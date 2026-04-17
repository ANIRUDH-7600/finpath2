import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { nudge_log_id, user_action } = await req.json()

    await prisma.nudgeLog.update({
      where: { id: nudge_log_id },
      data: { user_action },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('nudge log error:', error)
    return Response.json({ error: 'Failed to log nudge action' }, { status: 500 })
  }
}
