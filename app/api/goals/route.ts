import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Goal } from '@/types'

// Prisma returns null for unset optional fields; our interface uses undefined
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGoal(g: any): Goal {
  return {
    ...g,
    monthly_sip: g.monthly_sip ?? undefined,
    inflation_adjusted: g.inflation_adjusted ?? undefined,
    projected_return: g.projected_return ?? undefined,
    asset_allocation: g.asset_allocation ?? undefined,
    daily_save_required: g.daily_save_required ?? undefined,
    narrative: g.narrative ?? undefined,
    contributions: g.contributions ?? [],
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const user_id = searchParams.get('user_id')

    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 })

    const goals = await prisma.goal.findMany({
      where: { user_id },
      orderBy: { created_at: 'desc' },
      include: { contributions: { orderBy: { created_at: 'desc' } } },
    })

    return Response.json(goals.map(normalizeGoal))
  } catch (error) {
    console.error('goals GET error:', error)
    return Response.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, title, target_amount, current_savings, deadline_months } = await req.json()

    const goal = await prisma.goal.create({
      data: {
        user_id,
        title,
        target_amount,
        current_savings: current_savings ?? 0,
        deadline_months,
        status: 'active',
      },
    })

    return Response.json(goal)
  } catch (error) {
    console.error('goals POST error:', error)
    return Response.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}
