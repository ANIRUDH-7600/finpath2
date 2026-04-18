// app/api/portfolio/generate/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groq } from '@ai-sdk/groq'
import { generateText } from 'ai'

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 })
    }

    // Get user data
    const [user, transactions, goals, currentPortfolio] = await Promise.all([
      prisma.user.findUnique({ where: { id: user_id } }),
      prisma.transaction.findMany({
        where: { user_id },
        orderBy: { date: 'desc' },
        take: 100,
      }),
      prisma.goal.findMany({ where: { user_id, status: 'active' } }),
      prisma.portfolioProfile.findUnique({ where: { user_id } }),
    ])

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate financial metrics
    const monthlyIncome = user.monthly_income || 50000
    const typedTransactions = transactions as Array<{
      date: Date | string
      amount: number
      category: string
    }>

    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const monthlySpending = typedTransactions
      .filter((t: { date: Date | string }) => String(t.date).startsWith(monthKey))
      .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)
    const savingsRate = ((monthlyIncome - monthlySpending) / monthlyIncome) * 100
    
    // Get category breakdown
    const categorySpending: Record<string, number> = {}
    typedTransactions.forEach((t: { category: string; amount: number }) => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount
    })
    
    const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0]

    // Use Groq to determine risk appetite and portfolio
    const prompt = `You are a SEBI-registered robo-advisor. Analyze this Indian user's financial profile and recommend a portfolio.

USER FINANCIAL DATA:
- Monthly Income: ₹${monthlyIncome}
- Monthly Spending: ₹${monthlySpending}
- Savings Rate: ${savingsRate.toFixed(1)}%
- Top Spending Category: ${topCategory?.[0] || 'Unknown'} (₹${topCategory?.[1] || 0})
- Active Goals: ${goals.length} (${goals.map((g: { title: string }) => g.title).join(', ') || 'none'})
- Current Portfolio: ${currentPortfolio ? 'Exists' : 'None'}

Return ONLY valid JSON:
{
  "risk_score": number (1-5),
  "risk_label": "Conservative" or "Moderate" or "Aggressive",
  "allocation": {
    "equity": number,
    "debt": number,
    "gold": number,
    "cash": number
  },
  "monthly_sip": number,
  "funds": [
    { "name": "Indian fund name", "category": "equity/debt/gold", "allocation": number }
  ],
  "reasoning": "2-3 sentences explaining why this portfolio fits",
  "action_needed": "What user should do next"
}

Rules:
- Equity + Debt + Gold + Cash = 100
- Higher savings rate = more aggressive
- If savings rate < 10%, recommend conservative
- Use real Indian fund names (SBI Bluechip, HDFC Balanced, etc.)
- Monthly SIP should be 20-40% of savings`

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: prompt,
      temperature: 0.3,
      maxOutputTokens: 800,
    })

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    const recommendation = JSON.parse(cleaned)

    // Save recommendation to database
    await prisma.portfolioProfile.upsert({
      where: { user_id },
      update: {
        risk_score: recommendation.risk_score,
        allocation: JSON.stringify(recommendation.allocation),
        instruments: JSON.stringify(recommendation.funds),
        sip_amount: recommendation.monthly_sip,
        reasoning: recommendation.reasoning,
        macro_note: recommendation.action_needed,
      },
      create: {
        user_id,
        risk_score: recommendation.risk_score,
        allocation: JSON.stringify(recommendation.allocation),
        instruments: JSON.stringify(recommendation.funds),
        sip_amount: recommendation.monthly_sip,
        reasoning: recommendation.reasoning,
        macro_note: recommendation.action_needed,
      },
    })

    // Also update user's risk appetite
    await prisma.user.update({
      where: { id: user_id },
      data: { risk_appetite: recommendation.risk_score },
    })

    // Calculate blended expected returns from allocation
    const alloc = recommendation.allocation ?? {}
    const equityReturn = 12
    const debtReturn = 8
    const goldReturn = 10
    const cashReturn = 4
    const blended = ((alloc.equity ?? 0) * equityReturn + (alloc.debt ?? 0) * debtReturn + (alloc.gold ?? 0) * goldReturn + (alloc.cash ?? 0) * cashReturn) / 100
    const expectedReturns = {
      conservative: Math.round((blended - 2) * 10) / 10,
      expected: Math.round(blended * 10) / 10,
      optimistic: Math.round((blended + 3) * 10) / 10,
    }

    // Enrich funds with per-fund SIP amounts
    const fundsWithAmounts = (recommendation.funds ?? []).map((f: { name: string; category: string; allocation: number; amount?: number }) => ({
      ...f,
      amount: f.amount ?? Math.round((recommendation.monthly_sip ?? 0) * (f.allocation / 100)),
    }))

    return Response.json({
      success: true,
      portfolio: {
        risk_score: recommendation.risk_score,
        risk_label: recommendation.risk_label,
        allocation: recommendation.allocation,
        monthly_sip: recommendation.monthly_sip,
        funds: fundsWithAmounts,
        reasoning: recommendation.reasoning,
        action_needed: recommendation.action_needed,
        expected_returns: expectedReturns,
      },
    })
  } catch (error) {
    console.error('Portfolio generation error:', error)
    return Response.json({ error: 'Failed to generate portfolio' }, { status: 500 })
  }
}