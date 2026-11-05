"use client"

import { useState } from "react"
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  X,
  Wallet,
  ShieldCheck,
  Zap,
} from "lucide-react"
import {
  checkAndCreditMonthlyIncome,
  DEFAULT_BASE_BALANCE,
  formatCurrency,
  type IncomeInfo,
} from "@/lib/transactions"
import { Button } from "@/components/ui/button"

export function IncomeAutomationModal({
  open,
  onClose,
  userId,
  balance,
  incomeInfo,
}: {
  open: boolean
  onClose: () => void
  userId: string
  balance: number
  incomeInfo: IncomeInfo
}) {
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!open) return null

  const handleSimulateCredit = async () => {
    if (!userId || loading) return
    setLoading(true)
    setSuccessMsg(null)
    try {
      const result = await checkAndCreditMonthlyIncome(userId, true)
      if (result) {
        setSuccessMsg(
          `Success! +${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(result.amount)} auto-credited into your spendable balance!`
        )
      }
    } catch (err: any) {
      console.error("Simulation error:", err)
    } finally {
      setLoading(false)
    }
  }

  const nextDateFormatted = incomeInfo.nextCreditDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-card-foreground">
                  Monthly Income Automation
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automated monthly salary deposit directly to your wallet
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Balance Breakdown Card */}
        <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Wallet Composition
          </span>

          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                Base Starter Funds
              </span>
              <span className="font-mono font-medium text-foreground">
                {formatCurrency(DEFAULT_BASE_BALANCE)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Monthly Income
              </span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(incomeInfo.monthlyIncome)} / mo
              </span>
            </div>

            <div className="border-t border-border pt-2.5 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                Total Spendable Balance
              </span>
              <span className="font-serif text-lg font-bold text-primary">
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </div>

        {/* Automation Schedule Details */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Automated Pay Date
            </span>
            <span className="font-semibold text-foreground">
              1st of Every Month (00:00)
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Current Month Status
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Credited for {incomeInfo.lastCreditPeriod || "Current Month"}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Next Scheduled Credit
            </span>
            <span className="font-semibold text-foreground">
              {nextDateFormatted} (in {incomeInfo.daysUntilNextCredit} days)
            </span>
          </div>
        </div>

        {/* Success message banner */}
        {successMsg && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <Button
            type="button"
            onClick={handleSimulateCredit}
            disabled={loading}
            className="flex-1 h-11 rounded-xl text-xs font-semibold gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Crediting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Simulate 1st of Month Credit
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-xl text-xs font-medium"
          >
            Close
          </Button>
        </div>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Simulating dispatches a real-time salary credit to test your balance, ledger, and portfolio.
        </p>
      </div>
    </div>
  )
}
