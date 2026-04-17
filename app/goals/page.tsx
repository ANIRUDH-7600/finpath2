'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, Target, Plus, Zap, X } from 'lucide-react'
import toast from 'react-hot-toast'
import GoalCard from '@/components/GoalCard'
import { formatINR } from '@/lib/utils/formatCurrency'
import { calculateDailySave, goalDeadlineDate } from '@/lib/utils/goalMath'
import type { Goal } from '@/types'

const inputClass = "w-full bg-[#1C1C1C] border border-border rounded-xl px-4 py-3 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"

export default function GoalsPage() {
  const { data: session, status } = useSession()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [months, setMonths] = useState(12)

  const userId = session?.user?.id
  const income = session?.user?.monthly_income ?? 50000

  const liveDaily = title && target && months
    ? calculateDailySave(parseFloat(target) || 0, parseFloat(saved) || 0, months)
    : 0
  const liveDeadline = goalDeadlineDate(months)
  const liveMonthly = liveDaily * 30
  const livePct = income > 0 ? Math.round((liveMonthly / income) * 100) : 0
  const feasible = income > 0 && liveMonthly < income * 0.5

  const loadGoals = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/goals?user_id=${userId}`)
      if (res.ok) setGoals(await res.json())
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
      // Calls /api/calculate-goal which runs Claude to generate narrative + saves to DB
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
      toast.success(`Goal created! Save ₹${result.daily_save}/day`)
      setTitle(''); setTarget(''); setSaved(''); setMonths(12)
      setShowForm(false)
      loadGoals()
    } catch {
      toast.error('Failed to create goal')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-surface-raised rounded-2xl h-36 border border-border" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-base">Goals</h1>
          <p className="text-xs text-text-muted mt-0.5">AI-powered savings planner</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl px-4 py-2.5 text-sm"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New Goal'}
        </button>
      </div>

      {/* Goal creation form */}
      {showForm && (
        <div className="bg-surface-raised border border-brand/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-brand" />
            <h2 className="text-base font-bold text-text-base">New Savings Goal</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-muted block mb-1">Goal title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Europe Trip, Emergency Fund..." className={inputClass} required />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Target amount (₹)</label>
                <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="300000" className={inputClass} required />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Already saved (₹)</label>
                <input type="number" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Deadline (months): {months}</label>
                <input type="range" min={1} max={120} value={months} onChange={(e) => setMonths(parseInt(e.target.value))} className="w-full accent-brand" />
                <div className="flex justify-between text-[10px] text-text-faint mt-1">
                  <span>1 mo</span><span>Target: {liveDeadline}</span><span>10 yrs</span>
                </div>
              </div>
            </div>

            {/* Live preview */}
            {liveDaily > 0 && (
              <div className={`rounded-xl p-4 border ${feasible ? 'bg-brand-muted border-brand/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-brand">{formatINR(liveDaily)}</p>
                    <p className="text-[10px] text-text-muted uppercase font-semibold">Per Day</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-text-base">{formatINR(liveMonthly)}</p>
                    <p className="text-[10px] text-text-muted uppercase font-semibold">Per Month</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${livePct > 50 ? 'text-orange-400' : 'text-brand'}`}>{livePct}%</p>
                    <p className="text-[10px] text-text-muted uppercase font-semibold">Of Income</p>
                  </div>
                </div>
                <p className={`text-xs text-center mt-2 font-medium ${feasible ? 'text-brand' : 'text-orange-400'}`}>
                  {feasible ? '✓ Feasible — AI will generate your savings plan' : '⚠ Exceeds 50% of income — consider extending the deadline'}
                </p>
              </div>
            )}

            <button type="submit" disabled={submitting || !feasible} className="w-full bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? <><Loader2 size={14} className="animate-spin" />Generating AI plan...</> : 'Create Goal with AI Plan →'}
            </button>
          </form>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className="text-center py-16 bg-surface-raised border border-border rounded-2xl">
          <Target size={40} className="text-text-faint mx-auto mb-4" />
          <p className="text-text-base font-semibold mb-1">No goals yet</p>
          <p className="text-sm text-text-muted mb-5">Set a financial goal and AI will calculate exactly what you need to save daily — inflation adjusted.</p>
          <button onClick={() => setShowForm(true)} className="bg-brand text-[#0A0A0A] font-bold rounded-xl px-6 py-3 text-sm flex items-center gap-2 mx-auto">
            <Plus size={16} /> Create first goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}
    </div>
  )
}
