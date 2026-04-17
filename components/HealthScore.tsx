'use client'

import { useEffect, useState } from 'react'

interface Props {
  score: number
  label: string
}

export default function HealthScore({ score, label }: Props) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    let current = 0
    const step = Math.ceil(score / 40)
    const timer = setInterval(() => {
      current = Math.min(current + step, score)
      setDisplayed(current)
      if (current >= score) clearInterval(timer)
    }, 30)
    return () => clearInterval(timer)
  }, [score])

  const color = score >= 75 ? '#02FF9D' : score >= 50 ? '#f59e0b' : '#ef4444'
  const trackColor = 'rgba(255,255,255,0.08)'

  const radius = 52
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (displayed / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative inline-flex items-center justify-center">
        <svg width={128} height={128}>
          <circle cx={64} cy={64} r={radius} fill={`${color}10`} />
          <circle cx={64} cy={64} r={radius} fill="none" stroke={trackColor} strokeWidth={8} />
          <circle
            cx={64} cy={64} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 64 64)"
            style={{ transition: 'stroke-dashoffset 0.05s ease' }}
          />
        </svg>
        <span className="absolute text-3xl font-bold" style={{ color }}>{displayed}</span>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
    </div>
  )
}
