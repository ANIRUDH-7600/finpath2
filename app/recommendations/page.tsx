// app/recommendations/page.tsx
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  ShoppingBag, Search, CheckCircle, Clock, XCircle, ExternalLink,
  Loader2, TrendingDown, Target, Sparkles, IndianRupee, Globe,
  Zap, Tag, Store, Award, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatINR } from '@/lib/utils/formatCurrency'
import type { SmartBuyResult } from '@/types'

const CATEGORIES = [
  { label: 'Fashion', icon: Tag },
  { label: 'Electronics', icon: Zap },
  { label: 'Entertainment', icon: Sparkles },
  { label: 'Travel', icon: Globe },
  { label: 'Food & Dining', icon: ShoppingBag },
  { label: 'Home & Living', icon: Target },
  { label: 'Books', icon: Search },
  { label: 'Gaming', icon: Zap },
]

const QUICK_SEARCHES = [
  { label: 'Nike running shoes', query: 'Nike running shoes', budget: 3000, category: 'Fashion' },
  { label: 'IMAX movie ticket', query: 'IMAX movie ticket', budget: 500, category: 'Entertainment' },
  { label: 'Wireless earbuds', query: 'wireless earbuds', budget: 2000, category: 'Electronics' },
  { label: 'Office chair', query: 'ergonomic office chair', budget: 8000, category: 'Home & Living' },
]

