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

    const user = await prisma.user.findUnique({ where: { id: user_id }, select: { monthly_income: true } })
    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    const [transactions, monthlyTxns] = await Promise.all([
      prisma.transaction.findMany({ where: { user_id }, orderBy: { date: 'desc' }, take: 60 }),
      prisma.transaction.findMany({ where: { user_id, date: { startsWith: monthKey } } }),
    ])

    const monthlyIncome = user?.monthly_income ?? 0
    const monthlySpending = monthlyTxns.reduce((s, t) => s + t.amount, 0)
    const currentSavings = monthlyIncome - monthlySpending

    const result = await analyzeBehavior(transactions as unknown as Transaction[], { monthlyIncome, currentSavings, monthlySpending, savingsRate: monthlyIncome > 0 ? (currentSavings / monthlyIncome) * 100 : 0 })
    return Response.json(result)
  } catch (error) {
    console.error('analyze-spending error:', error)
    return Response.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
