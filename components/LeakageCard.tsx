import { AlertTriangle } from 'lucide-react'
import { formatINR } from '@/lib/utils/formatCurrency'

interface Props {
  pattern: string
  amount: number
  frequency: string
  suggestion: string
}

export default function LeakageCard({ pattern, amount, frequency, suggestion }: Props) {
  return (
    <div className="relative bg-surface-raised border border-red-500/20 border-l-2 border-l-red-500 rounded-2xl p-5 min-w-[240px] hover:border-red-500/40 transition-colors">
      <AlertTriangle size={16} className="absolute top-4 right-4 text-red-400" />
      <p className="text-red-400 font-semibold text-sm pr-6">{pattern}</p>
      <p className="text-red-400 text-xl font-bold mt-1">{formatINR(amount)}</p>
      <p className="text-text-faint text-xs mt-0.5">{frequency}</p>
      <p className="text-text-muted text-xs italic mt-2 leading-relaxed">{suggestion}</p>
    </div>
  )
}
