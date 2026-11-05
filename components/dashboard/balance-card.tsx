"use client"

import { useEffect, useState, useMemo } from "react"
import {
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  EyeOff,
  TrendingUp,
  Calendar,
  Sparkles,
  Zap,
} from "lucide-react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import {
  subscribeUserBalance,
  subscribeUserTransactions,
  subscribeUserIncomeInfo,
  P2PTransaction,
  DEFAULT_STARTING_BALANCE,
  DEFAULT_BASE_BALANCE,
  DEFAULT_MONTHLY_INCOME,
  getNextMonthlyCreditDate,
  getDaysUntilNextCredit,
  type IncomeInfo,
} from "@/lib/transactions"
import { formatCurrency, balanceHistory as fallbackHistory } from "@/lib/data"
import { BalanceVisibilityModal } from "@/components/dashboard/balance-visibility-modal"
import { IncomeAutomationModal } from "@/components/dashboard/income-automation-modal"

function Sparkline({ data }: { data: number[] }) {
  const safeData = data.length >= 2 ? data : [data[0] || 1000, (data[0] || 1000) * 1.05]
  const w = 320
  const h = 90
  const min = Math.min(...safeData)
  const max = Math.max(...safeData)
  const range = max - min || 1
  const step = w / (safeData.length - 1)
  const points = safeData.map((v, i) => {
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

export function BalanceCard({
  title = "Total wallet balance",
  badgeLabel,
}: {
  title?: string
  badgeLabel?: string
}) {
  const [userId, setUserId] = useState<string | null>(null)
  const [balance, setBalance] = useState<number>(DEFAULT_STARTING_BALANCE)
  const [transactions, setTransactions] = useState<P2PTransaction[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [mpinModalOpen, setMpinModalOpen] = useState(false)
  const [incomeModalOpen, setIncomeModalOpen] = useState(false)

  const [incomeInfo, setIncomeInfo] = useState<IncomeInfo>({
    monthlyIncome: DEFAULT_MONTHLY_INCOME,
    lastCreditPeriod: null,
    lastCreditTimestamp: null,
    nextCreditDate: getNextMonthlyCreditDate(),
    daysUntilNextCredit: getDaysUntilNextCredit(),
    isCreditedThisPeriod: true,
  })

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null)
      setIsVisible(false)
    })
    return () => unsubAuth()
  }, [])

  useEffect(() => {
    if (!userId) return
    const unsubBal = subscribeUserBalance(userId, (val) => setBalance(val))
    const unsubTx = subscribeUserTransactions(userId, (txs) => setTransactions(txs))
    const unsubIncome = subscribeUserIncomeInfo(userId, (info) => setIncomeInfo(info))

    return () => {
      unsubBal()
      unsubTx()
      unsubIncome()
    }
  }, [userId])

  const { moneyIn, moneyOut, chartData } = useMemo(() => {
    if (!userId || transactions.length === 0) {
      return {
        moneyIn: DEFAULT_STARTING_BALANCE,
        moneyOut: 0,
        chartData: fallbackHistory,
      }
    }

    let inTotal = 0
    let outTotal = 0

    // Chronological order
    const sorted = [...transactions]
      .filter((t) => t.status === "completed")
      .sort((a, b) => a.createdAt - b.createdAt)

    for (const tx of sorted) {
      if (tx.recipientId === userId) inTotal += tx.amount
      if (tx.senderId === userId) outTotal += tx.amount
    }

    // Build curve from recent transactions
    const historyPoints: number[] = [DEFAULT_BASE_BALANCE]
    let running = DEFAULT_BASE_BALANCE
    for (const tx of sorted.slice(-8)) {
      if (tx.recipientId === userId) running += tx.amount
      if (tx.senderId === userId) running -= tx.amount
      historyPoints.push(running)
    }
    if (historyPoints.length < 3) {
      historyPoints.push(balance)
    }

    return {
      moneyIn: inTotal > 0 ? inTotal : balance,
      moneyOut: outTotal,
      chartData: historyPoints,
    }
  }, [userId, transactions, balance])

  const cardTag = badgeLabel || (userId ? `•••• ${userId.slice(-4).toUpperCase()}` : "•••• 4921")
  const nextMonthText = incomeInfo.nextCreditDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/20">
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <button
              type="button"
              onClick={() => {
                if (isVisible) {
                  setIsVisible(false)
                } else {
                  if (userId) {
                    setMpinModalOpen(true)
                  } else {
                    setIsVisible(true)
                  }
                }
              }}
              className="flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors cursor-pointer group"
              title={isVisible ? "Hide balance" : "Reveal balance with MPIN"}
            >
              <span>{title}</span>
              {isVisible ? (
                <Eye className="h-4 w-4 opacity-80 group-hover:opacity-100" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4 opacity-80 group-hover:opacity-100" aria-hidden="true" />
              )}
            </button>

            <p className="mt-2 font-serif text-4xl font-bold tracking-tight">
              {isVisible ? formatCurrency(balance) : "••••••••"}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                Live Balance
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Income Included
              </div>
            </div>
          </div>

          <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">
            {cardTag}
          </span>
        </div>

        {/* ── Monthly Income Automation Ribbon ── */}
        <div className="relative z-10 mt-4 rounded-2xl bg-primary-foreground/12 p-3 backdrop-blur-sm border border-primary-foreground/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-foreground/20 text-primary-foreground">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-primary-foreground">Monthly Income</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping" />
                    Auto 1st
                  </span>
                </div>
                <p className="font-serif text-sm font-bold text-primary-foreground/95">
                  {isVisible ? `+${formatCurrency(incomeInfo.monthlyIncome)} / month` : "•••• / mo"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIncomeModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-foreground/20 hover:bg-primary-foreground/30 px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all cursor-pointer shadow-sm active:scale-95"
              title="View income automation rules & simulate 1st of month credit"
            >
              <span>Auto-credit</span>
              <Zap className="h-3.5 w-3.5 text-amber-300" />
            </button>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-primary-foreground/10 pt-2 text-[11px] text-primary-foreground/80">
            <span>Next auto-deposit: <strong>1st of {nextMonthText}</strong></span>
            <span className="font-semibold text-emerald-200">In {incomeInfo.daysUntilNextCredit} days</span>
          </div>
        </div>

        <div className="relative z-10 mt-4 h-16">
          <Sparkline data={chartData} />
        </div>

        <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-primary-foreground/12 p-3">
            <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
              <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Money in (w/ Income)
            </div>
            <p className="mt-1 font-serif text-lg font-semibold">
              {isVisible ? formatCurrency(moneyIn) : "••••"}
            </p>
          </div>
          <div className="rounded-2xl bg-primary-foreground/12 p-3">
            <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              Money out
            </div>
            <p className="mt-1 font-serif text-lg font-semibold">
              {isVisible ? formatCurrency(moneyOut) : "••••"}
            </p>
          </div>
        </div>
      </section>

      {userId && (
        <>
          <BalanceVisibilityModal
            open={mpinModalOpen}
            userId={userId}
            onReveal={() => setIsVisible(true)}
            onClose={() => setMpinModalOpen(false)}
          />
          <IncomeAutomationModal
            open={incomeModalOpen}
            onClose={() => setIncomeModalOpen(false)}
            userId={userId}
            balance={balance}
            incomeInfo={incomeInfo}
          />
        </>
      )}
    </>
  )
}
