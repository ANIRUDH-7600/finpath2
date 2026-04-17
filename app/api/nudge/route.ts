import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateNudge } from '@/lib/agents/nudge'

export async function POST(req: NextRequest) {
  try {
    const { user_id, merchant, amount, category, goal_id } = await req.json()

    const goal = goal_id ? await prisma.goal.findUnique({ where: { id: goal_id } }) : null

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    const recentTxns = await prisma.transaction.findMany({
      where: { user_id, category, date: { gte: sevenDaysAgoStr } },
      select: { amount: true },
    })

    const weeklyCategorySpend = recentTxns.reduce((sum: number, t) => sum + Number(t.amount), 0)
    const dailySaveRequired = goal?.daily_save_required ?? 0
    const daysBehind = goal
      ? Math.round(
          (goal.target_amount - goal.current_savings) / (dailySaveRequired || 1) -
            goal.deadline_months * 30
        )
      : 0

    const nudge = await generateNudge(
      merchant,
      amount,
      category,
      goal?.title ?? 'your goal',
      dailySaveRequired,
      weeklyCategorySpend,
      daysBehind
    )

    if (nudge.show_nudge) {
      const logEntry = await prisma.nudgeLog.create({
        data: { user_id, merchant, amount, category, nudge_message: nudge.message ?? '', user_action: 'pending' },
      })
      return Response.json({ ...nudge, nudge_log_id: logEntry.id })
    }

    return Response.json(nudge)
  } catch (error) {
    console.error('nudge error:', error)
    return Response.json({ show_nudge: false })
  }
}
