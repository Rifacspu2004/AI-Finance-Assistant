"use client"

import { useState } from "react"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { ledger, formatCurrency } from "@/lib/data"
import { cn } from "@/lib/utils"

const filters = ["All", "Income", "Costs", "Wants", "Savings"] as const

const categoryTone: Record<string, string> = {
  Income: "var(--chart-3)",
  Costs: "var(--chart-1)",
  Wants: "var(--chart-4)",
  Savings: "var(--chart-2)",
}

export function Ledger() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All")
  const rows = ledger.filter((e) => filter === "All" || e.category === filter)

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold text-card-foreground">P2P Ledger</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Stateful transaction history</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {rows.map((e) => {
          const isIn = e.direction === "in"
          return (
            <li key={e.id} className="flex items-center gap-3 py-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  isIn ? "bg-[color:var(--chart-3)]/15" : "bg-secondary",
                )}
              >
                {isIn ? (
                  <ArrowDownLeft
                    className="h-5 w-5 text-[color:var(--chart-3)]"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-card-foreground">{e.name}</p>
                  {e.status === "pending" && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                      Pending
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {e.note} · {e.date}
                </p>
              </div>

              <div className="text-right">
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    isIn ? "text-[color:var(--chart-3)]" : "text-card-foreground",
                  )}
                >
                  {isIn ? "+" : "−"}
                  {formatCurrency(e.amount)}
                </p>
                <span
                  className="text-xs font-medium"
                  style={{ color: categoryTone[e.category] }}
                >
                  {e.category}
                </span>
              </div>
            </li>
          )
        })}
        {rows.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">
            No transactions in this category yet.
          </li>
        )}
      </ul>
    </section>
  )
}
