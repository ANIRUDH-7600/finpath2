import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id')
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 })
    const sips = await prisma.sip.findMany({
      where: { user_id },
      orderBy: { created_at: 'desc' },
    })
    return Response.json(sips)
  } catch (error) {
    console.error('sip GET error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, asset_name, monthly_amount, start_date, expected_return } = await req.json()
    if (!user_id || !asset_name || !monthly_amount || !start_date)
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    const sip = await prisma.sip.create({
      data: {
        user_id,
        asset_name,
        monthly_amount: parseFloat(monthly_amount),
        start_date,
        expected_return: parseFloat(expected_return ?? 12),
      },
    })
    return Response.json(sip)
  } catch (error) {
    console.error('sip POST error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await prisma.sip.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (error) {
    console.error('sip DELETE error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