const PLATFORM_STYLE: Record<string, string> = {
  Flipkart: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Amazon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Meesho: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Myntra: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const DECISION_CONFIG = {
  buy: {
    icon: CheckCircle,
    label: 'Buy Now',
    bg: 'bg-brand-muted border-brand/20',
    text: 'text-brand',
    bar: 'bg-brand',
  },
  wait: {
    icon: Clock,
    label: 'Wait a Month',
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
    bar: 'bg-amber-400',
  },
  skip: {
    icon: XCircle,
    label: 'Skip This',
    bg: 'bg-red-500/10 border-red-500/20',
    text: 'text-red-400',
    bar: 'bg-red-500',
  },
}

export default function RecommendationsPage() {
  const { data: session } = useSession()
  const [query, setQuery] = useState('')
  const [budget, setBudget] = useState('')
  const [category, setCategory] = useState('Fashion')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SmartBuyResult | null>(null)

  const userId = session?.user?.id

  function applyQuickSearch(qs: typeof QUICK_SEARCHES[0]) {
    setQuery(qs.query)
    setBudget(String(qs.budget))
    setCategory(qs.category)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { toast.error('Please sign in first'); return }
    if (!query.trim() || !budget) { toast.error('Enter what you want to buy and a budget'); return }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, query: query.trim(), budget: parseFloat(budget), category }),
      })
      if (!res.ok) throw new Error()
      setResult(await res.json())
    } catch {
      toast.error('Could not get recommendation — try again')
    } finally {
      setLoading(false)
    }
  }

  const decisionCfg = result ? DECISION_CONFIG[result.decision] : null
  const DecisionIcon = decisionCfg?.icon

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-muted flex items-center justify-center">
              <ShoppingBag size={20} className="text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-base">Smart Buy Advisor</h1>
              <p className="text-sm text-text-muted">AI-powered purchase decisions with real-time deal finding</p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-surface-raised border border-border rounded-xl p-6 mb-6">
          {/* Quick searches */}
          <div className="mb-6 pb-4 border-b border-border">
            <p className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-3">Quick examples</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SEARCHES.map((qs) => (
                <button
                  key={qs.label}
                  onClick={() => applyQuickSearch(qs)}
                  className="text-xs bg-surface border border-border rounded-lg px-3 py-1.5 text-text-muted hover:border-brand/30 hover:text-text-base transition-all"
                >
                  {qs.label} · {formatINR(qs.budget)}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-5">
            {/* Query input */}
            <div>
              <label className="text-sm font-medium text-text-base block mb-2">What do you want to buy?</label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nike running shoes, iPhone 15, office chair..."
                  className="w-full bg-surface border border-border rounded-xl pl-11 pr-4 py-3.5 text-base text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                  required
                />
              </div>
            </div>

            {/* Category + Budget row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-text-base block mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon
                    return (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => setCategory(c.label)}
                        className={`inline-flex items-center gap-2 text-sm rounded-lg px-3.5 py-2 border transition-all font-medium ${
                          category === c.label
                            ? 'bg-brand text-[#0A0A0A] border-brand'
                            : 'bg-surface border-border text-text-muted hover:border-brand/30'
                        }`}
                      >
                        <Icon size={14} />
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-text-base block mb-2">Your Budget</label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint" />
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="3000"
                    min={100}
                    className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3.5 text-base text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                    required
                  />
                </div>
                {budget && (
                  <p className="text-xs text-text-faint mt-1.5">
                    Budget: {formatINR(parseFloat(budget) || 0)}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing finances & searching deals...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Analyze & Find Best Deals
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {result && decisionCfg && DecisionIcon && (
          <div className="space-y-5">
            {/* Decision banner */}
            <div className={`rounded-xl border p-6 ${decisionCfg.bg}`}>
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-xl ${decisionCfg.bg} shrink-0`}>
                  <DecisionIcon size={28} className={decisionCfg.text} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xl font-bold ${decisionCfg.text}`}>{decisionCfg.label}</span>
                    <span className={`text-xs font-bold uppercase rounded-full px-2.5 py-0.5 border ${decisionCfg.bg} ${decisionCfg.text}`}>
                      {result.decision}
                    </span>
                  </div>
                  <p className="text-base text-text-base leading-relaxed mb-2">{result.financial_verdict}</p>
                  <p className="text-sm text-text-muted">{result.goal_impact}</p>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface-raised border border-border rounded-xl p-5 text-center">
                <p className="text-2xl font-bold text-text-base">{formatINR(parseFloat(budget) || 0)}</p>
                <p className="text-xs text-text-muted font-medium mt-1">Your Budget</p>
              </div>
              <div className="bg-surface-raised border border-border rounded-xl p-5 text-center">
                <p className={`text-2xl font-bold ${result.affordability_pct > 15 ? 'text-red-400' : result.affordability_pct > 5 ? 'text-amber-400' : 'text-brand'}`}>
                  {result.affordability_pct}%
                </p>
                <p className="text-xs text-text-muted font-medium mt-1">of Monthly Income</p>
              </div>
              <div className="bg-surface-raised border border-border rounded-xl p-5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Target size={18} className={result.days_delayed > 30 ? 'text-red-400' : result.days_delayed > 7 ? 'text-amber-400' : 'text-brand'} />
                  <p className={`text-2xl font-bold ${result.days_delayed > 30 ? 'text-red-400' : result.days_delayed > 7 ? 'text-amber-400' : 'text-brand'}`}>
                    +{result.days_delayed}
                  </p>
                </div>
                <p className="text-xs text-text-muted font-medium mt-1">Days Goal Delayed</p>
              </div>
            </div>

            {/* Product grid */}
            {result.products.length > 0 && (
              <div className="bg-surface-raised border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Tag size={18} className="text-brand" />
                    <p className="text-base font-semibold text-text-base">
                      Best Picks Under {formatINR(parseFloat(budget) || 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-faint">
                    <Globe size={12} />
                    Live Search Results
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.products.map((p, i) => {
                    const platformStyle = PLATFORM_STYLE[p.platform] ?? 'bg-border text-text-muted border-border'
                    const isCheapest = result.products.every((op, oi) => oi === i || op.price >= p.price)
                    return (
                      <div key={i} className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-brand/30 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-bold rounded-full px-2.5 py-1 border ${platformStyle}`}>
                              <Store size={10} className="inline mr-1" />
                              {p.platform}
                            </span>
                            {isCheapest && (
                              <span className="text-xs font-bold rounded-full px-2.5 py-1 bg-brand-muted border border-brand/20 text-brand">
                                <Award size={10} className="inline mr-1" />
                                Best Price
                              </span>
                            )}
                          </div>
                          <p className="text-xl font-bold text-text-base shrink-0">{formatINR(p.price)}</p>
                        </div>
                        <p className="text-base font-semibold text-text-base leading-tight">{p.name}</p>
                        {p.specs && (
                          <p className="text-sm text-text-faint">{p.specs}</p>
                        )}
                        <div className="flex items-start gap-2 pt-2 border-t border-border">
                          <TrendingDown size={14} className="text-brand shrink-0 mt-0.5" />
                          <p className="text-sm text-text-muted">{p.why}</p>
                        </div>
                        {p.url && p.url.startsWith('http') && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline mt-1"
                          >
                            <ExternalLink size={12} />
                            View on {p.platform}
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Search links */}
            <div className="bg-surface-raised border border-border rounded-xl p-5">
              <p className="text-sm font-medium text-text-muted mb-3">Search live prices on</p>
              <div className="flex gap-3">
                <a
                  href={result.search_links.flipkart}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl py-3 text-sm font-semibold hover:bg-orange-500/20 transition"
                >
                  <ExternalLink size={14} />
                  Flipkart
                </a>
                <a
                  href={result.search_links.amazon}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl py-3 text-sm font-semibold hover:bg-amber-500/20 transition"
                >
                  <ExternalLink size={14} />
                  Amazon India
                </a>
              </div>
            </div>

            {/* Web sources */}
            {result.sources && result.sources.filter(s => s.startsWith('http')).length > 0 && (
              <div className="bg-surface-raised border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={14} className="text-text-faint" />
                  <p className="text-xs font-semibold text-text-faint uppercase tracking-wider">Sources Searched</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.sources.filter(s => s.startsWith('http')).slice(0, 8).map((src, i) => {
                    let domain = ''
                    try { domain = new URL(src).hostname.replace('www.', '') } catch { domain = src.slice(0, 30) }
                    return (
                      <a
                        key={i}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-faint hover:text-brand border border-border hover:border-brand/30 rounded-full px-3 py-1.5 transition"
                      >
                        {domain}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* New search button */}
            <button
              onClick={() => { setResult(null); setQuery(''); setBudget('') }}
              className="w-full text-sm text-text-muted hover:text-text-base border border-border hover:border-brand/30 rounded-xl py-3 transition-all"
            >
              Start New Search
            </button>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-xl bg-surface-raised border border-border flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={32} className="text-text-faint" />
            </div>
            <p className="text-text-muted text-base">
              Enter what you want to buy above
            </p>
            <p className="text-sm text-text-faint mt-1">
              AI will check if it fits your financial plan and find the best deals
            </p>
          </div>
        )}
      </div>
    </div>
  )
}