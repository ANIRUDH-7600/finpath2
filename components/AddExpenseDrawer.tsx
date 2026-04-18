'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import NudgePopup from './NudgePopup'
import type { NudgeResponse, TransactionCategory } from '@/types'

const CATEGORIES: TransactionCategory[] = [
  'Food & Dining', 'Transport', 'Entertainment', 'Subscriptions',
  'Shopping', 'Utilities', 'Healthcare', 'Other',
]

interface Props {
  isOpen: boolean
  onClose: () => void
  activeGoalId: string
  userId: string
  onSuccess: () => void
}

interface PendingTx {
  user_id: string
  merchant: string
  amount: number
  category: string
  date: string
  note?: string
}

const inputClass = "w-full bg-surface border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#555555] focus:outline-none focus:ring-2 focus:ring-[#02FF9D]/30 focus:border-[#02FF9D] transition"

export default function AddExpenseDrawer({ isOpen, onClose, activeGoalId, userId, onSuccess }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<TransactionCategory>('Food & Dining')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [nudge, setNudge] = useState<(NudgeResponse & { nudge_log_id?: string }) | null>(null)
  const [pending, setPending] = useState<PendingTx | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!merchant || !amount) return
    setLoading(true)
    try {
      const nudgeRes = await fetch('/api/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, merchant, amount: parseFloat(amount), category, goal_id: activeGoalId }),
      })
      const nudgeData = (await nudgeRes.json()) as NudgeResponse & { nudge_log_id?: string }

      if (nudgeData.show_nudge) {
        setPending({ user_id: userId, merchant, amount: parseFloat(amount), category, date, note })
        setNudge(nudgeData)
        onClose()
        return
      }

      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, merchant, amount: parseFloat(amount), category, date, note }),
      })
      toast.success('Expense added!')
      resetForm()
      onSuccess()
      onClose()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setMerchant(''); setAmount(''); setCategory('Food & Dining'); setDate(today); setNote('')
  }

  return (
    <>
      {nudge && pending && (
        <NudgePopup
          nudge={nudge}
          pendingTransaction={pending}
          userId={userId}
          onComplete={() => { setNudge(null); setPending(null); resetForm(); onSuccess() }}
        />
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <div className="relative w-full max-w-md bg-[#111111] border-l border-[#2A2A2A] h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
              <h2 className="text-base font-semibold text-white">Add Expense</h2>
              <button onClick={onClose} className="text-[#888888] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-[#888888] block mb-1.5">Merchant / Place</label>
                <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Swiggy, Big Bazaar" className={inputClass} required />
              </div>
              <div>
                <label className="text-xs font-medium text-[#888888] block mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-[#888888] text-sm">₹</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="1" className={`${inputClass} pl-8`} required />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#888888] block mb-1.5">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as TransactionCategory)} className={inputClass}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#888888] block mb-1.5">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-[#888888] block mb-1.5">Note (optional)</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any note..." className={inputClass} />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#02FF9D] hover:bg-[#01D97F] text-[#0A0A0A] font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40 mt-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Checking...' : 'Add Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
