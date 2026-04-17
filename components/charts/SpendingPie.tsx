'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatINR } from '@/lib/utils/formatCurrency'

interface Props {
  data: { name: string; value: number }[]
}

const COLORS = [
  '#02FF9D',
  '#3b82f6',
  '#f97316',
  '#ec4899',
  '#f59e0b',
  '#a855f7',
  '#14b8a6',
  '#888888',
]

export default function SpendingPie({ data }: Props) {
  const filtered = data.filter((d) => d.value > 0)

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-72 text-text-faint text-sm">
        Not enough data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={filtered}
          cx="50%"
          cy="45%"
          outerRadius={100}
          dataKey="value"
          label={false}
        >
          {filtered.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [formatINR(Number(value)), '']}
          contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'var(--text-base)', fontSize: 13 }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingTop: 8, color: 'var(--text-muted)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
