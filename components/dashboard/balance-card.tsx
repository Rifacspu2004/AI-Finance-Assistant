"use client"

import { ArrowUpRight, ArrowDownLeft, Eye, TrendingUp } from "lucide-react"
import { balanceHistory, formatCurrency } from "@/lib/data"

function Sparkline({ data }: { data: number[] }) {
  const w = 320
  const h = 90
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const points = data.map((v, i) => {
    const x = i * step
    const y = h - ((v - min) / range) * (h - 12) - 6
    return [x, y] as const
  })
  const line = points.map(([x, y]) => `${x},${y}`).join(" ")
  const area = `0,${h} ${line} ${w},${h}`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary-foreground)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary-foreground)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#balFill)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BalanceCard() {
  const balance = balanceHistory[balanceHistory.length - 1]
  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/20">
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
            Total wallet balance
            <Eye className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="mt-2 font-serif text-4xl font-bold tracking-tight">
            {formatCurrency(balance)}
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            +12.4% this month
          </div>
        </div>
        <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">
          •••• 4921
        </span>
      </div>

      <div className="relative z-10 mt-4 h-20">
        <Sparkline data={balanceHistory} />
      </div>

      <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-primary-foreground/12 p-3">
          <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
            <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Money in
          </div>
          <p className="mt-1 font-serif text-lg font-semibold">{formatCurrency(1440)}</p>
        </div>
        <div className="rounded-2xl bg-primary-foreground/12 p-3">
          <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            Money out
          </div>
          <p className="mt-1 font-serif text-lg font-semibold">{formatCurrency(615.9)}</p>
        </div>
      </div>
    </section>
  )
}
