import { claude, CLAUDE_MODEL } from '@/lib/claude'
import type { NudgeResponse, NudgeGoalImpact, NudgeCategoryStats } from '@/types'

export interface NudgeContext {
  merchant: string
  amount: number
  category: string
  goalImpacts: NudgeGoalImpact[]
  categoryStats: NudgeCategoryStats
  monthlyBudgetUsedPct: number
  monthlyIncome: number
}

function computeSeverity(amount: number, goalImpacts: NudgeGoalImpact[], categoryStats: NudgeCategoryStats): 'info' | 'warning' | 'danger' {
  const maxDelay = goalImpacts.length > 0 ? Math.max(...goalImpacts.map(g => g.days_delayed)) : 0
  if (amount > 1000 || maxDelay > 10 || categoryStats.overspend_pct > 30) return 'danger'
  if (amount > 300 || maxDelay > 3 || categoryStats.overspend_pct > 10) return 'warning'
  return 'info'
}

export async function generateNudge(ctx: NudgeContext): Promise<Omit<NudgeResponse, 'goal_impacts' | 'category_stats' | 'monthly_budget_used_pct' | 'nudge_log_id'>> {
  const { merchant, amount, category, goalImpacts, categoryStats, monthlyBudgetUsedPct, monthlyIncome } = ctx

  if (amount < 100 && goalImpacts.every(g => g.days_delayed <= 0) && categoryStats.overspend_pct <= 0) {
    return { show_nudge: false }
  }

  const severity = computeSeverity(amount, goalImpacts, categoryStats)
  const topGoal = [...goalImpacts].sort((a, b) => b.days_delayed - a.days_delayed)[0]
  const goalSummary = goalImpacts.length > 0
    ? goalImpacts.map(g => `"${g.title}": ${g.days_delayed}d delay`).join(', ')
    : 'no active goals'

  const extras = [
    categoryStats.streak_count > 1 ? `${categoryStats.streak_count}${['th','st','nd','rd'][Math.min(categoryStats.streak_count, 3)]} ${merchant} order this week` : '',
    categoryStats.overspend_pct > 0 ? `${categoryStats.overspend_pct}% over typical ${category} spend this month` : '',
  ].filter(Boolean).join('. ')

  try {
    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 250,
      system: 'You are a firm but caring financial guardian for Indian users. Return ONLY raw valid JSON — no markdown, no backticks.',
      messages: [{
        role: 'user',
        content: `User wants to spend ₹${amount} at ${merchant} (${category}).
Monthly income: ₹${monthlyIncome} | Budget used this month: ${monthlyBudgetUsedPct}%
Goal impacts: ${goalSummary}${extras ? '\nContext: ' + extras : ''}

Return JSON:
{
  "show_nudge": true,
  "severity": "${severity}",
  "message": "1-2 sentences with exact rupees, goal name, days delayed — specific and personal",
  "impact": "short impact phrase",
  "proceed_text": "short proceed button label",
  "reconsider_text": "short skip button label",
  "alternative": "one specific alternative action with exact amounts"
}`,
      }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return JSON.parse(text)
  } catch {
    return {
      show_nudge: true,
      severity,
      message: topGoal
        ? `Spending ₹${amount} at ${merchant} delays your "${topGoal.title}" by ${topGoal.days_delayed} day${topGoal.days_delayed !== 1 ? 's' : ''}. You've used ${monthlyBudgetUsedPct}% of this month's budget.`
        : `You've used ${monthlyBudgetUsedPct}% of your budget. This ${category} spend adds up this month.`,
      impact: topGoal ? `"${topGoal.title}" delayed ${topGoal.days_delayed}d` : `₹${amount} off savings`,
      proceed_text: 'Proceed anyway',
      reconsider_text: 'Skip & save instead',
      alternative: topGoal ? `Put ₹${amount} toward "${topGoal.title}" instead` : `Save ₹${amount} this month`,
    }
  }
}
