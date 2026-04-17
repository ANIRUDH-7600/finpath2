'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Zap, Shield, Target, TrendingUp, Brain, Lock, Sparkles } from 'lucide-react'

const STATS = [
  { value: "ZERO", label: "CAPITAL NEEDED" },
  { value: "UNDER 60", label: "SECONDS" },
  { value: "8", label: "AI AGENTS" },
  { value: "24/7", label: "PROTECTION" },
]

const FEATURES = [
  { icon: Brain, title: "READ YOUR MIND", desc: "Behavioral AI maps your money psychology. Spots leaks you ignore. Fixes them automatically." },
  { icon: Target, title: "DESTROY GOALS", desc: "Raw mathematics. No feelings. Exact daily number to crush any financial target." },
  { icon: TrendingUp, title: "WEAPONIZE MONEY", desc: "SEBI-compliant. Aggressive. Built for India. Zero fluff recommendations." },
  { icon: Shield, title: "STOP STUPID", desc: "Guardian AI blocks impulse purchases. Calculates real cost of every dumb decision." },
  { icon: Zap, title: "60 SECOND VICTORY", desc: "Connect UPI. Get analyzed. Start winning. No spreadsheets. No excuses." },
  { icon: Lock, title: "YOURS ALONE", desc: "Zero data storage. We compute. Then forget. Privacy by force." },
]

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem('finpath_user')
    if (user) router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-black">
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-6 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#02FF9D] rounded-sm flex items-center justify-center">
              <span className="text-black font-black text-sm">F</span>
            </div>
            <span className="text-xl font-black tracking-tighter text-white">FINPATH</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/signin" className="hidden md:block text-sm font-medium text-white/60 hover:text-white transition-colors">
              ACCESS
            </Link>
            <Link 
              href="/auth/signin" 
              className="px-6 py-2.5 text-sm font-bold bg-[#02FF9D] text-black rounded-sm hover:bg-[#02FF9D]/90 transition-all"
            >
              ENTER NOW
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative min-h-screen flex items-center justify-center px-6">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#02FF9D]/5 rounded-full blur-[150px]" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px]" />
          </div>

          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8 px-4 py-2 border border-[#02FF9D]/30 rounded-sm bg-[#02FF9D]/5">
              <span className="text-xs font-mono tracking-wider text-[#02FF9D]">YOUR MONEY. YOUR RULES.</span>
            </div>

            <h1 className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white mb-8 leading-[1.1]">
              STOP
              <span className="block text-[#02FF9D]">BANKRUPTING</span>
              YOUR FUTURE
            </h1>

            <p className="text-xl md:text-2xl text-white/60 max-w-3xl mx-auto mb-12 font-light leading-relaxed">
              Eight AI agents dissect your spending. Hunt your leaks. Build your wealth. 
              No human judgment. No data theft. Just cold, hard mathematics.
            </p>

            <div className="flex flex-col md:flex-row gap-4 justify-center mb-20">
              <Link
                href="/auth/signin"
                className="px-10 py-4 bg-[#02FF9D] text-black font-bold text-lg rounded-sm hover:bg-[#02FF9D]/90 transition-all inline-flex items-center gap-2 group"
              >
                CLAIM YOUR FUTURE
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#features"
                onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}
                className="px-10 py-4 border border-white/20 text-white font-medium text-lg rounded-sm hover:border-[#02FF9D]/50 hover:text-[#02FF9D] transition-all inline-flex items-center gap-2"
              >
                SEE THE MACHINE
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-12">
              {STATS.map((stat, i) => (
                <div key={stat.label}>
                  <p className="text-3xl md:text-4xl font-black text-white tracking-tighter">{stat.value}</p>
                  <p className="text-xs font-mono text-white/40 mt-1 tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="px-6 py-32 bg-zinc-950">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <div className="inline-block mb-4 px-3 py-1 border border-[#02FF9D]/20 rounded-sm bg-[#02FF9D]/5">
                <span className="text-[10px] font-mono text-[#02FF9D] tracking-wider">THE ARSENAL</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-4">
                SIX WEAPONS.
                <span className="text-[#02FF9D]"> ONE WAR.</span>
              </h2>
              <p className="text-white/40 max-w-2xl mx-auto">
                Each agent specializes in destroying a specific money leak. Together, they're unstoppable.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="group bg-zinc-900/50 border border-white/10 p-8 hover:border-[#02FF9D]/30 transition-all hover:-translate-y-1">
                    <Icon size={32} className="text-[#02FF9D] mb-4" />
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
                    <p className="text-white/40 text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="px-6 py-32 bg-black">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-block mb-6 px-4 py-2 border border-[#02FF9D]/20 rounded-sm bg-[#02FF9D]/5">
              <span className="text-xs font-mono text-[#02FF9D] tracking-wider">THE PROCESS</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-6">
              FOUR MOVES.
              <span className="text-[#02FF9D]"> CHECKMATE.</span>
            </h2>
            <p className="text-white/40 max-w-2xl mx-auto mb-16">
              No complexity. No confusion. Pure execution.
            </p>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { num: "01", title: "CONNECT", desc: "Link UPI or bank. 60 seconds." },
                { num: "02", title: "SCAN", desc: "8 AI agents attack your data." },
                { num: "03", title: "DESTROY", desc: "Kill spending leaks. Build systems." },
                { num: "04", title: "WIN", desc: "Watch wealth compound. Forever." }
              ].map((step) => (
                <div key={step.num} className="text-left">
                  <div className="text-6xl font-black text-[#02FF9D]/20 mb-3">{step.num}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-white/40 text-sm">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-32 bg-zinc-950">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-[#02FF9D] rounded-sm flex items-center justify-center mx-auto mb-8">
              <Zap size={32} className="text-black" />
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-6">
              ENOUGH EXCUSES.
              <span className="text-[#02FF9D]"> ENOUGH DELAY.</span>
            </h2>
            <p className="text-xl text-white/40 mb-10 leading-relaxed">
              Every day you wait is another day your money works against you. 
              The system is ready. The agents are waiting. 
              Your future self demands action.
            </p>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-3 px-12 py-5 bg-[#02FF9D] text-black font-bold text-lg rounded-sm hover:bg-[#02FF9D]/90 transition-all group"
            >
              START THE MACHINE
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-white/20 text-xs mt-6 font-mono">
              ZERO COST. ZERO COMMITMENT. ZERO EXCUSES.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#02FF9D] rounded-sm" />
            <span className="text-sm font-black tracking-tighter text-white">FINPATH</span>
          </div>
          <p className="text-white/20 text-xs font-mono">2025 — MONEY DOESN'T SLEEP. NEITHER DO WE.</p>
          <div className="flex gap-6">
            <a href="#" className="text-white/20 text-xs hover:text-[#02FF9D] transition-colors">TWITTER</a>
            <a href="#" className="text-white/20 text-xs hover:text-[#02FF9D] transition-colors">LINKEDIN</a>
            <a href="#" className="text-white/20 text-xs hover:text-[#02FF9D] transition-colors">DISCORD</a>
          </div>
        </div>
      </footer>
    </div>
  )
}