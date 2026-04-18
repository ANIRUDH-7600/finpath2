import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id')
    
    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 })
    }

    const decisions = await prisma.aIAgentDecision.findMany({
      where: { user_id, status: 'pending' },
      orderBy: { created_at: 'desc' },
      take: 10
    })

    return Response.json(decisions)
  } catch (error) {
    console.error('Decisions error:', error)
    return Response.json([])
  }
}