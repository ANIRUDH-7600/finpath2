import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeBehavior } from '@/lib/agents/behavioral'
import type { DashboardData, Transaction } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 })
    }

    const [user, transactions, goals, portfolio, nudgeSaved] = await Promise.all([
      prisma.user.findUnique({ where: { id: user_id } }),
      prisma.transaction.findMany({
        where: { user_id },
        orderBy: { date: 'desc' },
        take: 50,
      }),
      prisma.goal.findMany({
        where: { user_id, status: 'active' },
        orderBy: { created_at: 'desc' },
      }),
      prisma.portfolioProfile.findUnique({ where: { user_id } }),
      prisma.nudgeLog.findMany({
        where: { user_id, user_action: 'skipped' },
        select: { amount: true },
      }),
    ])

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate real savings
    const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0)
    const monthlySpending = totalSpending // Adjust for date range if needed
    const monthlyIncome = user.monthly_income || 0
    const currentSavings = monthlyIncome - monthlySpending

    // Pass real data to behavioral analysis
    const analysis = await analyzeBehavior(transactions as unknown as Transaction[], {
      monthlyIncome,
      currentSavings,
      monthlySpending
    })

    const moneySaved = nudgeSaved.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)

    const portfolioData = portfolio
      ? {
          allocation: JSON.parse(portfolio.allocation ?? '{}'),
          instruments: JSON.parse(portfolio.instruments ?? '[]'),
          sip_amount: portfolio.sip_amount ?? Math.max(0, currentSavings * 0.5), // 50% of savings to SIP
          reasoning: portfolio.reasoning ?? '',
          macro_note: portfolio.macro_note ?? '',
        }
      : null

    const dashboardData: DashboardData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email ?? '',
        monthly_income: user.monthly_income,
        risk_appetite: user.risk_appetite,
        created_at: user.created_at.toISOString(),
      },
      analysis: {
        ...analysis,
        monthly_total: monthlySpending,
        savings_rate: monthlyIncome > 0 ? (currentSavings / monthlyIncome) * 100 : 0,
      },
      savings: currentSavings,
      goals: goals.map(g => ({
        ...g,
        daily_save_required: g.daily_save_required ?? 0,
        narrative: g.narrative ?? '',
        created_at: g.created_at.toISOString(),
      })),
      portfolio: portfolioData,
      recent_transactions: transactions.slice(0, 5).map(t => ({
        ...t,
        created_at: t.created_at.toISOString(),
      })) as unknown as Transaction[],
      money_saved_by_guardian: moneySaved,
    }

    return Response.json(dashboardData)
  } catch (error) {
    console.error('dashboard error:', error)
    return Response.json({ error: 'Dashboard fetch failed' }, { status: 500 })
  }
}