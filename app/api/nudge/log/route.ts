import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { nudge_log_id, user_action } = await req.json()

    const log = await prisma.nudgeLog.update({
      where: { id: nudge_log_id },
      data: { user_action },
    })

    // When user skips a purchase, credit the saved amount to their most urgent active goal
    if (user_action === 'skipped' && log.amount && log.amount > 0 && log.user_id) {
      const goals = await prisma.goal.findMany({
        where: { user_id: log.user_id, status: 'active' },
        orderBy: { deadline_months: 'asc' },
        take: 1,
      })

      if (goals.length > 0) {
        const goal = goals[0]
        const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

        await prisma.$transaction([
          prisma.goalContribution.create({
            data: {
              goal_id: goal.id,
              amount: log.amount,
              month: monthKey,
              note: `Saved by skipping ${log.merchant ?? 'purchase'} (nudge)`,
            },
          }),
          prisma.goal.update({
            where: { id: goal.id },
            data: { current_savings: { increment: log.amount } },
          }),
        ])
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('nudge log error:', error)
    return Response.json({ error: 'Failed to log nudge action' }, { status: 500 })
  }
}
