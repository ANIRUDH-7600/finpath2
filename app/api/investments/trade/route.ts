// app/api/investments/trade/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { user_id, symbol, name, asset_type, action, quantity, price } = await req.json()

    if (!user_id || !symbol || !quantity || !price) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const totalValue = quantity * price

    if (action === 'buy') {
      // Check if user has enough savings
      const user = await prisma.user.findUnique({ where: { id: user_id } })
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      const startStr = startOfMonth.toISOString().split('T')[0]
      
      const monthlySpending = await prisma.transaction.aggregate({
        where: {
          user_id,
          date: { gte: startStr },
          category: { not: 'Investment' }
        },
        _sum: { amount: true }
      })
      
      const spending = monthlySpending._sum.amount || 0
      const availableSavings = (user?.monthly_income || 0) - spending
      
      if (totalValue > availableSavings) {
        return Response.json({ 
          error: `Insufficient savings. You have ${formatINR(availableSavings)} available` 
        }, { status: 400 })
      }

      // Check if investment already exists
      const existingInvestment = await prisma.investment.findFirst({
        where: { 
          user_id, 
          fund_name: name, 
          status: 'active' 
        }
      })

      let investment
      if (existingInvestment) {
        // Update existing investment - add more amount
        investment = await prisma.investment.update({
          where: { id: existingInvestment.id },
          data: { 
            amount: existingInvestment.amount + totalValue,
            transaction_date: new Date()
          }
        })
      } else {
        // Create new investment
        investment = await prisma.investment.create({
          data: {
            user_id,
            asset_type,
            fund_name: name,
            amount: totalValue,
            status: 'active'
          }
        })
      }

      // Record the transaction
      await prisma.transaction.create({
        data: {
          user_id,
          merchant: `INVESTMENT: Bought ${quantity} ${symbol}`,
          amount: totalValue,
          category: 'Investment',
          date: new Date().toISOString().split('T')[0],
          note: `Bought ${quantity} ${symbol} at ₹${price}`
        }
      })

      return Response.json({
        success: true,
        message: `Bought ${quantity} ${symbol}`,
        investment
      })
      
    } else if (action === 'sell') {
      // Find existing investment
      const existingInvestment = await prisma.investment.findFirst({
        where: { 
          user_id, 
          fund_name: name, 
          status: 'active' 
        }
      })

      if (!existingInvestment) {
        return Response.json({ error: 'No holdings found' }, { status: 400 })
      }

      // Calculate new amount after sale (simplified - proportional sale)
      const newAmount = existingInvestment.amount - totalValue
      
      if (newAmount <= 0.01) {
        await prisma.investment.delete({ where: { id: existingInvestment.id } })
      } else {
        await prisma.investment.update({
          where: { id: existingInvestment.id },
          data: { amount: newAmount, transaction_date: new Date() }
        })
      }

      // Record sale as negative expense (adds to savings)
      await prisma.transaction.create({
        data: {
          user_id,
          merchant: `INVESTMENT: Sold ${quantity} ${symbol}`,
          amount: -totalValue,
          category: 'Investment',
          date: new Date().toISOString().split('T')[0],
          note: `Sold ${quantity} ${symbol} at ₹${price}`
        }
      })

      return Response.json({
        success: true,
        message: `Sold ${quantity} ${symbol}`
      })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Trade error:', error)
    return Response.json({ error: 'Trade failed' }, { status: 500 })
  }
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)
}