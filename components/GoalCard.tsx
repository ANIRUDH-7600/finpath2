'use client'

import { useState } from 'react'
import type { Goal } from '@/types'
import { formatINR } from '@/lib/utils/formatCurrency'
import { progressPercent, currentMonthKey, monthLabel } from '@/lib/utils/goalMath'
import { CheckCircle, Clock, TrendingUp, Plus, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  goal: Goal
  onUpdate: (updated: Goal) => void
  onDelete: (id: string) => void
}

export default function GoalCard({ goal, onUpdate, onDelete }: Props) {
  const [contributing, setContributing] = useState(false)
  const [inputAmt, setInputAmt] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const thisMonth = currentMonthKey()
  const thisMonthContrib = goal.contributions?.find(c => c.month === thisMonth)
  const monthlySIP = goal.monthly_sip ?? goal.daily_save_required ? (goal.daily_save_required! * 30) : 0
  const paidThisMonth = thisMonthContrib ? thisMonthContrib.amount : 0
  const sipDue = Math.max(0, monthlySIP - paidThisMonth)
  const isOnTrack = paidThisMonth >= monthlySIP * 0.9  // within 10% is fine

  // Use inflation-adjusted target for progress if available
  const effectiveTarget = goal.inflation_adjusted ?? goal.target_amount
  const pct = progressPercent(goal.current_savings, effectiveTarget)

  const deadline = new Date(goal.created_at)
  deadline.setMonth(deadline.getMonth() + goal.deadline_months)
  const monthsLeft = Math.max(0, Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44)))
  const daysLeft = Math.max(0, Math.round((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  let allocation: { equity?: number; debt?: number; label?: string; fund_type?: string } = {}
  try { if (goal.asset_allocation) allocation = JSON.parse(goal.asset_allocation) } catch { /* */ }

  async function handleContribute() {
    const amt = parseFloat(inputAmt)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/goals/${goal.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      })
      if (!res.ok) throw new Error()
      const { goal: updated } = await res.json()
      onUpdate(updated)
      setInputAmt('')
      setContributing(false)
      toast.success(`₹${amt.toLocaleString('en-IN')} logged for ${goal.title}`)
    } catch {
      toast.error('Failed to log contribution')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${goal.title}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onDelete(goal.id)
      toast.success('Goal deleted')
    } catch {
      toast.error('Failed to delete goal')
    } finally {
      setDeleting(false)
    }
  }

  const isCompleted = goal.status === 'completed' || goal.current_savings >= goal.target_amount

  return (
    <div className={`bg-surface-raised border rounded-xl p-5 flex flex-col gap-3 transition-colors ${
      isCompleted ? 'border-brand/40' : 'border-border hover:border-brand/20'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {isCompleted && <CheckCircle size={14} className="text-brand shrink-0" />}
            <h3 className="text-sm font-bold text-text-base truncate">{goal.title}</h3>
          </div>
          {allocation.label && (
            <span className="text-[10px] text-text-faint">{allocation.label}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {monthlySIP > 0 && (
            <div className="text-right">
              <p className="text-xs font-bold text-brand">{formatINR(monthlySIP)}</p>
              <p className="text-[10px] text-text-faint">/ month SIP</p>
            </div>
          )}
          <button onClick={handleDelete} disabled={deleting} className="text-text-faint hover:text-red-400 transition-colors">
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-text-muted">{formatINR(goal.current_savings)} saved</span>
          <span className="text-text-faint">
            {goal.inflation_adjusted
              ? <>{formatINR(goal.target_amount)} <span className="text-brand">→ {formatINR(goal.inflation_adjusted)} adj.</span></>
              : formatINR(goal.target_amount)
            }
          </span>
        </div>
        <div className="w-full bg-border rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, background: isCompleted ? '#02FF9D' : pct > 60 ? '#02FF9D' : pct > 30 ? '#FBBF24' : '#F87171' }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[11px] text-text-faint">{pct}% of inflation-adjusted target</span>
          <span className="text-[11px] text-text-faint">
            {isCompleted ? 'Completed!' : daysLeft < 30 ? `${daysLeft}d left` : `${monthsLeft}mo left`}
          </span>
        </div>
      </div>

      {/* Investment details row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface rounded-xl p-2.5 text-center">
          <p className="text-xs font-bold text-text-base">{goal.projected_return ?? '—'}%</p>
          <p className="text-[10px] text-text-faint">Expected</p>
        </div>
        <div className="bg-surface rounded-xl p-2.5 text-center">
          <p className="text-xs font-bold text-text-base">
            {allocation.equity != null ? `${allocation.equity}% Eq` : '—'}
          </p>
          <p className="text-[10px] text-text-faint">Equity</p>
        </div>
        <div className="bg-surface rounded-xl p-2.5 text-center">
          <p className="text-xs font-bold text-text-base">{formatINR(goal.daily_save_required ?? 0)}</p>
          <p className="text-[10px] text-text-faint">Per day</p>
        </div>
      </div>

      {/* This month's SIP status */}
      {!isCompleted && monthlySIP > 0 && (
        <div className={`rounded-xl px-3 py-2.5 flex items-center justify-between border ${
          isOnTrack
            ? 'bg-brand-muted border-brand/20'
            : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {isOnTrack
              ? <CheckCircle size={13} className="text-brand" />
              : <Clock size={13} className="text-amber-400" />
            }
            <div>
              <p className={`text-xs font-semibold ${isOnTrack ? 'text-brand' : 'text-amber-400'}`}>
                {isOnTrack ? `${monthLabel(thisMonth)} paid` : `${monthLabel(thisMonth)} due`}
              </p>
              <p className="text-[10px] text-text-faint">
                {paidThisMonth > 0 ? `${formatINR(paidThisMonth)} logged` : 'No payment yet'}
                {sipDue > 0 && !isOnTrack && ` · ${formatINR(sipDue)} remaining`}
              </p>
            </div>
          </div>
          {!contributing && (
            <button
              onClick={() => { setContributing(true); setInputAmt(String(sipDue || monthlySIP)) }}
              className="flex items-center gap-1 text-[11px] font-semibold bg-brand text-[#0A0A0A] rounded-lg px-2.5 py-1.5"
            >
              <Plus size={11} />
              Log
            </button>
          )}
        </div>
      )}

      {/* Inline contribution form */}
      {contributing && (
        <div className="bg-surface border border-brand/20 rounded-xl p-3 flex items-center gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-2.5 text-xs text-text-faint">₹</span>
            <input
              type="number"
              value={inputAmt}
              onChange={e => setInputAmt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleContribute()}
              autoFocus
              placeholder={String(monthlySIP)}
              className="w-full bg-surface border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-text-base focus:outline-none focus:ring-1 focus:ring-brand/40"
            />
          </div>
          <button
            onClick={handleContribute}
            disabled={saving}
            className="bg-brand text-[#0A0A0A] font-bold rounded-lg px-3 py-2 text-xs flex items-center gap-1 disabled:opacity-50"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
            Save
          </button>
          <button onClick={() => setContributing(false)} className="text-text-faint text-xs px-2 py-2">
            Cancel
          </button>
        </div>
      )}

      {/* Fund type recommendation */}
      {allocation.fund_type && (
        <div className="flex items-start gap-2 bg-surface border border-border rounded-xl p-2.5">
          <TrendingUp size={12} className="text-brand shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-muted leading-relaxed">{allocation.fund_type}</p>
        </div>
      )}

      {/* Narrative */}
      {goal.narrative && (
        <p className="text-[11px] italic text-text-faint leading-relaxed border-t border-border pt-3">
          {goal.narrative}
        </p>
      )}

      {/* Contribution history toggle */}
      {goal.contributions && goal.contributions.length > 0 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1 text-[11px] text-text-faint hover:text-text-muted transition-colors"
        >
          {showHistory ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {goal.contributions.length} contribution{goal.contributions.length !== 1 ? 's' : ''}
        </button>
      )}

      {showHistory && goal.contributions && (
        <div className="space-y-1.5 border-t border-border pt-2">
          {goal.contributions.map(c => (
            <div key={c.id} className="flex items-center justify-between text-xs">
              <span className="text-text-faint">{monthLabel(c.month)}</span>
              <span className="text-text-base font-semibold">{formatINR(c.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
