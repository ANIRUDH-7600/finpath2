import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeBehavior } from '@/lib/agents/behavioral'
import type { Transaction } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 })
    }

    const transactions = await prisma.transaction.findMany({
      where: { user_id },
      orderBy: { date: 'desc' },
      take: 50,
    })

    const result = await analyzeBehavior(transactions as unknown as Transaction[])
    return Response.json(result)
  } catch (error) {
    console.error('analyze-spending error:', error)
    return Response.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
