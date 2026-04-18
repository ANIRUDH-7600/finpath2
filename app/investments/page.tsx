// app/investments/page.tsx - Updated to use real savings
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, TrendingDown, Loader2, Brain, X, RefreshCw, Minus, Zap, ChevronRight, Check, AlertTriangle, ArrowUpRight, ArrowDownRight, Wallet, PiggyBank } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatINR } from '@/lib/utils/formatCurrency'

interface MutualFund {
  name: string
  category: string
  risk: string
  nav: number
  sip_min: number
  returns_1y: number
}

interface Holding {
  id: string; symbol: string; name: string; asset_type: string
  quantity: number; avg_buy_price: number; current_price: number
  current_value: number; cost_basis: number; pnl: number; pnl_pct: number
}

interface Trade {
  id: string; symbol: string; action: string; quantity: number
  price: number; total_value: number; triggered_by: string
  ai_reason: string | null; created_at: string
}

interface AgentDecision {
  id: string; symbol: string; name: string; action: string
  quantity: number; price: number; reason: string; confidence: string
}

interface TradeModal {
  symbol: string; name: string; asset_type: string
  price: number; action: 'buy' | 'sell'; maxQty?: number
}

interface StockQuote {
  symbol: string; name: string; sector: string; price: number; change_pct: number
}

interface MarketSnapshot {
  fetched_at?: string; nifty_pe?: number; nifty_current?: number
  nifty_change_pct?: number; sensex_current?: number; repo_rate?: number
  inflation?: number; sentiment?: 'bullish' | 'bearish' | 'neutral'
  nifty_monthly?: { month: string; value: number }[]
  stocks?: StockQuote[]; mutual_funds?: MutualFund[]; etfs?: ETFQuote[]
}

interface ETFQuote {
  symbol: string; name: string; underlying: string; price: number; ytd_pct: number
}

const RISK_COLOR: Record<string, string> = {
  'Low-Mod': 'text-blue-400', Moderate: 'text-brand',
  High: 'text-amber-400', 'Very High': 'text-red-400',
}

