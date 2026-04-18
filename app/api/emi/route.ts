import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id')
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 })
    const emis = await prisma.emi.findMany({
      where: { user_id },
      orderBy: { created_at: 'desc' },
    })
    return Response.json(emis)
  } catch (error) {
    console.error('emi GET error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, loan_name, emi_amount, interest_rate, remaining_months, loan_type } = await req.json()
    if (!user_id || !loan_name || !emi_amount || !remaining_months)
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    const emi = await prisma.emi.create({
      data: {
        user_id,
        loan_name,
        emi_amount: parseFloat(emi_amount),
        interest_rate: parseFloat(interest_rate ?? 10),
        remaining_months: parseInt(remaining_months),
        loan_type: loan_type ?? 'personal',
      },
    })
    return Response.json(emi)
  } catch (error) {
    console.error('emi POST error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await prisma.emi.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (error) {
    console.error('emi DELETE error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
