export type TransactionCategory =
  | 'Food & Dining'
  | 'Transport'
  | 'Entertainment'
  | 'Subscriptions'
  | 'Shopping'
  | 'Utilities'
  | 'Healthcare'
  | 'Other'

export interface User {
  id: string
  name: string
  email?: string
  monthly_income: number
  risk_appetite: number
  phone?: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  merchant: string
  category: TransactionCategory
  date: string
  note?: string
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  target_amount: number
  current_savings: number
  deadline_months: number
  daily_save_required?: number
  monthly_sip?: number
  inflation_adjusted?: number
  projected_return?: number
  asset_allocation?: string   // JSON string
  narrative?: string
  status: string
  created_at: string
  contributions?: GoalContribution[]
}

export interface GoalContribution {
  id: string
  goal_id: string
  amount: number
  month: string   // "2025-04"
  note?: string
  created_at: string
}

export interface LeakagePattern {
  pattern: string
  amount: number
  frequency: string
  suggestion: string
}

export interface SpendingAnalysis {
  categories: Record<string, number>
  leakage_patterns: LeakagePattern[]
  health_score: number
  health_label: string
  top_insight: string
  monthly_total: number
  savings_rate?: number
}

export interface GoalCalculation {
  daily_save: number
  monthly_save: number
  feasible: boolean
  inflation_adjusted_target: number
  deadline_date: string
  percent_of_income: number
  narrative: string
}

export interface PortfolioSuggestion {
  allocation: {
    equity: number
    debt: number
    gold: number
    cash: number
  }
  instruments: Record<string, string[]>
  sip_amount: number
  reasoning: string
  macro_note: string
}

export interface NudgeGoalImpact {
  title: string
  days_delayed: number
  current_pct: number   // progress % before this purchase
  new_pct: number       // progress % if they proceed (visual only)
}

export interface NudgeCategoryStats {
  spent_this_month: number
  monthly_avg: number        // 3-month average for this category
  overspend_pct: number      // how far over typical they are (0 = on track)
  streak_count: number       // same-merchant orders this week
}

export interface NudgeResponse {
  show_nudge: boolean
  severity?: 'info' | 'warning' | 'danger'
  message?: string
  impact?: string
  proceed_text?: string
  reconsider_text?: string
  // Rich context
  goal_impacts?: NudgeGoalImpact[]
  category_stats?: NudgeCategoryStats
  alternative?: string
  monthly_budget_used_pct?: number
  nudge_log_id?: string
}

export interface DashboardData {
  user: User
  analysis: SpendingAnalysis
  savings?: number
  emi_monthly?: number
  sip_monthly?: number
  sip_portfolio_value?: number
  sip_total_invested?: number
  sip_gain_loss?: number
  net_cash?: number
  goals: Goal[]
  portfolio: PortfolioSuggestion | null
  recent_transactions: Transaction[]
  money_saved_by_guardian: number
}

export interface MacroInsight {
  market_outlook: string
  rbi_note: string
  action_tip: string
  sentiment: 'bullish' | 'neutral' | 'cautious' | 'bearish'
  // live market data from Gemini + Google Search
  nifty_level?: number
  nifty_pe?: number
  repo_rate?: number
  inflation?: number
  market_signal?: string
}

export interface ProductRecommendation {
  name: string
  price: number
  platform: string
  url?: string
  specs?: string
  why: string
}

export interface SmartBuyResult {
  decision: 'buy' | 'wait' | 'skip'
  severity: 'green' | 'yellow' | 'red'
  financial_verdict: string
  goal_impact: string
  days_delayed: number
  affordability_pct: number
  products: ProductRecommendation[]
  sources?: string[]
  search_links: { flipkart: string; amazon: string }
}
