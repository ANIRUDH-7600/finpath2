import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildGoalPlan } from '@/lib/agents/goal'

export async function POST(req: NextRequest) {
  try {
    const { user_id, title, target_amount, current_savings, deadline_months, income } = await req.json()

    const result = await buildGoalPlan(title, target_amount, current_savings ?? 0, deadline_months, income)

    const savedGoal = await prisma.goal.create({
      data: {
        user_id,
        title,
        target_amount,
        current_savings: current_savings ?? 0,
        deadline_months,
        daily_save_required: result.daily_save,
        monthly_sip: result.monthly_sip,
        inflation_adjusted: result.inflation_adjusted_target,
        projected_return: result.projected_return,
        asset_allocation: JSON.stringify(result.profile),
        narrative: result.narrative,
        status: 'active',
      },
    })

    return Response.json({
      goal_id: savedGoal.id,
      daily_save: result.daily_save,
      monthly_sip: result.monthly_sip,
      inflation_adjusted_target: result.inflation_adjusted_target,
      projected_return: result.projected_return,
      profile: result.profile,
      feasible: result.feasible,
      percent_of_income: result.percent_of_income,
      deadline_date: result.deadline_date,
      narrative: result.narrative,
    })
  } catch (error) {
    console.error('calculate-goal error:', error)
    return Response.json({ error: 'Goal calculation failed' }, { status: 500 })
  }
}
