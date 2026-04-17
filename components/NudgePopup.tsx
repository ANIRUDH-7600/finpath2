'use client'

import { ShieldAlert, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import type { NudgeResponse } from '@/types'

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
  const borderColor =
    nudge.severity === 'danger' ? 'border-red-500' :
    nudge.severity === 'warning' ? 'border-orange-400' : 'border-blue-400'

  const iconColor =
    nudge.severity === 'danger' ? 'text-red-400' :
    nudge.severity === 'warning' ? 'text-orange-400' : 'text-blue-400'

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
    toast.success('Transaction saved')
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className={`bg-[#111111] rounded-2xl border-2 ${borderColor} max-w-sm w-full p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert size={26} className={iconColor} />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-faint">Financial Guardian</p>
            <p className="text-base font-semibold text-text-base">Hold on a second</p>
          </div>
        </div>

        <p className="text-sm text-text-muted leading-relaxed mb-4">{nudge.message}</p>

        {nudge.impact && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-5">
            <TrendingDown size={14} className="text-red-400 shrink-0" />
            <p className="text-sm font-bold text-red-400">{nudge.impact}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleReconsider}
            className="flex-1 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-2.5 text-sm transition-colors"
          >
            {nudge.reconsider_text ?? 'Skip this time'}
          </button>
          <button
            onClick={handleProceed}
            className="flex-1 bg-surface border border-border hover:border-brand/30 text-text-muted rounded-xl py-2.5 text-sm transition-colors"
          >
            {nudge.proceed_text ?? 'Proceed anyway'}
          </button>
        </div>
      </div>
    </div>
  )
}
