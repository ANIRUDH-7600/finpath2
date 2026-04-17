import { NextRequest, NextResponse } from 'next/server'
import { claude } from '@/lib/claude'

interface WatchlistItem {
  id: string
  name: string
  type: 'stock' | 'mf' | 'etf'
  returns: number
}

const FALLBACK = {
  analysis: `Your watchlist shows a mix of instruments. For a balanced Indian portfolio, consider:
- Large cap stocks provide stability with moderate growth (8-15% expected)
- Flexi cap mutual funds offer diversification with inflation-beating returns
- Gold ETFs (5-10% allocation) hedge against rupee depreciation
- Maintain 3-6 months emergency fund before investing aggressively
Review your risk tolerance and investment horizon before committing capital.`,
}

export async function POST(req: NextRequest) {
  try {
    const { watchlist } = (await req.json()) as { watchlist: WatchlistItem[] }

    if (!watchlist?.length) {
      return NextResponse.json({ error: 'Empty watchlist' }, { status: 400 })
    }

    const portfolioSummary = watchlist
      .map((item) => `${item.name} (${item.type.toUpperCase()}, ${item.returns >= 0 ? '+' : ''}${item.returns}% returns)`)
      .join(', ')

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `Analyze this Indian investment watchlist and give 3-4 concise, actionable insights. Be specific about Indian market context, risks, and if the portfolio is diversified.

Watchlist: ${portfolioSummary}

Return ONLY plain text insights, no markdown, no headers. Max 150 words.`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : null
    if (!text) return NextResponse.json(FALLBACK)

    return NextResponse.json({ analysis: text })
  } catch (error) {
    console.error('investments/analyze error:', error)
    return NextResponse.json(FALLBACK)
  }
}
