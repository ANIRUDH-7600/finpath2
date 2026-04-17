'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Props {
  allocation: {
    equity: number
    debt: number
    gold: number
    cash: number
  }
}

const SEGMENTS = [
  { key: 'equity', label: 'Equity', color: '#02FF9D' },
  { key: 'debt', label: 'Debt', color: '#3b82f6' },
  { key: 'gold', label: 'Gold', color: '#f59e0b' },
  { key: 'cash', label: 'Cash', color: '#888888' },
]

export default function PortfolioDonut({ allocation }: Props) {
  const data = SEGMENTS.map((s) => ({
    name: s.label,
    value: allocation[s.key as keyof typeof allocation],
    color: s.color,
  })).filter((d) => d.value > 0)

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={100}
          dataKey="value"
          label={({ cx, cy }) => (
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{ fill: 'var(--text-base)', fontSize: 14, fontWeight: 700 }}>
              100%
            </text>
          )}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value}%`, '']}
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
