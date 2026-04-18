import { claude, CLAUDE_MODEL } from '@/lib/claude'
import type { MacroData } from '@/lib/services/market-data'

export interface UserProfile {
  riskScore: number
  monthlyIncome: number
  monthlySavings: number
  age: number
  existingInvestments?: number
  goals: { type: string; timeframe: number; amount: number; monthly_sip?: number }[]
}

interface PortfolioAllocation {
  equity: number
  debt: number
  gold: number
  cash: number
}

export interface FundRecommendation {
  name: string
  category: string
  allocation: number
  amount: number
}

export interface OptimizedPortfolio {
  allocation: PortfolioAllocation
  funds: FundRecommendation[]
  sipAmount: number
  reasoning: string
  macroNote: string
  expectedReturns: { conservative: number; expected: number; optimistic: number }
  rebalanceFrequency: string
}

// ── Deterministic allocation tables ────────────────────────────────────────
const BASE_ALLOCATIONS: Record<number, PortfolioAllocation> = {
  1: { equity: 20, debt: 55, gold: 20, cash: 5 },
  2: { equity: 35, debt: 45, gold: 15, cash: 5 },
  3: { equity: 50, debt: 30, gold: 15, cash: 5 },
  4: { equity: 70, debt: 15, gold: 10, cash: 5 },
  5: { equity: 85, debt:  5, gold:  8, cash: 2 },
}

function normalize(a: PortfolioAllocation): PortfolioAllocation {
  const total = a.equity + a.debt + a.gold + a.cash
  const equity = Math.round((a.equity / total) * 100)
  const debt   = Math.round((a.debt   / total) * 100)
  const gold   = Math.round((a.gold   / total) * 100)
  const cash   = 100 - equity - debt - gold
  return { equity, debt, gold, cash }
}

function adjustForMarket(a: PortfolioAllocation, macro: MacroData): PortfolioAllocation {
  const adj = { ...a }
  // Nifty PE signal
  if (macro.niftyPE > 25) {
    adj.equity = Math.max(15, adj.equity * 0.75)
    adj.debt   = Math.min(65, adj.debt + 10)
    adj.gold   = Math.min(25, adj.gold + 5)
  } else if (macro.niftyPE < 18) {
    adj.equity = Math.min(90, adj.equity * 1.2)
    adj.debt   = Math.max(5,  adj.debt - 5)
  }
  // Sentiment
  if (macro.sentiment.label === 'bullish') adj.equity = Math.min(90, adj.equity + 5)
  if (macro.sentiment.label === 'bearish') { adj.equity = Math.max(15, adj.equity - 10); adj.gold = Math.min(25, adj.gold + 5) }
  // Inflation
  if (macro.inflation > 6) { adj.gold = Math.min(25, adj.gold + 5); adj.equity = Math.min(90, adj.equity + 3) }
  // High repo rate → debt is attractive
  if (macro.repoRate >= 6.5) adj.debt = Math.min(60, adj.debt + 3)
  return normalize(adj)
}

function adjustForGoals(a: PortfolioAllocation, user: UserProfile): PortfolioAllocation {
  const adj = { ...a }
  if (user.goals.some(g => g.timeframe < 36)) {
    adj.equity = Math.max(20, adj.equity * 0.65)
    adj.debt   = Math.min(70, adj.debt + 15)
  }
  if (user.age > 50) {
    adj.equity = Math.max(25, adj.equity * 0.7)
    adj.debt   = Math.min(60, adj.debt + 15)
  }
  return normalize(adj)
}

function calculateSIP(user: UserProfile): number {
  // Sum goal SIPs if available, else fallback to income ratio
  const goalSIPTotal = user.goals.reduce((s, g) => s + (g.monthly_sip ?? 0), 0)
  if (goalSIPTotal > 0) return goalSIPTotal
  const ratio = user.riskScore <= 2 ? 0.25 : user.riskScore <= 4 ? 0.35 : 0.45
  return Math.round(user.monthlySavings * ratio)
}

