import { NextRequest } from 'next/server'
import { getMacroInsight, getBehavioralDeepInsight } from '@/lib/agents/macro'

export async function GET() {
  try {
    const insight = await getMacroInsight()
    return Response.json(insight)
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
