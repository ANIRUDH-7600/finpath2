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
  narrative?: string
  status: string
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

export interface NudgeResponse {
  show_nudge: boolean
  severity?: 'info' | 'warning' | 'danger'
  message?: string
  impact?: string
  proceed_text?: string
  reconsider_text?: string
}

export interface DashboardData {
  user: User
  analysis: SpendingAnalysis
  goals: Goal[]
  portfolio: PortfolioSuggestion | null
  recent_transactions: Transaction[]
  money_saved_by_guardian: number
}

export interface MacroInsight {
  market_outlook: string
  rbi_note: string
  action_tip: string
  sentiment: 'bullish' | 'neutral' | 'cautious'
}
