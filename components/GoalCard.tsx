import type { Goal } from '@/types'
import { formatINR } from '@/lib/utils/formatCurrency'
import { progressPercent } from '@/lib/utils/goalMath'

interface Props {
  goal: Goal
}

export default function GoalCard({ goal }: Props) {
  const pct = progressPercent(goal.current_savings, goal.target_amount)

  const deadline = new Date(goal.created_at)
  deadline.setMonth(deadline.getMonth() + goal.deadline_months)
  const daysLeft = Math.max(
    0,
    Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  return (
    <div className="bg-surface-raised border border-border rounded-2xl p-5 hover:border-brand/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-base">{goal.title}</h3>
        {goal.daily_save_required && (
          <span className="bg-brand-muted border border-brand/20 text-brand text-xs font-semibold px-2.5 py-1 rounded-xl shrink-0 ml-2">
            {formatINR(goal.daily_save_required)}/day
          </span>
        )}
      </div>

      <div className="flex justify-between text-xs text-text-faint mb-1.5">
        <span>{formatINR(goal.current_savings)} saved</span>
        <span>{formatINR(goal.target_amount)} goal</span>
      </div>

      <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%`, background: '#02FF9D' }}
        />
      </div>

      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-text-faint">{pct}% complete</span>
        <span className="text-xs text-text-faint">{daysLeft} days left</span>
      </div>

      {goal.narrative && (
        <p className="text-xs italic text-text-muted mt-3 leading-relaxed border-t border-border pt-3">
          {goal.narrative}
        </p>
      )}
    </div>
  )
}
