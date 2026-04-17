'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, TrendingDown, Loader2, Brain, Plus, X, BarChart2 } from 'lucide-react'
import toast from 'react-hot-toast'

const NIFTY_DATA = [
  { month: 'Apr 25', value: 22180 }, { month: 'May 25', value: 23540 },
  { month: 'Jun 25', value: 22870 }, { month: 'Jul 25', value: 24320 },
  { month: 'Aug 25', value: 24890 }, { month: 'Sep 25', value: 25430 },
  { month: 'Oct 25', value: 24760 }, { month: 'Nov 25', value: 25980 },
  { month: 'Dec 25', value: 26320 }, { month: 'Jan 26', value: 25760 },
  { month: 'Feb 26', value: 26890 }, { month: 'Mar 26', value: 27640 },
  { month: 'Apr 26', value: 27200 },
]

const STOCKS = [
  { id: 's1', symbol: 'RELIANCE', name: 'Reliance Industries', price: 2847, change: +2.3, ytd: +15.2, sector: 'Energy' },
  { id: 's2', symbol: 'TCS', name: 'Tata Consultancy Services', price: 3892, change: -0.8, ytd: +8.1, sector: 'IT' },
  { id: 's3', symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1756, change: +1.2, ytd: +12.4, sector: 'Banking' },
  { id: 's4', symbol: 'INFY', name: 'Infosys', price: 1623, change: -1.5, ytd: -2.8, sector: 'IT' },
  { id: 's5', symbol: 'ICICIBANK', name: 'ICICI Bank', price: 1298, change: +0.9, ytd: +18.7, sector: 'Banking' },
  { id: 's6', symbol: 'BHARTIARTL', name: 'Bharti Airtel', price: 1895, change: +3.1, ytd: +24.5, sector: 'Telecom' },
]

const MUTUAL_FUNDS = [
  { id: 'mf1', name: 'Mirae Asset Large Cap', category: 'Large Cap', nav: 102.5, returns1Y: 18.2, returns3Y: 15.4, risk: 'Moderate', sipMin: 500 },
  { id: 'mf2', name: 'Parag Parikh Flexi Cap', category: 'Flexi Cap', nav: 78.3, returns1Y: 22.1, returns3Y: 19.8, risk: 'High', sipMin: 1000 },
  { id: 'mf3', name: 'SBI Small Cap Fund', category: 'Small Cap', nav: 145.6, returns1Y: 28.4, returns3Y: 22.1, risk: 'Very High', sipMin: 500 },
  { id: 'mf4', name: 'HDFC Balanced Advantage', category: 'Hybrid', nav: 64.2, returns1Y: 13.7, returns3Y: 12.3, risk: 'Moderate', sipMin: 500 },
  { id: 'mf5', name: 'Axis Bluechip Fund', category: 'Large Cap', nav: 58.7, returns1Y: 12.1, returns3Y: 11.8, risk: 'Low-Mod', sipMin: 500 },
]

const ETFS = [
  { id: 'etf1', name: 'Nippon Nifty 50 BeES', symbol: 'NIFTYBEES', price: 248.5, ytd: 14.3, underlying: 'Nifty 50' },
  { id: 'etf2', name: 'HDFC Sensex ETF', symbol: 'HDFCSENSEX', price: 745.2, ytd: 12.8, underlying: 'BSE Sensex' },
  { id: 'etf3', name: 'Motilal Nasdaq 100 ETF', symbol: 'MON100', price: 98.3, ytd: 8.5, underlying: 'Nasdaq 100' },
  { id: 'etf4', name: 'SBI Gold ETF', symbol: 'SBIGETS', price: 65.8, ytd: 9.2, underlying: 'Gold' },
  { id: 'etf5', name: 'Mirae NYSE FANG+ ETF', symbol: 'MAFANG', price: 78.4, ytd: 15.6, underlying: 'NYSE FANG+' },
]

type WatchlistItem = { id: string; name: string; type: 'stock' | 'mf' | 'etf'; returns: number }

