'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { TrendingUp, AlertTriangle, Info, AlertCircle, Plus, Trash2, Loader2, ChevronUp, Zap, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatINR } from '@/lib/utils/formatCurrency'
import { SIP_PLANS, RISK_COLOR } from '@/lib/sip-plans'

interface SipProjection {
  id: string; asset_name: string; monthly_amount: number; start_date: string
  expected_return: number; months_elapsed: number; current_value: number
  value_12m: number; total_invested: number; gain: number
}
interface EmiAnalysis {
  id: string; loan_name: string; emi_amount: number; interest_rate: number
  remaining_months: number; loan_type: string; total_remaining: number
  opportunity_cost: number; pct_of_income: number
}
interface GoalImpact {
  id: string; title: string; months_without_sip: number; months_with_sip: number; acceleration: number
}
interface Alert { type: string; severity: 'warning' | 'danger' | 'info'; message: string }
interface CashflowData {
  income: number; expenses: number; total_emi: number; total_sip: number
  net_investable: number; commitment_ratio: number
  sip_projections: SipProjection[]; emi_analysis: EmiAnalysis[]
  goal_impacts: GoalImpact[]; alerts: Alert[]; insights: string[]
}

const LOAN_TYPES = ['personal', 'home', 'vehicle', 'education', 'credit card', 'business']
const ALERT_ICON = { warning: AlertTriangle, danger: AlertCircle, info: Info }
const ALERT_COLOR = { warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20', danger: 'text-red-400 bg-red-400/10 border-red-400/20', info: 'text-blue-400 bg-blue-400/10 border-blue-400/20' }

function FlowBar({ label, value, income, color }: { label: string; value: number; income: number; color: string }) {
  const pct = income > 0 ? Math.min(100, Math.round((value / income) * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-faint w-20 shrink-0 text-right">{label}</span>
      <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-text-muted w-20 shrink-0">{formatINR(value)} <span className="text-text-faint">({pct}%)</span></span>
    </div>
  )
}

export default function CashflowPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [data, setData] = useState<CashflowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSipForm, setShowSipForm] = useState(false)
  const [showEmiForm, setShowEmiForm] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [sipForm, setSipForm] = useState({ asset_name: '', monthly_amount: '', start_date: '', expected_return: '12' })
  const [emiForm, setEmiForm] = useState({ loan_name: '', emi_amount: '', interest_rate: '10', remaining_months: '', loan_type: 'personal' })
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/cashflow?user_id=${userId}`)
      if (res.ok) setData(await res.json())
    } catch { toast.error('Failed to load') } finally { setLoading(false) }
  }, [userId])

  useEffect(() => { fetchData() }, [fetchData])

  async function addSIP() {
    if (!userId || !sipForm.asset_name || !sipForm.monthly_amount || !sipForm.start_date) {
      toast.error('Fill all required fields'); return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/sip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...sipForm }),
      })
      if (!res.ok) throw new Error()
      toast.success('SIP added')
      setSipForm({ asset_name: '', monthly_amount: '', start_date: '', expected_return: '12' })
      setShowSipForm(false)
      await fetchData()
    } catch { toast.error('Failed') } finally { setSubmitting(false) }
  }

  async function addEMI() {
    if (!userId || !emiForm.loan_name || !emiForm.emi_amount || !emiForm.remaining_months) {
      toast.error('Fill all required fields'); return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/emi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...emiForm }),
      })
      if (!res.ok) throw new Error()
      toast.success('EMI added')
      setEmiForm({ loan_name: '', emi_amount: '', interest_rate: '10', remaining_months: '', loan_type: 'personal' })
      setShowEmiForm(false)
      await fetchData()
    } catch { toast.error('Failed') } finally { setSubmitting(false) }
  }

  async function deleteSIP(id: string) {
    await fetch('/api/sip', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('SIP removed')
    await fetchData()
  }

  async function deleteEMI(id: string) {
    await fetch('/api/emi', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    toast.success('EMI removed')
    await fetchData()
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-text-muted">
        <Loader2 size={18} className="animate-spin text-brand" />
        <span className="text-sm">Computing cash flow…</span>
      </div>
    )
  }

  const income = data?.income ?? 0
  const netColor = (data?.net_investable ?? 0) >= 0 ? 'text-brand' : 'text-red-400'
  const totalSipValue = data?.sip_projections.reduce((s, p) => s + p.current_value, 0) ?? 0
  const totalSipValue12m = data?.sip_projections.reduce((s, p) => s + p.value_12m, 0) ?? 0

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-base">Cash Flow Engine</h1>
        <p className="text-sm text-text-muted mt-0.5">Balancing income, expenses, SIPs, and EMIs toward your goals</p>
      </div>

      {/* Alerts */}
      {(data?.alerts.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2 mb-5">
          {data!.alerts.map((a, i) => {
            const Icon = ALERT_ICON[a.severity]
            return (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${ALERT_COLOR[a.severity]}`}>
                <Icon size={15} className="shrink-0" />
                {a.message}
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Monthly flow breakdown */}
          <div className="bg-surface-raised border border-border rounded-xl p-5">
            <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-4">Monthly Cash Flow</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Income', value: data?.income ?? 0, color: 'text-brand' },
                { label: 'Expenses', value: data?.expenses ?? 0, color: 'text-red-400' },
                { label: 'EMIs', value: data?.total_emi ?? 0, color: 'text-orange-400' },
                { label: 'SIPs', value: data?.total_sip ?? 0, color: 'text-blue-400' },
              ].map(s => (
                <div key={s.label} className="bg-surface rounded-xl p-3">
                  <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`text-base font-black ${s.color}`}>{formatINR(s.value)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 mb-5">
              <FlowBar label="Expenses" value={data?.expenses ?? 0} income={income} color="bg-red-400/70" />
              <FlowBar label="EMIs" value={data?.total_emi ?? 0} income={income} color="bg-orange-400/70" />
              <FlowBar label="SIPs" value={data?.total_sip ?? 0} income={income} color="bg-blue-400/70" />
            </div>

            <div className="flex items-center justify-between bg-surface rounded-xl px-4 py-3">
              <div>
                <p className="text-xs text-text-faint">Net Monthly Investable</p>
                <p className={`text-2xl font-black mt-0.5 ${netColor}`}>{formatINR(data?.net_investable ?? 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-faint">Commitment Ratio</p>
                <p className={`text-xl font-black mt-0.5 ${(data?.commitment_ratio ?? 0) > 60 ? 'text-red-400' : (data?.commitment_ratio ?? 0) > 40 ? 'text-amber-400' : 'text-brand'}`}>{data?.commitment_ratio ?? 0}%</p>
                <p className="text-[10px] text-text-faint">of income in EMI+SIP</p>
              </div>
            </div>
          </div>

          {/* SIPs */}
          <div className="bg-surface-raised border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-text-faint uppercase tracking-wider">SIPs</p>
                {data && data.sip_projections.length > 0 && (
                  <p className="text-xs text-text-muted mt-0.5">Portfolio today: <span className="text-brand font-bold">{formatINR(totalSipValue)}</span> · in 12m: <span className="font-bold text-text-base">{formatINR(totalSipValue12m)}</span></p>
                )}
              </div>
              <button onClick={() => setShowSipForm(v => !v)} className="flex items-center gap-1.5 bg-brand/10 border border-brand/20 text-brand rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-brand/20 transition-all">
                {showSipForm ? <ChevronUp size={12} /> : <Plus size={12} />} Add SIP
              </button>
            </div>

            {showSipForm && (
              <div className="bg-surface rounded-xl p-4 mb-4 space-y-3">
                <div>
                  <label className="text-[10px] text-text-faint uppercase tracking-wider block mb-2">Choose a Fund</label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {SIP_PLANS.map(plan => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlanId(plan.id)
                          setSipForm(v => ({ ...v, asset_name: plan.name, expected_return: String(plan.typical_return) }))
                        }}
                        className={`text-left px-3 py-2.5 rounded-xl border transition-all ${selectedPlanId === plan.id ? 'border-brand/40 bg-brand/5' : 'border-border hover:border-border/60'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-text-base">{plan.name}</p>
                            <p className="text-[10px] text-text-faint">{plan.category}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-brand">~{plan.typical_return}% p.a.</p>
                            <p className={`text-[10px] ${RISK_COLOR[plan.risk]}`}>{plan.risk}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-text-faint uppercase tracking-wider block mb-1">Monthly Amount (₹)</label>
                    <input type="number" value={sipForm.monthly_amount} onChange={e => setSipForm(v => ({ ...v, monthly_amount: e.target.value }))}
                      placeholder="5000" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-1 focus:ring-brand/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-faint uppercase tracking-wider block mb-1">Start Date</label>
                    <input type="month" value={sipForm.start_date} onChange={e => setSipForm(v => ({ ...v, start_date: e.target.value }))}
                      className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-1 focus:ring-brand/30" />
                  </div>
                </div>
                {selectedPlanId && (
                  <div className="flex items-center gap-2 text-xs text-text-faint bg-surface-raised rounded-lg px-3 py-2">
                    <span className="text-brand font-semibold">{sipForm.asset_name}</span>
                    <span>·</span>
                    <span>{sipForm.expected_return}% expected</span>
                    <button type="button" onClick={() => { setSelectedPlanId(''); setSipForm(v => ({ ...v, asset_name: '', expected_return: '12' })) }} className="ml-auto text-text-faint hover:text-red-400">✕</button>
                  </div>
                )}
                <button onClick={addSIP} disabled={submitting || !selectedPlanId || !sipForm.monthly_amount || !sipForm.start_date}
                  className="w-full bg-brand text-[#0A0A0A] font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add SIP
                </button>
              </div>
            )}

            {(data?.sip_projections.length ?? 0) === 0 ? (
              <p className="text-sm text-text-faint text-center py-6">No SIPs added yet — add one to track growth</p>
            ) : (
              <div className="space-y-2">
                {(data?.sip_projections ?? []).map(s => (
                  <div key={s.id} className="bg-surface rounded-xl p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-text-base truncate">{s.asset_name}</span>
                        <span className="text-[10px] bg-blue-400/10 text-blue-400 px-1.5 py-0.5 rounded-full shrink-0">{s.expected_return}% p.a.</span>
                      </div>
                      <p className="text-xs text-text-faint mb-2">{formatINR(s.monthly_amount)}/mo · {s.months_elapsed} months active</p>
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-text-faint">Invested: </span>
                          <span className="font-semibold text-text-muted">{formatINR(s.total_invested)}</span>
                        </div>
                        <ArrowRight size={11} className="text-text-faint shrink-0" />
                        <div>
                          <span className="text-text-faint">Value: </span>
                          <span className="font-bold text-brand">{formatINR(s.current_value)}</span>
                          {s.gain > 0 && <span className="text-brand/70"> (+{formatINR(s.gain)})</span>}
                        </div>
                        <div>
                          <span className="text-text-faint">In 12m: </span>
                          <span className="font-bold text-text-base">{formatINR(s.value_12m)}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteSIP(s.id)} className="text-text-faint hover:text-red-400 transition-colors shrink-0 mt-0.5">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EMIs */}
          <div className="bg-surface-raised border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-text-faint uppercase tracking-wider">EMIs & Loans</p>
              <button onClick={() => setShowEmiForm(v => !v)} className="flex items-center gap-1.5 bg-orange-400/10 border border-orange-400/20 text-orange-400 rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-orange-400/20 transition-all">
                {showEmiForm ? <ChevronUp size={12} /> : <Plus size={12} />} Add EMI
              </button>
            </div>

            {showEmiForm && (
              <div className="bg-surface rounded-xl p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-text-faint uppercase tracking-wider block mb-1">Loan Name</label>
                    <input value={emiForm.loan_name} onChange={e => setEmiForm(v => ({ ...v, loan_name: e.target.value }))}
                      placeholder="e.g. Car Loan SBI" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-1 focus:ring-brand/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-faint uppercase tracking-wider block mb-1">EMI Amount (₹)</label>
                    <input type="number" value={emiForm.emi_amount} onChange={e => setEmiForm(v => ({ ...v, emi_amount: e.target.value }))}
                      placeholder="12000" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-1 focus:ring-brand/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-faint uppercase tracking-wider block mb-1">Remaining Months</label>
                    <input type="number" value={emiForm.remaining_months} onChange={e => setEmiForm(v => ({ ...v, remaining_months: e.target.value }))}
                      placeholder="24" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-1 focus:ring-brand/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-faint uppercase tracking-wider block mb-1">Interest Rate (% p.a.)</label>
                    <input type="number" value={emiForm.interest_rate} onChange={e => setEmiForm(v => ({ ...v, interest_rate: e.target.value }))}
                      placeholder="10" className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-1 focus:ring-brand/30" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-text-faint uppercase tracking-wider block mb-1">Loan Type</label>
                    <select value={emiForm.loan_type} onChange={e => setEmiForm(v => ({ ...v, loan_type: e.target.value }))}
                      className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:ring-1 focus:ring-brand/30">
                      {LOAN_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={addEMI} disabled={submitting} className="w-full bg-orange-400 text-[#0A0A0A] font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add EMI
                </button>
              </div>
            )}

            {(data?.emi_analysis.length ?? 0) === 0 ? (
              <p className="text-sm text-text-faint text-center py-6">No EMIs tracked — add a loan to see opportunity cost</p>
            ) : (
              <div className="space-y-2">
                {(data?.emi_analysis ?? []).map(e => (
                  <div key={e.id} className="bg-surface rounded-xl p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-text-base">{e.loan_name}</span>
                        <span className="text-[10px] bg-orange-400/10 text-orange-400 px-1.5 py-0.5 rounded-full capitalize shrink-0">{e.loan_type}</span>
                        <span className="text-[10px] text-text-faint">{e.interest_rate}%</span>
                      </div>
                      <p className="text-xs text-text-faint mb-2">{formatINR(e.emi_amount)}/mo · {e.remaining_months} months left · {e.pct_of_income}% of income</p>
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-text-faint">Remaining: </span>
                          <span className="font-semibold text-orange-400">{formatINR(e.total_remaining)}</span>
                        </div>
                        <div>
                          <span className="text-text-faint">Opportunity cost: </span>
                          <span className="font-bold text-red-400">–{formatINR(e.opportunity_cost)}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteEMI(e.id)} className="text-text-faint hover:text-red-400 transition-colors shrink-0 mt-0.5">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* AI insights */}
          {(data?.insights.length ?? 0) > 0 && (
            <div className="bg-surface-raised border border-brand/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-brand" />
                <p className="text-sm font-semibold text-text-base">AI Insights</p>
              </div>
              <div className="space-y-2.5">
                {data!.insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-brand text-xs font-bold shrink-0 mt-0.5">0{i + 1}</span>
                    <p className="text-sm text-text-muted leading-relaxed">{ins}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goal impact */}
          {(data?.goal_impacts.filter(g => g.acceleration > 0).length ?? 0) > 0 && (
            <div className="bg-surface-raised border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-3">SIP Impact on Goals</p>
              <div className="space-y-3">
                {data!.goal_impacts.filter(g => g.acceleration > 0 || g.months_with_sip > 0).map(g => (
                  <div key={g.id} className="bg-surface rounded-xl p-3">
                    <p className="text-xs font-semibold text-text-base mb-1.5 truncate">{g.title}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 text-text-faint">
                        <span>{g.months_without_sip}m</span>
                        <span className="text-[9px]">without</span>
                      </div>
                      <ArrowRight size={10} className="text-brand" />
                      <div className="flex items-center gap-1 text-brand font-bold">
                        <span>{g.months_with_sip}m</span>
                        <span className="text-[9px] font-normal text-text-faint">with SIPs</span>
                      </div>
                      {g.acceleration > 0 && (
                        <span className="ml-auto text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold">{g.acceleration}m faster</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary card */}
          <div className="bg-surface-raised border border-border rounded-xl p-5 space-y-3">
            <p className="text-xs font-semibold text-text-faint uppercase tracking-wider">Summary</p>
            {[
              { label: 'Total SIP invested', value: formatINR(data?.sip_projections.reduce((s, p) => s + p.total_invested, 0) ?? 0) },
              { label: 'SIP portfolio value', value: formatINR(totalSipValue), highlight: true },
              { label: 'Total EMI remaining', value: formatINR(data?.emi_analysis.reduce((s, e) => s + e.total_remaining, 0) ?? 0), danger: true },
              { label: 'Opportunity cost (EMI)', value: formatINR(data?.emi_analysis.reduce((s, e) => s + e.opportunity_cost, 0) ?? 0), danger: true },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between text-xs">
                <span className="text-text-faint">{r.label}</span>
                <span className={`font-bold ${r.highlight ? 'text-brand' : r.danger ? 'text-red-400' : 'text-text-base'}`}>{r.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-surface-raised border border-blue-400/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={13} className="text-blue-400" />
              <p className="text-xs font-semibold text-blue-400">About SIP returns</p>
            </div>
            <p className="text-xs text-text-faint leading-relaxed">Projected values use the future value formula with monthly compounding. Actual returns vary with market conditions.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
