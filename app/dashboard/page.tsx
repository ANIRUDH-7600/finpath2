// app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Zap, Plus, FileDown, TrendingUp, Target, Globe, Loader2, Receipt, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import HealthScore from '@/components/HealthScore'
import LeakageCard from '@/components/LeakageCard'
import GoalCard from '@/components/GoalCard'
import TransactionRow from '@/components/TransactionRow'
import AddExpenseDrawer from '@/components/AddExpenseDrawer'
import SpendingPie from '@/components/charts/SpendingPie'
import { IncomeSetupModal } from '@/components/IncomeModal'
import { formatINR } from '@/lib/utils/formatCurrency'
import type { DashboardData, MacroInsight, TransactionCategory } from '@/types'

const CATEGORIES: TransactionCategory[] = [
  'Food & Dining', 'Transport', 'Entertainment', 'Subscriptions',
  'Shopping', 'Utilities', 'Healthcare', 'Other',
]

const inputClass = "w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"

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
          <div key={i} className="animate-pulse bg-surface-raised rounded-xl h-32 border border-border" />
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
          <h1 className="text-3xl font-bold text-text-base">
            {greeting}, {session?.user?.name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Your AI Personal CFO is ready — let&apos;s get your data in</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-raised border border-brand/20 rounded-xl p-6">
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

          <div className="bg-surface-raised border border-border rounded-xl p-6">
            <h2 className="text-base font-bold text-text-base mb-1">Or import your bank statement</h2>
            <p className="text-xs text-text-muted mb-5">Upload a CSV or UPI PDF to instantly load months of transaction history.</p>
            <div className="space-y-3">
              <Link href="/transactions?tab=import" className="flex items-center gap-3 bg-surface border border-border rounded-xl p-4 hover:border-brand/30 transition-all">
                <Receipt size={18} className="text-brand" />
                <div>
                  <p className="text-base font-semibold text-text-base">Import Bank CSV / UPI PDF</p>
                  <p className="text-xs text-text-muted">HDFC, SBI, Axis · PhonePe, GPay</p>
                </div>
              </Link>
              <Link href="/transactions" className="flex items-center gap-3 bg-surface border border-border rounded-xl p-4 hover:border-brand/30 transition-all">
                <Plus size={18} className="text-text-muted" />
                <div>
                  <p className="text-base font-semibold text-text-base">Add multiple expenses manually</p>
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
  const emiMonthly = data?.emi_monthly ?? 0
  const sipMonthly = data?.sip_monthly ?? 0
  const sipPortfolioValue = data?.sip_portfolio_value ?? 0
  const sipTotalInvested = data?.sip_total_invested ?? 0
  const sipGainLoss = data?.sip_gain_loss ?? 0
  const monthlySavings = data?.savings ?? Math.max(0, monthlyIncome - monthlySpending - emiMonthly)
  const netCash = data?.net_cash ?? Math.max(0, monthlySavings - sipMonthly)
  const savingsRate = data?.analysis.savings_rate ?? (monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0)
  const incomeUsedPct = monthlyIncome > 0 ? Math.min(100, Math.round((monthlySpending / monthlyIncome) * 100)) : 0
  const hasEmiOrSip = emiMonthly > 0 || sipMonthly > 0

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
          <h1 className="text-3xl font-bold text-text-base">
            {greeting}, {data?.user.name?.split(' ')[0] ?? session?.user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Here&apos;s your financial snapshot</p>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 bg-surface-raised border border-border rounded-lg px-3.5 py-2 text-[12px] text-text-muted hover:text-text-base hover:border-brand/30 transition-all">
          <FileDown size={13} />
          Export PDF
        </button>
      </div>

      {/* Row 1 — Key metrics */}
      <div className="bg-surface-raised border border-border rounded-xl mb-5 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          <div className="p-5 flex flex-col items-center justify-center">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3">Health Score</p>
            <HealthScore score={data?.analysis.health_score ?? 50} label={data?.analysis.health_label ?? 'Average'} />
          </div>

          <div className="p-5">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2">Income</p>
            <p className="text-3xl font-bold text-text-base num">{formatINR(monthlyIncome)}</p>
            <button onClick={() => setShowIncomeModal(true)} className="text-[11px] text-brand hover:underline mt-1.5 block">
              Update →
            </button>
          </div>

          <div className="p-5">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2">Spending</p>
            <p className="text-3xl font-bold text-text-base num">{formatINR(monthlySpending)}</p>
            <p className="text-[11px] text-text-faint mt-1">{incomeUsedPct}% of income</p>
            <div className="mt-2.5 w-full bg-border rounded-full h-1 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${incomeUsedPct}%`, background: incomeUsedPct > 80 ? '#ef4444' : incomeUsedPct > 60 ? '#f59e0b' : '#02FF9D' }} />
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Saved</p>
              <DollarSign size={13} className="text-brand" />
            </div>
            <p className="text-3xl font-bold text-brand num">{formatINR(monthlySavings)}</p>
            <p className="text-[11px] text-text-faint mt-1">{savingsRate.toFixed(1)}% rate</p>
            <div className="mt-2.5 w-full bg-border rounded-full h-1 overflow-hidden">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, savingsRate)}%` }} />
            </div>
            {emiMonthly > 0 && <p className="text-[10px] text-orange-400 mt-1.5">–{formatINR(emiMonthly)} EMI</p>}
          </div>
        </div>
      </div>

      {/* Money Flow Strip */}
      {hasEmiOrSip && (
        <div className="bg-surface-raised border border-border rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Income Allocation</p>
            <Link href="/cashflow" className="text-xs text-brand hover:underline">Manage →</Link>
          </div>
          <div className="flex items-center gap-1 h-5 rounded-full overflow-hidden mb-3">
            {monthlyIncome > 0 && [
              { label: 'Expenses', val: monthlySpending, color: 'bg-red-400' },
              { label: 'EMIs', val: emiMonthly, color: 'bg-orange-400' },
              { label: 'SIPs', val: sipMonthly, color: 'bg-blue-400' },
              { label: 'Free', val: Math.max(0, netCash), color: 'bg-brand/70' },
            ].map(s => s.val > 0 && (
              <div key={s.label} className={`h-full ${s.color} transition-all`} style={{ width: `${Math.min(100, (s.val / monthlyIncome) * 100)}%` }} title={`${s.label}: ${formatINR(s.val)}`} />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Expenses', val: monthlySpending, color: 'bg-red-400' },
              { label: 'EMIs', val: emiMonthly, color: 'bg-orange-400' },
              { label: 'SIPs', val: sipMonthly, color: 'bg-blue-400' },
              { label: 'Free Cash', val: Math.max(0, netCash), color: 'bg-brand/70' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${s.color}`} />
                <div>
                  <p className="text-[10px] text-text-faint">{s.label}</p>
                  <p className="text-xs font-bold text-text-base">{formatINR(s.val)}</p>
                </div>
              </div>
            ))}
          </div>
          {sipPortfolioValue > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <TrendingUp size={12} className="text-blue-400" />
                  <p className="text-xs text-text-faint">SIP Portfolio Value</p>
                </div>
                <p className="text-sm font-bold text-blue-400">{formatINR(sipPortfolioValue)}</p>
              </div>
              {sipTotalInvested > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-text-faint">Invested: {formatINR(sipTotalInvested)}</p>
                  <p className={`text-[10px] font-semibold ${sipGainLoss >= 0 ? 'text-brand' : 'text-red-400'}`}>
                    {sipGainLoss >= 0 ? '+' : ''}{formatINR(sipGainLoss)} ({sipTotalInvested > 0 ? ((sipGainLoss / sipTotalInvested) * 100).toFixed(1) : '0'}%)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Row 2 — Live Market + Portfolio */}
      <div className="bg-surface-raised border border-border rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-text-faint" />
            <p className="text-base font-semibold text-text-base">Investments</p>
          </div>
          <Link href="/portfolio" className="text-xs text-brand hover:underline">Manage →</Link>
        </div>

        {/* Live market ticker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {macro?.nifty_level && (
            <div className="bg-surface rounded-xl p-3">
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Nifty 50</p>
              <p className="text-lg font-black text-text-base">{macro.nifty_level.toLocaleString('en-IN')}</p>
            </div>
          )}
          {macro?.nifty_pe && (
            <div className="bg-surface rounded-xl p-3">
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">PE Ratio</p>
              <p className={`text-lg font-black ${macro.nifty_pe > 25 ? 'text-red-400' : macro.nifty_pe < 18 ? 'text-brand' : 'text-yellow-400'}`}>
                {macro.nifty_pe}
              </p>
              <p className="text-[10px] text-text-faint">{macro.nifty_pe > 25 ? 'expensive' : macro.nifty_pe < 18 ? 'cheap' : 'fair value'}</p>
            </div>
          )}
          {macro?.repo_rate && (
            <div className="bg-surface rounded-xl p-3">
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Repo Rate</p>
              <p className="text-lg font-black text-text-base">{macro.repo_rate}%</p>
            </div>
          )}
          {macro?.inflation && (
            <div className="bg-surface rounded-xl p-3">
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Inflation</p>
              <p className={`text-lg font-black ${macro.inflation > 6 ? 'text-orange-400' : 'text-text-base'}`}>{macro.inflation}%</p>
            </div>
          )}
          {/* Fallback when no macro numbers yet */}
          {!macro?.nifty_level && !macro?.nifty_pe && (
            <div className="col-span-2 sm:col-span-4 flex items-center gap-2 text-xs text-text-faint">
              <Loader2 size={12} className="animate-spin" />
              Fetching live market data…
            </div>
          )}
        </div>

        {/* Sentiment + signal */}
        {macro && (
          <div className="flex items-center gap-3 mb-5">
            <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${
              macro.sentiment === 'bullish' ? 'bg-brand/10 text-brand' :
              macro.sentiment === 'bearish' ? 'bg-red-500/10 text-red-400' :
              'bg-yellow-400/10 text-yellow-400'
            }`}>
              {macro.sentiment.toUpperCase()}
            </span>
            {macro.market_signal && (
              <p className="text-xs text-text-faint truncate">{macro.market_signal}</p>
            )}
          </div>
        )}

        {/* Portfolio allocation */}
        {data?.portfolio ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-text-faint uppercase tracking-wider">Your Allocation</p>
              <p className="text-xs font-bold text-brand">SIP {formatINR(data.portfolio.sip_amount)}/mo</p>
            </div>
            <div className="space-y-1.5">
              {Object.entries(data.portfolio.allocation).map(([key, val]) => {
                const colors: Record<string, string> = { equity: '#02FF9D', debt: '#3B82F6', gold: '#F59E0B', cash: '#6B7280' }
                const color = colors[key] ?? '#6B7280'
                return (
                  <div key={key} className="flex items-center gap-2">
                    <p className="text-[10px] text-text-faint capitalize w-10 shrink-0">{key}</p>
                    <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${val}%`, background: color }} />
                    </div>
                    <p className="text-[10px] font-bold text-text-base w-8 text-right">{String(val)}%</p>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <Link
            href="/portfolio"
            className="flex items-center justify-between bg-brand/5 border border-brand/20 rounded-xl px-4 py-3 hover:border-brand/40 transition-all"
          >
            <div>
              <p className="text-sm font-semibold text-brand">Generate AI Portfolio</p>
              <p className="text-xs text-text-faint mt-0.5">Based on your risk profile + live market data</p>
            </div>
            <TrendingUp size={18} className="text-brand shrink-0" />
          </Link>
        )}
      </div>

      {/* Row 3 — Spending + AI Insight */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
        <div className="md:col-span-3 bg-surface-raised border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-semibold text-text-base">Spending Breakdown</p>
            {(emiMonthly > 0 || sipMonthly > 0) && (
              <span className="text-[10px] text-text-faint">Expenses only · <Link href="/cashflow" className="text-brand hover:underline">full flow →</Link></span>
            )}
          </div>
          <SpendingPie data={pieData} /></div>

        <div className="md:col-span-2">
          <div className="bg-surface-raised border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} className="text-brand" />
              <p className="text-base font-semibold text-text-base">AI Insight</p>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">{data?.analysis.top_insight}</p>
            {macro?.action_tip && (
              <p className="text-xs text-brand mt-3 pt-3 border-t border-border">{macro.action_tip}</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 4 — Spending Leaks */}
      {(data?.analysis.leakage_patterns.length ?? 0) > 0 && (
        <div className="mb-5">
          <p className="text-base font-semibold text-text-base mb-3">Spending Leaks</p>
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
              <p className="text-base font-semibold text-text-base">Goals</p>
            </div>
            <Link href="/goals" className="text-xs text-brand hover:underline">Manage →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.goals.slice(0, 2).map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onUpdate={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Row 6 — Recent Transactions */}
      <div className="bg-surface-raised border border-border rounded-xl p-5 mb-24">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-semibold text-text-base">Recent Transactions</p>
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
        className="fixed bottom-6 right-6 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl px-5 py-3.5 flex items-center gap-2 text-sm transition-colors z-30 shadow-lg"
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