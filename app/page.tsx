'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Zap, Brain, Target, TrendingUp, Shield, Lock, ChevronRight } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Feature {
  icon: React.ElementType
  index: string
  title: string
  desc: string
}

interface Stat {
  value: string
  suffix: string
  label: string
}

// ─── Data ────────────────────────────────────────────────────────────────────
const STATS: Stat[] = [
  { value: '0', suffix: '₹', label: 'Capital needed' },
  { value: '<60', suffix: 's', label: 'To get started' },
  { value: '8', suffix: '', label: 'AI agents live' },
  { value: '24', suffix: '/7', label: 'Always watching' },
]

const FEATURES: Feature[] = [
  {
    icon: Brain,
    index: '01',
    title: 'It knows you better than you do',
    desc: 'Maps your spending triggers, emotional patterns, and leak cycles. Then builds automated fixes before you even notice the damage.',
  },
  {
    icon: Target,
    index: '02',
    title: 'Your goal. Broken into today.',
    desc: 'Skip the motivation. Get the math. Any target — emergency fund, house, freedom — reduced to an exact daily number and a ruthless timeline.',
  },
  {
    icon: TrendingUp,
    index: '03',
    title: 'Built for India. Not borrowed from the West.',
    desc: 'NIFTY signals, SIP optimisation, tax-efficient instruments. SEBI-compliant intelligence designed for Indian markets from the ground up.',
  },
  {
    icon: Shield,
    index: '04',
    title: 'Stops you before you wreck it',
    desc: 'A dedicated agent intercepts every impulse purchase and shows you the real compounded cost. Then blocks it. Then asks again.',
  },
  {
    icon: Zap,
    index: '05',
    title: 'Running in sixty seconds flat',
    desc: 'Connect UPI or your bank. Eight agents fire in parallel. First insight lands before you finish your coffee. No forms. No spreadsheets.',
  },
  {
    icon: Lock,
    index: '06',
    title: 'We see it. We compute it. We forget it.',
    desc: 'Zero persistent storage. Your transaction stream is analysed in memory, the insight is returned, and everything else is discarded. Privacy is the architecture.',
  },
]

const TICKER_ITEMS = [
  'NET WORTH GROWING',
  'LEAKS DETECTED',
  'GOALS CRUSHED',
  'IMPULSE BLOCKED',
  'PORTFOLIO OPTIMISED',
  'TAX SAVED',
  'SIP AUTOMATED',
  '8 AGENTS LIVE',
]

const PROCESS_STEPS = [
  { num: '01', title: 'Connect', desc: 'Link UPI or your bank. No card. No forms. Under sixty seconds.' },
  { num: '02', title: 'Dissect', desc: 'All eight agents attack your transaction history at once. Nothing is missed.' },
  { num: '03', title: 'Destroy', desc: 'Every leak is named. Every bad habit is priced. Automated systems replace them.' },
  { num: '04', title: 'Compound', desc: 'Freed capital routes to your goals automatically. The number goes up. Forever.' },
]

// ─── Hooks ───────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Ticker() {
  return (
    <div className="ticker-wrapper">
      <div className="ticker-track">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i} className="ticker-item">
            <span className="ticker-dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function GridLines() {
  return (
    <div className="grid-lines" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid-line" />
      ))}
    </div>
  )
}

