import { claude, CLAUDE_MODEL } from '@/lib/claude'
import { calculateGoalInvesting } from '@/lib/utils/goalMath'
import type { GoalInvestingResult } from '@/lib/utils/goalMath'

export interface GoalPlanResult extends GoalInvestingResult {
  narrative: string
}

export async function buildGoalPlan(
  title: string,
  target: number,
  savings: number,
  months: number,
  income: number
): Promise<GoalPlanResult> {
  const calc = calculateGoalInvesting(target, savings, months, income)

  const fallbackNarrative = `Invest ₹${calc.monthly_sip.toLocaleString('en-IN')}/month via ${calc.profile.fund_type} to reach ₹${calc.inflation_adjusted_target.toLocaleString('en-IN')} (inflation-adjusted) by ${calc.deadline_date} at ${calc.projected_return}% annual return.`

  let narrative = fallbackNarrative

  try {
    const res = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 140,
      system:
        'You are a warm Indian personal finance coach who uses Goal-Based Investing principles. Write exactly one sentence that mentions the inflation-adjusted amount, monthly SIP, specific fund type, and deadline. Be specific and motivating. No generic phrases. No markdown.',
      messages: [
        {
          role: 'user',
          content: `Goal: "${title}"
Target: ₹${target.toLocaleString('en-IN')} → Inflation-adjusted: ₹${calc.inflation_adjusted_target.toLocaleString('en-IN')} by ${calc.deadline_date}
Monthly SIP: ₹${calc.monthly_sip.toLocaleString('en-IN')} | Strategy: ${calc.profile.fund_type}
Expected return: ${calc.projected_return}% CAGR | Already saved: ₹${savings.toLocaleString('en-IN')}
Monthly income: ₹${income.toLocaleString('en-IN')}

Write one motivating sentence about this Goal-Based Investing plan.`,
        },
      ],
    })
    const text = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
    if (text) narrative = text
  } catch {
    // use fallback
  }

  return { ...calc, narrative }
}
