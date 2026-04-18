// app/api/autopilot/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groq } from '@ai-sdk/groq'
import { generateText } from 'ai'

interface SweepAllocation {
  goal_id: string
  goal_title: string
  amount: number
  reason: string
}

interface GoalWithDetails {
  id: string
  title: string
  target_amount: number
  current_savings: number
  deadline_months: number
  inflation_adjusted: number | null
}

interface AutoSweepSummary {
  id: string
  week_key: string
  total_surplus: number
  approved_at: Date | null
}

interface TransactionSummary {
  amount: number
  category: string
}

function currentWeekKey(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function weekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id')
    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 })
    }

    const weekKey = currentWeekKey()
    const weekFrom = weekStart()

    const [user, goals, weekTxns, existingSweep, allSweeps] = await Promise.all([
      prisma.user.findUnique({ 
        where: { id: user_id }, 
        select: { monthly_income: true } 
      }),
      prisma.goal.findMany({ 
        where: { user_id, status: 'active' }, 
        orderBy: { created_at: 'asc' } 
      }) as Promise<GoalWithDetails[]>,
      prisma.transaction.findMany({
        where: { user_id, date: { gte: weekFrom } },
        select: { amount: true, category: true },
      }) as Promise<TransactionSummary[]>,
      prisma.autoSweep.findFirst({ 
        where: { user_id, week_key: weekKey } 
      }),
      prisma.autoSweep.findMany({
        where: { user_id, status: 'approved' },
        orderBy: { created_at: 'desc' },
        take: 8,
      }) as Promise<AutoSweepSummary[]>,
    ])

    const monthlyIncome: number = user?.monthly_income ?? 50000
    const weeklyBudget: number = Math.round(monthlyIncome / 4)
    const weeklySpent: number = weekTxns.reduce((sum: number, t: TransactionSummary) => sum + t.amount, 0)
    const surplus: number = Math.max(0, weeklyBudget - weeklySpent)

    const spendByCategory: Record<string, number> = weekTxns.reduce((acc: Record<string, number>, t: TransactionSummary) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount
      return acc
    }, {} as Record<string, number>)

    const totalAutoswept: number = allSweeps.reduce((sum: number, sw: AutoSweepSummary) => sum + sw.total_surplus, 0)

    if (existingSweep) {
      return Response.json({
        week_key: weekKey,
        weekly_budget: weeklyBudget,
        weekly_spent: Math.round(weeklySpent),
        surplus,
        spend_by_category: spendByCategory,
        pending_sweep: {
          id: existingSweep.id,
          status: existingSweep.status,
          allocations: JSON.parse(existingSweep.allocations),
          total_surplus: existingSweep.total_surplus,
          approved_at: existingSweep.approved_at,
        },
        past_sweeps: allSweeps.map((sw: AutoSweepSummary) => ({
          id: sw.id,
          week_key: sw.week_key,
          total_surplus: sw.total_surplus,
          approved_at: sw.approved_at,
        })),
        total_autoswept: Math.round(totalAutoswept),
      })
    }

    if (surplus < 200 || goals.length === 0) {
      return Response.json({
        week_key: weekKey,
        weekly_budget: weeklyBudget,
        weekly_spent: Math.round(weeklySpent),
        surplus,
        spend_by_category: spendByCategory,
        pending_sweep: null,
        past_sweeps: allSweeps.map((sw: AutoSweepSummary) => ({
          id: sw.id,
          week_key: sw.week_key,
          total_surplus: sw.total_surplus,
          approved_at: sw.approved_at,
        })),
        total_autoswept: Math.round(totalAutoswept),
      })
    }

    const goalSummary: string = goals.map((g: GoalWithDetails) => {
      const effective: number = g.inflation_adjusted ?? g.target_amount
      const remaining: number = Math.max(0, effective - g.current_savings)
      const urgency: number = g.deadline_months > 0 ? Math.round((remaining / effective) * 100) : 50
      return `"${g.title}" id=${g.id}: ₹${remaining.toLocaleString('en-IN')} remaining, ${g.deadline_months}mo deadline, ${urgency}% gap`
    }).join('\n')

    let allocations: SweepAllocation[] = []
    
    try {
      const { text } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        prompt: `User has ₹${surplus} surplus this week to sweep into goals. Allocate it intelligently — prioritise goals with closest deadlines and biggest remaining gaps.

Goals:
${goalSummary}

Return JSON array only:
[{"goal_id":"id","goal_title":"title","amount":0,"reason":"one short phrase"}]

Rules: amounts must sum to exactly ${surplus}. Round to nearest ₹10. Each amount >= 100.`,
        temperature: 0.3,
        maxOutputTokens: 400,
      })
      
      const cleaned: string = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      allocations = JSON.parse(cleaned) as SweepAllocation[]
    } catch {
      const perGoal: number = Math.round(surplus / goals.length / 10) * 10
      allocations = goals.map((g: GoalWithDetails) => ({
        goal_id: g.id,
        goal_title: g.title,
        amount: perGoal,
        reason: 'Equal split across active goals',
      }))
    }

    const sweep = await prisma.autoSweep.create({
      data: {
        user_id,
        week_key: weekKey,
        total_surplus: surplus,
        allocations: JSON.stringify(allocations),
        status: 'pending',
      },
    })

    return Response.json({
      week_key: weekKey,
      weekly_budget: weeklyBudget,
      weekly_spent: Math.round(weeklySpent),
      surplus,
      spend_by_category: spendByCategory,
      pending_sweep: {
        id: sweep.id,
        status: sweep.status,
        allocations,
        total_surplus: surplus,
        approved_at: null,
      },
      past_sweeps: allSweeps.map((sw: AutoSweepSummary) => ({
        id: sw.id,
        week_key: sw.week_key,
        total_surplus: sw.total_surplus,
        approved_at: sw.approved_at,
      })),
      total_autoswept: Math.round(totalAutoswept),
    })
  } catch (error) {
    console.error('autopilot GET error:', error)
    return Response.json({ error: 'Failed to calculate sweep' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, sweep_id, action, allocations }: { 
      user_id: string; 
      sweep_id: string; 
      action: string; 
      allocations?: SweepAllocation[] 
    } = body

    if (!user_id || !sweep_id) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (action === 'dismiss') {
      await prisma.autoSweep.update({ 
        where: { id: sweep_id }, 
        data: { status: 'dismissed' } 
      })
      return Response.json({ ok: true })
    }

    if (action !== 'approve') {
      return Response.json({ error: 'Invalid action' }, { status: 400 })
    }

    const finalAllocs: SweepAllocation[] = allocations || []
    const now: Date = new Date()
    const monthKey: string = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    await prisma.$transaction([
      prisma.autoSweep.update({
        where: { id: sweep_id },
        data: { 
          status: 'approved', 
          approved_at: now, 
          allocations: JSON.stringify(finalAllocs) 
        },
      }),
      ...finalAllocs.map((a: SweepAllocation) =>
        prisma.goalContribution.create({
          data: { 
            goal_id: a.goal_id, 
            amount: a.amount, 
            month: monthKey, 
            note: 'Autopilot sweep' 
          },
        })
      ),
      ...finalAllocs.map((a: SweepAllocation) =>
        prisma.goal.update({
          where: { id: a.goal_id },
          data: { current_savings: { increment: a.amount } },
        })
      ),
    ])

    return Response.json({ ok: true })
  } catch (error) {
    console.error('autopilot POST error:', error)
    return Response.json({ error: 'Sweep failed' }, { status: 500 })
  }
}