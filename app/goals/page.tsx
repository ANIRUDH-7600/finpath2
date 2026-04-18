'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, Target, Plus, X, TrendingUp, IndianRupee, Calendar, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import GoalCard from '@/components/GoalCard'
import { formatINR } from '@/lib/utils/formatCurrency'
import { calculateGoalInvesting, goalDeadlineDate, currentMonthKey } from '@/lib/utils/goalMath'
import type { Goal } from '@/types'

const inputClass =
  'w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition'

export default function GoalsPage() {
  const { data: session, status } = useSession()
  const [goals, setGoals] = useState<Goal[]>([])
  const [sipPortfolioValue, setSipPortfolioValue] = useState(0)
  const [sipMonthly, setSipMonthly] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [months, setMonths] = useState(24)

  const userId = session?.user?.id
  const income = (session?.user as { monthly_income?: number })?.monthly_income ?? 50000

  // Live calculation using the new investing math
  const liveCalc =
    title && target && months
      ? calculateGoalInvesting(parseFloat(target) || 0, parseFloat(saved) || 0, months, income)
      : null

  const loadGoals = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [goalsRes, cfRes] = await Promise.all([
        fetch(`/api/goals?user_id=${userId}`),
        fetch(`/api/cashflow?user_id=${userId}`),
      ])
      if (goalsRes.ok) setGoals(await goalsRes.json())
      if (cfRes.ok) {
        const cf = await cfRes.json()
        setSipPortfolioValue(cf.sip_projections?.reduce((s: number, p: { current_value: number }) => s + p.current_value, 0) ?? 0)
        setSipMonthly(cf.total_sip ?? 0)
      }
    } catch {
      toast.error('Failed to load goals')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (status === 'authenticated') loadGoals()
  }, [status, loadGoals])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !target || !userId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/calculate-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          title,
          target_amount: parseFloat(target),
          current_savings: parseFloat(saved) || 0,
          deadline_months: months,
          income,
        }),
      })
      if (!res.ok) throw new Error('Failed to create goal')
      const result = await res.json()
      toast.success(`Goal created! SIP: ${formatINR(result.monthly_sip)}/month`)
      setTitle(''); setTarget(''); setSaved(''); setMonths(24)
      setShowForm(false)
      loadGoals()
    } catch {
      toast.error('Failed to create goal')
    } finally {
      setSubmitting(false)
    }
  }

  // Monthly SIP summary across all active goals
  const thisMonth = currentMonthKey()
  const activeGoals = goals.filter(g => g.status === 'active')
  const totalMonthlySIP = activeGoals.reduce((s, g) => s + (g.monthly_sip ?? 0), 0)
  const totalPaidThisMonth = activeGoals.reduce((s, g) => {
    const c = g.contributions?.find(c => c.month === thisMonth)
    return s + (c?.amount ?? 0)
  }, 0)
  const goalsDueThisMonth = activeGoals.filter(g => {
    const paid = g.contributions?.find(c => c.month === thisMonth)?.amount ?? 0
    const sip = g.monthly_sip ?? 0
    return sip > 0 && paid < sip * 0.9
  }).length

  if (status === 'loading' || loading) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-surface-raised rounded-xl h-48 border border-border" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-base">Goals</h1>
          <p className="text-xs text-text-muted mt-0.5">Goal-Based Investing · Inflation-adjusted SIP plans</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl px-4 py-2.5 text-sm"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New Goal'}
        </button>
      </div>

      {/* SIP Portfolio Impact Banner */}
      {sipPortfolioValue > 0 && (
        <div className="bg-blue-400/5 border border-blue-400/20 rounded-xl p-4 mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp size={16} className="text-blue-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-text-base">SIP Portfolio: <span className="text-blue-400">{formatINR(sipPortfolioValue)}</span></p>
              <p className="text-xs text-text-faint">
                {sipMonthly > 0 ? `${formatINR(sipMonthly)}/mo invested` : 'Accumulated returns'} · This wealth accelerates your goals
              </p>
            </div>
          </div>
          <a href="/cashflow" className="text-xs text-blue-400 hover:underline shrink-0">Manage SIPs →</a>
        </div>
      )}

      {/* Monthly SIP summary bar */}
      {activeGoals.length > 0 && totalMonthlySIP > 0 && (
        <div className={`rounded-xl border p-4 mb-5 ${
          goalsDueThisMonth > 0
            ? 'bg-amber-500/10 border-amber-500/20'
            : 'bg-brand-muted border-brand/20'
        }`}>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-base font-bold text-text-base">{formatINR(totalMonthlySIP)}</p>
              <p className="text-[10px] text-text-muted uppercase font-semibold">Total SIP / month</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-brand">{formatINR(totalPaidThisMonth)}</p>
              <p className="text-[10px] text-text-muted uppercase font-semibold">Paid this month</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                {goalsDueThisMonth > 0 && <AlertCircle size={13} className="text-amber-400" />}
                <p className={`text-base font-bold ${goalsDueThisMonth > 0 ? 'text-amber-400' : 'text-brand'}`}>
                  {goalsDueThisMonth}
                </p>
              </div>
              <p className="text-[10px] text-text-muted uppercase font-semibold">Goals due</p>
            </div>
          </div>
          {goalsDueThisMonth > 0 && (
            <p className="text-xs text-amber-400 text-center mt-2 font-medium">
              {goalsDueThisMonth} goal{goalsDueThisMonth > 1 ? 's' : ''} still need{goalsDueThisMonth === 1 ? 's' : ''} this month&apos;s SIP — log your contributions below
            </p>
          )}
        </div>
      )}

      {/* Goal creation form */}
      {showForm && (
        <div className="bg-surface-raised border border-brand/20 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Target size={16} className="text-brand" />
            <h2 className="text-base font-bold text-text-base">New Savings Goal</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-text-muted block mb-1">Goal title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="House down payment, Europe trip, Emergency fund..."
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Target amount (₹)</label>
                <input
                  type="number"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  placeholder="500000"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Already saved (₹)</label>
                <input
                  type="number"
                  value={saved}
                  onChange={e => setSaved(e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-text-muted">Timeline: {months} months</label>
                <span className="text-xs text-text-faint">{goalDeadlineDate(months)}</span>
              </div>
              <input
                type="range"
                min={1}
                max={120}
                value={months}
                onChange={e => setMonths(parseInt(e.target.value))}
                className="w-full accent-brand"
              />
              <div className="flex justify-between text-[10px] text-text-faint mt-0.5">
                <span>1 month</span>
                <span>5 years</span>
                <span>10 years</span>
              </div>
            </div>

            {/* Live investment preview */}
            {liveCalc && (
              <div className="rounded-xl border overflow-hidden">
                {/* Strategy banner */}
                <div className="bg-brand-muted border-b border-brand/20 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={13} className="text-brand" />
                    <span className="text-xs font-bold text-brand">{liveCalc.profile.label}</span>
                  </div>
                  <span className="text-xs text-text-muted">{liveCalc.profile.annual_return}% expected return</span>
                </div>

                {/* Numbers grid */}
                <div className="bg-surface-raised border-border grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-border">
                  <div className="p-3 text-center">
                    <p className="text-base font-bold text-brand">{formatINR(liveCalc.monthly_sip)}</p>
                    <p className="text-[10px] text-text-muted uppercase font-semibold">Monthly SIP</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-base font-bold text-text-base">{formatINR(liveCalc.daily_save)}</p>
                    <p className="text-[10px] text-text-muted uppercase font-semibold">Per Day</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-base font-bold text-text-base">{formatINR(liveCalc.inflation_adjusted_target)}</p>
                    <p className="text-[10px] text-text-muted uppercase font-semibold">Adj. Target</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className={`text-base font-bold ${liveCalc.percent_of_income > 50 ? 'text-red-400' : 'text-text-base'}`}>
                      {liveCalc.percent_of_income}%
                    </p>
                    <p className="text-[10px] text-text-muted uppercase font-semibold">Of Income</p>
                  </div>
                </div>

                {/* Allocation pills */}
                <div className="bg-surface-raised border-t border-border px-4 py-2.5 flex items-center gap-2 flex-wrap">
                  <IndianRupee size={11} className="text-text-faint" />
                  <span className="text-[11px] text-text-muted">{liveCalc.profile.fund_type}</span>
                </div>

                {/* Asset bar */}
                {liveCalc.profile.equity > 0 && (
                  <div className="px-4 py-2 border-t border-border">
                    <div className="flex rounded-full overflow-hidden h-1.5">
                      <div style={{ width: `${liveCalc.profile.equity}%`, background: '#02FF9D' }} />
                      <div style={{ width: `${liveCalc.profile.debt}%`, background: '#60A5FA' }} />
                    </div>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-[10px] text-brand">{liveCalc.profile.equity}% Equity</span>
                      <span className="text-[10px] text-blue-400">{liveCalc.profile.debt}% Debt</span>
                    </div>
                  </div>
                )}

                {/* Feasibility */}
                <div className={`px-4 py-2 border-t text-xs text-center font-medium ${
                  liveCalc.feasible
                    ? 'border-brand/20 bg-brand-muted text-brand'
                    : 'border-red-500/20 bg-red-500/10 text-red-400'
                }`}>
                  {liveCalc.feasible
                    ? `Feasible — ${liveCalc.percent_of_income}% of your income`
                    : `Requires ${liveCalc.percent_of_income}% of income — consider extending the timeline`
                  }
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || (liveCalc != null && !liveCalc.feasible)}
              className="w-full bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting
                ? <><Loader2 size={14} className="animate-spin" />Creating goal...</>
                : 'Create Goal with AI Plan →'
              }
            </button>
          </form>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className="text-center py-16 bg-surface-raised border border-border rounded-xl">
          <Target size={40} className="text-text-faint mx-auto mb-4" />
          <p className="text-text-base font-semibold mb-1">No goals yet</p>
          <p className="text-sm text-text-muted mb-5 max-w-sm mx-auto">
            Set a financial goal — AI calculates the inflation-adjusted SIP plan and picks the right investment strategy for your timeline.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-brand text-[#0A0A0A] font-bold rounded-xl px-6 py-3 text-sm flex items-center gap-2 mx-auto"
          >
            <Plus size={16} /> Create first goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Completed goals section */}
          {goals.filter(g => g.status === 'completed').length > 0 && (
            <div>
              <p className="text-xs text-text-faint font-medium uppercase tracking-wider mb-2">Completed</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.filter(g => g.status === 'completed').map(g => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onUpdate={updated => setGoals(prev => prev.map(x => x.id === updated.id ? updated : x))}
                    onDelete={id => setGoals(prev => prev.filter(x => x.id !== id))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Active goals */}
          {activeGoals.length > 0 && (
            <div>
              {goals.filter(g => g.status === 'completed').length > 0 && (
                <p className="text-xs text-text-faint font-medium uppercase tracking-wider mb-2">Active</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGoals.map(g => {
                  const sipContrib = activeGoals.length > 0 ? Math.round(sipPortfolioValue / activeGoals.length) : 0
                  const effProgress = g.target_amount > 0 ? Math.min(100, Math.round(((g.current_savings + sipContrib) / g.target_amount) * 100)) : 0
                  const baseProgress = g.target_amount > 0 ? Math.round((g.current_savings / g.target_amount) * 100) : 0
                  const boost = effProgress - baseProgress
                  return (
                    <div key={g.id}>
                      <GoalCard
                        goal={g}
                        onUpdate={updated => setGoals(prev => prev.map(x => x.id === updated.id ? updated : x))}
                        onDelete={id => setGoals(prev => prev.filter(x => x.id !== id))}
                      />
                      {sipContrib > 0 && (
                        <div className="mt-1.5 flex items-center gap-2 px-1">
                          <TrendingUp size={11} className="text-blue-400 shrink-0" />
                          <p className="text-xs text-text-faint">
                            SIP portfolio adds <span className="text-blue-400 font-semibold">{formatINR(sipContrib)}</span> toward this goal
                            {boost > 0 && <span className="text-blue-400"> (+{boost}% progress)</span>}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