function calculateReturns(a: PortfolioAllocation, macro: MacroData) {
  const equityReturn = macro.niftyPE < 18 ? 14 : macro.niftyPE > 25 ? 10 : 12
  const debtReturn   = macro.repoRate > 6 ? 8.5 : 7.5
  const exp = (a.equity * equityReturn + a.debt * debtReturn + a.gold * 10 + a.cash * 4) / 100
  return {
    conservative: Math.round((exp - 2) * 10) / 10,
    expected:     Math.round(exp * 10) / 10,
    optimistic:   Math.round((exp + 3) * 10) / 10,
  }
}

function getRebalanceFrequency(a: PortfolioAllocation): string {
  return a.equity > 60 ? 'Quarterly' : a.equity > 30 ? 'Half-Yearly' : 'Yearly'
}

// ── Fallback fund list (used when Claude fails) ────────────────────────────
function getFallbackFunds(a: PortfolioAllocation, sipAmount: number, macro: MacroData): FundRecommendation[] {
  const funds: FundRecommendation[] = []

  if (a.equity > 0) {
    const amt = Math.round(sipAmount * a.equity / 100)
    const bearish = macro.niftyPE > 25 || macro.sentiment.label === 'bearish'
    if (bearish) {
      funds.push({ name: 'SBI Bluechip Fund - Direct Growth',       category: 'Equity', allocation: 60, amount: Math.round(amt * 0.6) })
      funds.push({ name: 'Parag Parikh Flexi Cap Fund',             category: 'Equity', allocation: 40, amount: Math.round(amt * 0.4) })
    } else {
      funds.push({ name: 'UTI Nifty 50 Index Fund - Direct Growth', category: 'Equity', allocation: 40, amount: Math.round(amt * 0.4) })
      funds.push({ name: 'Parag Parikh Flexi Cap Fund',             category: 'Equity', allocation: 40, amount: Math.round(amt * 0.4) })
      funds.push({ name: 'Motilal Oswal Midcap Fund',               category: 'Equity', allocation: 20, amount: Math.round(amt * 0.2) })
    }
  }
  if (a.debt > 0) {
    const amt = Math.round(sipAmount * a.debt / 100)
    funds.push({
      name: macro.repoRate > 6.5 ? 'HDFC Short Duration Fund' : 'ICICI Prudential Corporate Bond Fund',
      category: 'Debt', allocation: 100, amount: amt,
    })
  }
  if (a.gold > 0) {
    const amt = Math.round(sipAmount * a.gold / 100)
    funds.push({
      name: macro.inflation > 6 ? 'Sovereign Gold Bond (SGB)' : 'Nippon India Gold ETF',
      category: 'Gold', allocation: 100, amount: amt,
    })
  }
  if (a.cash > 0) {
    const amt = Math.round(sipAmount * a.cash / 100)
    funds.push({ name: 'HDFC Liquid Fund - Direct Growth', category: 'Cash', allocation: 100, amount: amt })
  }
  return funds
}

