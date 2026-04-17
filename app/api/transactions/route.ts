import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const user_id = searchParams.get('user_id')
    const category = searchParams.get('category')

    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 })
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        user_id,
        ...(category && category !== 'All' ? { category } : {}),
      },
      orderBy: { date: 'desc' },
    })

    return Response.json(transactions)
  } catch (error) {
    console.error('transactions GET error:', error)
    return Response.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, amount, merchant, category, date, note } = await req.json()

    const transaction = await prisma.transaction.create({
      data: { user_id, amount, merchant, category, date: String(date), note: note ?? '' },
    })

    return Response.json(transaction)
  } catch (error) {
    console.error('transactions POST error:', error)
    return Response.json({ error: 'Failed to save transaction' }, { status: 500 })
  }
}
