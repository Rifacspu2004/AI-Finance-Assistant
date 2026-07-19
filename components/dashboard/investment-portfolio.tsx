"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { holdings, formatCurrency } from "@/lib/data"
import { cn } from "@/lib/utils"

const tones = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-5)"]

export function InvestmentPortfolio() {
  const total = holdings.reduce((s, h) => s + h.value, 0)

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-lg font-bold text-card-foreground">
            Investment Portfolio
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Holdings & performance</p>
        </div>
        <div className="text-right">
          <p className="font-serif text-xl font-bold text-card-foreground">
            {formatCurrency(total)}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--chart-3)]">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            +6.2% all time
          </span>
        </div>
      </div>

      {/* allocation bar */}
      <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full">
        {holdings.map((h, i) => (
          <div
            key={h.id}
            style={{ width: `${h.allocation}%`, backgroundColor: tones[i % tones.length] }}
            title={`${h.ticker} ${h.allocation}%`}
          />
        ))}
      </div>

      <ul className="mt-4 space-y-1">
        {holdings.map((h, i) => {
          const up = h.change >= 0
          return (
            <li
              key={h.id}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-secondary"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-primary-foreground"
                style={{ backgroundColor: tones[i % tones.length] }}
              >
                {h.ticker}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-card-foreground">{h.name}</p>
                <p className="text-xs text-muted-foreground">{h.allocation}% of portfolio</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums text-card-foreground">
                  {formatCurrency(h.value)}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    up ? "text-[color:var(--chart-3)]" : "text-destructive",
                  )}
                >
                  {up ? (
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                  )}
                  {up ? "+" : ""}
                  {h.change}%
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
