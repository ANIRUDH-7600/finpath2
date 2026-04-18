'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Zap, Check, X, ChevronRight, Loader2, TrendingUp, Clock, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatINR } from '@/lib/utils/formatCurrency'

interface SweepAllocation {
  goal_id: string
  goal_title: string
  amount: number
  reason: string
}

interface PendingSweep {
  id: string
  status: 'pending' | 'approved' | 'dismissed'
  allocations: SweepAllocation[]
  total_surplus: number
  approved_at: string | null
}

interface PastSweep {
  id: string
  week_key: string
  total_surplus: number
  approved_at: string | null
}

interface AutopilotData {
  week_key: string
  weekly_budget: number
  weekly_spent: number
  surplus: number
  spend_by_category: Record<string, number>
  pending_sweep: PendingSweep | null
  past_sweeps: PastSweep[]
  total_autoswept: number
}

function WeekLabel(key: string): string {
  const [year, week] = key.split('-W')
  const jan1 = new Date(parseInt(year), 0, 1)
  const dayOfWeek = jan1.getDay()
  const daysToMonday = dayOfWeek <= 1 ? 1 - dayOfWeek : 8 - dayOfWeek
  const monday = new Date(jan1.getTime() + (daysToMonday + (parseInt(week) - 1) * 7) * 86400000)
  return monday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function AutopilotPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<AutopilotData | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [editedAllocs, setEditedAllocs] = useState<SweepAllocation[]>([])

  const load = useCallback(async () => {
    if (!session?.user?.id) return
    try {
      const res = await fetch(`/api/autopilot?user_id=${session.user.id}`)
      const json: AutopilotData = await res.json()
      setData(json)
      if (json.pending_sweep?.status === 'pending') {
        setEditedAllocs(json.pending_sweep.allocations)
      }
    } catch {
      toast.error('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => { load() }, [load])

  async function approveSweep() {
    if (!data?.pending_sweep || !session?.user?.id) return
    setApproving(true)
    try {
      const res = await fetch('/api/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.user.id,
          sweep_id: data.pending_sweep.id,
          action: 'approve',
          allocations: editedAllocs,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${formatINR(data.pending_sweep.total_surplus)} swept to your goals`)
      await load()
    } catch {
      toast.error('Sweep failed')
    } finally {
      setApproving(false)
    }
  }

  async function dismissSweep() {
    if (!data?.pending_sweep || !session?.user?.id) return
    await fetch('/api/autopilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: session.user.id, sweep_id: data.pending_sweep.id, action: 'dismiss', allocations: [] }),
    })
    toast('Sweep dismissed')
    await load()
  }

  function updateAmount(goalId: string, val: number) {
    setEditedAllocs(prev => prev.map(a => a.goal_id === goalId ? { ...a, amount: Math.max(0, val) } : a))
  }

  const editedTotal = editedAllocs.reduce((s, a) => s + a.amount, 0)
  const surplus = data?.surplus ?? 0
  const budgetUsedPct = data ? Math.min(100, Math.round((data.weekly_spent / data.weekly_budget) * 100)) : 0

  const hasPending = data?.pending_sweep?.status === 'pending'
  const wasApproved = data?.pending_sweep?.status === 'approved'
  const wasDismissed = data?.pending_sweep?.status === 'dismissed'

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 size={20} className="animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
            <Zap size={16} className="text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-text-base">Autopilot</h1>
        </div>
        <p className="text-sm text-text-muted ml-11">Detects your unspent budget each week and sweeps it to your goals — automatically.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Weekly budget card */}
          <div className="bg-surface-raised border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-semibold text-text-faint uppercase tracking-wider">This Week</p>
              <span className="text-xs text-text-faint bg-surface px-2.5 py-1 rounded-full">{data?.week_key}</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <p className="text-[11px] text-text-faint mb-1">Budget</p>
                <p className="text-xl font-black text-text-base">{formatINR(data?.weekly_budget ?? 0)}</p>
              </div>
              <div>
                <p className="text-[11px] text-text-faint mb-1">Spent</p>
                <p className="text-xl font-black text-text-base">{formatINR(data?.weekly_spent ?? 0)}</p>
              </div>
              <div>
                <p className="text-[11px] text-text-faint mb-1">Sleeping</p>
                <p className={`text-xl font-black ${surplus > 0 ? 'text-brand' : 'text-text-faint'}`}>
                  {formatINR(surplus)}
                </p>
              </div>
            </div>

            <div className="h-2 bg-surface rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ${budgetUsedPct > 85 ? 'bg-red-400' : budgetUsedPct > 65 ? 'bg-yellow-400' : 'bg-brand'}`}
                style={{ width: `${budgetUsedPct}%` }}
              />
            </div>
            <p className="text-[11px] text-text-faint">{budgetUsedPct}% of weekly budget used</p>
          </div>

          {/* Spending breakdown */}
          {data?.spend_by_category && Object.keys(data.spend_by_category).length > 0 && (
            <div className="bg-surface-raised border border-border rounded-xl p-6">
              <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-4">This Week's Spending</p>
              <div className="space-y-2.5">
                {Object.entries(data.spend_by_category)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => {
                    const pct = data.weekly_spent > 0 ? Math.round((amt / data.weekly_spent) * 100) : 0
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-muted">{cat}</span>
                          <span className="font-semibold text-text-base">{formatINR(amt)}</span>
                        </div>
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-brand/50 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Sweep plan */}
          {hasPending && (
            <div className="bg-surface-raised border border-brand/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={15} className="text-brand" />
                <p className="text-sm font-semibold text-text-base">AI Sweep Plan</p>
              </div>
              <p className="text-xs text-text-faint mb-5">
                Claude allocated {formatINR(data.pending_sweep!.total_surplus)} across your goals by urgency. Adjust amounts below.
              </p>

              <div className="space-y-3 mb-5">
                {editedAllocs.map((a) => (
                  <div key={a.goal_id} className="bg-surface rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-text-base">{a.goal_title}</p>
                        <p className="text-xs text-text-faint mt-0.5">{a.reason}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-text-faint">₹</span>
                        <input
                          type="number"
                          value={a.amount}
                          onChange={(e) => updateAmount(a.goal_id, parseInt(e.target.value) || 0)}
                          className="w-20 bg-surface-raised border border-border rounded-lg px-2 py-1 text-sm font-bold text-brand text-right focus:outline-none focus:ring-1 focus:ring-brand/50"
                        />
                      </div>
                    </div>
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${Math.round((a.amount / data.pending_sweep!.total_surplus) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {editedTotal !== surplus && (
                <p className="text-xs text-orange-400 mb-3">
                  Total {formatINR(editedTotal)} — {editedTotal > surplus ? 'exceeds' : 'below'} available {formatINR(surplus)}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={approveSweep}
                  disabled={approving || editedTotal === 0}
                  className="flex-1 bg-brand hover:brightness-110 text-[#0A0A0A] font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                >
                  {approving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {approving ? 'Sweeping…' : `Sweep ${formatINR(editedTotal)}`}
                </button>
                <button
                  onClick={dismissSweep}
                  className="px-4 bg-surface border border-border hover:border-border-strong text-text-muted rounded-xl py-3 text-sm transition-all"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {wasApproved && (
            <div className="bg-brand/5 border border-brand/20 rounded-xl p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                <Check size={18} className="text-brand" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-base">This week's sweep is done</p>
                <p className="text-xs text-text-faint mt-0.5">
                  {formatINR(data!.pending_sweep!.total_surplus)} swept to {data!.pending_sweep!.allocations.length} goals
                  {data!.pending_sweep!.approved_at && ` · ${new Date(data!.pending_sweep!.approved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                </p>
              </div>
            </div>
          )}

          {wasDismissed && (
            <div className="bg-surface-raised border border-border rounded-xl p-5 text-center">
              <p className="text-sm text-text-muted">Sweep dismissed for this week. Come back next week.</p>
            </div>
          )}

          {!hasPending && !wasApproved && !wasDismissed && surplus < 200 && (
            <div className="bg-surface-raised border border-border rounded-xl p-6 text-center">
              <Clock size={22} className="text-text-faint mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-base mb-1">
                {surplus === 0 ? 'Budget fully used this week' : 'Not enough surplus yet'}
              </p>
              <p className="text-xs text-text-faint">
                Autopilot activates when you have ₹200+ unspent. Spend less this week to unlock a sweep.
              </p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Total autopiloted */}
          <div className="bg-surface-raised border border-border rounded-xl p-6 text-center">
            <p className="text-[11px] text-text-faint uppercase tracking-wider mb-3">Total Autopiloted</p>
            <p className="text-4xl font-black text-brand mb-1">{formatINR(data?.total_autoswept ?? 0)}</p>
            <p className="text-xs text-text-faint">{data?.past_sweeps?.length ?? 0} sweeps completed</p>
          </div>

          {/* How it works */}
          <div className="bg-surface-raised border border-border rounded-xl p-5">
            <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-4">How it works</p>
            <div className="space-y-4">
              {[
                { step: '01', text: 'Every week, Autopilot compares your spending against your weekly budget' },
                { step: '02', text: 'Any unspent money is detected as "sleeping surplus"' },
                { step: '03', text: 'Claude splits the surplus across your goals by urgency and deadline' },
                { step: '04', text: 'You review, adjust amounts, then approve with one tap' },
              ].map(({ step, text }) => (
                <div key={step} className="flex gap-3">
                  <span className="text-[10px] font-black text-brand bg-brand/10 rounded-lg w-7 h-7 flex items-center justify-center shrink-0">{step}</span>
                  <p className="text-xs text-text-muted leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Past sweeps */}
          {(data?.past_sweeps?.length ?? 0) > 0 && (
            <div className="bg-surface-raised border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-4">Sweep History</p>
              <div className="space-y-2">
                {data!.past_sweeps.map((sw) => (
                  <div key={sw.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                      <div>
                        <p className="text-xs font-medium text-text-base">
                          Week of {WeekLabel(sw.week_key)}
                        </p>
                        {sw.approved_at && (
                          <p className="text-[10px] text-text-faint">
                            {new Date(sw.approved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-brand">+{formatINR(sw.total_surplus)}</p>
                      <TrendingUp size={11} className="text-brand" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
