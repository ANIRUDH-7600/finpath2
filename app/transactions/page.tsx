'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Search, Upload, CheckCircle, Loader2, Plus, PenLine, Brain } from 'lucide-react'
import toast from 'react-hot-toast'
import TransactionRow from '@/components/TransactionRow'
import { formatINR } from '@/lib/utils/formatCurrency'
import type { Transaction, TransactionCategory } from '@/types'

const CATEGORIES: TransactionCategory[] = [
  'Food & Dining', 'Transport', 'Entertainment', 'Subscriptions',
  'Shopping', 'Utilities', 'Healthcare', 'Other',
]

const inputClass = "w-full bg-[#1C1C1C] border border-border rounded-xl px-4 py-3 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"

export default function TransactionsPage() {
  const { data: session, status } = useSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [parsedTx, setParsedTx] = useState<Array<{ merchant: string; amount: number; date: string; category: string }>>([])
  const [fileLoading, setFileLoading] = useState(false)
  const [fileSaving, setFileSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [tab, setTab] = useState<'list' | 'import' | 'manual'>('list')
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<TransactionCategory>('Food & Dining')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [manualSaving, setManualSaving] = useState(false)

  const userId = session?.user?.id

  const loadTransactions = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions?user_id=${userId}`)
      if (res.ok) setTransactions(await res.json())
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (status === 'authenticated') loadTransactions()
  }, [status, loadTransactions])

  const filtered = transactions.filter((t) => {
    const matchSearch = t.merchant.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'All' || t.category === activeCategory
    return matchSearch && matchCat
  })
  const total = filtered.reduce((s, t) => s + Number(t.amount), 0)

  async function handleFile(file: File) {
    setFileLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setParsedTx(data)
      toast.success(`${data.length} transactions parsed`)
    } catch {
      toast.error('Parsing failed — check file format')
    } finally {
      setFileLoading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveImported() {
    if (!userId || !parsedTx.length) return
    setFileSaving(true)
    try {
      await Promise.all(
        parsedTx.map((t) =>
          fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, ...t }),
          })
        )
      )
      toast.success(`${parsedTx.length} transactions saved!`)
      setParsedTx([])
      setTab('list')
      loadTransactions()
    } catch {
      toast.error('Failed to save transactions')
    } finally {
      setFileSaving(false)
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setManualSaving(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, merchant, amount: parseFloat(amount), category, date, note }),
      })
      if (!res.ok) throw new Error()
      toast.success('Expense saved!')
      setMerchant(''); setAmount(''); setNote('')
      setDate(new Date().toISOString().split('T')[0])
      setTab('list')
      loadTransactions()
    } catch {
      toast.error('Failed to save expense')
    } finally {
      setManualSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="p-6 md:p-8 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-surface-raised rounded-xl h-14 border border-border" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-base">Expenses</h1>
          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
            <Brain size={12} className="text-brand" />
            Behavioral analysis by Groq · {transactions.length} transactions
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('import')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium border transition-all ${tab === 'import' ? 'bg-brand text-[#0A0A0A] border-brand' : 'bg-surface-raised text-text-muted border-border hover:border-brand/30'}`}>
            <Upload size={14} /> Import
          </button>
          <button onClick={() => setTab('manual')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium border transition-all ${tab === 'manual' ? 'bg-brand text-[#0A0A0A] border-brand' : 'bg-surface-raised text-text-muted border-border hover:border-brand/30'}`}>
            <PenLine size={14} /> Add
          </button>
        </div>
      </div>

      {tab === 'manual' && (
        <div className="bg-surface-raised border border-border rounded-2xl p-6 mb-5">
          <h2 className="text-base font-bold text-text-base mb-4">Add Expense</h2>
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-muted block mb-1">Merchant</label>
                <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Swiggy" className={inputClass} required />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Amount (₹)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="450" className={inputClass} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-muted block mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as TransactionCategory)} className={inputClass}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={inputClass} />
            <div className="flex gap-3">
              <button type="submit" disabled={manualSaving} className="flex-1 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {manualSaving && <Loader2 size={14} className="animate-spin" />}
                {manualSaving ? 'Saving...' : 'Save Expense'}
              </button>
              <button type="button" onClick={() => setTab('list')} className="px-5 bg-surface border border-border rounded-xl text-sm text-text-muted">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {tab === 'import' && (
        <div className="bg-surface-raised border border-border rounded-2xl p-6 mb-5">
          <h2 className="text-base font-bold text-text-base mb-1">Import Transactions</h2>
          <p className="text-xs text-text-muted mb-4">Upload HDFC/SBI CSV or PhonePe/GPay PDF. AI auto-categorizes.</p>
          <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors mb-4 ${dragOver ? 'border-brand bg-brand-muted' : 'border-border hover:border-brand/40'}`}>
            {fileLoading ? (
              <div className="flex flex-col items-center gap-2"><Loader2 size={28} className="animate-spin text-brand" /><p className="text-sm text-text-muted">Parsing...</p></div>
            ) : parsedTx.length > 0 ? (
              <div className="flex flex-col items-center gap-2"><CheckCircle size={28} className="text-brand" /><p className="text-sm font-medium text-brand">{parsedTx.length} transactions ready</p></div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload size={28} className="text-text-faint" />
                <p className="text-sm text-text-muted">Drag & drop or browse</p>
                <label className="cursor-pointer">
                  <span className="text-xs text-brand font-medium underline">Browse file</span>
                  <input type="file" accept=".csv,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </label>
                <p className="text-xs text-text-faint">HDFC / SBI CSV · PhonePe / GPay PDF</p>
              </div>
            )}
          </div>
          {parsedTx.length > 0 && (
            <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
              {parsedTx.slice(0, 10).map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-surface border border-border rounded-xl px-3 py-2">
                  <span className="text-text-base font-medium truncate max-w-[120px]">{t.merchant}</span>
                  <span className="text-text-muted">{t.category}</span>
                  <span className="text-brand font-bold">{formatINR(t.amount)}</span>
                </div>
              ))}
              {parsedTx.length > 10 && <p className="text-xs text-text-faint text-center">+{parsedTx.length - 10} more</p>}
            </div>
          )}
          <div className="flex gap-3">
            {parsedTx.length > 0 && (
              <button onClick={saveImported} disabled={fileSaving} className="flex-1 bg-brand text-[#0A0A0A] font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {fileSaving && <Loader2 size={14} className="animate-spin" />}
                {fileSaving ? 'Saving...' : `Save ${parsedTx.length} Transactions`}
              </button>
            )}
            <button onClick={() => setTab('list')} className="px-5 bg-surface border border-border rounded-xl text-sm text-text-muted">Cancel</button>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {['All', ...CATEGORIES].map((c) => (
              <button key={c} onClick={() => setActiveCategory(c)} className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${activeCategory === c ? 'bg-brand text-[#0A0A0A] border-brand' : 'bg-surface-raised text-text-muted border-border hover:border-brand/30 hover:text-text-base'}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="relative mb-4">
            <Search size={15} className="absolute left-4 top-3.5 text-text-faint" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search merchant..." className="w-full bg-surface-raised border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-text-faint text-sm mb-4">No expenses yet</p>
              <button onClick={() => setTab('manual')} className="bg-brand text-[#0A0A0A] font-bold rounded-xl px-6 py-3 text-sm flex items-center gap-2 mx-auto">
                <Plus size={16} /> Add your first expense
              </button>
            </div>
          ) : (
            <>
              <div className="bg-surface-raised border border-border rounded-2xl overflow-hidden mb-4">
                {filtered.map((t) => <TransactionRow key={t.id} transaction={t} />)}
              </div>
              <div className="flex justify-between items-center text-sm px-1">
                <span className="text-text-muted">{filtered.length} transactions</span>
                <span className="text-text-base font-bold">Total: {formatINR(total)}</span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
