import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { claude, CLAUDE_MODEL } from '@/lib/claude'

function sipFV(monthly: number, annualReturn: number, months: number): number {
  if (months <= 0) return 0
  const r = annualReturn / 100 / 12
  if (r === 0) return monthly * months
  return monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r)
}

function monthsSince(startDate: string): number {
  const [y, m] = startDate.split('-').map(Number)
  const start = new Date(y, (m || 1) - 1, 1)
  const now = new Date()
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()))
}

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id')
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 })

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const monthKey = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`

    const [user, sipsRaw, emisRaw, transactions, goals] = await Promise.all([
      prisma.user.findUnique({ where: { id: user_id }, select: { monthly_income: true, risk_appetite: true } }),
      prisma.sip.findMany({ where: { user_id }, orderBy: { created_at: 'desc' } }),
      prisma.emi.findMany({ where: { user_id }, orderBy: { created_at: 'desc' } }),
      prisma.transaction.findMany({
        where: { user_id, date: { startsWith: monthKey } },
        select: { amount: true, category: true },
      }),
      prisma.goal.findMany({ where: { user_id, status: 'active' }, orderBy: { created_at: 'asc' }, take: 3 }),
    ])
    const sips = sipsRaw.map(s => ({ ...s, monthly_amount: Number(s.monthly_amount), expected_return: Number(s.expected_return) }))
    const emis = emisRaw.map(e => ({ ...e, emi_amount: Number(e.emi_amount), remaining_months: Number(e.remaining_months) }))

    const income = user?.monthly_income ?? 0
    const expenses = transactions.reduce((s, t) => s + t.amount, 0)
    const totalEMI = emis.reduce((s, e) => s + e.emi_amount, 0)
    const totalSIP = sips.reduce((s, s2) => s + s2.monthly_amount, 0)
    const netInvestable = income - expenses - totalEMI - totalSIP
    const commitmentRatio = income > 0 ? (totalEMI + totalSIP) / income : 0

    // SIP projections
    const sipProjections = sips.map(sip => {
      const elapsed = monthsSince(sip.start_date)
      const currentValue = Math.round(sipFV(sip.monthly_amount, sip.expected_return, elapsed))
      const value12m = Math.round(sipFV(sip.monthly_amount, sip.expected_return, elapsed + 12))
      const totalInvested = sip.monthly_amount * elapsed
      return { ...sip, months_elapsed: elapsed, current_value: currentValue, value_12m: value12m, total_invested: Math.round(totalInvested), gain: currentValue - Math.round(totalInvested) }
    })

    // EMI analysis
    const emiAnalysis = emis.map(emi => {
      const totalRemaining = emi.emi_amount * emi.remaining_months
      const opportunityCost = Math.round(sipFV(emi.emi_amount, 12, emi.remaining_months) - totalRemaining)
      const pctOfIncome = income > 0 ? Math.round((emi.emi_amount / income) * 100) : 0
      return { ...emi, total_remaining: Math.round(totalRemaining), opportunity_cost: opportunityCost, pct_of_income: pctOfIncome }
    })

    // Goal timeline impact
    const goalImpacts = goals.map(g => {
      const gap = g.target_amount - g.current_savings
      if (gap <= 0) return { id: g.id, title: g.title, months_without_sip: 0, months_with_sip: 0, acceleration: 0 }
      const monthlyWithoutSIP = Math.max(1, netInvestable + totalSIP)
      const monthlySIPReturn = totalSIP * 0.01
      const monthlyWithSIP = Math.max(1, netInvestable + monthlySIPReturn)
      const withoutSIP = Math.ceil(gap / monthlyWithoutSIP)
      const withSIP = Math.ceil(gap / monthlyWithSIP)
      return { id: g.id, title: g.title, months_without_sip: withoutSIP, months_with_sip: withSIP, acceleration: withoutSIP - withSIP }
    })

    // Alerts
    const alerts: { type: string; severity: 'warning' | 'danger' | 'info'; message: string }[] = []
    if (commitmentRatio > 0.7) alerts.push({ type: 'overloaded', severity: 'danger', message: `EMI + SIP = ${Math.round(commitmentRatio * 100)}% of income — dangerously high` })
    else if (commitmentRatio > 0.6) alerts.push({ type: 'overloaded', severity: 'warning', message: `EMI + SIP = ${Math.round(commitmentRatio * 100)}% of income — approaching limit` })
    if (netInvestable < 0) alerts.push({ type: 'negative_flow', severity: 'danger', message: `Monthly shortfall of ₹${Math.abs(Math.round(netInvestable)).toLocaleString('en-IN')} — liabilities exceed income` })
    const inefficientSIPs = sips.filter(s => s.expected_return < 5)
    if (inefficientSIPs.length > 0) alerts.push({ type: 'inefficient_sip', severity: 'warning', message: `${inefficientSIPs.map(s => s.asset_name).join(', ')} — returns below inflation rate` })
    if (sips.length === 0 && netInvestable > 5000) alerts.push({ type: 'no_sip', severity: 'info', message: `₹${Math.round(netInvestable).toLocaleString('en-IN')}/mo is idle — consider starting a SIP` })

    // Claude insights
    let insights: string[] = []
    try {
      const response = await claude.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 250,
        system: 'You are a personal finance coach. Return ONLY a JSON array of 3 short insight strings (under 12 words each). No markdown.',
        messages: [{
          role: 'user',
          content: `Income: ₹${income}/mo | Expenses: ₹${Math.round(expenses)}/mo | EMIs: ₹${Math.round(totalEMI)}/mo | SIPs: ₹${Math.round(totalSIP)}/mo | Net investable: ₹${Math.round(netInvestable)}/mo | Commitment ratio: ${Math.round(commitmentRatio * 100)}% | SIP count: ${sips.length} | EMI count: ${emis.length}. Generate 3 actionable insights.`,
        }],
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
      const parsed = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? '[]')
      if (Array.isArray(parsed)) insights = parsed.slice(0, 3)
    } catch {
      if (commitmentRatio > 0.6) insights.push(`EMI + SIP commitment is high — review liabilities`)
      if (netInvestable > 5000) insights.push(`₹${Math.round(netInvestable).toLocaleString('en-IN')} free monthly — put it to work`)
      if (totalSIP > 0) insights.push(`SIPs are compounding — stay consistent for best results`)
    }

    return Response.json({
      income, expenses: Math.round(expenses), total_emi: Math.round(totalEMI),
      total_sip: Math.round(totalSIP), net_investable: Math.round(netInvestable),
      commitment_ratio: Math.round(commitmentRatio * 100),
      sip_projections: sipProjections, emi_analysis: emiAnalysis,
      goal_impacts: goalImpacts, alerts, insights,
    })
  } catch (error) {
    console.error('cashflow GET error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
