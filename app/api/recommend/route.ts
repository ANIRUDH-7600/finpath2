import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSmartRecommendation } from '@/lib/agents/recommender'

export async function POST(req: NextRequest) {
  try {
    const { user_id, query, budget, category } = await req.json()

    if (!user_id || !query || !budget) {
      return NextResponse.json({ error: 'user_id, query, and budget are required' }, { status: 400 })
    }

    const [user, transactions, goals] = await Promise.all([
      prisma.user.findUnique({ where: { id: user_id } }),
      prisma.transaction.findMany({
        where: { user_id },
        orderBy: { date: 'desc' },
        take: 60,
      }),
      prisma.goal.findMany({
        where: { user_id, status: 'active' },
      }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const now = new Date()
    const monthly_spending = transactions
      .filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((s, t) => s + t.amount, 0)

    const monthly_income = user.monthly_income ?? 50000
    const surplus = monthly_income - monthly_spending
    const savings_rate = monthly_income > 0 ? Math.max(0, Math.round((surplus / monthly_income) * 100)) : 0

    // Simple health score based on savings rate
    let health_score = 50
    if (savings_rate >= 30) health_score = 88
    else if (savings_rate >= 20) health_score = 72
    else if (savings_rate >= 10) health_score = 58
    else health_score = 38

    const result = await getSmartRecommendation(
      query,
      Number(budget),
      category ?? 'General',
      {
        monthly_income,
        monthly_spending,
        health_score,
        savings_rate,
        active_goals: goals.map(g => ({
          title: g.title,
          daily_save_required: g.daily_save_required ?? 0,
        })),
      }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('recommend error:', error)
    return NextResponse.json({ error: 'Recommendation failed' }, { status: 500 })
  }
}