function StatCard({ stat, delay }: { stat: Stat; delay: number }) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={`stat-card ${inView ? 'stat-card--visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="stat-value">
        {stat.value}
        <span className="stat-suffix">{stat.suffix}</span>
      </p>
      <p className="stat-label">{stat.label}</p>
    </div>
  )
}

function FeatureCard({ feature, delay }: { feature: Feature; delay: number }) {
  const { ref, inView } = useInView()
  const Icon = feature.icon
  return (
    <div
      ref={ref}
      className={`feature-card ${inView ? 'feature-card--visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="feature-index">{feature.index}</span>
      <Icon size={22} className="feature-icon" strokeWidth={1.5} />
      <h3 className="feature-title">{feature.title}</h3>
      <p className="feature-desc">{feature.desc}</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Subtle parallax on hero glow
  useEffect(() => {
    if (!mounted) return
    const onMove = (e: MouseEvent) => {
      const glow = document.getElementById('hero-glow')
      if (!glow) return
      const x = (e.clientX / window.innerWidth - 0.5) * 40
      const y = (e.clientY / window.innerHeight - 0.5) * 40
      glow.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [mounted])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');

        :root {
          --brand: #02FF9D;
          --brand-dim: rgba(2,255,157,0.08);
          --brand-border: rgba(2,255,157,0.18);
          --black: #070708;
          --surface: #0e0e10;
          --surface2: #161618;
          --border: rgba(255,255,255,0.06);
          --border2: rgba(255,255,255,0.1);
          --text: #efefef;
          --text-muted: rgba(239,239,239,0.42);
          --text-faint: rgba(239,239,239,0.18);
          --font-display: 'Bebas Neue', sans-serif;
          --font-body: 'DM Sans', sans-serif;
          --font-mono: 'DM Mono', monospace;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html { scroll-behavior: smooth; }

        body {
          background: var(--black);
          color: var(--text);
          font-family: var(--font-body);
          font-weight: 300;
          line-height: 1.65;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ── NOISE ── */
        body::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.032;
          pointer-events: none;
          z-index: 9999;
        }

        /* ── NAVBAR ── */
        .nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          border-bottom: 1px solid var(--border);
          background: rgba(7,7,8,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-logo-mark {
          width: 30px;
          height: 30px;
          background: var(--brand);
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-logo-mark span {
          font-family: var(--font-display);
          font-size: 17px;
          color: #000;
          line-height: 1;
          padding-top: 1px;
        }

        .nav-logo-text {
          font-family: var(--font-display);
          font-size: 22px;
          letter-spacing: 0.06em;
          color: var(--text);
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .nav-link {
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          transition: color 0.2s;
        }

        .nav-link:hover { color: var(--text); }

        .nav-cta {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-ghost {
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: 8px 16px;
          border: 1px solid var(--border2);
          border-radius: 4px;
          transition: all 0.2s;
        }

        .btn-ghost:hover {
          color: var(--text);
          border-color: var(--brand-border);
        }

        .btn-primary {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #000;
          background: var(--brand);
          padding: 8px 20px;
          border-radius: 4px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-primary:hover { background: #00e88c; }

        /* ── GRID LINES ── */
        .grid-lines {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          pointer-events: none;
          z-index: 0;
        }

        .grid-line {
          border-right: 1px solid var(--border);
        }

        /* ── TICKER ── */
        .ticker-wrapper {
          width: 100%;
          overflow: hidden;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 11px 0;
          background: var(--surface);
        }

        .ticker-track {
          display: flex;
          gap: 0;
          animation: ticker 30s linear infinite;
          width: max-content;
        }

        .ticker-item {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.12em;
          color: var(--text-muted);
          padding: 0 36px;
          white-space: nowrap;
        }

        .ticker-item:hover { color: var(--brand); }

        .ticker-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--brand);
          opacity: 0.6;
          flex-shrink: 0;
        }

        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* ── HERO ── */
        .hero {
          position: relative;
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 100px 40px 60px;
          overflow: hidden;
        }

        .hero-glow {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(2,255,157,0.07) 0%, transparent 65%);
          pointer-events: none;
          transition: transform 0.15s ease-out;
          z-index: 0;
        }

        .hero-inner {
          position: relative;
          z-index: 1;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          color: var(--brand);
          text-transform: uppercase;
          margin-bottom: 28px;
          opacity: 0;
          animation: fadeUp 0.7s ease forwards 0.1s;
        }

        .hero-eyebrow-line {
          width: 32px;
          height: 1px;
          background: var(--brand);
          opacity: 0.5;
        }

        .hero-heading {
          font-family: var(--font-display);
          font-size: clamp(80px, 12vw, 160px);
          line-height: 0.93;
          letter-spacing: 0.01em;
          color: var(--text);
          margin-bottom: 0;
        }

        .hero-heading-line {
          display: block;
          overflow: hidden;
        }

        .hero-heading-line span {
          display: block;
          opacity: 0;
          transform: translateY(100%);
          animation: slideUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards;
        }

        .hero-heading-line:nth-child(1) span { animation-delay: 0.2s; }
        .hero-heading-line:nth-child(2) span { animation-delay: 0.32s; }
        .hero-heading-line:nth-child(3) span { animation-delay: 0.44s; color: var(--brand); }

        .hero-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: flex-end;
          margin-top: 48px;
          opacity: 0;
          animation: fadeUp 0.8s ease forwards 0.7s;
        }

        .hero-desc {
          font-size: 17px;
          font-weight: 300;
          color: var(--text-muted);
          max-width: 440px;
          line-height: 1.75;
        }

        .hero-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 16px;
        }

        .btn-hero {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 32px;
          background: var(--brand);
          color: #000;
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-radius: 3px;
          transition: all 0.2s;
        }

        .btn-hero:hover {
          background: #00e88c;
          gap: 14px;
        }

        .hero-note {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--text-faint);
          text-transform: uppercase;
        }

        /* ── STATS ── */
        .stats-section {
          position: relative;
          border-top: 1px solid var(--border);
          background: var(--surface);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          max-width: 1280px;
          margin: 0 auto;
        }

        .stat-card {
          padding: 48px 40px;
          border-right: 1px solid var(--border);
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .stat-card:last-child { border-right: none; }

        .stat-card--visible {
          opacity: 1;
          transform: translateY(0);
        }

        .stat-value {
          font-family: var(--font-display);
          font-size: 64px;
          line-height: 1;
          letter-spacing: 0.01em;
          color: var(--text);
        }

        .stat-suffix {
          font-size: 36px;
          color: var(--brand);
          margin-left: 2px;
        }

        .stat-label {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--text-faint);
          text-transform: uppercase;
          margin-top: 10px;
        }

        /* ── FEATURES ── */
        .features-section {
          position: relative;
          padding: 120px 40px;
          overflow: hidden;
        }

        .section-label {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          color: var(--text-faint);
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .section-heading {
          font-family: var(--font-display);
          font-size: clamp(48px, 7vw, 88px);
          line-height: 0.95;
          letter-spacing: 0.01em;
          color: var(--text);
          max-width: 1280px;
          margin: 0 auto 64px;
        }

        .section-heading .accent { color: var(--brand); }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          max-width: 1280px;
          margin: 0 auto;
          overflow: hidden;
        }

        .feature-card {
          background: var(--black);
          padding: 36px 32px;
          position: relative;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease, background 0.2s;
        }

        .feature-card:hover {
          background: var(--surface);
        }

        .feature-card--visible {
          opacity: 1;
          transform: translateY(0);
        }

        .feature-card::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0;
          width: 0;
          height: 1px;
          background: var(--brand);
          transition: width 0.3s ease;
        }

        .feature-card:hover::after { width: 100%; }

        .feature-index {
          display: block;
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--text-faint);
          margin-bottom: 24px;
        }

        .feature-icon {
          color: var(--brand);
          margin-bottom: 16px;
          display: block;
        }

        .feature-title {
          font-size: 16px;
          font-weight: 500;
          color: var(--text);
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }

        .feature-desc {
          font-size: 13.5px;
          font-weight: 300;
          color: var(--text-muted);
          line-height: 1.7;
        }

        /* ── PROCESS ── */
        .process-section {
          position: relative;
          padding: 120px 40px;
          background: var(--surface);
          overflow: hidden;
        }

        .process-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          border: 1px solid var(--border);
          max-width: 1280px;
          margin: 64px auto 0;
          background: var(--border);
        }

        .process-step {
          background: var(--surface);
          padding: 40px 32px;
          position: relative;
          transition: background 0.2s;
        }

        .process-step:hover { background: var(--surface2); }

        .process-num {
          font-family: var(--font-display);
          font-size: 72px;
          line-height: 1;
          color: rgba(255,255,255,0.05);
          margin-bottom: 16px;
          letter-spacing: 0.01em;
        }

        .process-title {
          font-size: 18px;
          font-weight: 500;
          color: var(--text);
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }

        .process-desc {
          font-size: 13.5px;
          font-weight: 300;
          color: var(--text-muted);
          line-height: 1.7;
        }

        .process-step::after {
          content: attr(data-num);
          position: absolute;
          top: 20px;
          right: 20px;
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--brand);
          opacity: 0.6;
        }

        /* ── CTA ── */
        .cta-section {
          position: relative;
          padding: 140px 40px;
          overflow: hidden;
          text-align: center;
        }

        .cta-glow {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(2,255,157,0.06) 0%, transparent 65%);
          pointer-events: none;
        }

        .cta-inner {
          position: relative;
          z-index: 1;
          max-width: 800px;
          margin: 0 auto;
        }

        .cta-heading {
          font-family: var(--font-display);
          font-size: clamp(60px, 9vw, 120px);
          line-height: 0.93;
          letter-spacing: 0.01em;
          color: var(--text);
          margin-bottom: 28px;
        }

        .cta-heading .accent { color: var(--brand); }

        .cta-sub {
          font-size: 16px;
          font-weight: 300;
          color: var(--text-muted);
          max-width: 500px;
          margin: 0 auto 40px;
          line-height: 1.75;
        }

        .btn-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 18px 44px;
          background: var(--brand);
          color: #000;
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-radius: 3px;
          transition: all 0.2s;
        }

        .btn-cta:hover {
          background: #00e88c;
          gap: 14px;
        }

        .cta-legal {
          margin-top: 20px;
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--text-faint);
          text-transform: uppercase;
        }

        /* ── FOOTER ── */
        .footer {
          border-top: 1px solid var(--border);
          padding: 40px 40px;
          background: var(--surface);
        }

        .footer-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .footer-logo-mark {
          width: 24px;
          height: 24px;
          background: var(--brand);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .footer-logo-mark span {
          font-family: var(--font-display);
          font-size: 14px;
          color: #000;
          line-height: 1;
          padding-top: 1px;
        }

        .footer-logo-text {
          font-family: var(--font-display);
          font-size: 18px;
          letter-spacing: 0.06em;
          color: var(--text);
        }

        .footer-copy {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--text-faint);
          text-transform: uppercase;
        }

        .footer-links {
          display: flex;
          gap: 24px;
        }

        .footer-link {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--text-faint);
          text-transform: uppercase;
          transition: color 0.2s;
        }

        .footer-link:hover { color: var(--brand); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .nav { padding: 0 24px; }
          .nav-links { display: none; }
          .hero { padding: 90px 24px 60px; }
          .hero-body { grid-template-columns: 1fr; gap: 32px; }
          .hero-actions { align-items: flex-start; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .stat-card:nth-child(2) { border-right: none; }
          .features-section { padding: 80px 24px; }
          .features-grid { grid-template-columns: repeat(2, 1fr); }
          .process-section { padding: 80px 24px; }
          .process-grid { grid-template-columns: repeat(2, 1fr); }
          .cta-section { padding: 100px 24px; }
          .footer { padding: 32px 24px; }
        }

        @media (max-width: 640px) {
          .features-grid { grid-template-columns: 1fr; }
          .process-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .footer-inner { flex-direction: column; gap: 20px; text-align: center; }
          .hero-heading { font-size: 68px; }
          .section-heading { font-size: 48px; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-logo">
          
          <span className="nav-logo-text">FINPATH</span>
        </div>

        <div className="nav-links">
          <a
            href="#features"
            className="nav-link"
            onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}
          >
            Features
          </a>
          <a
            href="#process"
            className="nav-link"
            onClick={(e) => { e.preventDefault(); document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' }) }}
          >
            How it works
          </a>
          <a href="#" className="nav-link">Agents</a>
        </div>

        <div className="nav-cta">
          <Link href="/auth/signin" className="btn-ghost">Sign in</Link>
          <Link href="/auth/signin" className="btn-primary">
            Start free
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero" ref={heroRef}>
        <GridLines />
        <div className="hero-glow" id="hero-glow" />

        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-line" />
            Eight agents. One mission. Your wealth.
          </div>

          <h1 className="hero-heading">
            <span className="hero-heading-line"><span>Your money</span></span>
            <span className="hero-heading-line"><span>is leaking.</span></span>
            <span className="hero-heading-line"><span>Fix it now.</span></span>
          </h1>

          <div className="hero-body">
            <p className="hero-desc">
              Eight AI agents tear through your finances simultaneously — exposing
              every leak, blocking every impulse, and routing every spare rupee
              toward the life you keep postponing.
            </p>

            <div className="hero-actions">
              <Link href="/auth/signin" className="btn-hero">
                Start in 60 seconds
                <ArrowUpRight size={15} />
              </Link>
              <p className="hero-note">Free forever &nbsp;·&nbsp; No card &nbsp;·&nbsp; SEBI compliant</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <Ticker />

      {/* ── STATS ── */}
      <section className="stats-section">
        <div className="stats-grid">
          {STATS.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} delay={i * 100} />
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="features-section">
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="section-label">The arsenal</div>
          <h2 className="section-heading">
            Eight agents.<br />
            <span className="accent">Every angle.</span>
          </h2>
        </div>
        <div className="features-grid">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.index} feature={feature} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section id="process" className="process-section">
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="section-label">The process</div>
          <h2 className="section-heading">
            No setup.<br />
            <span className="accent">Just results.</span>
          </h2>
        </div>
        <div className="process-grid">
          {PROCESS_STEPS.map((step) => (
            <div key={step.num} className="process-step" data-num={step.num}>
              <div className="process-num">{step.num}</div>
              <h3 className="process-title">{step.title}</h3>
              <p className="process-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-glow" />
        <div className="cta-inner">
          <h2 className="cta-heading">
            The longer<br />
            <span className="accent">you wait.</span>
          </h2>
          <p className="cta-sub">
            Every day without FinPath is another day your money leaks, compounds against you,
            and funds someone else's future. The machine is built. It's waiting.
          </p>
          <Link href="/auth/signin" className="btn-cta">
            Start for free
            <ArrowUpRight size={15} />
          </Link>
          <p className="cta-legal">Free forever &nbsp;·&nbsp; No card required &nbsp;·&nbsp; SEBI compliant</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
       
            <span className="footer-logo-text">FINPATH</span>
          </div>

          <p className="footer-copy">© 2025 FinPath &nbsp;·&nbsp; Not SEBI registered &nbsp;·&nbsp; Educational purposes</p>

          <div className="footer-links">
            <a href="#" className="footer-link">Twitter</a>
            <a href="#" className="footer-link">LinkedIn</a>
            <a href="#" className="footer-link">Discord</a>
          </div>
        </div>
      </footer>
    </>
  )
}