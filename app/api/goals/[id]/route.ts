import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: { contributions: { orderBy: { created_at: 'desc' } } },
    })
    if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 })
    return Response.json(goal)
  } catch (error) {
    console.error('goal GET error:', error)
    return Response.json({ error: 'Failed to fetch goal' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const updated = await prisma.goal.update({
      where: { id },
      data: body,
      include: { contributions: { orderBy: { created_at: 'desc' } } },
    })
    return Response.json(updated)
  } catch (error) {
    console.error('goal PATCH error:', error)
    return Response.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.goal.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (error) {
    console.error('goal DELETE error:', error)
    return Response.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
