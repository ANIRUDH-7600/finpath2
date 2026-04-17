import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { suggestPortfolio } from '@/lib/agents/portfolio'

export async function POST(req: NextRequest) {
  try {
    const { user_id, risk_score, monthly_income } = await req.json()

    const result = await suggestPortfolio(risk_score, monthly_income)

    await prisma.portfolioProfile.upsert({
      where: { user_id },
      update: {
        risk_score,
        allocation: JSON.stringify(result.allocation),
        instruments: JSON.stringify(result.instruments),
        sip_amount: result.sip_amount,
        reasoning: result.reasoning,
        macro_note: result.macro_note,
      },
      create: {
        user_id,
        risk_score,
        allocation: JSON.stringify(result.allocation),
        instruments: JSON.stringify(result.instruments),
        sip_amount: result.sip_amount,
        reasoning: result.reasoning,
        macro_note: result.macro_note,
      },
    })

    return Response.json(result)
  } catch (error) {
    console.error('portfolio-suggest error:', error)
    return Response.json({ error: 'Portfolio suggestion failed' }, { status: 500 })
  }
}
