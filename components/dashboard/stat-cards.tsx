import { Wallet, PiggyBank, Users, Receipt } from "lucide-react"
import { formatCurrency } from "@/lib/data"

const stats = [
  {
    label: "Spendable",
    value: formatCurrency(3844.1),
    icon: Wallet,
    sub: "After allocations",
    tone: "var(--chart-1)",
  },
  {
    label: "Saved this month",
    value: formatCurrency(620),
    icon: PiggyBank,
    sub: "74% of goal",
    tone: "var(--chart-3)",
  },
  {
    label: "Owed to you",
    value: formatCurrency(305),
    icon: Users,
    sub: "3 open requests",
    tone: "var(--chart-2)",
  },
  {
    label: "Bills due",
    value: formatCurrency(214.4),
    icon: Receipt,
    sub: "Next 7 days",
    tone: "var(--chart-5)",
  },
]

export function StatCards() {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon
        return (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `color-mix(in oklch, ${s.tone} 16%, transparent)` }}
              >
                <Icon className="h-4 w-4" style={{ color: s.tone }} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 font-serif text-2xl font-bold tracking-tight text-card-foreground">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
          </div>
        )
      })}
    </div>
  )
}
