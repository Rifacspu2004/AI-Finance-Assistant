"use client"

import { CheckCircle2, Sparkles } from "lucide-react"
import { budget, formatCurrency } from "@/lib/data"

const rows = [
  {
    key: "Costs",
    tone: "var(--chart-1)",
    ...budget.costs,
    hint: "Fixed needs — rent, bills, groceries",
  },
  {
    key: "Wants",
    tone: "var(--chart-4)",
    ...budget.wants,
    hint: "Flexible lifestyle spending",
  },
  {
    key: "Savings",
    tone: "var(--chart-3)",
    ...budget.savings,
    hint: "Goals, vault & investments",
  },
]

export function BudgetTracker() {
  const allocated = budget.costs.limit + budget.wants.limit + budget.savings.limit
  const balanced = allocated === budget.income

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-lg font-bold text-card-foreground">AI Budget Tracker</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Allocation validated against your income
          </p>
        </div>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          50 / 30 / 20
        </span>
      </div>

      {/* Formula validation matrix: C + W + S = I */}
      <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl bg-secondary px-4 py-3 font-serif text-sm">
        <span className="font-semibold text-[color:var(--chart-1)]">
          Costs {formatCurrency(budget.costs.limit)}
        </span>
        <span className="text-muted-foreground">+</span>
        <span className="font-semibold text-[color:var(--chart-4)]">
          Wants {formatCurrency(budget.wants.limit)}
        </span>
        <span className="text-muted-foreground">+</span>
        <span className="font-semibold text-[color:var(--chart-3)]">
          Savings {formatCurrency(budget.savings.limit)}
        </span>
        <span className="text-muted-foreground">=</span>
        <span className="font-bold text-foreground">Income {formatCurrency(budget.income)}</span>
        {balanced && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[color:var(--chart-3)]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Balanced
          </span>
        )}
      </div>

      <div className="mt-5 space-y-5">
        {rows.map((row) => {
          const pct = Math.round((row.spent / row.limit) * 100)
          return (
            <div key={row.key}>
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: row.tone }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-card-foreground">{row.key}</span>
                  <span className="text-xs text-muted-foreground">{row.hint}</span>
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">
                  <span className="font-semibold text-card-foreground">
                    {formatCurrency(row.spent)}
                  </span>{" "}
                  / {formatCurrency(row.limit)}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: row.tone }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="text-sm leading-relaxed text-card-foreground">
          <span className="font-semibold">AI insight:</span> You&apos;re pacing 8% under your Wants
          budget. Redirecting the surplus to Savings would hit your emergency-fund goal 3 weeks
          early.
        </p>
      </div>
    </section>
  )
}
