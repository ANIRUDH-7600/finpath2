// app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Shield, Zap, Plus, FileDown, TrendingUp, Target, Globe, Loader2, Receipt, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import HealthScore from '@/components/HealthScore'
import LeakageCard from '@/components/LeakageCard'
import GoalCard from '@/components/GoalCard'
import TransactionRow from '@/components/TransactionRow'
import AddExpenseDrawer from '@/components/AddExpenseDrawer'
import SpendingPie from '@/components/charts/SpendingPie'
import PortfolioDonut from '@/components/charts/PortfolioDonut'
import { IncomeSetupModal } from '@/components/IncomeModal'
import { formatINR } from '@/lib/utils/formatCurrency'
import type { DashboardData, MacroInsight, TransactionCategory } from '@/types'

const CATEGORIES: TransactionCategory[] = [
  'Food & Dining', 'Transport', 'Entertainment', 'Subscriptions',
  'Shopping', 'Utilities', 'Healthcare', 'Other',
]

const inputClass = "w-full bg-[#1C1C1C] border border-border rounded-xl px-4 py-3 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [macro, setMacro] = useState<MacroInsight | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showIncomeModal, setShowIncomeModal] = useState(false)

  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<TransactionCategory>('Food & Dining')
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [addingFirst, setAddingFirst] = useState(false)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  async function loadDashboard() {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const [dashRes, macroRes] = await Promise.all([
        fetch(`/api/dashboard?user_id=${session.user.id}`),
        fetch('/api/macro'),
      ])
      
      if (dashRes.ok) {
        const dashboardData = await dashRes.json()
        setData(dashboardData)
        
        if (!dashboardData.user.monthly_income || dashboardData.user.monthly_income === 0) {
          setShowIncomeModal(true)
        }
      }
      
      if (macroRes.ok) setMacro(await macroRes.json())
    } catch (error) {
      console.error('Load error:', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') loadDashboard()
  }, [status, session?.user?.id])

  async function handleAddFirstExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!merchant || !amount || !session?.user?.id) return
    setAddingFirst(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.user.id,
          merchant,
          amount: parseFloat(amount),
          category,
          date: expDate,
          note,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Expense added! Analyzing your data...')
      setMerchant('')
      setAmount('')
      setNote('')
      await loadDashboard()
    } catch {
      toast.error('Failed to add expense')
    } finally {
      setAddingFirst(false)
    }
  }

  async function handleExportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    const el = document.getElementById('dashboard-export')
    if (!el) return
    const toastId = toast.loading('Generating PDF...')
    try {
      const canvas = await html2canvas(el, { scale: 1.5, backgroundColor: '#0A0A0A' })
      const img = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(img, 'PNG', 0, 0, w, h)
      pdf.save('finpath-report.pdf')
      toast.dismiss(toastId)
      toast.success('PDF downloaded!')
    } catch {
      toast.dismiss(toastId)
      toast.error('Failed to generate PDF')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse bg-surface-raised rounded-2xl h-32 border border-border" />
        ))}
      </div>
    )
  }

  const hasTransactions = (data?.recent_transactions?.length ?? 0) > 0

  // EMPTY STATE - No transactions yet
  if (!hasTransactions) {
    return (
      <div className="p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-base">
            {greeting}, {session?.user?.name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Your AI Personal CFO is ready — let&apos;s get your data in</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-raised border border-brand/20 rounded-2xl p-6">
            <h2 className="text-base font-bold text-text-base mb-1">Add your first expense</h2>
            <p className="text-xs text-text-muted mb-5">Once you add a few expenses, the AI will activate and analyze your patterns.</p>
            <form onSubmit={handleAddFirstExpense} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted block mb-1">Merchant</label>
                  <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Swiggy, Zomato..." className={inputClass} required />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Amount (₹)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="450" className={inputClass} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted block mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as TransactionCategory)} className={inputClass}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Date</label>
                  <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className={inputClass} />
                </div>
              </div>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={inputClass} />
              <button type="submit" disabled={addingFirst} className="w-full bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {addingFirst && <Loader2 size={14} className="animate-spin" />}
                {addingFirst ? 'Saving...' : 'Add Expense & Analyze →'}
              </button>
            </form>
          </div>

          <div className="bg-surface-raised border border-border rounded-2xl p-6">
            <h2 className="text-base font-bold text-text-base mb-1">Or import your bank statement</h2>
            <p className="text-xs text-text-muted mb-5">Upload a CSV or UPI PDF to instantly load months of transaction history.</p>
            <div className="space-y-3">
              <Link href="/transactions?tab=import" className="flex items-center gap-3 bg-surface border border-border rounded-xl p-4 hover:border-brand/30 transition-all">
                <Receipt size={18} className="text-brand" />
                <div>
                  <p className="text-sm font-semibold text-text-base">Import Bank CSV / UPI PDF</p>
                  <p className="text-xs text-text-muted">HDFC, SBI, Axis · PhonePe, GPay</p>
                </div>
              </Link>
              <Link href="/transactions" className="flex items-center gap-3 bg-surface border border-border rounded-xl p-4 hover:border-brand/30 transition-all">
                <Plus size={18} className="text-text-muted" />
                <div>
                  <p className="text-sm font-semibold text-text-base">Add multiple expenses manually</p>
                  <p className="text-xs text-text-muted">Use the full transactions page</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Income Modal */}
        {showIncomeModal && session?.user?.id && (
          <IncomeSetupModal
            isOpen={showIncomeModal}
            userId={session.user.id}
            onComplete={() => {
              setShowIncomeModal(false)
              loadDashboard()
            }}
          />
        )}
      </div>
    )
  }

  // FULL DASHBOARD - Has transactions
  const pieData = Object.entries(data?.analysis.categories ?? {})
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  const monthlyIncome = data?.user.monthly_income ?? 0
  const monthlySpending = data?.analysis.monthly_total ?? 0
  const monthlySavings = data?.savings ?? Math.max(0, monthlyIncome - monthlySpending)
  const savingsRate = data?.analysis.savings_rate ?? (monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0)
  const incomeUsedPct = monthlyIncome > 0 ? Math.min(100, Math.round((monthlySpending / monthlyIncome) * 100)) : 0

  const activeGoalId = data?.goals?.[0]?.id ?? ''

  // Get savings insight message
  const getSavingsInsight = () => {
    if (savingsRate >= 30) return '🚀 Excellent! You\'re building wealth fast'
    if (savingsRate >= 20) return '🎯 Great! You\'re on track for financial freedom'
    if (savingsRate >= 10) return '📈 Good start! Aim for 20% savings rate'
    if (savingsRate > 0) return '⚠️ Try to reduce expenses to save more'
    return '🔴 Your spending exceeds income. Review your expenses immediately'
  }

  return (
    <div className="p-6 md:p-8" id="dashboard-export">
      {/* Income Modal */}
      {showIncomeModal && session?.user?.id && (
        <IncomeSetupModal
          isOpen={showIncomeModal}
          userId={session.user.id}
          onComplete={() => {
            setShowIncomeModal(false)
            loadDashboard()
          }}
        />
      )}

      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-text-base">
            {greeting}, {data?.user.name?.split(' ')[0] ?? session?.user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Here&apos;s your financial snapshot</p>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 bg-surface-raised border border-border rounded-xl px-4 py-2 text-sm text-text-muted hover:text-text-base hover:border-brand/30 transition-all">
          <FileDown size={14} />
          Export PDF
        </button>
      </div>

      {/* Row 1 — Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div className="bg-surface-raised border border-border rounded-2xl p-5 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-3">Financial Health</p>
          <HealthScore score={data?.analysis.health_score ?? 50} label={data?.analysis.health_label ?? 'Average'} />
        </div>

        <div className="bg-surface-raised border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-2">Monthly Income</p>
          <p className="text-3xl font-bold text-text-base">{formatINR(monthlyIncome)}</p>
          <button 
            onClick={() => setShowIncomeModal(true)}
            className="text-xs text-brand hover:underline mt-1 block"
          >
            Update income →
          </button>
        </div>

        <div className="bg-surface-raised border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-2">Monthly Spend</p>
          <p className="text-3xl font-bold text-text-base">{formatINR(monthlySpending)}</p>
          <p className="text-xs text-text-muted mt-1">
            {incomeUsedPct}% of income · {Object.keys(data?.analysis.categories ?? {}).length} categories
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
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-text-faint uppercase tracking-wider">Monthly Savings</p>
            <DollarSign size={14} className="text-brand" />
          </div>
          <p className="text-3xl font-bold text-brand">{formatINR(monthlySavings)}</p>
          <p className="text-xs text-text-muted mt-1">
            {savingsRate.toFixed(1)}% savings rate
          </p>
          <div className="mt-3 w-full bg-border rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.min(100, savingsRate)}%` }}
            />
          </div>
          <p className="text-xs text-text-faint mt-2">{getSavingsInsight()}</p>
        </div>
      </div>

      {/* Row 2 — Macro insight */}
      {macro && (
        <div className="bg-surface-raised border border-border rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-text-muted" />
              <p className="text-sm font-semibold text-text-base">Market Intelligence</p>
            </div>
            <span className={`text-xs font-bold rounded-full px-2.5 py-0.5 ${
              macro.sentiment === 'bullish' ? 'bg-brand-muted text-brand' :
              macro.sentiment === 'cautious' ? 'bg-orange-500/10 text-orange-400' :
              'bg-border text-text-muted'
            }`}>
              {macro.sentiment.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-text-faint uppercase font-semibold mb-1">Market Outlook</p>
              <p className="text-xs text-text-muted leading-relaxed">{macro.market_outlook}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-faint uppercase font-semibold mb-1">RBI / Policy</p>
              <p className="text-xs text-text-muted leading-relaxed">{macro.rbi_note}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-faint uppercase font-semibold mb-1">Your Action</p>
              <p className="text-xs text-brand font-medium leading-relaxed">{macro.action_tip}</p>
            </div>
          </div>
        </div>
      )}

      {/* Row 3 — Spending + AI Insight */}
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
            <p className="text-sm text-text-muted leading-relaxed">{data?.analysis.top_insight}</p>
          </div>

          {data?.portfolio && (
            <div className="bg-surface-raised border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-brand" />
                <p className="text-sm font-semibold text-text-base">Portfolio</p>
              </div>
              <PortfolioDonut allocation={data.portfolio.allocation} />
              <p className="text-xs text-center text-text-muted mt-2">
                SIP: <span className="font-bold text-brand">{formatINR(data.portfolio.sip_amount)}/mo</span>
              </p>
              <p className="text-xs text-text-faint text-center mt-1">
                Based on your {formatINR(monthlySavings)} monthly savings
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Row 4 — Spending Leaks */}
      {(data?.analysis.leakage_patterns.length ?? 0) > 0 && (
        <div className="mb-5">
          <p className="text-sm font-semibold text-text-base mb-3">Spending Leaks</p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {data?.analysis.leakage_patterns.map((p, i) => (
              <LeakageCard key={i} pattern={p.pattern} amount={p.amount} frequency={p.frequency} suggestion={p.suggestion} />
            ))}
          </div>
        </div>
      )}

      {/* Row 5 — Goals */}
      {(data?.goals.length ?? 0) > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-brand" />
              <p className="text-sm font-semibold text-text-base">Goals</p>
            </div>
            <Link href="/goals" className="text-xs text-brand hover:underline">Manage →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.goals.slice(0, 2).map((g) => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}

      {/* Row 6 — Recent Transactions */}
      <div className="bg-surface-raised border border-border rounded-2xl p-5 mb-24">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-text-base">Recent Transactions</p>
          <Link href="/transactions" className="text-xs text-brand hover:underline">See all →</Link>
        </div>
        {(data?.recent_transactions.length ?? 0) === 0 ? (
          <p className="text-sm text-text-faint text-center py-6">No transactions yet</p>
        ) : (
          data?.recent_transactions.map((t) => <TransactionRow key={t.id} transaction={t} />)
        )}
      </div>

      {/* Add Expense Button */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-6 right-6 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-2xl px-5 py-3.5 flex items-center gap-2 text-sm transition-colors z-30 shadow-lg"
      >
        <Plus size={18} />
        Add Expense
      </button>

      {/* Add Expense Drawer */}
      <AddExpenseDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeGoalId={activeGoalId}
        userId={session?.user?.id ?? ''}
        onSuccess={loadDashboard}
      />
    </div>
  )
}