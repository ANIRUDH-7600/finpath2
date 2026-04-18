import { claude, CLAUDE_MODEL } from '@/lib/claude'
import type { PortfolioSuggestion } from '@/types'

function getFallback(riskScore: number, income: number): PortfolioSuggestion {
  const sip = Math.round(income * 0.2)
  if (riskScore <= 2) {
    return {
      allocation: { equity: 30, debt: 50, gold: 15, cash: 5 },
      instruments: {
        equity: ['Nifty 50 Index Fund - Direct Growth', 'HDFC Balanced Advantage Fund'],
        debt: ['HDFC Short Term Debt Fund', 'SBI Savings Fund'],
        gold: ['Sovereign Gold Bond 2024', 'Nippon India Gold ETF'],
        cash: ['Paytm Money Liquid Fund', 'HDFC Liquid Fund'],
      },
      sip_amount: sip,
      reasoning:
        'Conservative allocation prioritizing capital preservation with debt-heavy portfolio. Equity exposure through index funds minimizes volatility.',
      macro_note:
        'Indian debt markets remain attractive with RBI maintaining rates; short-duration funds offer stability.',
    }
  }
  if (riskScore <= 3) {
    return {
      allocation: { equity: 55, debt: 30, gold: 10, cash: 5 },
      instruments: {
        equity: ['Parag Parikh Flexi Cap Fund', 'Nifty 50 Index Fund - Direct Growth'],
        debt: ['HDFC Short Term Debt Fund', 'ICICI Prudential Corporate Bond Fund'],
        gold: ['Sovereign Gold Bond 2024', 'Nippon India Gold ETF'],
        cash: ['Paytm Money Liquid Fund', 'Axis Liquid Fund'],
      },
      sip_amount: sip,
      reasoning:
        'Balanced approach with majority equity for growth, debt for stability. Flexi cap exposure allows dynamic allocation across market caps.',
      macro_note:
        'India equity markets show strong fundamentals with GDP growth expected at 6.5%; SIP averaging is ideal in current volatile environment.',
    }
  }
  return {
    allocation: { equity: 75, debt: 15, gold: 5, cash: 5 },
    instruments: {
      equity: ['Parag Parikh Flexi Cap Fund', 'Mirae Asset Emerging Bluechip Fund'],
      debt: ['HDFC Short Term Debt Fund', 'SBI Magnum Ultra Short Duration Fund'],
      gold: ['Sovereign Gold Bond 2024', 'HDFC Gold Fund'],
      cash: ['Paytm Money Liquid Fund', 'ICICI Prudential Liquid Fund'],
    },
    sip_amount: sip,
    reasoning:
      'Aggressive equity-heavy portfolio targeting long-term wealth creation. High allocation to flexi cap and mid-cap for superior returns.',
    macro_note:
      'Mid and small cap valuations remain elevated; systematic investment through SIP helps manage entry risk in a bull market.',
  }
}

export async function suggestPortfolio(
  riskScore: number,
  income: number
): Promise<PortfolioSuggestion> {
  const sip = Math.round(income * 0.2)

  try {
    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 800,
      system:
        'You are a SEBI-aligned robo-advisor for Indian retail investors. Return ONLY raw valid JSON — no markdown, no backticks, no explanation. Return exactly: {"allocation":{"equity":0,"debt":0,"gold":0,"cash":0},"instruments":{"equity":["fund1","fund2"],"debt":["fund1","fund2"],"gold":["fund1","fund2"],"cash":["fund1","fund2"]},"sip_amount":0,"reasoning":"2-3 sentences","macro_note":"1 sentence"}. allocation percentages must sum to 100. Use real Indian fund names like: Nifty 50 Index Fund, Parag Parikh Flexi Cap, HDFC Short Term Debt Fund, Sovereign Gold Bond, Paytm Money Liquid Fund, Mirae Asset Emerging Bluechip, ICICI Prudential Corporate Bond Fund.',
      messages: [
        {
          role: 'user',
          content: `Risk score: ${riskScore}/5, Monthly income: ₹${income}, Suggested SIP: ₹${sip}. Generate a SEBI-aligned portfolio allocation.`,
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text) as PortfolioSuggestion
    return parsed
  } catch {
    return getFallback(riskScore, income)
  }
}
