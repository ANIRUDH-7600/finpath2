'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Zap, Plus, FileDown, Loader2, TrendingUp, Target } from 'lucide-react'
import toast from 'react-hot-toast'
import HealthScore from '@/components/HealthScore'
import LeakageCard from '@/components/LeakageCard'
import GoalCard from '@/components/GoalCard'
import TransactionRow from '@/components/TransactionRow'
import AddExpenseDrawer from '@/components/AddExpenseDrawer'
import SpendingPie from '@/components/charts/SpendingPie'
import PortfolioDonut from '@/components/charts/PortfolioDonut'
import { formatINR } from '@/lib/utils/formatCurrency'
import type { DashboardData, User } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const fetchDashboard = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/dashboard?user_id=${userId}`)
      if (!res.ok) throw new Error('Dashboard fetch failed')
      const json = await res.json()
      setData(json)
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('finpath_user')
    if (!stored) { router.replace('/auth/signin'); return }
    const u = JSON.parse(stored) as User
    setUser(u)
    fetchDashboard(u.id)
  }, [router, fetchDashboard])

  async function handleExportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    const el = document.getElementById('dashboard-export')
    if (!el) return
    const toastId = toast.loading('Generating PDF...')
    const canvas = await html2canvas(el, { scale: 1.5, backgroundColor: '#0A0A0A' })
    const img = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const w = pdf.internal.pageSize.getWidth()
    const h = (canvas.height * w) / canvas.width
    pdf.addImage(img, 'PNG', 0, 0, w, h)
    pdf.save('finpath-report.pdf')
    toast.dismiss(toastId)
    toast.success('PDF downloaded!')
  }

  const activeGoalId = data?.goals?.[0]?.id ?? ''

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse bg-surface-raised rounded-2xl h-32 border border-border" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const pieData = Object.entries(data.analysis.categories)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  const incomeUsedPct = data.user.monthly_income > 0
    ? Math.min(100, Math.round((data.analysis.monthly_total / data.user.monthly_income) * 100))
    : 0

  return (
    <div className="p-6 md:p-8" id="dashboard-export">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-text-base">
            {greeting}, {data.user.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Here&apos;s your financial snapshot</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 bg-surface-raised border border-border rounded-xl px-4 py-2 text-sm text-text-muted hover:text-text-base hover:border-brand/30 transition-all"
        >
          <FileDown size={14} />
          Export PDF
        </button>
      </div>

      {/* Row 1 — Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-surface-raised border border-border rounded-2xl p-5 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-3">Financial Health</p>
          <HealthScore score={data.analysis.health_score} label={data.analysis.health_label} />
        </div>

        <div className="bg-surface-raised border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-2">Monthly Spend</p>
          <p className="text-3xl font-bold text-text-base">{formatINR(data.analysis.monthly_total)}</p>
          <p className="text-xs text-text-muted mt-1">
            {incomeUsedPct}% of income · {Object.keys(data.analysis.categories).length} categories
          </p>
          <div className="mt-3 w-full bg-border rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${incomeUsedPct}%`,
                background: incomeUsedPct > 80 ? '#ef4444' : incomeUsedPct > 60 ? '#f59e0b' : '#02FF9D',
              }}
            />
          </div>
        </div>

        <div className="bg-surface-raised border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-2">Saved by Guardian</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-brand">{formatINR(data.money_saved_by_guardian)}</p>
            <Shield size={18} className="text-brand" />
          </div>
          <p className="text-xs text-text-muted mt-1">By reconsidering nudged purchases</p>
        </div>
      </div>

      {/* Row 2 — Spending + Insight */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
        <div className="md:col-span-3 bg-surface-raised border border-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-text-base mb-4">Spending Breakdown</p>
          <SpendingPie data={pieData} />
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="bg-surface-raised border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} className="text-brand" />
              <p className="text-sm font-semibold text-text-base">AI Insight</p>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">{data.analysis.top_insight}</p>
          </div>

          {data.portfolio && (
            <div className="bg-surface-raised border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-brand" />
                <p className="text-sm font-semibold text-text-base">Portfolio</p>
              </div>
              <PortfolioDonut allocation={data.portfolio.allocation} />
              <p className="text-xs text-center text-text-muted mt-2">
                SIP: <span className="font-bold text-brand">{formatINR(data.portfolio.sip_amount)}/mo</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Row 3 — Spending Leaks */}
      {data.analysis.leakage_patterns.length > 0 && (
        <div className="mb-5">
          <p className="text-sm font-semibold text-text-base mb-3">Spending Leaks</p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {data.analysis.leakage_patterns.map((p, i) => (
              <LeakageCard key={i} pattern={p.pattern} amount={p.amount} frequency={p.frequency} suggestion={p.suggestion} />
            ))}
          </div>
        </div>
      )}

      {/* Row 4 — Goals */}
      {data.goals.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-brand" />
              <p className="text-sm font-semibold text-text-base">Goals</p>
            </div>
            <Link href="/goals" className="text-xs text-brand hover:underline">Manage →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.goals.slice(0, 2).map((g) => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}

      {/* Row 5 — Recent Transactions */}
      <div className="bg-surface-raised border border-border rounded-2xl p-5 mb-24">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-text-base">Recent Transactions</p>
          <Link href="/transactions" className="text-xs text-brand hover:underline">See all →</Link>
        </div>
        {data.recent_transactions.length === 0 ? (
          <p className="text-sm text-text-faint text-center py-6">No transactions yet</p>
        ) : (
          data.recent_transactions.map((t) => <TransactionRow key={t.id} transaction={t} />)
        )}
      </div>

      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-6 right-6 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-2xl px-5 py-3.5 flex items-center gap-2 text-sm transition-colors z-30"
      >
        <Plus size={18} />
        Add Expense
      </button>

      <AddExpenseDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeGoalId={activeGoalId}
        userId={user?.id ?? ''}
        onSuccess={() => user && fetchDashboard(user.id)}
      />
    </div>
  )
}
