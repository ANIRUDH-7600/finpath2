'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw, Info, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import PortfolioDonut from '@/components/charts/PortfolioDonut'
import { formatINR } from '@/lib/utils/formatCurrency'
import type { PortfolioSuggestion, User } from '@/types'

const RISK_QUESTIONS = [
  {
    question: "If your investment drops 30% overnight, you would...",
    options: [{ label: "Sell everything", score: 1 }, { label: "Wait and watch", score: 3 }, { label: "Buy more — it's a discount!", score: 5 }],
  },
  {
    question: "When do you need this money?",
    options: [{ label: "Within 1 year", score: 1 }, { label: "In 1-3 years", score: 3 }, { label: "5+ years away", score: 5 }],
  },
  {
    question: "How do you describe your investing style?",
    options: [{ label: "Safety first always", score: 1 }, { label: "Balanced approach", score: 3 }, { label: "High risk high reward", score: 5 }],
  },
]

const ASSET_BADGE: Record<string, string> = {
  equity: 'bg-brand-muted text-brand border border-brand/20',
  debt: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  gold: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  cash: 'bg-border text-text-muted border border-border',
}

export default function PortfolioPage() {
  const router = useRouter()
  const [portfolio, setPortfolio] = useState<PortfolioSuggestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [userId, setUserId] = useState('')
  const [income, setIncome] = useState(0)
  const [riskScore, setRiskScore] = useState(3)
  const [showQuiz, setShowQuiz] = useState(false)
  const [answers, setAnswers] = useState<number[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('finpath_user')
    if (!stored) { router.replace('/auth/signin'); return }
    const u = JSON.parse(stored) as User
    setUserId(u.id)
    setIncome(u.monthly_income)
    setRiskScore(u.risk_appetite ?? 3)

    const cached = localStorage.getItem('finpath_portfolio')
    if (cached) {
      setPortfolio(JSON.parse(cached))
      setLoading(false)
    } else {
      setShowQuiz(true)
      setLoading(false)
    }
  }, [router])

  async function generatePortfolio(rs: number) {
    setGenerating(true)
    try {
      const res = await fetch('/api/portfolio-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, risk_score: rs, monthly_income: income }),
      })
      const data = await res.json()
      setPortfolio(data)
      localStorage.setItem('finpath_portfolio', JSON.stringify(data))
      setShowQuiz(false)
      toast.success('Portfolio generated!')
    } catch {
      toast.error('Portfolio generation failed')
    } finally {
      setGenerating(false)
    }
  }

  function handleQuizSubmit() {
    if (answers.length < 3) return
    const rs = Math.round(answers.reduce((a, b) => a + b, 0) / 3)
    setRiskScore(rs)
    generatePortfolio(rs)
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="animate-pulse bg-surface-raised rounded-2xl h-32 border border-border" />)}
      </div>
    )
  }

  if (showQuiz || !portfolio) {
    return (
      <div className="p-6 md:p-8 max-w-lg">
        <h1 className="text-2xl font-bold text-text-base mb-1">Investment Profile</h1>
        <p className="text-sm text-text-muted mb-6">3 quick questions to get your personalized portfolio</p>

        <div className="space-y-5">
          {RISK_QUESTIONS.map((q, qi) => (
            <div key={qi} className="bg-surface-raised border border-border rounded-2xl p-5">
              <p className="text-sm font-medium text-text-base mb-3">{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const selected = answers[qi] === opt.score
                  return (
                    <button
                      key={opt.score}
                      onClick={() => { const a = [...answers]; a[qi] = opt.score; setAnswers(a) }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border transition-colors ${selected ? 'border-brand bg-brand-muted text-brand font-medium' : 'border-border text-text-muted hover:border-brand/30 hover:text-text-base'}`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <button
            onClick={handleQuizSubmit}
            disabled={answers.length < 3 || generating}
            className="w-full bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {generating && <Loader2 size={16} className="animate-spin" />}
            {generating ? 'Building portfolio...' : 'Get My Portfolio →'}
          </button>
        </div>
      </div>
    )
  }

  const assetClasses = Object.entries(portfolio.allocation) as [string, number][]

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-base">Portfolio Management</h1>
          <p className="text-sm text-text-muted mt-0.5">Risk score: {riskScore}/5 · AI-optimized for Indian markets</p>
        </div>
        <button
          onClick={() => { setShowQuiz(true); setAnswers([]) }}
          className="flex items-center gap-2 bg-surface-raised border border-border rounded-xl px-4 py-2 text-sm text-text-muted hover:text-text-base hover:border-brand/30 transition-all"
        >
          <RefreshCw size={14} />
          Recalculate
        </button>
      </div>

      <div className="bg-surface-raised border border-border rounded-2xl p-6 mb-4 text-center">
        <PortfolioDonut allocation={portfolio.allocation} />
        <div className="flex items-center justify-center gap-2 mt-3">
          <TrendingUp size={18} className="text-brand" />
          <p className="text-lg font-bold text-text-base">
            Invest <span className="text-brand">{formatINR(portfolio.sip_amount)}/month</span> via SIP
          </p>
        </div>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} className="text-blue-400" />
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">AI Analysis</p>
        </div>
        <p className="text-sm text-text-muted leading-relaxed">{portfolio.reasoning}</p>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-5">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-1">Market Note</p>
        <p className="text-sm text-text-muted">{portfolio.macro_note}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {assetClasses.filter(([, v]) => v > 0).map(([asset, pct]) => {
          const badgeClass = ASSET_BADGE[asset] ?? 'bg-border text-text-muted border border-border'
          const funds = portfolio.instruments?.[asset] ?? []
          return (
            <div key={asset} className="bg-surface-raised border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-text-base capitalize">{asset}</p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeClass}`}>{pct}%</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {funds.map((fund: string, i: number) => (
                  <span key={i} className={`text-xs px-2 py-1 rounded-lg ${badgeClass}`}>{fund}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-text-faint text-center">
        Not financial advice. Consult a SEBI registered investment advisor before investing.
      </p>
    </div>
  )
}
