// app/api/nudge/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNudge } from '@/lib/agents/nudge'
import type { NudgeGoalImpact, NudgeCategoryStats } from '@/types'

interface UserData {
  monthly_income: number | null
}

interface GoalData {
  id: string
  title: string
  target_amount: number
  current_savings: number
  deadline_months: number
  inflation_adjusted: number | null
  daily_save_required: number | null
}

interface TransactionData {
  amount: number
  category: string
}

interface TransactionWithDate extends TransactionData {
  date: string
}

interface RequestBody {
  user_id: string
  merchant: string
  amount: number
  category: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as RequestBody
    const { user_id, merchant, amount, category } = body

    const now: Date = new Date()
    const firstOfMonth: string = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const sevenDaysAgo: string = new Date(now.getTime() - 7 * 86400_000).toISOString().split('T')[0]
    const threeMonthsAgo: string = new Date(now.getTime() - 90 * 86400_000).toISOString().split('T')[0]

    // Fetch everything in parallel
    const [user, activeGoals, thisMonthTxns, threeMonthTxns, weekTxns] = await Promise.all([
      prisma.user.findUnique({ 
        where: { id: user_id }, 
        select: { monthly_income: true } 
      }) as Promise<UserData | null>,
      prisma.goal.findMany({ 
        where: { user_id, status: 'active' } 
      }) as Promise<GoalData[]>,
      prisma.transaction.findMany({ 
        where: { user_id, date: { gte: firstOfMonth } }, 
        select: { amount: true, category: true } 
      }) as Promise<TransactionData[]>,
      prisma.transaction.findMany({ 
        where: { user_id, category, date: { gte: threeMonthsAgo } }, 
        select: { amount: true, date: true } 
      }) as Promise<TransactionWithDate[]>,
      prisma.transaction.findMany({ 
        where: { user_id, merchant, date: { gte: sevenDaysAgo } }, 
        select: { amount: true } 
      }) as Promise<{ amount: number }[]>,
    ])

    const monthlyIncome: number = user?.monthly_income ?? 50000

    // Monthly budget usage
    const totalSpentThisMonth: number = thisMonthTxns.reduce((sum: number, t: TransactionData) => sum + t.amount, 0)
    const monthlyBudgetUsedPct: number = monthlyIncome > 0
      ? Math.round(((totalSpentThisMonth + amount) / monthlyIncome) * 100)
      : 0

    // Category stats
    const categoryThisMonth: number = thisMonthTxns
      .filter((t: TransactionData) => t.category === category)
      .reduce((sum: number, t: TransactionData) => sum + t.amount, 0)

    const threeMonthCategoryTotal: number = threeMonthTxns.reduce((sum: number, t: TransactionWithDate) => sum + t.amount, 0)
    const monthlyAvg: number = Math.round(threeMonthCategoryTotal / 3)

    const overspendPct: number = monthlyAvg > 0
      ? Math.max(0, Math.round(((categoryThisMonth + amount - monthlyAvg) / monthlyAvg) * 100))
      : 0

    const categoryStats: NudgeCategoryStats = {
      spent_this_month: categoryThisMonth,
      monthly_avg: monthlyAvg,
      overspend_pct: overspendPct,
      streak_count: weekTxns.length + 1,
    }

    // Goal impacts
    const goalImpacts: NudgeGoalImpact[] = activeGoals
      .map((g: GoalData) => {
        const effectiveTarget: number = g.inflation_adjusted ?? g.target_amount
        const dailySave: number = g.daily_save_required ?? Math.round(effectiveTarget / ((g.deadline_months || 12) * 30))
        const daysDelayed: number = dailySave > 0 ? Math.round(amount / dailySave) : 0
        const currentPct: number = effectiveTarget > 0 ? Math.round((g.current_savings / effectiveTarget) * 100) : 0
        const newPct: number = Math.max(0, currentPct - Math.round((daysDelayed / (g.deadline_months * 30)) * 100))

        return {
          title: g.title,
          days_delayed: daysDelayed,
          current_pct: currentPct,
          new_pct: newPct,
        }
      })
      .filter((g: NudgeGoalImpact) => g.days_delayed > 0 || activeGoals.length <= 2)

    // AI-generated nudge message
    const aiNudge = await generateNudge({
      merchant,
      amount,
      category,
      goalImpacts,
      categoryStats,
      monthlyBudgetUsedPct,
      monthlyIncome,
    })

    if (!aiNudge.show_nudge) {
      return Response.json({ show_nudge: false })
    }

    const logEntry = await prisma.nudgeLog.create({
      data: { 
        user_id, 
        merchant, 
        amount, 
        category, 
        nudge_message: aiNudge.message ?? '', 
        user_action: 'pending' 
      },
    })

    return Response.json({
      ...aiNudge,
      goal_impacts: goalImpacts,
      category_stats: categoryStats,
      monthly_budget_used_pct: monthlyBudgetUsedPct,
      nudge_log_id: logEntry.id,
    })
  } catch (error) {
    console.error('nudge error:', error)
    return Response.json({ show_nudge: false })
  }
}