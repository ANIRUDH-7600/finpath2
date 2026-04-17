import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 })
    }

    const goals = await prisma.goal.findMany({
      where: { user_id, status: 'active' },
      orderBy: { created_at: 'desc' },
    })

    return Response.json(goals)
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
