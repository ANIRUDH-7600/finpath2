import type { Transaction, TransactionCategory } from '@/types'
import { formatINR } from '@/lib/utils/formatCurrency'

interface Props {
  transaction: Transaction
}

const categoryColors: Record<TransactionCategory, string> = {
  'Food & Dining': 'bg-orange-500/10 text-orange-400',
  Transport: 'bg-blue-500/10 text-blue-400',
  Entertainment: 'bg-pink-500/10 text-pink-400',
  Subscriptions: 'bg-purple-500/10 text-purple-400',
  Shopping: 'bg-amber-500/10 text-amber-400',
  Utilities: 'bg-slate-500/10 text-slate-400',
  Healthcare: 'bg-green-500/10 text-green-400',
  Other: 'bg-border text-text-muted',
}

export default function TransactionRow({ transaction }: Props) {
  const color =
    categoryColors[transaction.category as TransactionCategory] ?? 'bg-border text-text-muted'

  const dateStr = new Date(transaction.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-base truncate">{transaction.merchant}</p>
        <p className="text-xs text-text-faint mt-0.5">{dateStr}</p>
      </div>
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full mx-3 shrink-0 ${color}`}>
        {transaction.category}
      </span>
      <span className="text-sm font-bold text-red-400 shrink-0">
        -{formatINR(transaction.amount)}
      </span>
    </div>
  )
}
