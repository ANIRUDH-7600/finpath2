'use client'

import { ShieldAlert, Flame, TrendingDown, Lightbulb, AlertTriangle, Target } from 'lucide-react'
import toast from 'react-hot-toast'
import type { NudgeResponse } from '@/types'
import { formatINR } from '@/lib/utils/formatCurrency'

interface PendingTransaction {
  user_id: string
  merchant: string
  amount: number
  category: string
  date: string
  note?: string
}

interface Props {
  nudge: NudgeResponse & { nudge_log_id?: string }
  pendingTransaction: PendingTransaction
  userId: string
  onComplete: () => void
}

export default function NudgePopup({ nudge, pendingTransaction, userId, onComplete }: Props) {
  const isDanger = nudge.severity === 'danger'
  const isWarning = nudge.severity === 'warning'

  const borderColor = isDanger ? 'border-red-500' : isWarning ? 'border-orange-400' : 'border-blue-400'
  const headerBg = isDanger ? 'bg-red-500/10' : isWarning ? 'bg-orange-400/10' : 'bg-blue-400/10'
  const iconColor = isDanger ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-blue-400'
  const accentColor = isDanger ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-blue-400'
  const barAccent = isDanger ? 'bg-red-500' : isWarning ? 'bg-orange-400' : 'bg-blue-400'

  const goalImpacts = nudge.goal_impacts ?? []
  const catStats = nudge.category_stats
  const streakCount = catStats?.streak_count ?? 0

  async function handleReconsider() {
    if (nudge.nudge_log_id) {
      await fetch('/api/nudge/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nudge_log_id: nudge.nudge_log_id, user_action: 'skipped' }),
      })
    }
    toast.success(`₹${pendingTransaction.amount} saved! Goal moved closer`)
    onComplete()
  }

  async function handleProceed() {
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pendingTransaction, user_id: userId }),
    })
    if (nudge.nudge_log_id) {
      await fetch('/api/nudge/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nudge_log_id: nudge.nudge_log_id, user_action: 'proceeded' }),
      })
    }
    toast('Transaction saved', { icon: '💸' })
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8">
      <div className={`bg-[#111111] rounded-xl border-2 ${borderColor} w-full max-w-md shadow-2xl overflow-hidden`}>

        {/* Header */}
        <div className={`${headerBg} px-6 py-4 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${borderColor}`}>
            <ShieldAlert size={20} className={iconColor} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-faint">Financial Guardian</p>
            <p className="text-sm font-semibold text-text-base">
              {isDanger ? 'Danger — high impact purchase' : isWarning ? 'Warning — review this spend' : 'Just a heads-up'}
            </p>
          </div>
          {streakCount > 1 && (
            <div className="ml-auto flex items-center gap-1 bg-orange-500/20 border border-orange-400/30 rounded-full px-2 py-0.5">
              <Flame size={12} className="text-orange-400" />
              <span className="text-[10px] font-bold text-orange-400">{streakCount}x this week</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Amount + message */}
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className={`text-2xl font-black ${accentColor}`}>{formatINR(pendingTransaction.amount)}</span>
              <span className="text-sm text-text-muted">at {pendingTransaction.merchant}</span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">{nudge.message}</p>
          </div>

          {/* Goal impact bars */}
          {goalImpacts.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-text-faint flex items-center gap-1">
                <Target size={11} />
                Goal Impact
              </p>
              {goalImpacts.slice(0, 2).map((g) => (
                <div key={g.title}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-text-base truncate max-w-[60%]">{g.title}</span>
                    <span className={`font-bold ${accentColor}`}>
                      {g.days_delayed > 0 ? `−${g.days_delayed}d` : 'no delay'}
                    </span>
                  </div>
                  <div className="relative h-3 bg-surface rounded-full overflow-hidden">
                    {/* green = safe progress */}
                    <div
                      className="absolute left-0 top-0 h-full bg-brand/70 rounded-full transition-all"
                      style={{ width: `${Math.max(0, g.new_pct)}%` }}
                    />
                    {/* red = the chunk lost */}
                    {g.days_delayed > 0 && (
                      <div
                        className={`absolute top-0 h-full ${barAccent} opacity-60 rounded-r-full transition-all`}
                        style={{ left: `${Math.max(0, g.new_pct)}%`, width: `${Math.min(g.current_pct - g.new_pct, 100 - g.new_pct)}%` }}
                      />
                    )}
                    {/* current position marker */}
                    <div
                      className="absolute top-0 h-full w-0.5 bg-white/50"
                      style={{ left: `${g.current_pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-text-faint mt-0.5">
                    <span>{g.new_pct}% after</span>
                    <span>{g.current_pct}% now</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Category velocity bar */}
          {catStats && catStats.monthly_avg > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-faint uppercase tracking-wider font-bold flex items-center gap-1">
                  <TrendingDown size={10} />
                  {pendingTransaction.category} this month
                </span>
                {catStats.overspend_pct > 0 && (
                  <span className={`font-bold text-[10px] ${accentColor}`}>+{catStats.overspend_pct}% over avg</span>
                )}
              </div>
              <div className="relative h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-brand/50 rounded-full"
                  style={{ width: `${Math.min((catStats.spent_this_month / (catStats.monthly_avg * 1.5)) * 100, 100)}%` }}
                />
                {/* avg marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-white/40"
                  style={{ left: `${Math.min((catStats.monthly_avg / (catStats.monthly_avg * 1.5)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-faint mt-0.5">
                <span>{formatINR(catStats.spent_this_month)} spent</span>
                <span>{formatINR(catStats.monthly_avg)} avg/mo</span>
              </div>
            </div>
          )}

          {/* Alternative suggestion */}
          {nudge.alternative && (
            <div className="flex gap-2 bg-brand/5 border border-brand/20 rounded-xl px-3 py-2.5">
              <Lightbulb size={14} className="text-brand shrink-0 mt-0.5" />
              <p className="text-xs text-text-muted leading-relaxed">
                <span className="font-semibold text-brand">Instead: </span>
                {nudge.alternative}
              </p>
            </div>
          )}

          {/* Budget warning */}
          {(nudge.monthly_budget_used_pct ?? 0) > 70 && (
            <div className="flex gap-2 items-center bg-orange-500/5 border border-orange-400/20 rounded-xl px-3 py-2">
              <AlertTriangle size={13} className="text-orange-400 shrink-0" />
              <p className="text-xs text-orange-300">
                {nudge.monthly_budget_used_pct}% of monthly income spent — only {100 - (nudge.monthly_budget_used_pct ?? 0)}% left
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleReconsider}
            className="flex-1 bg-brand hover:brightness-110 text-[#0A0A0A] font-bold rounded-xl py-3 text-sm transition-all"
          >
            {nudge.reconsider_text ?? 'Skip & save instead'}
          </button>
          <button
            onClick={handleProceed}
            className="flex-1 bg-surface border border-border hover:border-border-strong text-text-muted rounded-xl py-3 text-sm transition-all"
          >
            {nudge.proceed_text ?? 'Proceed anyway'}
          </button>
        </div>
      </div>
    </div>
  )
}
