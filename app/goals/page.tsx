'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Target, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import GoalCard from '@/components/GoalCard'
import { formatINR } from '@/lib/utils/formatCurrency'
import { calculateDailySave, goalDeadlineDate } from '@/lib/utils/goalMath'
import type { Goal, User } from '@/types'

const inputClass = "w-full bg-[#1C1C1C] border border-border rounded-xl px-4 py-3 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"

export default function GoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState('')
  const [income, setIncome] = useState(0)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [months, setMonths] = useState(12)

  const liveDaily = title && target && months
    ? calculateDailySave(parseFloat(target) || 0, parseFloat(saved) || 0, months)
    : 0
  const liveDeadline = goalDeadlineDate(months)
  const liveMonthly = liveDaily * 30
  const livePct = income > 0 ? Math.round((liveMonthly / income) * 100) : 0
  const feasible = income > 0 && liveMonthly < income * 0.5

  const fetchGoals = useCallback(async (uid: string) => {
    const res = await fetch(`/api/goals?user_id=${uid}`)
    const data = await res.json()
    setGoals(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('finpath_user')
    if (!stored) { router.replace('/auth/signin'); return }
    const u = JSON.parse(stored) as User
    setUserId(u.id)
    setIncome(u.monthly_income)
    fetchGoals(u.id).finally(() => setLoading(false))
  }, [router, fetchGoals])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !target) return
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
      if (!res.ok) throw new Error('Failed')
      toast.success('Goal created!')
      setTitle(''); setTarget(''); setSaved(''); setMonths(12)
      setShowForm(false)
      fetchGoals(userId)
    } catch {
      toast.error('Failed to create goal')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-base">Goal Planning</h1>
          <p className="text-sm text-text-muted mt-0.5">AI-powered savings plan for your dreams</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl px-4 py-2.5 text-sm transition-colors"
        >
          <Plus size={16} />
          New Goal
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-raised border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-text-base mb-4">Create a new goal</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">What are you saving for?</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goa trip, New bike, Emergency fund..." className={inputClass} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1.5">Target amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-text-muted text-sm">₹</span>
                  <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="30000" className={`${inputClass} pl-8`} required />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1.5">Already saved</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-text-muted text-sm">₹</span>
                  <input type="number" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" className={`${inputClass} pl-8`} />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">
                Timeline: <span className="text-brand font-bold">{months} months</span>
              </label>
              <input type="range" min={3} max={120} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-text-faint mt-1">
                <span>3 months</span>
                <span>120 months</span>
              </div>
            </div>

            {liveDaily > 0 && (
              <div className="bg-brand-muted border border-brand/20 rounded-xl p-4">
                <div className="text-center mb-3">
                  <p className="text-xs text-text-muted mb-1">Daily savings needed</p>
                  <p className="text-3xl font-bold text-brand">{formatINR(liveDaily)}/day</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-text-faint">Monthly</p>
                    <p className="font-semibold text-text-base">{formatINR(liveMonthly)}</p>
                  </div>
                  <div>
                    <p className="text-text-faint">Deadline</p>
                    <p className="font-semibold text-text-base">{liveDeadline}</p>
                  </div>
                  <div>
                    <p className="text-text-faint">% of income</p>
                    <p className="font-semibold text-text-base">{livePct}%</p>
                  </div>
                </div>
                {income > 0 && (
                  <div className={`mt-3 text-center text-xs font-medium px-3 py-1.5 rounded-full ${feasible ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {feasible ? '✓ Feasible on your income' : '⚠ Stretch goal — consider longer timeline'}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-border text-text-muted rounded-xl py-3 text-sm hover:text-text-base hover:border-brand/30 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Creating with AI...' : 'Create Goal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse bg-surface-raised rounded-2xl h-32 border border-border" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-surface-raised border border-border rounded-2xl p-12 text-center">
          <div className="bg-brand-muted rounded-2xl p-3 w-fit mx-auto mb-4">
            <Target size={24} className="text-brand" />
          </div>
          <p className="text-sm font-semibold text-text-base mb-1">No goals yet</p>
          <p className="text-xs text-text-muted">Create your first goal to get an AI-powered savings plan</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl px-5 py-2.5 text-sm"
          >
            + Create First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}
    </div>
  )
}
