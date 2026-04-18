'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Search, Upload, CheckCircle, Loader2, Plus, PenLine, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import toast from 'react-hot-toast'
import TransactionRow from '@/components/TransactionRow'
import NudgePopup from '@/components/NudgePopup'
import { formatINR } from '@/lib/utils/formatCurrency'
import type { Transaction, TransactionCategory, NudgeResponse } from '@/types'

const CATEGORIES: TransactionCategory[] = [
  'Food & Dining', 'Transport', 'Entertainment', 'Subscriptions',
  'Shopping', 'Utilities', 'Healthcare', 'Other',
]
const PAGE_SIZE = 20
const inputClass = "w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"

function monthKey(offsetMonths = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offsetMonths)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}
function pct(a: number, b: number) {
  if (b === 0) return a > 0 ? 100 : 0
  return Math.round(((a - b) / b) * 100)
}

export default function TransactionsPage() {
  const { data: session, status } = useSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [viewMode, setViewMode] = useState<'current' | 'last' | 'all'>('current')
  const [page, setPage] = useState(1)

  // forms
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
  const [nudge, setNudge] = useState<(NudgeResponse & { nudge_log_id?: string }) | null>(null)
  const [pendingTx, setPendingTx] = useState<{ merchant: string; amount: number; category: string; date: string; note: string } | null>(null)

  const userId = session?.user?.id
  const curKey = monthKey(0)
  const prevKey = monthKey(-1)

  const loadTransactions = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions?user_id=${userId}`)
      if (res.ok) setTransactions(await res.json())
    } catch { toast.error('Failed to load') } finally { setLoading(false) }
  }, [userId])

  useEffect(() => { if (status === 'authenticated') loadTransactions() }, [status, loadTransactions])

  // ── Derived month slices ──────────────────────────────
  const currentTxns = useMemo(() => transactions.filter(t => t.date.startsWith(curKey)), [transactions, curKey])
  const lastTxns = useMemo(() => transactions.filter(t => t.date.startsWith(prevKey)), [transactions, prevKey])

  const currentTotal = useMemo(() => currentTxns.reduce((s, t) => s + Number(t.amount), 0), [currentTxns])
  const lastTotal = useMemo(() => lastTxns.reduce((s, t) => s + Number(t.amount), 0), [lastTxns])
  const change = pct(currentTotal, lastTotal)

  // category totals for comparison
  const catTotals = useCallback((txns: Transaction[]) => {
    const m: Record<string, number> = {}
    for (const t of txns) m[t.category] = (m[t.category] ?? 0) + Number(t.amount)
    return m
  }, [])
  const curCats = useMemo(() => catTotals(currentTxns), [catTotals, currentTxns])
  const prevCats = useMemo(() => catTotals(lastTxns), [catTotals, lastTxns])
  const allCats = useMemo(() => {
    const keys = new Set([...Object.keys(curCats), ...Object.keys(prevCats)])
    return [...keys].sort((a, b) => (curCats[b] ?? 0) - (curCats[a] ?? 0))
  }, [curCats, prevCats])
  const maxCatVal = useMemo(() => Math.max(...allCats.map(c => Math.max(curCats[c] ?? 0, prevCats[c] ?? 0)), 1), [allCats, curCats, prevCats])

  // ── Filtered + paginated list ─────────────────────────
  const baseList = useMemo(() => {
    if (viewMode === 'current') return currentTxns
    if (viewMode === 'last') return lastTxns
    return transactions
  }, [viewMode, currentTxns, lastTxns, transactions])

  const filtered = useMemo(() => baseList.filter(t => {
    const matchSearch = t.merchant.toLowerCase().includes(search.toLowerCase()) ||
      t.note?.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'All' || t.category === activeCategory
    return matchSearch && matchCat
  }), [baseList, search, activeCategory])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])
  const filteredTotal = filtered.reduce((s, t) => s + Number(t.amount), 0)

  // Reset page when filter changes
  useEffect(() => { setPage(1) }, [search, activeCategory, viewMode])

  // ── Group paginated by date ────────────────────────────
  const grouped = useMemo(() => {
    const g: { date: string; items: Transaction[] }[] = []
    for (const t of paginated) {
      const last = g[g.length - 1]
      if (last && last.date === t.date) last.items.push(t)
      else g.push({ date: t.date, items: [t] })
    }
    return g
  }, [paginated])

  // ── File import ────────────────────────────────────────
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
    } catch { toast.error('Parsing failed — check file format') } finally { setFileLoading(false) }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveImported() {
    if (!userId || !parsedTx.length) return
    setFileSaving(true)
    try {
      await Promise.all(parsedTx.map(t => fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, ...t }) })))
      toast.success(`${parsedTx.length} transactions saved!`)
      setParsedTx([]); setTab('list'); loadTransactions()
    } catch { toast.error('Failed to save') } finally { setFileSaving(false) }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setManualSaving(true)
    try {
      const nudgeRes = await fetch('/api/nudge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, merchant, amount: parseFloat(amount), category }),
      })
      const nudgeData = (await nudgeRes.json()) as NudgeResponse & { nudge_log_id?: string }
      if (nudgeData.show_nudge) {
        setPendingTx({ merchant, amount: parseFloat(amount), category, date, note })
        setNudge(nudgeData); setManualSaving(false); return
      }
      await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, merchant, amount: parseFloat(amount), category, date, note }) })
      toast.success('Expense saved!')
      setMerchant(''); setAmount(''); setNote(''); setDate(new Date().toISOString().split('T')[0])
      setTab('list'); loadTransactions()
    } catch { toast.error('Failed') } finally { setManualSaving(false) }
  }

  if (status === 'loading' || loading) {
    return <div className="p-6 md:p-8 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="animate-pulse bg-surface-raised rounded-xl h-14 border border-border" />)}</div>
  }

  const avgPerDay = (total: number, txns: Transaction[]) => {
    if (txns.length === 0) return 0
    const days = new Set(txns.map(t => t.date)).size
    return Math.round(total / days)
  }

  return (
    <div className="p-6 md:p-8">
      {nudge && pendingTx && userId && (
        <NudgePopup
          nudge={nudge}
          pendingTransaction={{ user_id: userId, ...pendingTx }}
          userId={userId}
          onComplete={() => { setNudge(null); setPendingTx(null); setMerchant(''); setAmount(''); setNote(''); setDate(new Date().toISOString().split('T')[0]); setTab('list'); loadTransactions() }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-text-base">Expenses</h1>
          <p className="text-xs text-text-muted mt-0.5">{transactions.length} total transactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab(tab === 'import' ? 'list' : 'import')} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium border transition-all ${tab === 'import' ? 'bg-brand text-[#0A0A0A] border-brand' : 'bg-surface-raised text-text-muted border-border hover:border-brand/30'}`}>
            <Upload size={13} /> Import
          </button>
          <button onClick={() => setTab(tab === 'manual' ? 'list' : 'manual')} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium border transition-all ${tab === 'manual' ? 'bg-brand text-[#0A0A0A] border-brand' : 'bg-surface-raised text-text-muted border-border hover:border-brand/30'}`}>
            <PenLine size={13} /> Add
          </button>
        </div>
      </div>

      {/* Add expense form */}
      {tab === 'manual' && (
        <div className="bg-surface-raised border border-border rounded-xl p-5 mb-5">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-muted block mb-1">Merchant</label>
                <input value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="Swiggy" className={inputClass} required />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Amount (₹)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="450" className={inputClass} required />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value as TransactionCategory)} className={inputClass}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
              </div>
            </div>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className={inputClass} />
            <div className="flex gap-3">
              <button type="submit" disabled={manualSaving} className="flex-1 bg-brand text-[#0A0A0A] font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {manualSaving && <Loader2 size={13} className="animate-spin" />}
                {manualSaving ? 'Saving…' : 'Save Expense'}
              </button>
              <button type="button" onClick={() => setTab('list')} className="px-5 bg-surface border border-border rounded-xl text-sm text-text-muted">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Import form */}
      {tab === 'import' && (
        <div className="bg-surface-raised border border-border rounded-xl p-5 mb-5">
          <p className="text-xs text-text-muted mb-4">Upload HDFC/SBI CSV or PhonePe/GPay PDF</p>
          <div onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-4 ${dragOver ? 'border-brand bg-brand-muted' : 'border-border hover:border-brand/40'}`}>
            {fileLoading ? <div className="flex flex-col items-center gap-2"><Loader2 size={24} className="animate-spin text-brand" /><p className="text-sm text-text-muted">Parsing…</p></div>
              : parsedTx.length > 0 ? <div className="flex flex-col items-center gap-2"><CheckCircle size={24} className="text-brand" /><p className="text-sm font-medium text-brand">{parsedTx.length} transactions ready</p></div>
              : <div className="flex flex-col items-center gap-3"><Upload size={24} className="text-text-faint" /><p className="text-sm text-text-muted">Drag & drop or browse</p><label className="cursor-pointer"><span className="text-xs text-brand font-medium underline">Browse file</span><input type="file" accept=".csv,.pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} /></label><p className="text-xs text-text-faint">HDFC / SBI CSV · PhonePe / GPay PDF</p></div>}
          </div>
          {parsedTx.length > 0 && (
            <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
              {parsedTx.slice(0, 10).map((t, i) => <div key={i} className="flex items-center justify-between text-xs bg-surface border border-border rounded-xl px-3 py-2"><span className="text-text-base font-medium truncate max-w-[120px]">{t.merchant}</span><span className="text-text-muted">{t.category}</span><span className="text-brand font-bold">{formatINR(t.amount)}</span></div>)}
              {parsedTx.length > 10 && <p className="text-xs text-text-faint text-center">+{parsedTx.length - 10} more</p>}
            </div>
          )}
          <div className="flex gap-3">
            {parsedTx.length > 0 && <button onClick={saveImported} disabled={fileSaving} className="flex-1 bg-brand text-[#0A0A0A] font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">{fileSaving && <Loader2 size={13} className="animate-spin" />}{fileSaving ? 'Saving…' : `Save ${parsedTx.length} transactions`}</button>}
            <button onClick={() => setTab('list')} className="px-5 bg-surface border border-border rounded-xl text-sm text-text-muted">Cancel</button>
          </div>
        </div>
      )}

      {/* Month tabs */}
      <div className="flex gap-1 bg-surface-raised border border-border rounded-xl p-1 mb-4 w-fit">
        {([['current', monthLabel(curKey)], ['last', monthLabel(prevKey)], ['all', 'All Time']] as const).map(([mode, label]) => (
          <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${viewMode === mode ? 'bg-brand text-[#0A0A0A]' : 'text-text-muted hover:text-text-base'}`}>
            {label}
            <span className="ml-1.5 text-[10px] opacity-60">
              {mode === 'current' ? `₹${(currentTotal / 1000).toFixed(0)}k` : mode === 'last' ? `₹${(lastTotal / 1000).toFixed(0)}k` : `${transactions.length}`}
            </span>
          </button>
        ))}
      </div>

      {/* Comparison strip — only when on current or last month */}
      {(viewMode === 'current' || viewMode === 'last') && currentTxns.length > 0 && (
        <div className="mb-4 space-y-3">
          {/* Top stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface-raised border border-border rounded-xl p-3">
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">This month</p>
              <p className="text-lg font-black text-text-base">{formatINR(Math.round(currentTotal))}</p>
              <p className="text-[10px] text-text-muted">{currentTxns.length} transactions</p>
            </div>
            <div className="bg-surface-raised border border-border rounded-xl p-3">
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Last month</p>
              <p className="text-lg font-black text-text-base">{formatINR(Math.round(lastTotal))}</p>
              <p className="text-[10px] text-text-muted">{lastTxns.length} transactions</p>
            </div>
            <div className={`border rounded-xl p-3 ${change > 0 ? 'bg-red-400/5 border-red-400/20' : change < 0 ? 'bg-brand/5 border-brand/20' : 'bg-surface-raised border-border'}`}>
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Month change</p>
              <div className={`flex items-center gap-1 ${change > 0 ? 'text-red-400' : change < 0 ? 'text-brand' : 'text-text-muted'}`}>
                {change > 0 ? <ArrowUpRight size={16} /> : change < 0 ? <ArrowDownRight size={16} /> : <Minus size={16} />}
                <p className="text-lg font-black">{change > 0 ? '+' : ''}{change}%</p>
              </div>
              <p className="text-[10px] text-text-muted">{change > 0 ? 'higher than last' : change < 0 ? 'lower than last' : 'same as last'}</p>
            </div>
            <div className="bg-surface-raised border border-border rounded-xl p-3">
              <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Avg / active day</p>
              <p className="text-lg font-black text-text-base">{formatINR(avgPerDay(currentTotal, currentTxns))}</p>
              <p className="text-[10px] text-text-muted">vs {formatINR(avgPerDay(lastTotal, lastTxns))} last</p>
            </div>
          </div>

          {/* Category comparison bars */}
          {allCats.length > 0 && (
            <div className="bg-surface-raised border border-border rounded-xl p-4">
              <div className="flex items-center gap-4 mb-3 text-[10px] text-text-faint">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-brand/70" /> {monthLabel(curKey)}</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-border" /> {monthLabel(prevKey)}</div>
              </div>
              <div className="space-y-2.5">
                {allCats.slice(0, 6).map(cat => {
                  const cur = curCats[cat] ?? 0
                  const prev = prevCats[cat] ?? 0
                  const catChange = pct(cur, prev)
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-muted">{cat}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-text-base">{formatINR(Math.round(cur))}</span>
                          {prev > 0 && (
                            <span className={`text-[10px] ${catChange > 10 ? 'text-red-400' : catChange < -10 ? 'text-brand' : 'text-text-faint'}`}>
                              {catChange > 0 ? '+' : ''}{catChange}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-brand/70 rounded-full" style={{ width: `${(cur / maxCatVal) * 100}%` }} />
                        </div>
                        <div className="h-1 bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-border rounded-full" style={{ width: `${(prev / maxCatVal) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
        {(['All', ...CATEGORIES] as string[]).map(c => (
          <button key={c} onClick={() => setActiveCategory(c)} className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${activeCategory === c ? 'bg-brand text-[#0A0A0A] border-brand' : 'bg-surface-raised text-text-muted border-border hover:border-brand/30 hover:text-text-base'}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="relative mb-4">
        <Search size={14} className="absolute left-4 top-3.5 text-text-faint" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search merchant or note…"
          className="w-full bg-surface-raised border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30" />
      </div>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-surface-raised border border-border rounded-xl">
          <p className="text-text-faint text-sm mb-4">No transactions match</p>
          <button onClick={() => setTab('manual')} className="bg-brand text-[#0A0A0A] font-bold rounded-xl px-6 py-2.5 text-sm flex items-center gap-2 mx-auto">
            <Plus size={15} /> Add expense
          </button>
        </div>
      ) : (
        <>
          <div className="bg-surface-raised border border-border rounded-xl overflow-hidden mb-3">
            {grouped.map(({ date: d, items }) => (
              <div key={d}>
                <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border">
                  <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wider">
                    {new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-xs font-semibold text-text-muted">{formatINR(items.reduce((s, t) => s + Number(t.amount), 0))}</p>
                </div>
                {items.map(t => <TransactionRow key={t.id} transaction={t} />)}
              </div>
            ))}
          </div>

          {/* Footer: total + pagination */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-text-muted">
              <span className="font-semibold text-text-base">{filtered.length}</span> transactions ·
              <span className="font-semibold text-text-base ml-1">{formatINR(Math.round(filteredTotal))}</span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-border text-text-muted hover:border-brand/30 disabled:opacity-30 transition-all">
                  <ChevronLeft size={14} />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).reduce<(number | '...')[]>((acc, p, i, arr) => {
                    if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                    acc.push(p); return acc
                  }, []).map((p, i) =>
                    p === '...' ? <span key={`e${i}`} className="px-2 text-xs text-text-faint">…</span> :
                    <button key={p} onClick={() => setPage(p as number)} className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${page === p ? 'bg-brand text-[#0A0A0A]' : 'border border-border text-text-muted hover:border-brand/30'}`}>{p}</button>
                  )}
                </div>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-border text-text-muted hover:border-brand/30 disabled:opacity-30 transition-all">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
