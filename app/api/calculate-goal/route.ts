import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildGoalPlan } from '@/lib/agents/goal'

export async function POST(req: NextRequest) {
  try {
    const { user_id, title, target_amount, current_savings, deadline_months, income } = await req.json()

    const result = await buildGoalPlan(title, target_amount, current_savings, deadline_months, income)

    const savedGoal = await prisma.goal.create({
      data: {
        user_id,
        title,
        target_amount,
        current_savings,
        deadline_months,
        daily_save_required: result.daily_save,
        narrative: result.narrative,
        status: 'active',
      },
    })

    return Response.json({ ...result, goal: savedGoal })
  } catch (error) {
    console.error('calculate-goal error:', error)
    return Response.json({ error: 'Goal calculation failed' }, { status: 500 })
  }
}
