import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentMonthKey } from '@/lib/utils/goalMath'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { amount, note } = await req.json()

    if (!amount || amount <= 0) {
      return Response.json({ error: 'amount must be positive' }, { status: 400 })
    }

    const month = currentMonthKey()

    // Check if already contributed this month
    const existing = await prisma.goalContribution.findFirst({
      where: { goal_id: id, month },
    })

    let contribution
    if (existing) {
      // Update existing contribution for this month
      contribution = await prisma.goalContribution.update({
        where: { id: existing.id },
        data: { amount: existing.amount + amount, note: note ?? existing.note },
      })
      // Add delta to current_savings
      await prisma.goal.update({
        where: { id },
        data: { current_savings: { increment: amount } },
      })
    } else {
      // Create new contribution and bump savings
      const [contrib] = await prisma.$transaction([
        prisma.goalContribution.create({
          data: { goal_id: id, amount, month, note },
        }),
        prisma.goal.update({
          where: { id },
          data: { current_savings: { increment: amount } },
        }),
      ])
      contribution = contrib
    }

    // Return updated goal with all contributions
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: { contributions: { orderBy: { created_at: 'desc' } } },
    })

    // Auto-complete if target reached
    if (goal && goal.current_savings >= goal.target_amount) {
      await prisma.goal.update({ where: { id }, data: { status: 'completed' } })
    }

    return Response.json({ contribution, goal })
  } catch (error) {
    console.error('contribute error:', error)
    return Response.json({ error: 'Contribution failed' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const contributions = await prisma.goalContribution.findMany({
      where: { goal_id: id },
      orderBy: { created_at: 'desc' },
    })
    return Response.json(contributions)
  } catch (error) {
    console.error('contributions GET error:', error)
    return Response.json({ error: 'Failed to fetch contributions' }, { status: 500 })
  }
}
