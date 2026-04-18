// app/portfolio/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, TrendingUp, Target, Shield, Zap, CheckCircle, AlertCircle, Wallet, BarChart3, PieChart } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatINR } from '@/lib/utils/formatCurrency'

interface PortfolioData {
  risk_score: number
  risk_label: string
  allocation: {
    equity: number
    debt: number
    gold: number
    cash: number
  }
  monthly_sip: number
  funds: Array<{ name: string; category: string; allocation: number; amount?: number }>
  reasoning: string
  action_needed: string
  expected_returns?: { conservative: number; expected: number; optimistic: number }
}

export default function PortfolioPage() {
  const { data: session } = useSession()
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [currentSavings, setCurrentSavings] = useState(0)
  const [monthlySpending, setMonthlySpending] = useState(0)

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData()
    }
  }, [session])

  async function loadDashboardData() {
    try {
      const res = await fetch(`/api/dashboard?user_id=${session?.user?.id}`)
      const data = await res.json()
      
      // Calculate savings from dashboard data
      const income = data.user?.monthly_income || 0
      const spending = data.analysis?.monthly_total || 0
      setMonthlySpending(spending)
      setCurrentSavings(income - spending)
      
      // Load existing portfolio if any
      if (data.portfolio) {
        // instruments can be an array of fund objects OR a Record<category, string[]>
        const rawInstruments = data.portfolio.instruments
        let funds: Array<{ name: string; category: string; allocation: number; amount?: number }> = []
        if (Array.isArray(rawInstruments)) {
          funds = rawInstruments
        } else if (rawInstruments && typeof rawInstruments === 'object') {
          // Convert { equity: ["Fund A", ...], debt: [...] } to flat array
          for (const [cat, names] of Object.entries(rawInstruments as Record<string, string[]>)) {
            if (Array.isArray(names)) {
              names.forEach(name => funds.push({ name, category: cat, allocation: Math.round(100 / names.length) }))
            }
          }
        }

        // Calculate blended expected returns from allocation
        const alloc = data.portfolio.allocation ?? {}
        const blended = ((alloc.equity ?? 0) * 12 + (alloc.debt ?? 0) * 8 + (alloc.gold ?? 0) * 10 + (alloc.cash ?? 0) * 4) / 100
        const expectedReturns = blended > 0 ? {
          conservative: Math.round((blended - 2) * 10) / 10,
          expected: Math.round(blended * 10) / 10,
          optimistic: Math.round((blended + 3) * 10) / 10,
        } : undefined

        setPortfolio({
          risk_score: data.user?.risk_appetite || 3,
          risk_label: getRiskLabel(data.user?.risk_appetite || 3),
          allocation: data.portfolio.allocation,
          monthly_sip: data.portfolio.sip_amount || 0,
          funds,
          reasoning: data.portfolio.reasoning,
          action_needed: data.portfolio.macro_note,
          expected_returns: expectedReturns,
        })
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  async function generatePortfolio() {
    setGenerating(true)
    try {
      const res = await fetch('/api/portfolio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: session?.user?.id }),
      })
      
      const data = await res.json()
      if (data.success) {
        setPortfolio({
          ...data.portfolio,
          expected_returns: data.portfolio.expected_returns,
        })
        toast.success('Portfolio generated based on your spending!')
      } else {
        toast.error(data.error || 'Generation failed')
      }
    } catch {
      toast.error('Failed to generate portfolio')
    } finally {
      setGenerating(false)
    }
  }

  async function acceptPortfolio() {
    if (!portfolio || !session?.user?.id) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const totalSIP = portfolio.monthly_sip

      // If funds have per-fund amounts or allocations, split SIP accordingly
      // Otherwise distribute equally across all funds
      const funds = portfolio.funds.filter(f => f.name)
      if (funds.length === 0) {
        toast.error('No funds to invest in')
        return
      }

      const sipPromises = funds.map((f, i) => {
        let sipAmount: number
        if ((f.amount ?? 0) > 0) {
          sipAmount = f.amount!
        } else if (f.allocation > 0) {
          sipAmount = Math.round(totalSIP * (f.allocation / 100))
        } else {
          // Equal split
          sipAmount = Math.round(totalSIP / funds.length)
        }
        // Give last fund any rounding remainder
        if (i === funds.length - 1) {
          const allocated = funds.slice(0, -1).reduce((s, f2) => {
            if ((f2.amount ?? 0) > 0) return s + f2.amount!
            if (f2.allocation > 0) return s + Math.round(totalSIP * (f2.allocation / 100))
            return s + Math.round(totalSIP / funds.length)
          }, 0)
          sipAmount = Math.max(1, totalSIP - allocated)
        }
        if (sipAmount <= 0) return Promise.resolve()
        return fetch('/api/sip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: session?.user?.id,
            asset_name: f.name,
            monthly_amount: sipAmount,
            start_date: today,
            expected_return: 12,
          }),
        })
      })
      await Promise.all(sipPromises)
      toast.success(`Portfolio accepted! ${funds.length} SIPs created for ${formatINR(totalSIP)}/month`)
    } catch {
      toast.error('Failed to create SIPs')
    }
  }

  function getRiskLabel(score: number): string {
    if (score <= 2) return 'Conservative'
    if (score <= 4) return 'Moderate'
    return 'Aggressive'
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-brand" />
      </div>
    )
  }

  const hasPortfolio = portfolio && portfolio.allocation

  // Calculate donut chart
  const allocations = hasPortfolio ? Object.entries(portfolio.allocation) : []
  const ALLOC_COLORS: Record<string, string> = {
    equity: '#02FF9D',
    debt: '#3B82F6',
    gold: '#F59E0B',
    cash: '#6B7280',
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-brand-muted flex items-center justify-center">
            <PieChart size={20} className="text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-base">AI Portfolio Advisor</h1>
            <p className="text-sm text-text-muted">Based on your spending, income, and financial goals</p>
          </div>
        </div>
      </div>

      {/* Financial Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-raised border border-border rounded-xl p-5">
          <p className="text-xs text-text-faint uppercase tracking-wider mb-1">Monthly Income</p>
          <p className="text-2xl font-bold text-text-base">{formatINR(session?.user?.monthly_income || 0)}</p>
        </div>
        <div className="bg-surface-raised border border-border rounded-xl p-5">
          <p className="text-xs text-text-faint uppercase tracking-wider mb-1">Monthly Spending</p>
          <p className="text-2xl font-bold text-text-base">{formatINR(monthlySpending)}</p>
        </div>
        <div className="bg-surface-raised border border-brand/20 rounded-xl p-5">
          <p className="text-xs text-text-faint uppercase tracking-wider mb-1">Monthly Savings</p>
          <p className="text-2xl font-bold text-brand">{formatINR(currentSavings)}</p>
        </div>
      </div>

      {/* Generate Button or Portfolio Display */}
      {!hasPortfolio ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-brand-muted border border-brand/20 flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={32} className="text-brand" />
          </div>
          <h2 className="text-xl font-bold text-text-base mb-2">No Portfolio Yet</h2>
          <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
            Let AI analyze your spending patterns and create a personalized investment portfolio
          </p>
          <button
            onClick={generatePortfolio}
            disabled={generating}
            className="px-8 py-3 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl flex items-center gap-2 mx-auto transition-all"
          >
            {generating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
            {generating ? 'Analyzing your finances...' : 'Generate AI Portfolio'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Risk Profile */}
          <div className="bg-surface-raised border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-brand" />
                <span className="text-sm font-semibold text-text-base">Risk Profile</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                portfolio.risk_label === 'Conservative' ? 'bg-blue-500/10 text-blue-400' :
                portfolio.risk_label === 'Aggressive' ? 'bg-orange-500/10 text-orange-400' :
                'bg-brand-muted text-brand'
              }`}>
                {portfolio.risk_label} · Score {portfolio.risk_score}/5
              </span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">{portfolio.reasoning}</p>
          </div>

          {/* Allocation Chart */}
          <div className="bg-surface-raised border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-text-base mb-4">Recommended Allocation</h3>
            <div className="flex flex-col md:flex-row gap-6 items-center">
              {/* Donut Chart */}
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {(() => {
                    let offset = 0
                    const paths = []
                    for (const [key, val] of allocations) {
                      const sweep = val * 3.6
                      const x1 = 50 + 40 * Math.cos((offset * Math.PI) / 180)
                      const y1 = 50 + 40 * Math.sin((offset * Math.PI) / 180)
                      const x2 = 50 + 40 * Math.cos(((offset + sweep) * Math.PI) / 180)
                      const y2 = 50 + 40 * Math.sin(((offset + sweep) * Math.PI) / 180)
                      const large = sweep > 180 ? 1 : 0
                      paths.push(
                        <path
                          key={key}
                          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z`}
                          fill={ALLOC_COLORS[key] ?? '#6B7280'}
                        />
                      )
                      offset += sweep
                    }
                    return paths
                  })()}
                  <circle cx="50" cy="50" r="26" fill="var(--surface-raised)" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xl font-bold text-text-base">{formatINR(portfolio.monthly_sip)}</div>
                    <div className="text-[10px] text-text-faint">Monthly SIP</div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-2">
                {allocations.map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: ALLOC_COLORS[key] }} />
                      <span className="text-sm capitalize text-text-muted">{key}</span>
                    </div>
                    <span className="text-sm font-bold text-text-base">{val}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Funds */}
          <div className="bg-surface-raised border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={18} className="text-brand" />
              <h3 className="text-sm font-semibold text-text-base">Recommended Funds</h3>
            </div>
            <div className="space-y-3">
              {portfolio.funds.map((fund, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-text-base">{fund.name}</p>
                    <p className="text-xs text-text-faint capitalize">{fund.category}</p>
                  </div>
                  <span className="text-xs font-bold text-brand">{fund.allocation}% of SIP</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expected Returns */}
          {portfolio.expected_returns && (
            <div className="bg-surface-raised border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-brand" />
                <h3 className="text-sm font-semibold text-text-base">Expected Returns (Annual)</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center bg-surface rounded-xl p-3">
                  <p className="text-xs text-text-faint mb-1">Conservative</p>
                  <p className="text-xl font-bold text-blue-400">{portfolio.expected_returns.conservative}%</p>
                </div>
                <div className="text-center bg-brand-muted rounded-xl p-3 border border-brand/20">
                  <p className="text-xs text-text-faint mb-1">Expected</p>
                  <p className="text-xl font-bold text-brand">{portfolio.expected_returns.expected}%</p>
                </div>
                <div className="text-center bg-surface rounded-xl p-3">
                  <p className="text-xs text-text-faint mb-1">Optimistic</p>
                  <p className="text-xl font-bold text-orange-400">{portfolio.expected_returns.optimistic}%</p>
                </div>
              </div>
              {portfolio.monthly_sip > 0 && (
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-3 text-center">
                  {[1, 3, 5].map(years => {
                    const r = (portfolio.expected_returns!.expected / 100) / 12
                    const n = years * 12
                    const fv = r > 0 ? portfolio.monthly_sip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : portfolio.monthly_sip * n
                    const invested = portfolio.monthly_sip * n
                    return (
                      <div key={years}>
                        <p className="text-[10px] text-text-faint">{years}Y SIP value</p>
                        <p className="text-sm font-bold text-text-base">{formatINR(Math.round(fv))}</p>
                        <p className="text-[10px] text-brand">+{formatINR(Math.round(fv - invested))} gain</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Action Needed */}
          <div className={`rounded-xl p-5 ${
            portfolio.action_needed.includes('immediately') || portfolio.action_needed.includes('reduce')
              ? 'bg-orange-500/10 border border-orange-500/20'
              : 'bg-brand-muted/10 border border-brand/20'
          }`}>
            <div className="flex items-start gap-3">
              {portfolio.action_needed.includes('immediately') || portfolio.action_needed.includes('reduce') ? (
                <AlertCircle size={18} className="text-orange-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle size={18} className="text-brand shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-base mb-1">Action Needed</p>
                <p className="text-sm text-text-muted">{portfolio.action_needed}</p>
              </div>
            </div>
          </div>

          {/* Accept Button */}
          <button
            onClick={acceptPortfolio}
            className="w-full py-3 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <CheckCircle size={18} />
            Accept & Auto-Invest
          </button>

          {/* Regenerate */}
          <button
            onClick={generatePortfolio}
            disabled={generating}
            className="w-full py-2.5 border border-border text-text-muted hover:text-text-base rounded-xl text-sm transition-all"
          >
            {generating ? 'Analyzing...' : 'Regenerate Portfolio'}
          </button>
        </div>
      )}
    </div>
  )
}