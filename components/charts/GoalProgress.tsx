'use client'

import type { Goal } from '@/types'
import { formatINR } from '@/lib/utils/formatCurrency'
import { progressPercent } from '@/lib/utils/goalMath'

interface Props {
  goals: Goal[]
}

export default function GoalProgress({ goals }: Props) {
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-text-faint">
        <p className="text-sm">No goals yet</p>
        <p className="text-xs mt-1">Create your first goal to track progress</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {goals.map((goal) => {
        const pct = progressPercent(goal.current_savings, goal.target_amount)
        return (
          <div key={goal.id}>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm font-medium text-text-base">{goal.title}</span>
              <span className="text-xs text-text-faint">{pct}%</span>
            </div>
            <div className="w-full bg-border rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${pct}%`, background: '#02FF9D' }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-text-faint">{formatINR(goal.current_savings)}</span>
              <span className="text-xs text-text-faint">{formatINR(goal.target_amount)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
