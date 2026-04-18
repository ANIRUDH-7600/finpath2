import { NextRequest } from 'next/server'
import { getMacroInsight, getBehavioralDeepInsight } from '@/lib/agents/macro'
import { marketData } from '@/lib/services/market-data'

export async function GET() {
  try {
    const [insight, macro] = await Promise.all([
      getMacroInsight(),
      marketData.getMacroData(),
    ])
    return Response.json({
      ...insight,
      nifty_level: macro.niftyLevel,
      nifty_pe: macro.niftyPE,
      repo_rate: macro.repoRate,
      inflation: macro.inflation,
      sentiment: macro.sentiment.label,
      market_signal: macro.market_signal,
      action_tip: macro.action_tip ?? insight.action_tip,
    })
  } catch (error) {
    console.error('macro GET error:', error)
    return Response.json({ error: 'Macro insight failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { categories, monthly_income } = await req.json()
    const insight = await getBehavioralDeepInsight(categories ?? {}, monthly_income ?? 0)
    return Response.json(insight)
  } catch (error) {
    console.error('macro POST error:', error)
    return Response.json({ error: 'Behavioral analysis failed' }, { status: 500 })
  }
}
