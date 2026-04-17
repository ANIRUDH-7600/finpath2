'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, TrendingUp, Target, Brain, LineChart, Shield } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem('finpath_user')
    if (user) router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand rounded-xl p-1.5">
            <Zap size={18} className="text-[#0A0A0A] fill-[#0A0A0A]" />
          </div>
          <span className="text-xl font-bold text-text-base">FinPath</span>
        </div>
        <Link
          href="/auth/signin"
          className="bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl px-5 py-2.5 text-sm transition-colors"
        >
          Get started →
        </Link>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
        <span className="bg-brand-muted text-brand text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-brand/20">
          AI-Powered Personal Finance
        </span>

        <h1 className="text-5xl md:text-6xl font-bold text-text-base mb-5 leading-tight tracking-tight">
          Your Personal CFO.{' '}
          <span className="text-brand">Finally.</span>
        </h1>

        <p className="text-lg text-text-muted max-w-xl mb-10 leading-relaxed">
          Close the gap between daily spending and generational wealth. FinPath runs AI agents
          that analyze your behavior, model your goals, suggest portfolios, and warn you before
          a purchase hurts your future.
        </p>

        <Link
          href="/auth/signin"
          className="bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl px-8 py-4 text-base transition-colors"
        >
          Start for free →
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 max-w-3xl w-full">
          {[
            { icon: Brain, title: 'Behavioral Analysis', desc: 'AI finds your spending leakage patterns and scores your financial health in real time.' },
            { icon: Target, title: 'Goal Modeling', desc: 'Set a goal and get an exact daily savings number, inflation-adjusted for Indian markets.' },
            { icon: TrendingUp, title: 'Portfolio Intelligence', desc: 'SEBI-aligned SIP recommendations with real Indian mutual funds and ETFs.' },
            { icon: LineChart, title: 'Investment Simulation', desc: 'Simulate Nifty 50, mutual funds, and ETF performance before committing real money.' },
            { icon: Shield, title: 'Purchase Guardian', desc: 'AI warns you before a purchase hurts your savings goal — and calculates the real cost.' },
            { icon: Zap, title: 'Instant Insights', desc: 'Connect your UPI statement or bank CSV for instant AI-powered financial analysis.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-surface-raised border border-border rounded-2xl p-5 text-left hover:border-brand/30 transition-colors">
              <div className="bg-brand-muted rounded-xl p-2.5 w-fit mb-3">
                <Icon size={18} className="text-brand" />
              </div>
              <p className="text-sm font-semibold text-text-base mb-1">{title}</p>
              <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-border px-8 py-5 flex items-center justify-between text-xs text-text-faint">
        <span>© 2026 FinPath · AI Finance for India</span>
        <span>Not SEBI registered. For educational purposes only.</span>
      </footer>
    </div>
  )
}
