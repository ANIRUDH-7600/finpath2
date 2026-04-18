// app/api/dashboard/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeBehavior } from '@/lib/agents/behavioral'
import type { DashboardData, Transaction } from '@/types'

function sipFV(monthly: number, annualReturn: number, months: number): number {
  if (months <= 0) return 0
  const r = annualReturn / 100 / 12
  if (r === 0) return monthly * months
  return monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r)
}

function monthsSince(startDate: string): number {
  const [y, m] = startDate.split('-').map(Number)
  const start = new Date(y, (m || 1) - 1, 1)
  const now = new Date()
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()))
}


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 })
    }

    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const [user, monthlyTransactions, recentTransactions, goals, portfolio, nudgeSaved, sipsRaw, emisRaw] = await Promise.all([
      prisma.user.findUnique({ where: { id: user_id } }),
      prisma.transaction.findMany({
        where: { user_id, date: { startsWith: monthKey } },
        orderBy: { date: 'desc' },
      }),
      prisma.transaction.findMany({
        where: { user_id },
        orderBy: { date: 'desc' },
        take: 60,
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
      prisma.sip.findMany({ where: { user_id }, select: { monthly_amount: true, start_date: true, expected_return: true } }),
      prisma.emi.findMany({ where: { user_id }, select: { emi_amount: true } }),
    ])

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    const sips = sipsRaw.map(s => ({
      monthly_amount: Number(s.monthly_amount),
      start_date: s.start_date,
      expected_return: Number(s.expected_return)
    }))

    const emis = emisRaw.map(e => ({
      emi_amount: Number(e.emi_amount)
    }))

    const monthlySpending = monthlyTransactions.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)
    const monthlyIncome = user.monthly_income || 0
    const emiMonthly = emis.reduce((s, e) => s + e.emi_amount, 0)
    const sipMonthly = sips.reduce((s, s2) => s + s2.monthly_amount, 0)
    const currentSavings = monthlyIncome - monthlySpending - emiMonthly

    // SIP portfolio: current value (FV), total invested (principal), and gain
    const sipPortfolioValue = Math.round(sips.reduce((sum, s) => sum + sipFV(s.monthly_amount, s.expected_return, monthsSince(s.start_date)), 0))
    const sipTotalInvested = Math.round(sips.reduce((sum, s) => sum + s.monthly_amount * monthsSince(s.start_date), 0))
    const sipGainLoss = sipPortfolioValue - sipTotalInvested

    const analysis = await analyzeBehavior(recentTransactions as unknown as Transaction[], {
      monthlyIncome,
      currentSavings,
      monthlySpending,
      savingsRate: monthlyIncome > 0 ? (currentSavings / monthlyIncome) * 100 : 0,
    })

    // Override categories with current-month only data
    const monthlyCategories: Record<string, number> = {}
    for (const t of monthlyTransactions) {
      monthlyCategories[t.category] = (monthlyCategories[t.category] ?? 0) + t.amount
    }

    const moneySaved = nudgeSaved.reduce(
      (sum: number, row: { amount: number | null | undefined }) => sum + Number(row.amount ?? 0),
      0,
    )

    const portfolioData = portfolio
      ? {
          allocation: JSON.parse(portfolio.allocation ?? '{}'),
          instruments: JSON.parse(portfolio.instruments ?? '[]'),
          sip_amount: portfolio.sip_amount ?? Math.max(0, currentSavings * 0.5),
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
        categories: monthlyCategories,
        monthly_total: monthlySpending,
        savings_rate: monthlyIncome > 0 ? (currentSavings / monthlyIncome) * 100 : 0,
      },
      savings: currentSavings,
      emi_monthly: Math.round(emiMonthly),
      sip_monthly: Math.round(sipMonthly),
      sip_portfolio_value: sipPortfolioValue,
      sip_total_invested: sipTotalInvested,
      sip_gain_loss: sipGainLoss,
      net_cash: Math.round(currentSavings - sipMonthly),
      goals: goals.map((g) => ({
        id: g.id,
        user_id: g.user_id,
        title: g.title,
        target_amount: g.target_amount,
        current_savings: g.current_savings,
        deadline_months: g.deadline_months,
        daily_save_required: g.daily_save_required ?? 0,
        narrative: g.narrative ?? '',
        monthly_sip: (g as any).monthly_sip ?? undefined,
        inflation_adjusted: (g as any).inflation_adjusted ?? undefined,
        projected_return: (g as any).projected_return ?? undefined,
        asset_allocation: (g as any).asset_allocation ?? undefined,
        status: g.status,
        created_at: g.created_at.toISOString(),
      })),
      portfolio: portfolioData,
      recent_transactions: recentTransactions.slice(0, 5).map(t => ({
        id: t.id,
        user_id: t.user_id,
        merchant: t.merchant,
        amount: t.amount,
        category: t.category as Transaction['category'],
        date: t.date,
        note: t.note ?? undefined,
        created_at: new Date(t.created_at).toISOString(),
      })),
      money_saved_by_guardian: moneySaved,
    }

    return Response.json(dashboardData)
  } catch (error) {
    console.error('dashboard error:', error)
    return Response.json({ error: 'Dashboard fetch failed' }, { status: 500 })
  }
}