// ── Claude call with live market injection ─────────────────────────────────
async function getAIRecommendations(
  allocation: PortfolioAllocation,
  sipAmount: number,
  user: UserProfile,
  macro: MacroData,
): Promise<{ funds: FundRecommendation[]; reasoning: string; macroNote: string }> {
  const goalsSummary = user.goals.length > 0
    ? user.goals.map(g => `"${g.type}" ₹${g.amount.toLocaleString('en-IN')} in ${g.timeframe}mo`).join('; ')
    : 'No specific goals'

  const prompt = `You are a SEBI-aligned Indian robo-advisor. A user needs a portfolio.

USER PROFILE:
- Risk score: ${user.riskScore}/5
- Monthly income: ₹${user.monthlyIncome.toLocaleString('en-IN')}
- Monthly SIP budget: ₹${sipAmount.toLocaleString('en-IN')}
- Age: ~${user.age}
- Goals: ${goalsSummary}

LIVE MARKET DATA (fetched right now via Google Search):
- Nifty 50 level: ${macro.niftyLevel}  |  PE ratio: ${macro.niftyPE}
- RBI Repo Rate: ${macro.repoRate}%
- CPI Inflation: ${macro.inflation}%
- Market sentiment: ${macro.sentiment.label}
- Market signal: ${macro.market_signal ?? 'N/A'}
- Action tip: ${macro.action_tip ?? 'Continue SIPs'}

REQUIRED ALLOCATION (already computed, do NOT change these numbers):
Equity ${allocation.equity}%  |  Debt ${allocation.debt}%  |  Gold ${allocation.gold}%  |  Cash ${allocation.cash}%

Return ONLY valid JSON (no markdown):
{
  "funds": [
    { "name": "exact real Indian fund name", "category": "Equity", "allocation": 60, "amount": 0 },
    { "name": "...", "category": "Equity", "allocation": 40, "amount": 0 }
  ],
  "reasoning": "2-3 sentences referencing actual PE (${macro.niftyPE}), repo rate (${macro.repoRate}%), user goals, and why this allocation",
  "macroNote": "1 crisp sentence: what the current market signal means for this user right now"
}

Rules:
- funds[].allocation values for each category must sum to 100 within that category
- funds[].amount = sipAmount × (category_allocation/100) × (fund_allocation_within_category/100), round to nearest ₹10
- Use real fund names: UTI Nifty 50 Index Fund, Parag Parikh Flexi Cap, HDFC Short Duration, SBI Bluechip, Motilal Oswal Midcap, Quant Small Cap, ICICI Pru Corporate Bond, Nippon Gold ETF, Sovereign Gold Bond, Mirae Asset Emerging Bluechip, HDFC Liquid Fund
- If Nifty PE > 25 prefer large cap / flexi cap; if PE < 18 add midcap; if inflation > 6 use SGB over ETF`

  try {
    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 700,
      system: 'You are a SEBI-aligned robo-advisor. Return ONLY raw valid JSON — no markdown, no backticks.',
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text)
    return {
      funds: parsed.funds ?? [],
      reasoning: parsed.reasoning ?? '',
      macroNote: parsed.macroNote ?? '',
    }
  } catch {
    // Fallback: generate reasoning from deterministic logic, hardcoded funds
    const parts: string[] = []
    if (user.riskScore <= 2) parts.push('Conservative allocation prioritising capital preservation')
    else if (user.riskScore <= 4) parts.push('Balanced allocation for steady wealth creation')
    else parts.push('Aggressive equity-heavy portfolio for maximum long-term growth')
    if (macro.niftyPE > 25) parts.push(`Nifty at elevated PE of ${macro.niftyPE} — equity exposure trimmed, SIP staggering advised`)
    else if (macro.niftyPE < 18) parts.push(`Attractive Nifty valuation (PE ${macro.niftyPE}) — equity allocation increased`)
    if (macro.sentiment.label === 'bearish') parts.push('Bearish market hedged with extra gold and debt')
    if (macro.inflation > 6) parts.push(`High inflation (${macro.inflation}%) → increased gold for protection`)

    const macroNote = macro.niftyPE > 25
      ? `Markets are expensive (PE ${macro.niftyPE}) — stagger your SIPs and avoid lumpsum equity.`
      : macro.niftyPE < 18
        ? `Nifty PE at ${macro.niftyPE} signals good value — ideal time to increase equity SIPs.`
        : `Fair valuations (PE ${macro.niftyPE}), RBI rate ${macro.repoRate}% — continue systematic SIPs.`

    return {
      funds: getFallbackFunds(allocation, sipAmount, macro),
      reasoning: parts.join('. ') + '.',
      macroNote,
    }
  }
}

// ── Main optimizer class ───────────────────────────────────────────────────
class PortfolioOptimizer {
  async optimize(user: UserProfile, macro: MacroData): Promise<OptimizedPortfolio> {
    const base       = BASE_ALLOCATIONS[user.riskScore] ?? BASE_ALLOCATIONS[3]
    const mktAdj     = adjustForMarket(base, macro)
    const allocation = adjustForGoals(mktAdj, user)
    const sipAmount  = calculateSIP(user)

    const { funds, reasoning, macroNote } = await getAIRecommendations(allocation, sipAmount, user, macro)

    return {
      allocation,
      funds,
      sipAmount,
      reasoning,
      macroNote,
      expectedReturns:   calculateReturns(allocation, macro),
      rebalanceFrequency: getRebalanceFrequency(allocation),
    }
  }
}

export const portfolioOptimizer = new PortfolioOptimizer()
