'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Upload, CheckCircle, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

const RISK_QUESTIONS = [
  {
    question: "If your investment drops 30% overnight, you would...",
    options: [
      { label: "Sell everything", score: 1 },
      { label: "Wait and watch", score: 3 },
      { label: "Buy more — it's a discount!", score: 5 },
    ],
  },
  {
    question: "When do you need this money?",
    options: [
      { label: "Within 1 year", score: 1 },
      { label: "In 1-3 years", score: 3 },
      { label: "5+ years away", score: 5 },
    ],
  },
  {
    question: "How do you describe your investing style?",
    options: [
      { label: "Safety first always", score: 1 },
      { label: "Balanced approach", score: 3 },
      { label: "High risk high reward", score: 5 },
    ],
  },
]

const inputClass = "w-full bg-[#1C1C1C] border border-border rounded-xl px-4 py-3 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [income, setIncome] = useState('')
  const [phone, setPhone] = useState('')
  const [riskAnswers, setRiskAnswers] = useState<number[]>([])
  const [csvParsed, setCsvParsed] = useState<Array<{ merchant: string; amount: number; date: string; category: string }>>([])
  const [csvLoading, setCsvLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (session?.user?.name && !name) setName(session.user.name)
    if (session?.user?.onboarding_complete) router.replace('/dashboard')
  }, [session, router, name])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.replace('/auth/signin')
    return null
  }

  const riskScore = riskAnswers.length === 3
    ? Math.round(riskAnswers.reduce((a, b) => a + b, 0) / 3)
    : 3

  async function handleFile(file: File) {
    setCsvLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/parse-csv', { method: 'POST', body: fd })
      const data = await res.json()
      setCsvParsed(data)
      toast.success(`Parsed ${data.length} transactions`)
    } catch {
      toast.error('File parsing failed')
    } finally {
      setCsvLoading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleComplete() {
    const userId = session?.user?.id
    if (!userId) {
      toast.error('Session expired. Please sign in again.')
      router.replace('/auth/signin')
      return
    }
    setSubmitting(true)
    try {
      // User already exists — NextAuth created them on Google sign-in. PATCH to update profile.
      const updateRes = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          monthly_income: parseFloat(income) || 0,
          risk_appetite: riskScore,
          phone: phone || null,
        }),
      })

      if (!updateRes.ok) {
        const err = await updateRes.json()
        throw new Error(err.error ?? 'Failed to update profile')
      }

      const updatedUser = await updateRes.json()
      localStorage.setItem('finpath_user', JSON.stringify(updatedUser))

      if (csvParsed.length > 0) {
        await Promise.all(
          csvParsed.slice(0, 50).map((t) =>
            fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId, ...t }),
            })
          )
        )
      }

      toast.success('Welcome to FinPath!')
      router.replace('/dashboard')
    } catch (err) {
      toast.error((err as Error).message ?? 'Setup failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="bg-brand rounded-xl p-1.5">
            <Zap size={18} className="text-[#0A0A0A] fill-[#0A0A0A]" />
          </div>
          <span className="text-2xl font-bold text-text-base">FinPath</span>
        </div>

        <div className="bg-surface-raised border border-border rounded-2xl p-7">
          <div className="flex gap-2 mb-7">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-border">
                <div className={`h-full rounded-full transition-all duration-500 ${s <= step ? 'bg-brand' : 'bg-transparent'}`} />
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-text-base">Let&apos;s get started</h2>
                <p className="text-sm text-text-muted mt-1">Tell us about yourself</p>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1.5">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Arjun Mehta"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1.5">Monthly income</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-text-muted text-sm">₹</span>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="75000"
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1.5">Phone (optional, for SMS alerts)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputClass}
                />
              </div>
              <button
                onClick={() => name && income && setStep(2)}
                disabled={!name || !income}
                className="w-full bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-text-base">Risk profile</h2>
                <p className="text-sm text-text-muted mt-1">3 quick questions to calibrate your portfolio</p>
              </div>
              {RISK_QUESTIONS.map((q, qi) => (
                <div key={qi}>
                  <p className="text-sm font-medium text-text-base mb-2">{q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const selected = riskAnswers[qi] === opt.score
                      return (
                        <button
                          key={opt.score}
                          onClick={() => {
                            const a = [...riskAnswers]
                            a[qi] = opt.score
                            setRiskAnswers(a)
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border transition-colors ${
                            selected
                              ? 'border-brand bg-brand-muted text-brand font-medium'
                              : 'border-border text-text-muted hover:border-brand/30 hover:text-text-base'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <button
                onClick={() => riskAnswers.length === 3 && setStep(3)}
                disabled={riskAnswers.length < 3}
                className="w-full bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-text-base">Import transactions</h2>
                <p className="text-sm text-text-muted mt-1">Upload your bank CSV or UPI PDF (optional)</p>
              </div>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                  dragOver ? 'border-brand bg-brand-muted' : 'border-border hover:border-brand/40'
                }`}
              >
                {csvLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={28} className="animate-spin text-brand" />
                    <p className="text-sm text-text-muted">Parsing file...</p>
                  </div>
                ) : csvParsed.length > 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle size={28} className="text-brand" />
                    <p className="text-sm font-medium text-brand">{csvParsed.length} transactions ready</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload size={28} className="text-text-faint" />
                    <p className="text-sm text-text-muted">Drag & drop your bank CSV or UPI PDF</p>
                    <label className="cursor-pointer">
                      <span className="text-xs text-brand font-medium underline">Browse file</span>
                      <input
                        type="file"
                        accept=".csv,.pdf"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                      />
                    </label>
                    <p className="text-xs text-text-faint">Supports HDFC/SBI CSV · PhonePe/GPay PDF</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleComplete}
                disabled={submitting}
                className="w-full bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Setting up...' : 'Launch FinPath →'}
              </button>
              <button
                onClick={handleComplete}
                disabled={submitting}
                className="w-full text-sm text-text-faint hover:text-text-muted transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