function PnlBadge({ val, pct }: { val: number; pct: number }) {
  const pos = val >= 0
  return (
    <div className={`flex items-center gap-1 ${pos ? 'text-brand' : 'text-red-400'}`}>
      {pos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      <span className="text-xs font-bold">{pos ? '+' : ''}{formatINR(val)}</span>
      <span className="text-[10px] opacity-70">({pos ? '+' : ''}{pct}%)</span>
    </div>
  )
}

export default function InvestmentsPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [loadingMarket, setLoadingMarket] = useState(true)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [cashBalance, setCashBalance] = useState(0)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalCurrentValue, setTotalCurrentValue] = useState(0)
  const [totalPnl, setTotalPnl] = useState(0)
  const [totalPnlPct, setTotalPnlPct] = useState(0)
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [loadingHoldings, setLoadingHoldings] = useState(true)
  const [agentDecisions, setAgentDecisions] = useState<AgentDecision[]>([])
  const [runningAgent, setRunningAgent] = useState(false)
  const [tab, setTab] = useState<'stocks' | 'mf' | 'etf' | 'holdings'>('stocks')
  const [tradeModal, setTradeModal] = useState<TradeModal | null>(null)
  const [tradeQty, setTradeQty] = useState('1')
  const [tradingLoading, setTradingLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [userSavings, setUserSavings] = useState(0)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlySpending, setMonthlySpending] = useState(0)

  const fetchMarket = useCallback(async (bust = false) => {
    try {
      const res = await fetch(bust ? `/api/investments/market?bust=${Date.now()}` : '/api/investments/market')
      if (res.ok) setMarket(await res.json())
    } catch { toast.error('Market data unavailable') }
  }, [])

  const fetchUserFinancials = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/dashboard?user_id=${userId}`)
      const data = await res.json()
      const income = data.user?.monthly_income || 0
      const spending = data.analysis?.monthly_total || 0
      setMonthlyIncome(income)
      setMonthlySpending(spending)
      setUserSavings(income - spending)
    } catch (error) {
      console.error('Failed to fetch user financials:', error)
    }
  }, [userId])

  const fetchHoldings = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/investments/holdings?user_id=${userId}`)
      const data = await res.json()
      setHoldings(data.holdings || [])
      setCashBalance(data.cash_balance || userSavings)
      setTotalInvested(data.total_invested || 0)
      setTotalCurrentValue(data.total_current_value || 0)
      setTotalPnl(data.total_pnl || 0)
      setTotalPnlPct(data.total_pnl_pct || 0)
      setRecentTrades(data.recent_trades || [])
    } catch { /* silently */ } finally { setLoadingHoldings(false) }
  }, [userId, userSavings])

  const fetchDecisions = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/investments/agent/decisions?user_id=${userId}`)
      if (res.ok) setAgentDecisions(await res.json())
    } catch { /* silently */ }
  }, [userId])

  useEffect(() => {
    fetchMarket().finally(() => setLoadingMarket(false))
    fetchUserFinancials()
  }, [fetchMarket, fetchUserFinancials])

  useEffect(() => {
    if (userId && userSavings > 0) {
      fetchHoldings()
      fetchDecisions()
    }
  }, [userId, userSavings, fetchHoldings, fetchDecisions])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchMarket(true)
    await fetchHoldings()
    setRefreshing(false)
    toast.success('Refreshed')
  }

  async function executeTrade() {
    if (!tradeModal || !userId) return
    const qty = parseFloat(tradeQty)
    if (!qty || qty <= 0) { toast.error('Enter valid quantity'); return }
    
    const totalCost = qty * tradeModal.price
    
    if (tradeModal.action === 'buy' && totalCost > cashBalance) {
      toast.error(`Insufficient savings. You have ${formatINR(cashBalance)} available`)
      return
    }
    
    setTradingLoading(true)
    try {
      const res = await fetch('/api/investments/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          symbol: tradeModal.symbol, name: tradeModal.name,
          asset_type: tradeModal.asset_type, action: tradeModal.action,
          quantity: qty, price: tradeModal.price,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      
      toast.success(`${tradeModal.action === 'buy' ? 'Bought' : 'Sold'} ${qty} × ${tradeModal.symbol}`)
      setTradeModal(null)
      setTradeQty('1')
      await fetchHoldings()
      await fetchUserFinancials()
      
      // Show nudge if buying with significant portion of savings
      if (tradeModal.action === 'buy' && (totalCost / cashBalance) > 0.3) {
        toast((t) => (
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Large Purchase Alert</p>
              <p className="text-xs">This uses {Math.round((totalCost / cashBalance) * 100)}% of your savings</p>
            </div>
          </div>
        ), { duration: 5000 })
      }
    } catch { toast.error('Trade failed') } finally { setTradingLoading(false) }
  }

  async function runAgent() {
    if (!userId) return
    setRunningAgent(true)
    try {
      const res = await fetch('/api/investments/agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      await fetchDecisions()
      toast.success(`AI generated ${data.count} decision${data.count !== 1 ? 's' : ''}`)
      setTab('holdings')
    } catch { toast.error('Agent failed') } finally { setRunningAgent(false) }
  }

  async function handleDecision(decisionId: string, act: 'approve' | 'reject') {
    if (!userId) return
    const res = await fetch('/api/investments/agent/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, action: act, decision_id: decisionId }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    toast.success(act === 'approve' ? 'Trade executed' : 'Decision rejected')
    await fetchDecisions()
    await fetchHoldings()
    await fetchUserFinancials()
  }

  async function runWatchlistAnalysis() {
    if (!market) return
    setAnalyzing(true)
    setAiAnalysis('')
    try {
      const res = await fetch('/api/investments/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchlist: [
            { id: 'RELIANCE', name: 'RELIANCE', type: 'stock', returns: 15.2 },
            { id: 'TCS', name: 'TCS', type: 'stock', returns: 8.1 },
          ],
          market: { nifty_pe: market.nifty_pe, nifty_current: market.nifty_current, repo_rate: market.repo_rate, inflation: market.inflation, sentiment: market.sentiment },
        }),
      })
      const d = await res.json()
      setAiAnalysis(d.analysis ?? '')
    } catch { toast.error('Analysis failed') } finally { setAnalyzing(false) }
  }

  function openTrade(symbol: string, name: string, asset_type: string, price: number, action: 'buy' | 'sell') {
    const holding = holdings.find(h => h.symbol === symbol)
    setTradeModal({ symbol, name, asset_type, price, action, maxQty: action === 'sell' ? holding?.quantity : undefined })
    setTradeQty(action === 'sell' && holding ? String(holding.quantity) : '1')
  }

  const tradeTotal = tradeModal ? parseFloat(tradeQty || '0') * tradeModal.price : 0
  const canAfford = !tradeModal || tradeModal.action === 'sell' || cashBalance >= tradeTotal

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number }[] }) => {
    if (!active || !payload?.length) return null
    return <div className="bg-surface-raised border border-border rounded-xl px-3 py-2 text-xs"><p className="text-brand font-bold">₹{payload[0].value.toLocaleString('en-IN')}</p></div>
  }

  const firstNifty = market?.nifty_monthly?.[0]?.value ?? 0
  const lastNifty = market?.nifty_monthly?.at(-1)?.value ?? 0
  const niftyReturn = firstNifty > 0 ? (((lastNifty - firstNifty) / firstNifty) * 100).toFixed(1) : null

  const tabs: { id: 'stocks' | 'mf' | 'etf' | 'holdings'; label: string }[] = [
    { id: 'stocks', label: 'Stocks' },
    { id: 'mf', label: 'Mutual Funds' },
    { id: 'etf', label: 'ETFs' },
    { id: 'holdings', label: `Holdings${holdings.length ? ` (${holdings.length})` : ''}` },
  ]

  return (
    <div className="p-6 md:p-8">
      {/* Trade modal */}
      {tradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-[#111] border border-border rounded-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] text-text-faint uppercase tracking-wider">{tradeModal.action === 'buy' ? 'Buy' : 'Sell'}</p>
                <p className="text-lg font-black text-text-base">{tradeModal.symbol}</p>
                <p className="text-xs text-text-faint">{tradeModal.name}</p>
              </div>
              <button onClick={() => setTradeModal(null)} className="text-text-faint hover:text-text-base">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-text-faint">Price</span>
                <span className="font-bold text-text-base">{formatINR(tradeModal.price)}</span>
              </div>
              <div>
                <label className="text-xs text-text-faint block mb-1.5">Quantity</label>
                <input
                  type="number" value={tradeQty} min="0.01" step="1"
                  onChange={e => setTradeQty(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm font-bold text-text-base focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                {tradeModal.maxQty && (
                  <button onClick={() => setTradeQty(String(tradeModal.maxQty))} className="text-[10px] text-brand mt-1">
                    Max: {tradeModal.maxQty}
                  </button>
                )}
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-3">
                <span className="text-text-faint">Total</span>
                <span className={`font-black text-lg ${canAfford ? 'text-brand' : 'text-red-400'}`}>{formatINR(Math.round(tradeTotal))}</span>
              </div>
              {tradeModal.action === 'buy' && (
                <div className="flex justify-between text-xs text-text-faint">
                  <span>Available Savings</span>
                  <span className={canAfford ? 'text-text-muted' : 'text-red-400 font-semibold'}>{formatINR(Math.round(cashBalance))}</span>
                </div>
              )}
              {!canAfford && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Insufficient savings
                </p>
              )}
            </div>

            <button
              onClick={executeTrade}
              disabled={tradingLoading || !canAfford || parseFloat(tradeQty) <= 0}
              className={`w-full font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 ${tradeModal.action === 'buy' ? 'bg-brand text-[#0A0A0A]' : 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'}`}
            >
              {tradingLoading ? <Loader2 size={15} className="animate-spin" /> : tradeModal.action === 'buy' ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
              {tradingLoading ? 'Processing…' : `${tradeModal.action === 'buy' ? 'Buy' : 'Sell'} ${tradeQty} × ${tradeModal.symbol}`}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-base">Investments</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Trade with your actual savings
            {market?.fetched_at && <span className="text-text-faint ml-1.5">· {new Date(market.fetched_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border rounded-xl text-xs text-text-muted hover:border-brand/30 transition-all">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-surface-raised border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} className="text-text-faint" />
            <p className="text-[10px] text-text-faint uppercase tracking-wider">Monthly Income</p>
          </div>
          <p className="text-xl font-bold text-text-base">{formatINR(monthlyIncome)}</p>
        </div>
        <div className="bg-surface-raised border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-red-400" />
            <p className="text-[10px] text-text-faint uppercase tracking-wider">Monthly Spending</p>
          </div>
          <p className="text-xl font-bold text-text-base">{formatINR(monthlySpending)}</p>
        </div>
        <div className="bg-surface-raised border border-brand/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank size={14} className="text-brand" />
            <p className="text-[10px] text-text-faint uppercase tracking-wider">Available Savings</p>
          </div>
          <p className="text-xl font-bold text-brand">{formatINR(cashBalance)}</p>
        </div>
        <div className="bg-surface-raised border border-border rounded-xl p-4">
          <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Portfolio P&L</p>
          <PnlBadge val={totalPnl} pct={totalPnlPct} />
        </div>
      </div>

      {/* Market ticker */}
      {loadingMarket ? (
        <div className="bg-surface-raised border border-border rounded-xl p-5 mb-5 flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-brand" />
          <p className="text-sm text-text-muted">Fetching live market data…</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-5">
          {[
            { label: 'Nifty 50', value: market?.nifty_current?.toLocaleString('en-IN') ?? '—', sub: market?.nifty_change_pct != null ? `${market.nifty_change_pct >= 0 ? '+' : ''}${market.nifty_change_pct}%` : undefined, color: market?.nifty_change_pct != null ? (market.nifty_change_pct >= 0 ? 'text-brand' : 'text-red-400') : undefined },
            { label: 'Sensex', value: market?.sensex_current?.toLocaleString('en-IN') ?? '—' },
            { label: 'PE Ratio', value: market?.nifty_pe != null ? String(market.nifty_pe) : '—', sub: market?.nifty_pe != null ? (market.nifty_pe > 25 ? 'expensive' : market.nifty_pe < 18 ? 'cheap' : 'fair') : undefined, color: market?.nifty_pe != null ? (market.nifty_pe > 25 ? 'text-red-400' : market.nifty_pe < 18 ? 'text-brand' : 'text-yellow-400') : undefined },
            { label: 'Repo Rate', value: market?.repo_rate != null ? `${market.repo_rate}%` : '—' },
            { label: 'Inflation', value: market?.inflation != null ? `${market.inflation}%` : '—', color: market?.inflation != null && market.inflation > 6 ? 'text-orange-400' : undefined },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-xl p-3">
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-lg font-black ${s.color ?? 'text-text-base'}`}>{s.value}</p>
              {s.sub && <p className="text-[10px] text-text-faint mt-0.5">{s.sub}</p>}
            </div>
          ))}
          <div className="bg-surface rounded-xl p-3">
            <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Sentiment</p>
            {market?.sentiment ? (
              <div className={`flex items-center gap-1 ${market.sentiment === 'bullish' ? 'text-brand' : market.sentiment === 'bearish' ? 'text-red-400' : 'text-yellow-400'}`}>
                {market.sentiment === 'bullish' ? <TrendingUp size={14} /> : market.sentiment === 'bearish' ? <TrendingDown size={14} /> : <Minus size={14} />}
                <p className="text-sm font-black capitalize">{market.sentiment}</p>
              </div>
            ) : <p className="text-sm font-black text-text-faint">—</p>}
          </div>
        </div>
      )}

      {/* Nifty chart */}
      {market?.nifty_monthly && market.nifty_monthly.length > 0 && (
        <div className="bg-surface-raised border border-border rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-text-base">Nifty 50</p>
            <div className="text-right">
              <p className="text-xl font-bold text-text-base">{market.nifty_current?.toLocaleString('en-IN')}</p>
              {niftyReturn && <p className={`text-xs font-semibold ${parseFloat(niftyReturn) >= 0 ? 'text-brand' : 'text-red-400'}`}>{parseFloat(niftyReturn) >= 0 ? '+' : ''}{niftyReturn}% period</p>}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={market.nifty_monthly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={firstNifty} stroke="var(--border)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="value" stroke="#02FF9D" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#02FF9D' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main panel */}
        <div className="lg:col-span-2">
          <div className="flex gap-1 bg-surface-raised border border-border rounded-xl p-1 mb-4 w-fit overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-brand text-[#0A0A0A]' : 'text-text-muted hover:text-text-base'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {loadingMarket && tab !== 'holdings' ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="animate-pulse bg-surface-raised rounded-xl h-16 border border-border" />)}</div>
          ) : (
            <>
              {tab === 'stocks' && (
                <div className="space-y-2">
                  {(market?.stocks ?? []).map((s: StockQuote) => (
                    <div key={s.symbol} className="bg-surface-raised border border-border rounded-xl p-4 flex items-center gap-3 hover:border-brand/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-lg shrink-0">{s.symbol}</span>
                          <span className="text-xs text-text-faint truncate">{s.sector}</span>
                        </div>
                        <p className="text-sm font-semibold text-text-base truncate">{s.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-text-base">{formatINR(s.price)}</p>
                        <p className={`text-xs font-semibold flex items-center gap-0.5 justify-end ${s.change_pct >= 0 ? 'text-brand' : 'text-red-400'}`}>
                          {s.change_pct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {s.change_pct >= 0 ? '+' : ''}{s.change_pct}%
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => openTrade(s.symbol, s.name, 'stock', s.price, 'buy')} className="bg-brand/10 border border-brand/20 text-brand rounded-lg px-2.5 py-1.5 text-xs font-bold hover:bg-brand hover:text-[#0A0A0A] transition-all">Buy</button>
                        {holdings.find(h => h.symbol === s.symbol) && (
                          <button onClick={() => openTrade(s.symbol, s.name, 'stock', s.price, 'sell')} className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-2.5 py-1.5 text-xs font-bold hover:bg-red-500/20 transition-all">Sell</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'mf' && (
                <div className="space-y-2">
                  {(market?.mutual_funds ?? []).map((mf: MutualFund, i: number) => (
                    <div key={i} className="bg-surface-raised border border-border rounded-xl p-4 flex items-center gap-3 hover:border-brand/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-text-faint bg-border px-2 py-0.5 rounded-lg shrink-0">{mf.category}</span>
                          <span className={`text-xs font-semibold shrink-0 ${RISK_COLOR[mf.risk] ?? 'text-text-muted'}`}>{mf.risk}</span>
                        </div>
                        <p className="text-sm font-semibold text-text-base truncate">{mf.name}</p>
                        <p className="text-xs text-text-faint mt-0.5">NAV ₹{mf.nav} · SIP ₹{mf.sip_min}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-brand font-bold text-sm">+{mf.returns_1y}%</p>
                        <p className="text-[10px] text-text-faint">1Y</p>
                      </div>
                      <button onClick={() => openTrade(`MF${i}`, mf.name, 'mf', mf.nav, 'buy')} className="bg-brand/10 border border-brand/20 text-brand rounded-lg px-2.5 py-1.5 text-xs font-bold hover:bg-brand hover:text-[#0A0A0A] transition-all shrink-0">Buy</button>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'etf' && (
                <div className="space-y-2">
                  {(market?.etfs ?? []).map((etf: ETFQuote) => (
                    <div key={etf.symbol} className="bg-surface-raised border border-border rounded-xl p-4 flex items-center gap-3 hover:border-brand/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-lg shrink-0">{etf.symbol}</span>
                          <span className="text-xs text-text-faint truncate">{etf.underlying}</span>
                        </div>
                        <p className="text-sm font-semibold text-text-base truncate">{etf.name}</p>
                        <p className="text-xs text-text-faint mt-0.5">{formatINR(etf.price)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold text-sm ${etf.ytd_pct >= 0 ? 'text-brand' : 'text-red-400'}`}>{etf.ytd_pct >= 0 ? '+' : ''}{etf.ytd_pct}% YTD</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => openTrade(etf.symbol, etf.name, 'etf', etf.price, 'buy')} className="bg-brand/10 border border-brand/20 text-brand rounded-lg px-2.5 py-1.5 text-xs font-bold hover:bg-brand hover:text-[#0A0A0A] transition-all">Buy</button>
                        {holdings.find(h => h.symbol === etf.symbol) && (
                          <button onClick={() => openTrade(etf.symbol, etf.name, 'etf', etf.price, 'sell')} className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-2.5 py-1.5 text-xs font-bold hover:bg-red-500/20 transition-all">Sell</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'holdings' && (
                <div className="space-y-4">
                  {holdings.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-brand-muted border border-brand/20 flex items-center justify-center mx-auto mb-3">
                        <Wallet size={24} className="text-brand" />
                      </div>
                      <p className="text-text-faint text-sm">No investments yet</p>
                      <p className="text-xs text-text-faint mt-1">Buy stocks, ETFs, or mutual funds to start building wealth</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {holdings.map(h => (
                        <div key={h.id} className="bg-surface-raised border border-border rounded-xl p-4 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-lg">{h.symbol}</span>
                              <span className="text-[10px] text-text-faint capitalize">{h.asset_type}</span>
                            </div>
                            <p className="text-sm font-semibold text-text-base truncate">{h.name}</p>
                            <p className="text-xs text-text-faint mt-0.5">{h.quantity} units · avg {formatINR(Math.round(h.avg_buy_price))}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-text-base">{formatINR(h.current_value)}</p>
                            <PnlBadge val={h.pnl} pct={h.pnl_pct} />
                          </div>
                          <button
                            onClick={() => openTrade(h.symbol, h.name, h.asset_type, h.current_price, 'sell')}
                            className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-2.5 py-1.5 text-xs font-bold hover:bg-red-500/20 transition-all shrink-0"
                          >
                            Sell
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recent trades */}
                  {recentTrades.length > 0 && (
                    <div className="bg-surface-raised border border-border rounded-xl p-5">
                      <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-3">Recent Trades</p>
                      <div className="space-y-2">
                        {recentTrades.slice(0, 8).map(t => (
                          <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold uppercase px-1.5 py-0.5 rounded text-[10px] ${t.action === 'buy' ? 'bg-brand/10 text-brand' : 'bg-red-500/10 text-red-400'}`}>{t.action}</span>
                              <span className="font-medium text-text-base">{t.symbol}</span>
                              <span className="text-text-faint">{t.quantity}×</span>
                              {t.triggered_by === 'ai_agent' && <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">AI</span>}
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-text-base">{formatINR(Math.round(t.total_value))}</span>
                              <p className="text-text-faint text-[10px]">{new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* AI Agent decisions */}
          {agentDecisions.length > 0 && (
            <div className="bg-surface-raised border border-purple-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Brain size={15} className="text-purple-400" />
                <p className="text-sm font-semibold text-text-base">AI Decisions</p>
                <span className="ml-auto text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">{agentDecisions.length} pending</span>
              </div>
              <div className="space-y-3">
                {agentDecisions.map(d => (
                  <div key={d.id} className="bg-surface rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${d.action === 'buy' ? 'bg-brand/10 text-brand' : 'bg-red-500/10 text-red-400'}`}>{d.action}</span>
                          <span className="text-sm font-bold text-text-base">{d.symbol}</span>
                          <span className="text-xs text-text-faint">{d.quantity}×</span>
                        </div>
                        <p className="text-xs text-text-faint">{d.reason}</p>
                        <p className="text-xs font-semibold text-text-base mt-0.5">{formatINR(Math.round(d.quantity * d.price))}</p>
                      </div>
                      <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded-full ${d.confidence === 'high' ? 'bg-brand/10 text-brand' : d.confidence === 'medium' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-border text-text-faint'}`}>{d.confidence}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDecision(d.id, 'approve')} className="flex-1 bg-brand/10 border border-brand/20 text-brand rounded-lg py-1.5 text-xs font-bold hover:bg-brand hover:text-[#0A0A0A] transition-all flex items-center justify-center gap-1">
                        <Check size={11} /> Execute
                      </button>
                      <button onClick={() => handleDecision(d.id, 'reject')} className="flex-1 bg-surface border border-border text-text-faint rounded-lg py-1.5 text-xs hover:text-red-400 transition-all flex items-center justify-center gap-1">
                        <X size={11} /> Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Run agent */}
          <div className="bg-surface-raised border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} className="text-brand" />
              <p className="text-sm font-semibold text-text-base">AI Portfolio Manager</p>
            </div>
            <p className="text-xs text-text-muted mb-4 leading-relaxed">
              Analyzes your spending, savings rate, and market conditions to suggest trades
            </p>
            <button
              onClick={runAgent}
              disabled={runningAgent || holdings.length === 0}
              className="w-full bg-brand hover:brightness-110 text-[#0A0A0A] font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
            >
              {runningAgent ? <Loader2 size={15} className="animate-spin" /> : <Brain size={15} />}
              {runningAgent ? 'Analyzing…' : 'Run AI Agent'}
            </button>
          </div>

          {/* Market analysis */}
          <div className="bg-surface-raised border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={14} className="text-text-faint" />
              <p className="text-sm font-semibold text-text-base">Market Analysis</p>
            </div>
            {aiAnalysis ? (
              <p className="text-sm text-text-muted leading-relaxed mb-3">{aiAnalysis}</p>
            ) : (
              <p className="text-xs text-text-faint mb-3">Get AI insights on current market conditions</p>
            )}
            <button
              onClick={runWatchlistAnalysis}
              disabled={analyzing || !market}
              className="w-full border border-border hover:border-brand/30 text-text-muted rounded-xl py-2.5 text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
            >
              {analyzing ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
              {analyzing ? 'Analyzing…' : 'Analyze Market'}
            </button>
          </div>

          <div className="bg-surface-raised border border-amber-500/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-400 mb-1">Real Money Trading</p>
            <p className="text-xs text-text-faint leading-relaxed">Trades use your actual savings. P&L affects your net worth.</p>
          </div>
        </div>
      </div>
    </div>
  )
}