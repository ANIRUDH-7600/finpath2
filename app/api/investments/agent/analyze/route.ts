import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { claude, CLAUDE_MODEL } from '@/lib/claude'

interface AIDecision {
  symbol: string
  name: string
  action: 'buy' | 'sell' | 'hold'
  quantity: number
  price: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

const FALLBACK_DECISIONS: AIDecision[] = [
  { symbol: 'NIFTY50IDX', name: 'UTI Nifty 50 Index Fund', action: 'buy', quantity: 1, price: 500, reason: 'Core index allocation for long-term wealth. Low cost, diversified exposure to top 50 Indian companies.', confidence: 'high' },
  { symbol: 'PPFAS', name: 'Parag Parikh Flexi Cap Fund', action: 'buy', quantity: 1, price: 1000, reason: 'Flexi cap with international diversification. Strong long-term track record and disciplined fund management.', confidence: 'medium' },
]

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 })

    const [user, transactions, goals, portfolio] = await Promise.all([
      prisma.user.findUnique({ where: { id: user_id } }),
      prisma.transaction.findMany({ where: { user_id }, orderBy: { date: 'desc' }, take: 30 }),
      prisma.goal.findMany({ where: { user_id, status: 'active' } }),
      prisma.portfolioProfile.findUnique({ where: { user_id } }),
    ])

    if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const monthlySpending = transactions
      .filter(t => t.date.startsWith(monthKey))
      .reduce((s, t) => s + t.amount, 0)
    const availableSavings = (user.monthly_income || 0) - monthlySpending

    if (availableSavings <= 0) {
      return Response.json({ count: 0, message: 'No investable surplus this month' })
    }

    const topCategories = transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)
    const topSpend = Object.entries(topCategories).sort((a, b) => b[1] - a[1])[0]

    let decisions: AIDecision[] = FALLBACK_DECISIONS

    try {
      const allocation = portfolio?.allocation ? JSON.parse(portfolio.allocation) : { equity: 60, debt: 25, gold: 10, cash: 5 }
      const investablePerAsset = {
        equity: Math.round(availableSavings * 0.4 * (allocation.equity / 100)),
        debt: Math.round(availableSavings * 0.4 * (allocation.debt / 100)),
        gold: Math.round(availableSavings * 0.4 * (allocation.gold / 100)),
      }

      const response = await claude.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 600,
        system: 'You are a SEBI-aligned AI investment advisor for Indian retail investors. Return ONLY valid JSON array. No markdown.',
        messages: [{
          role: 'user',
          content: `User financial profile:
- Monthly income: ₹${user.monthly_income}
- Monthly spending: ₹${Math.round(monthlySpending)}
- Available to invest: ₹${Math.round(availableSavings)}
- Risk appetite: ${user.risk_appetite}/5
- Top spending: ${topSpend?.[0]} (₹${Math.round(topSpend?.[1] || 0)})
- Active goals: ${goals.map(g => g.title).join(', ') || 'none'}
- Portfolio allocation: Equity ${allocation.equity}%, Debt ${allocation.debt}%, Gold ${allocation.gold}%

Generate 2-3 specific investment decisions based on this profile.
Return JSON array:
[{"symbol":"FUND_CODE","name":"Full Fund Name","action":"buy","quantity":1,"price":AMOUNT_IN_INR,"reason":"specific reason referencing their data","confidence":"high|medium|low"}]

Rules:
- Use real Indian fund names (UTI Nifty 50, Parag Parikh Flexi Cap, HDFC Short Duration, SGB, etc.)
- price = recommended SIP/lump sum amount in INR
- quantity is always 1 (units for MF)
- Total across all decisions should not exceed ₹${Math.round(availableSavings * 0.4)}
- Equity investable: ₹${investablePerAsset.equity}, Debt: ₹${investablePerAsset.debt}, Gold: ₹${investablePerAsset.gold}
- Reason must reference their specific spending pattern or goal`,
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const parsed = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? '[]')
      if (Array.isArray(parsed) && parsed.length > 0) decisions = parsed
    } catch {
      // use fallback
    }

    // Save decisions to DB
    const saved = await Promise.all(
      decisions.map(d =>
        prisma.aIAgentDecision.create({
          data: {
            user_id,
            symbol: d.symbol,
            name: d.name,
            action: d.action,
            quantity: d.quantity || 1,
            price: d.price,
            reason: d.reason,
            confidence: d.confidence,
            status: 'pending',
          },
        })
      )
    )

    return Response.json({ count: saved.length, decisions: saved })
  } catch (error) {
    console.error('agent analyze error:', error)
    return Response.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
