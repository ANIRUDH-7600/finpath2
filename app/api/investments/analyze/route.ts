import { NextRequest, NextResponse } from 'next/server'
import { claude, CLAUDE_MODEL } from '@/lib/claude'

interface WatchlistItem {
  id: string
  name: string
  type: 'stock' | 'mf' | 'etf'
  returns: number
}

interface MarketContext {
  nifty_pe?: number
  nifty_current?: number
  repo_rate?: number
  inflation?: number
  sentiment?: string
}

const FALLBACK = {
  analysis: `Your watchlist shows a mix of Indian instruments. For a balanced portfolio consider: large cap stability through index funds, flexi cap for dynamic allocation, and 5-10% gold for rupee hedging. Maintain a 3-6 month emergency fund before investing aggressively. Review your risk tolerance before committing capital.`,
}

export async function POST(req: NextRequest) {
  try {
    const { watchlist, market } = (await req.json()) as { watchlist: WatchlistItem[]; market?: MarketContext }

    if (!watchlist?.length) {
      return NextResponse.json({ error: 'Empty watchlist' }, { status: 400 })
    }

    const portfolioSummary = watchlist
      .map((item) => `${item.name} (${item.type.toUpperCase()}, ${item.returns >= 0 ? '+' : ''}${item.returns}% returns)`)
      .join(', ')

    const marketContext = market
      ? `\nLIVE MARKET: Nifty ${market.nifty_current?.toLocaleString('en-IN')} | PE ${market.nifty_pe} | Repo ${market.repo_rate}% | CPI ${market.inflation}% | Sentiment: ${market.sentiment}`
      : ''

    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 350,
      messages: [
        {
          role: 'user',
          content: `You are a SEBI-aligned Indian investment advisor. Analyze this watchlist and give 3-4 sharp, specific insights. Reference actual returns, current market PE, and Indian market context. No generic advice.
${marketContext}

Watchlist: ${portfolioSummary}

Return plain text only, no markdown, no bullet symbols. Max 120 words. Be direct and specific.`,
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
