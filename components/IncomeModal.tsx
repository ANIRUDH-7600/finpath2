'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, ArrowRight, Loader2, Target, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

interface IncomeSetupModalProps {
  isOpen: boolean
  userId: string
  onComplete: (income: number) => void
}

export function IncomeSetupModal({ isOpen, userId, onComplete }: IncomeSetupModalProps) {
  const [income, setIncome] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'income' | 'goals'>('income')
  const [selectedGoal, setSelectedGoal] = useState<string>('')

  if (!isOpen) return null

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const monthlyIncome = parseFloat(income)
    
    if (isNaN(monthlyIncome) || monthlyIncome <= 0) {
      toast.error('Please enter a valid income amount')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/users/income', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, monthly_income: monthlyIncome }),
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success('Income saved!')
      setStep('goals')
    } catch (error) {
      toast.error('Failed to save income')
    } finally {
      setLoading(false)
    }
  }

  const handleGoalSubmit = () => {
    onComplete(parseFloat(income))
  }

  if (step === 'income') {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-surface-raised border border-border rounded-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="bg-brand-muted rounded-full p-3 w-fit mx-auto mb-4">
              <DollarSign size={28} className="text-brand" />
            </div>
            <h2 className="text-2xl font-bold text-text-base">Welcome to FinPath</h2>
            <p className="text-sm text-text-muted mt-2">
              Let's start by understanding your income to provide personalized insights
            </p>
          </div>

          <form onSubmit={handleIncomeSubmit}>
            <div className="mb-6">
              <label className="text-sm font-medium text-text-base block mb-2">
                What's your monthly income?
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-text-muted">₹</span>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl pl-8 pr-4 py-3 text-base text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  placeholder="50,000"
                  autoFocus
                />
              </div>
              <p className="text-xs text-text-faint mt-2">
                This helps us calculate your savings potential and investment capacity
              </p>
            </div>

            <div className="bg-brand-muted/10 border border-brand/20 rounded-xl p-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
                <TrendingUp size={14} className="text-brand" />
                <span className="font-semibold">What we'll calculate:</span>
              </div>
              <ul className="text-xs text-text-faint space-y-1 ml-5">
                <li>• Your monthly savings = Income - Expenses</li>
                <li>• Savings rate and financial health score</li>
                <li>• Personalized investment recommendations</li>
                <li>• Goal feasibility and timelines</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-base flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Continue <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-surface-raised border border-border rounded-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="bg-brand-muted rounded-full p-3 w-fit mx-auto mb-4">
            <Target size={28} className="text-brand" />
          </div>
          <h2 className="text-2xl font-bold text-text-base">What's your financial goal?</h2>
          <p className="text-sm text-text-muted mt-2">
            Set a goal and we'll calculate exactly how much to save daily
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { value: 'emergency', label: 'Emergency Fund', desc: '3-6 months of expenses' },
            { value: 'vacation', label: 'Dream Vacation', desc: 'Goa, Europe, or anywhere' },
            { value: 'house', label: 'Home Down Payment', desc: 'Save for your first home' },
            { value: 'investment', label: 'Investment Portfolio', desc: 'Start building wealth' },
            { value: 'other', label: 'Other Goal', desc: 'I\'ll set my own goal' },
          ].map((goal) => (
            <button
              key={goal.value}
              onClick={() => setSelectedGoal(goal.value)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedGoal === goal.value
                  ? 'border-brand bg-brand-muted'
                  : 'border-border hover:border-brand/30'
              }`}
            >
              <p className="font-semibold text-text-base">{goal.label}</p>
              <p className="text-xs text-text-muted mt-0.5">{goal.desc}</p>
            </button>
          ))}
        </div>

        <button
          onClick={handleGoalSubmit}
          className="w-full bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-base flex items-center justify-center gap-2 transition-all"
        >
          Go to Dashboard <ArrowRight size={18} />
        </button>
        
        <p className="text-center text-xs text-text-faint mt-4">
          You can always skip or change this later
        </p>
      </div>
    </div>
  )
}