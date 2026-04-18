import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { user_id, symbol, name, asset_type, action, quantity, price, triggered_by, ai_reason } = await req.json()

    if (!user_id || !symbol || !action || !quantity || !price) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const portfolio = await prisma.paperPortfolio.findUnique({
      where: { user_id },
      include: { holdings: true },
    })

    if (!portfolio) return Response.json({ error: 'Portfolio not found' }, { status: 404 })

    const totalValue = Math.round(quantity * price * 100) / 100
    const existingHolding = portfolio.holdings.find(h => h.symbol === symbol)

    if (action === 'buy') {
      if (portfolio.cash_balance < totalValue) {
        return Response.json({ error: `Insufficient cash. Need ₹${totalValue}, have ₹${Math.round(portfolio.cash_balance)}` }, { status: 400 })
      }

      await prisma.$transaction(async (tx) => {
        // Deduct cash
        await tx.paperPortfolio.update({
          where: { id: portfolio.id },
          data: { cash_balance: { decrement: totalValue } },
        })

        if (existingHolding) {
          // Update avg price: (old_qty * old_avg + new_qty * new_price) / total_qty
          const newQty = existingHolding.quantity + quantity
          const newAvg = (existingHolding.quantity * existingHolding.avg_buy_price + quantity * price) / newQty
          await tx.paperHolding.update({
            where: { id: existingHolding.id },
            data: { quantity: newQty, avg_buy_price: Math.round(newAvg * 100) / 100 },
          })
        } else {
          await tx.paperHolding.create({
            data: { portfolio_id: portfolio.id, symbol, name, asset_type, quantity, avg_buy_price: price },
          })
        }

        await tx.paperTrade.create({
          data: {
            portfolio_id: portfolio.id, symbol, name, asset_type,
            action: 'buy', quantity, price, total_value: totalValue,
            triggered_by: triggered_by ?? 'manual',
            ai_reason: ai_reason ?? null,
          },
        })
      })
    } else if (action === 'sell') {
      if (!existingHolding || existingHolding.quantity < quantity) {
        return Response.json({ error: `Cannot sell ${quantity} — only hold ${existingHolding?.quantity ?? 0}` }, { status: 400 })
      }

      await prisma.$transaction(async (tx) => {
        await tx.paperPortfolio.update({
          where: { id: portfolio.id },
          data: { cash_balance: { increment: totalValue } },
        })

        const newQty = existingHolding.quantity - quantity
        if (newQty <= 0.0001) {
          await tx.paperHolding.delete({ where: { id: existingHolding.id } })
        } else {
          await tx.paperHolding.update({ where: { id: existingHolding.id }, data: { quantity: newQty } })
        }

        await tx.paperTrade.create({
          data: {
            portfolio_id: portfolio.id, symbol, name, asset_type,
            action: 'sell', quantity, price, total_value: totalValue,
            triggered_by: triggered_by ?? 'manual',
            ai_reason: ai_reason ?? null,
          },
        })
      })
    }

    // Return updated portfolio
    const updated = await prisma.paperPortfolio.findUnique({
      where: { user_id },
      select: { cash_balance: true },
    })
    return Response.json({ ok: true, cash_balance: updated?.cash_balance })
  } catch (error) {
    console.error('trade POST error:', error)
    return Response.json({ error: 'Trade failed' }, { status: 500 })
  }
}
