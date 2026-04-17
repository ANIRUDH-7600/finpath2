'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Upload, CheckCircle, Loader2, Plus, FileText, PenLine } from 'lucide-react'
import toast from 'react-hot-toast'
import TransactionRow from '@/components/TransactionRow'
import { formatINR } from '@/lib/utils/formatCurrency'
import type { Transaction, TransactionCategory, User } from '@/types'

const CATEGORIES: TransactionCategory[] = [
  'Food & Dining', 'Transport', 'Entertainment', 'Subscriptions',
  'Shopping', 'Utilities', 'Healthcare', 'Other',
]

const inputClass = "w-full bg-[#1C1C1C] border border-border rounded-xl px-4 py-3 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"

export default function TransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [userId, setUserId] = useState('')
  const [parsedTx, setParsedTx] = useState<unknown[]>([])
  const [fileLoading, setFileLoading] = useState(false)
  const [fileSaving, setFileSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [tab, setTab] = useState<'list' | 'import' | 'manual'>('list')

  // Manual entry state
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<TransactionCategory>('Food & Dining')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [manualSaving, setManualSaving] = useState(false)

  const fetchTransactions = useCallback(async (uid: string, cat?: string) => {
    const url = new URL('/api/transactions', window.location.origin)
    url.searchParams.set('user_id', uid)
    if (cat && cat !== 'All') url.searchParams.set('category', cat)
    const res = await fetch(url.toString())
    const data = await res.json()
    setTransactions(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('finpath_user')
    if (!stored) { router.replace('/auth/signin'); return }
    const u = JSON.parse(stored) as User
    setUserId(u.id)
    fetchTransactions(u.id).finally(() => setLoading(false))
  }, [router, fetchTransactions])

  useEffect(() => {
    if (!userId) return
    fetchTransactions(userId, activeCategory)
  }, [activeCategory, userId, fetchTransactions])

  const filtered = transactions.filter((t) =>
    t.merchant.toLowerCase().includes(search.toLowerCase())
  )
  const total = filtered.reduce((s, t) => s + Number(t.amount), 0)

  async function handleFile(file: File) {
    setFileLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/parse-csv', { method: 'POST', body: fd })
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setParsedTx(data)
        toast.success(`${data.length} transactions parsed`)
      } else {
        toast.error('No transactions found in file')
      }
    } catch {
      toast.error('File parsing failed')
    } finally {
      setFileLoading(false)
    }
  }

  async function saveImported() {
    setFileSaving(true)
    try {
      await Promise.all(
        parsedTx.slice(0, 100).map((tx: unknown) => {
          const t = tx as { merchant: string; amount: number; date: string; category: string }
          return fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, ...t }),
          })
        })
      )
      toast.success(`Saved ${parsedTx.length} transactions!`)
      setParsedTx([])
      fetchTransactions(userId)
      setTab('list')
    } catch {
      toast.error('Failed to save transactions')
    } finally {
      setFileSaving(false)
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!merchant || !amount) return
    setManualSaving(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, merchant, amount: parseFloat(amount), category, date, note }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Transaction added!')
      setMerchant(''); setAmount(''); setNote('')
      fetchTransactions(userId)
      setTab('list')
    } catch {
      toast.error('Failed to save')
    } finally {
      setManualSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-base">Expenses</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {filtered.length} entries · Total: {formatINR(total)}
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-surface-raised border border-border rounded-xl p-1 mb-5 w-fit">
        {([
          { key: 'list', label: 'All Expenses', icon: Search },
          { key: 'import', label: 'Import File', icon: FileText },
          { key: 'manual', label: 'Add Manual', icon: PenLine },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-brand text-[#0A0A0A]' : 'text-text-muted hover:text-text-base'}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Import tab */}
      {tab === 'import' && (
        <div className="bg-surface-raised border border-border rounded-2xl p-6 mb-5">
          <h2 className="text-sm font-semibold text-text-base mb-1">Import Bank Statement</h2>
          <p className="text-xs text-text-muted mb-4">Supports: HDFC/SBI CSV · PhonePe/GPay UPI PDF · Any UPI statement</p>
          <div
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver ? 'border-brand bg-brand-muted' : 'border-border hover:border-brand/40'}`}
          >
            {fileLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                <Loader2 size={18} className="animate-spin text-brand" />
                Parsing file...
              </div>
            ) : parsedTx.length > 0 ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-brand">
                  <CheckCircle size={16} />
                  {parsedTx.length} transactions ready to import
                </div>
                <button
                  onClick={saveImported}
                  disabled={fileSaving}
                  className="bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl px-4 py-2 text-xs disabled:opacity-40"
                >
                  {fileSaving ? 'Saving...' : 'Confirm Import'}
                </button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-3 text-sm text-text-muted hover:text-text-base">
                <Upload size={28} className="text-text-faint" />
                <span>Drop file here or <span className="text-brand underline">browse</span></span>
                <span className="text-xs text-text-faint">CSV or PDF · Max 10MB</span>
                <input type="file" accept=".csv,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
            )}
          </div>

          <div className="mt-4 p-3 bg-[#1C1C1C] rounded-xl border border-border">
            <p className="text-xs font-semibold text-text-muted mb-1">Supported UPI format:</p>
            <pre className="text-xs text-text-faint font-mono leading-relaxed">
{`Apr 17, 2026
11:43 am
Paid to MERCHANT NAME DEBIT ₹300
Transaction ID T2604...`}
            </pre>
          </div>
        </div>
      )}

      {/* Manual entry tab */}
      {tab === 'manual' && (
        <div className="bg-surface-raised border border-border rounded-2xl p-6 mb-5 max-w-md">
          <h2 className="text-sm font-semibold text-text-base mb-4">Add Transaction Manually</h2>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">Merchant / Place</label>
              <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Swiggy, Big Bazaar" className={inputClass} required />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-text-muted text-sm">₹</span>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="1" className={`${inputClass} pl-8`} required />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as TransactionCategory)} className={inputClass}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">Note (optional)</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any note..." className={inputClass} />
            </div>
            <button type="submit" disabled={manualSaving} className="w-full bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
              {manualSaving && <Loader2 size={16} className="animate-spin" />}
              {manualSaving ? 'Saving...' : <><Plus size={16} /> Add Transaction</>}
            </button>
          </form>
        </div>
      )}

      {/* List tab */}
      {tab === 'list' && (
        <>
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3.5 top-3.5 text-text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by merchant..."
              className="w-full bg-surface-raised border border-border rounded-xl pl-9 pr-4 py-3 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
            {['All', ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-brand text-[#0A0A0A]' : 'bg-surface-raised border border-border text-text-muted hover:border-brand/30 hover:text-text-base'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="bg-surface-raised border border-border rounded-2xl p-5">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-border rounded-xl h-12" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-faint">
                <p className="text-sm">No transactions found</p>
                <p className="text-xs mt-1">Try importing a bank statement or adding manually</p>
              </div>
            ) : (
              filtered.map((t) => <TransactionRow key={t.id} transaction={t} />)
            )}
          </div>
        </>
      )}
    </div>
  )
}
