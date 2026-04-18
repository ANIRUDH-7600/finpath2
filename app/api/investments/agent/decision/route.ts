import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { user_id, decision_id, action } = await req.json()

    if (!user_id || !decision_id || !action) {
      return Response.json({ error: 'user_id, decision_id, action required' }, { status: 400 })
    }

    const decision = await prisma.aIAgentDecision.findUnique({ where: { id: decision_id } })
    if (!decision || decision.user_id !== user_id) {
      return Response.json({ error: 'Decision not found' }, { status: 404 })
    }

    if (action === 'reject') {
      await prisma.aIAgentDecision.update({ where: { id: decision_id }, data: { status: 'rejected' } })
      return Response.json({ ok: true, message: 'Decision rejected' })
    }

    if (action === 'approve') {
      const totalValue = decision.quantity * decision.price

      // Verify affordability from savings
      const user = await prisma.user.findUnique({ where: { id: user_id } })
      const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const monthlySpending = await prisma.transaction.aggregate({
        where: { user_id, date: { startsWith: monthKey } },
        _sum: { amount: true },
      })
      const availableSavings = (user?.monthly_income || 0) - (monthlySpending._sum.amount || 0)

      if (totalValue > availableSavings) {
        return Response.json({ error: `Insufficient savings. Available: ₹${Math.round(availableSavings).toLocaleString('en-IN')}` }, { status: 400 })
      }

      // Create investment record
      const existing = await prisma.investment.findFirst({
        where: { user_id, fund_name: decision.name, status: 'active' },
      })

      if (existing) {
        await prisma.investment.update({
          where: { id: existing.id },
          data: { amount: existing.amount + totalValue, transaction_date: new Date() },
        })
      } else {
        await prisma.investment.create({
          data: {
            user_id,
            asset_type: decision.symbol.includes('DEBT') || decision.symbol.includes('BOND') ? 'Debt' : 'Equity',
            fund_name: decision.name,
            amount: totalValue,
            status: 'active',
          },
        })
      }

      // Deduct from savings via transaction
      await prisma.transaction.create({
        data: {
          user_id,
          merchant: `AI Invest: ${decision.name}`,
          amount: totalValue,
          category: 'Investment' as never,
          date: new Date().toISOString().split('T')[0],
          note: decision.reason.slice(0, 100),
        },
      })

      // Mark decision as executed
      await prisma.aIAgentDecision.update({ where: { id: decision_id }, data: { status: 'executed' } })

      return Response.json({ ok: true, message: `Invested ₹${totalValue.toLocaleString('en-IN')} in ${decision.name}` })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('agent decision error:', error)
    return Response.json({ error: 'Failed to process decision' }, { status: 500 })
  }
}