const RISK_COLOR: Record<string, string> = {
  'Low-Mod': 'text-blue-400',
  Moderate: 'text-brand',
  High: 'text-amber-400',
  'Very High': 'text-red-400',
}

export default function InvestmentsPage() {
  const [tab, setTab] = useState<'stocks' | 'mf' | 'etf'>('stocks')
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  function addToWatchlist(item: WatchlistItem) {
    if (watchlist.find((w) => w.id === item.id)) {
      toast('Already in watchlist')
      return
    }
    setWatchlist((prev) => [...prev, item])
    toast.success(`${item.name} added to watchlist`)
  }

  function removeFromWatchlist(id: string) {
    setWatchlist((prev) => prev.filter((w) => w.id !== id))
  }

  async function runAIAnalysis() {
    if (watchlist.length === 0) { toast.error('Add at least one instrument to watchlist'); return }
    setAnalyzing(true)
    setAiAnalysis('')
    try {
      const res = await fetch('/api/investments/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlist }),
      })
      const data = await res.json()
      setAiAnalysis(data.analysis ?? 'Analysis unavailable')
    } catch {
      toast.error('AI analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const niftyReturn = (((NIFTY_DATA.at(-1)?.value ?? 0) - (NIFTY_DATA[0]?.value ?? 1)) / (NIFTY_DATA[0]?.value ?? 1) * 100).toFixed(1)

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number }[] }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-surface-raised border border-border rounded-xl px-3 py-2 text-xs">
        <p className="text-brand font-bold">₹{payload[0].value.toLocaleString('en-IN')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-text-base">AI Smart Investments</h1>
        <p className="text-sm text-text-muted mt-0.5">Simulate Indian stocks, mutual funds & ETFs — add to watchlist, then analyze with AI</p>
      </div>

      {/* Nifty 50 Chart */}
      <div className="bg-surface-raised border border-border rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-text-base">Nifty 50 — 12 Month Simulation</p>
            <p className="text-xs text-text-muted mt-0.5">Mock data for illustrative purposes only</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-text-base">
              {NIFTY_DATA.at(-1)?.value.toLocaleString('en-IN')}
            </p>
            <p className="text-xs font-semibold text-brand">+{niftyReturn}% YTD</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={NIFTY_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={NIFTY_DATA[0].value} stroke="var(--border)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="value" stroke="#02FF9D" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#02FF9D' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Instruments panel */}
        <div className="lg:col-span-2">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-surface-raised border border-border rounded-xl p-1 mb-4 w-fit">
            {(['stocks', 'mf', 'etf'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-brand text-[#0A0A0A]' : 'text-text-muted hover:text-text-base'}`}
              >
                {t === 'stocks' ? 'Stocks' : t === 'mf' ? 'Mutual Funds' : 'ETFs'}
              </button>
            ))}
          </div>

          {tab === 'stocks' && (
            <div className="space-y-2">
              {STOCKS.map((s) => (
                <div key={s.id} className="bg-surface-raised border border-border rounded-xl p-4 flex items-center justify-between hover:border-brand/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand bg-brand-muted px-2 py-0.5 rounded-lg">{s.symbol}</span>
                      <span className="text-xs text-text-faint">{s.sector}</span>
                    </div>
                    <p className="text-sm font-semibold text-text-base mt-1">{s.name}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-sm font-bold text-text-base">₹{s.price.toLocaleString('en-IN')}</p>
                    <p className={`text-xs font-semibold flex items-center gap-0.5 justify-end ${s.change >= 0 ? 'text-brand' : 'text-red-400'}`}>
                      {s.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {s.change >= 0 ? '+' : ''}{s.change}%
                    </p>
                    <p className={`text-xs ${s.ytd >= 0 ? 'text-brand' : 'text-red-400'}`}>YTD {s.ytd >= 0 ? '+' : ''}{s.ytd}%</p>
                  </div>
                  <button
                    onClick={() => addToWatchlist({ id: s.id, name: s.symbol, type: 'stock', returns: s.ytd })}
                    className="bg-brand-muted border border-brand/20 text-brand rounded-lg p-1.5 hover:bg-brand hover:text-[#0A0A0A] transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'mf' && (
            <div className="space-y-2">
              {MUTUAL_FUNDS.map((mf) => (
                <div key={mf.id} className="bg-surface-raised border border-border rounded-xl p-4 flex items-center justify-between hover:border-brand/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-faint bg-border px-2 py-0.5 rounded-lg">{mf.category}</span>
                      <span className={`text-xs font-semibold ${RISK_COLOR[mf.risk] ?? 'text-text-muted'}`}>{mf.risk}</span>
                    </div>
                    <p className="text-sm font-semibold text-text-base mt-1">{mf.name}</p>
                    <p className="text-xs text-text-faint mt-0.5">Min SIP ₹{mf.sipMin} · NAV ₹{mf.nav}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-brand font-bold text-sm">+{mf.returns1Y}%</p>
                    <p className="text-xs text-text-faint">1Y returns</p>
                    <p className="text-xs text-text-muted">3Y: +{mf.returns3Y}%</p>
                  </div>
                  <button
                    onClick={() => addToWatchlist({ id: mf.id, name: mf.name, type: 'mf', returns: mf.returns1Y })}
                    className="bg-brand-muted border border-brand/20 text-brand rounded-lg p-1.5 hover:bg-brand hover:text-[#0A0A0A] transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'etf' && (
            <div className="space-y-2">
              {ETFS.map((etf) => (
                <div key={etf.id} className="bg-surface-raised border border-border rounded-xl p-4 flex items-center justify-between hover:border-brand/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand bg-brand-muted px-2 py-0.5 rounded-lg">{etf.symbol}</span>
                      <span className="text-xs text-text-faint">{etf.underlying}</span>
                    </div>
                    <p className="text-sm font-semibold text-text-base mt-1">{etf.name}</p>
                    <p className="text-xs text-text-faint mt-0.5">Price: ₹{etf.price}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-brand font-bold text-sm">+{etf.ytd}%</p>
                    <p className="text-xs text-text-faint">YTD</p>
                  </div>
                  <button
                    onClick={() => addToWatchlist({ id: etf.id, name: etf.symbol, type: 'etf', returns: etf.ytd })}
                    className="bg-brand-muted border border-brand/20 text-brand rounded-lg p-1.5 hover:bg-brand hover:text-[#0A0A0A] transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist + AI panel */}
        <div className="space-y-4">
          <div className="bg-surface-raised border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-brand" />
              <h3 className="text-sm font-semibold text-text-base">My Watchlist</h3>
            </div>

            {watchlist.length === 0 ? (
              <p className="text-xs text-text-faint text-center py-4">
                Add instruments from the left to build your watchlist
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {watchlist.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-[#1C1C1C] rounded-xl px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-text-base">{item.name}</p>
                      <p className="text-xs text-text-faint capitalize">{item.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand">+{item.returns}%</span>
                      <button onClick={() => removeFromWatchlist(item.id)} className="text-text-faint hover:text-red-400 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={runAIAnalysis}
              disabled={analyzing || watchlist.length === 0}
              className="w-full bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              {analyzing ? 'Analyzing...' : 'Analyze with AI'}
            </button>
          </div>

          {aiAnalysis && (
            <div className="bg-brand-muted border border-brand/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain size={15} className="text-brand" />
                <p className="text-xs font-semibold text-brand uppercase tracking-wide">AI Insights</p>
              </div>
              <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
            </div>
          )}

          <div className="bg-surface-raised border border-amber-500/20 rounded-2xl p-4">
            <p className="text-xs font-semibold text-amber-400 mb-1">Disclaimer</p>
            <p className="text-xs text-text-faint leading-relaxed">
              All data is simulated for educational purposes. Not financial advice.
              Past performance does not guarantee future returns.
              Consult a SEBI registered advisor before investing.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
