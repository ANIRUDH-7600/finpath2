// ── Investment profile by timeline ──────────────────────────────────────────
export interface InvestmentProfile {
  equity: number    // % in equity (index funds / large-cap SIP)
  debt: number      // % in debt (liquid / short-term bond)
  annual_return: number   // blended expected annual return
  label: string           // human-readable strategy name
  fund_type: string       // specific fund type recommendation
}

export function getInvestmentProfile(months: number): InvestmentProfile {
  if (months < 6) {
    return { equity: 0, debt: 100, annual_return: 6.5, label: 'Capital Protection', fund_type: 'Liquid Fund / FD' }
  }
  if (months < 12) {
    return { equity: 0, debt: 100, annual_return: 7.5, label: 'Short-term Debt', fund_type: 'Short-Duration Debt Fund' }
  }
  if (months < 36) {
    return { equity: 40, debt: 60, annual_return: 9.0, label: 'Conservative Hybrid', fund_type: '60% Debt + 40% Balanced Advantage Fund' }
  }
  if (months < 84) {
    return { equity: 70, debt: 30, annual_return: 11.5, label: 'Growth (Equity SIP)', fund_type: '70% Nifty 50 Index + 30% Debt Fund SIP' }
  }
  return { equity: 85, debt: 15, annual_return: 13.0, label: 'Aggressive Growth', fund_type: '85% Nifty 50 / Midcap Index SIP' }
}

// ── Core financial math ──────────────────────────────────────────────────────

/**
 * Inflation-adjusted target: how much the goal will actually cost when due.
 * Uses 6% India long-term inflation.
 */
export function inflationAdjustedTarget(target: number, months: number, inflationRate = 0.06): number {
  return Math.round(target * Math.pow(1 + inflationRate, months / 12))
}

/**
 * How much existing savings will grow if invested at expected return.
 */
export function growSavings(savings: number, months: number, annualReturn: number): number {
  return Math.round(savings * Math.pow(1 + annualReturn, months / 12))
}

/**
 * Monthly SIP needed to reach a future value using FV of annuity formula.
 * FV = SIP × ((1+r)^n - 1) / r
 * → SIP = FV × r / ((1+r)^n - 1)
 */
export function monthlySIPForTarget(targetFV: number, months: number, annualReturn: number): number {
  if (months <= 0 || targetFV <= 0) return 0
  const r = Math.pow(1 + annualReturn, 1 / 12) - 1  // monthly rate
  if (r === 0) return Math.round(targetFV / months)
  const n = months
  const sip = (targetFV * r) / (Math.pow(1 + r, n) - 1)
  return Math.max(1, Math.round(sip))
}

// ── Main calculation exported to agent ──────────────────────────────────────
export interface GoalInvestingResult {
  inflation_adjusted_target: number
  savings_grown: number          // current savings grown at expected return
  gap: number                    // gap that SIP needs to fill
  monthly_sip: number
  daily_save: number
  projected_return: number       // annual %
  profile: InvestmentProfile
  feasible: boolean
  percent_of_income: number
  deadline_date: string
  months_remaining: number
}

export function calculateGoalInvesting(
  target: number,
  savings: number,
  months: number,
  income: number
): GoalInvestingResult {
  const profile = getInvestmentProfile(months)
  const adj = inflationAdjustedTarget(target, months)
  const grown = growSavings(savings, months, profile.annual_return / 100)
  const gap = Math.max(0, adj - grown)
  const sip = monthlySIPForTarget(gap, months, profile.annual_return / 100)
  const daily = Math.max(1, Math.round(sip / 30))
  const feasible = income > 0 && sip < income * 0.5

  const deadline = new Date()
  deadline.setMonth(deadline.getMonth() + months)
  const deadlineDate = deadline.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return {
    inflation_adjusted_target: adj,
    savings_grown: grown,
    gap,
    monthly_sip: sip,
    daily_save: daily,
    projected_return: profile.annual_return,
    profile,
    feasible,
    percent_of_income: income > 0 ? Math.round((sip / income) * 100) : 0,
    deadline_date: deadlineDate,
    months_remaining: months,
  }
}

// ── Helpers used in UI ───────────────────────────────────────────────────────
export function goalDeadlineDate(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

/** Returns "2025-04" format for current month — used to key contributions */
export function currentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** e.g. "April 2025" */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}
