// app/api/portfolio-suggest/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { portfolioOptimizer } from '@/lib/agents/portfolio-optimizer'
import { marketData } from '@/lib/services/market-data'

export async function POST(req: NextRequest) {
  try {
    const { user_id, risk_score, monthly_income, monthly_savings } = await req.json()

    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 })
    }

    // Get user details including goals
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: { goals: true }
    })

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Get real-time market data and sentiment
    const macro = await marketData.getMacroData()

    // Get AI-optimized portfolio
    const userProfile = {
      riskScore: risk_score || user.risk_appetite,
      monthlyIncome: monthly_income || user.monthly_income,
      monthlySavings: monthly_savings || (user.monthly_income * 0.3),
      age: 30, // Add to schema later
      existingInvestments: 0,
      goals: user.goals
        .filter((g: typeof user.goals[0]) => g.status === 'active')
        .map((g: typeof user.goals[0]) => ({
          type: g.title,
          timeframe: g.deadline_months,
          amount: g.inflation_adjusted ?? g.target_amount,
          monthly_sip: g.monthly_sip ?? undefined,
        }))
    }

    const portfolio = await portfolioOptimizer.optimize(userProfile, macro)

    // Save to database
    await prisma.portfolioProfile.upsert({
      where: { user_id },
      update: {
        risk_score: userProfile.riskScore,
        allocation: JSON.stringify(portfolio.allocation),
        instruments: JSON.stringify(portfolio.funds),
        sip_amount: portfolio.sipAmount,
        reasoning: portfolio.reasoning,
        macro_note: portfolio.macroNote
      },
      create: {
        user_id,
        risk_score: userProfile.riskScore,
        allocation: JSON.stringify(portfolio.allocation),
        instruments: JSON.stringify(portfolio.funds),
        sip_amount: portfolio.sipAmount,
        reasoning: portfolio.reasoning,
        macro_note: portfolio.macroNote
      }
    })

    // instruments: { equity: ["Fund A", "Fund B"], debt: [...] }
    const instruments = portfolio.funds.reduce((acc, f) => {
      const key = f.category.toLowerCase()
      if (!acc[key]) acc[key] = []
      acc[key].push(f.name)
      return acc
    }, {} as Record<string, string[]>)

    // funds_detail: full objects with amounts for per-fund breakdown
    return Response.json({
      allocation: portfolio.allocation,
      instruments,
      funds_detail: portfolio.funds,
      sip_amount: portfolio.sipAmount,
      reasoning: portfolio.reasoning,
      macro_note: portfolio.macroNote,
      expected_returns: portfolio.expectedReturns,
      rebalance: portfolio.rebalanceFrequency,
      nifty_pe: macro.niftyPE,
      nifty_level: macro.niftyLevel,
      repo_rate: macro.repoRate,
      inflation: macro.inflation,
      sentiment: macro.sentiment.label,
      market_signal: macro.market_signal,
    })
  } catch (error) {
    console.error('Portfolio error:', error)
    return Response.json({ error: 'Failed to generate portfolio' }, { status: 500 })
  }
}