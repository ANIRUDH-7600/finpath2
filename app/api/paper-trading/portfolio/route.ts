import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { marketData } from '@/lib/services/market-data'

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id')
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 })

    let portfolio = await prisma.paperPortfolio.findUnique({
      where: { user_id },
      include: { holdings: true, trades: { orderBy: { created_at: 'desc' }, take: 20 } },
    })

    if (!portfolio) {
      return Response.json({ exists: false })
    }

    // Get current prices from market snapshot cache
    const macro = await marketData.getMacroData().catch(() => null)

    // Build price map from last known market data
    // We store last known prices in trades; use avg_buy_price as fallback
    const tradesBySymbol = new Map<string, number>()
    for (const trade of portfolio.trades) {
      if (!tradesBySymbol.has(trade.symbol)) tradesBySymbol.set(trade.symbol, trade.price)
    }

    const holdingsWithPnl = portfolio.holdings.map(h => {
      const currentPrice = tradesBySymbol.get(h.symbol) ?? h.avg_buy_price
      const currentValue = currentPrice * h.quantity
      const costBasis = h.avg_buy_price * h.quantity
      const pnl = currentValue - costBasis
      const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
      return {
        ...h,
        current_price: currentPrice,
        current_value: Math.round(currentValue),
        cost_basis: Math.round(costBasis),
        pnl: Math.round(pnl),
        pnl_pct: Math.round(pnlPct * 10) / 10,
      }
    })

    const totalInvested = holdingsWithPnl.reduce((s, h) => s + h.cost_basis, 0)
    const totalCurrentValue = holdingsWithPnl.reduce((s, h) => s + h.current_value, 0)
    const totalPnl = totalCurrentValue - totalInvested
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0

    return Response.json({
      exists: true,
      id: portfolio.id,
      cash_balance: portfolio.cash_balance,
      agent_enabled: portfolio.agent_enabled,
      agent_mode: portfolio.agent_mode,
      total_invested: Math.round(totalInvested),
      total_current_value: Math.round(totalCurrentValue),
      total_pnl: Math.round(totalPnl),
      total_pnl_pct: Math.round(totalPnlPct * 10) / 10,
      holdings: holdingsWithPnl,
      recent_trades: portfolio.trades,
      nifty_level: macro?.niftyLevel,
    })
  } catch (error) {
    console.error('portfolio GET error:', error)
    return Response.json({ error: 'Failed to load portfolio' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, seed_amount } = await req.json()
    if (!user_id || !seed_amount) return Response.json({ error: 'Missing fields' }, { status: 400 })

    const existing = await prisma.paperPortfolio.findUnique({ where: { user_id } })
    if (existing) {
      // Top up cash
      const updated = await prisma.paperPortfolio.update({
        where: { user_id },
        data: { cash_balance: { increment: seed_amount } },
      })
      return Response.json({ cash_balance: updated.cash_balance })
    }

    const portfolio = await prisma.paperPortfolio.create({
      data: { user_id, cash_balance: seed_amount },
    })
    return Response.json({ cash_balance: portfolio.cash_balance })
  } catch (error) {
    console.error('portfolio POST error:', error)
    return Response.json({ error: 'Failed to create portfolio' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user_id, agent_enabled, agent_mode } = await req.json()
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 })

    const updated = await prisma.paperPortfolio.update({
      where: { user_id },
      data: {
        ...(agent_enabled !== undefined && { agent_enabled }),
        ...(agent_mode !== undefined && { agent_mode }),
      },
    })
    return Response.json({ agent_enabled: updated.agent_enabled, agent_mode: updated.agent_mode })
  } catch (error) {
    console.error('portfolio PATCH error:', error)
    return Response.json({ error: 'Failed to update' }, { status: 500 })
  }
}
