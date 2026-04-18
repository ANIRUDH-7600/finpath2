import { groq, MODEL } from '@/lib/groq'
import { geminiClient, GEMINI_MODEL } from '@/lib/gemini'
import type { SmartBuyResult, ProductRecommendation } from '@/types'

interface UserFinancials {
  monthly_income: number
  monthly_spending: number
  health_score: number
  savings_rate: number
  active_goals: Array<{ title: string; daily_save_required: number }>
}

// ── Financial advice via Groq (fast) ────────────────────────────────────────
async function getFinancialAdvice(
  query: string,
  budget: number,
  category: string,
  f: UserFinancials
) {
  const budgetPct = f.monthly_income > 0 ? Math.round((budget / f.monthly_income) * 100) : 0
  const goalsText = f.active_goals.length > 0
    ? f.active_goals.map(g => `${g.title} (needs ₹${g.daily_save_required}/day)`).join('; ')
    : 'No active goals'

  try {
    const r = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a strict Indian personal finance advisor. Return ONLY valid JSON.',
        },
        {
          role: 'user',
          content: `User wants to buy: "${query}" (${category}) for ₹${budget}
Monthly income: ₹${f.monthly_income} | Monthly spending: ₹${f.monthly_spending}
Financial health score: ${f.health_score}/100 | Savings rate: ${f.savings_rate}%
Active goals: ${goalsText}
This purchase = ${budgetPct}% of monthly income.

Return:
{
  "decision": "buy" | "wait" | "skip",
  "severity": "green" | "yellow" | "red",
  "financial_verdict": "one concise sentence",
  "goal_impact": "one sentence on goal effect",
  "days_delayed": <integer>
}`,
        },
      ],
    })
    return JSON.parse(r.choices[0].message.content ?? '{}')
  } catch {
    const pct = budget / (f.monthly_income || 50000)
    return {
      decision: pct < 0.05 ? 'buy' : pct < 0.15 ? 'wait' : 'skip',
      severity: pct < 0.05 ? 'green' : pct < 0.15 ? 'yellow' : 'red',
      financial_verdict: `This purchase is ${Math.round(pct * 100)}% of your monthly income.`,
      goal_impact: 'Unable to calculate goal impact.',
      days_delayed: 0,
    }
  }
}

// ── Real internet product search via Gemini 2.0 Flash + Google Search ───────
async function searchRealProducts(
  query: string,
  budget: number,
  category: string
): Promise<{ products: ProductRecommendation[]; sources: string[] }> {
  // Gemini 2.0 Flash has native Google Search grounding
  const model = geminiClient.getGenerativeModel({
    model: GEMINI_MODEL,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ googleSearch: {} } as any],
  })

  const prompt = `Search Google Shopping and e-commerce sites right now for "${query}" available to buy in India under ₹${budget}.

Look across Amazon India, Flipkart, Myntra, Meesho, AJIO, Croma, and any other Indian shopping site.

Find the 4 best options and return ONLY a JSON array (no markdown, no extra text):
[
  {
    "name": "Brand + exact model name",
    "price": 1999,
    "platform": "Flipkart",
    "url": "https://actual-product-url-if-found",
    "specs": "one key spec or variant info",
    "why": "one line reason this is the best pick at this price"
  }
]

Only include products under ₹${budget}. Use real current prices from search results.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Extract sources from grounding metadata
  const candidates = result.response.candidates ?? []
  const sources: string[] = []
  for (const candidate of candidates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (candidate as any).groundingMetadata
    if (meta?.groundingChunks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const chunk of meta.groundingChunks as any[]) {
        if (chunk?.web?.uri) sources.push(chunk.web.uri)
        if (chunk?.web?.title) sources.push(chunk.web.title)
      }
    }
  }

  // Parse JSON from response (handle markdown fences)
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]) as ProductRecommendation[]
      return { products: Array.isArray(parsed) ? parsed : [], sources }
    } catch {
      // fall through
    }
  }

  // If Gemini didn't return JSON cleanly, ask Groq to extract it from the prose
  try {
    const extraction = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Extract product data from text. Return ONLY valid JSON.' },
        {
          role: 'user',
          content: `Extract up to 4 products from this text about "${query}" in India under ₹${budget}:

${text.slice(0, 1500)}

Return: {"products": [{"name":"...","price":0,"platform":"...","specs":"...","why":"..."}]}`,
        },
      ],
    })
    const parsed = JSON.parse(extraction.choices[0].message.content ?? '{}')
    return { products: parsed.products ?? [], sources }
  } catch {
    return { products: [], sources }
  }
}

// ── Main export ──────────────────────────────────────────────────────────────
export async function getSmartRecommendation(
  query: string,
  budget: number,
  category: string,
  userFinancials: UserFinancials
): Promise<SmartBuyResult> {
  const budgetPct =
    userFinancials.monthly_income > 0
      ? Math.round((budget / userFinancials.monthly_income) * 100)
      : 0

  const searchQ = encodeURIComponent(`${query} under ${budget}`)

  // Financial advice + real product search run in parallel
  const [financial, { products, sources }] = await Promise.all([
    getFinancialAdvice(query, budget, category, userFinancials),
    searchRealProducts(query, budget, category).catch(() => ({ products: [] as ProductRecommendation[], sources: [] as string[] })),
  ])

  return {
    decision: (financial.decision ?? 'wait') as 'buy' | 'wait' | 'skip',
    severity: (financial.severity ?? 'yellow') as 'green' | 'yellow' | 'red',
    financial_verdict: financial.financial_verdict ?? `This is ${budgetPct}% of your monthly income.`,
    goal_impact: financial.goal_impact ?? 'Could not calculate goal impact.',
    days_delayed: financial.days_delayed ?? 0,
    affordability_pct: budgetPct,
    products,
    sources,
    search_links: {
      flipkart: `https://www.flipkart.com/search?q=${searchQ}`,
      amazon: `https://www.amazon.in/s?k=${searchQ}`,
    },
  }
}
