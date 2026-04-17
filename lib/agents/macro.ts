import { geminiClient, GEMINI_MODEL } from '@/lib/gemini'

export interface MacroInsight {
  market_outlook: string
  rbi_note: string
  action_tip: string
  sentiment: 'bullish' | 'neutral' | 'cautious'
}

const FALLBACK: MacroInsight = {
  market_outlook:
    'Nifty 50 consolidating near highs, mid-caps showing strong momentum driven by domestic inflows and improving corporate earnings.',
  rbi_note:
    'RBI holding rates steady; inflation cooling toward 4% target — supports gradual rate cuts in H2 2026.',
  action_tip:
    'Start or top-up a SIP in a Nifty 50 index fund — consistent investing beats market timing.',
  sentiment: 'neutral',
}

export async function getMacroInsight(): Promise<MacroInsight> {
  if (!process.env.GEMINI_API_KEY) return FALLBACK

  try {
    const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL })

    const result = await model.generateContent(
      `You are a macro-economic analyst for Indian retail investors writing in April 2026.
Provide a brief, factual macro outlook. Return ONLY valid JSON — no markdown, no backticks.
Exact shape: {"market_outlook":"2 sentences on Indian equity/debt markets","rbi_note":"1 sentence on RBI monetary policy","action_tip":"1 actionable tip for Indian retail investors","sentiment":"bullish|neutral|cautious"}`
    )

    const text = result.response.text().trim()
    const parsed = JSON.parse(text) as MacroInsight
    return parsed
  } catch {
    return FALLBACK
  }
}

export interface BehavioralDeepInsight {
  emotional_spend_risk: 'low' | 'medium' | 'high'
  biggest_leak_category: string
  weekly_burn_rate: number
  savings_potential: number
  behavioral_tip: string
}

const BEHAVIORAL_FALLBACK: BehavioralDeepInsight = {
  emotional_spend_risk: 'medium',
  biggest_leak_category: 'Food & Dining',
  weekly_burn_rate: 0,
  savings_potential: 0,
  behavioral_tip: 'Track every purchase for 7 days — awareness alone reduces spend by 15%.',
}

export async function getBehavioralDeepInsight(
  categories: Record<string, number>,
  monthlyIncome: number
): Promise<BehavioralDeepInsight> {
  if (!process.env.GEMINI_API_KEY) return BEHAVIORAL_FALLBACK

  try {
    const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL })
    const spendSummary = Object.entries(categories)
      .map(([k, v]) => `${k}: ₹${v}`)
      .join(', ')

    const result = await model.generateContent(
      `You are a behavioral finance AI for Indian users.
Monthly income: ₹${monthlyIncome}. Spending: ${spendSummary}.
Analyze emotional spending patterns and return ONLY valid JSON — no markdown.
Shape: {"emotional_spend_risk":"low|medium|high","biggest_leak_category":"string","weekly_burn_rate":number,"savings_potential":number,"behavioral_tip":"1 specific actionable sentence"}`
    )

    const text = result.response.text().trim()
    return JSON.parse(text) as BehavioralDeepInsight
  } catch {
    return BEHAVIORAL_FALLBACK
  }
}
