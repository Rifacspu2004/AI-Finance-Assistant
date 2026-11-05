"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { checkAndCreditMonthlyIncome, formatCurrency } from "@/lib/transactions"
import { Sparkles, CheckCircle2, X } from "lucide-react"

export function MonthlyIncomeScheduler() {
  const [toast, setToast] = useState<{
    show: boolean
    amount: number
    period: string
    isSimulation?: boolean
  }>({ show: false, amount: 0, period: "" })

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return

      // 1. Initial check & credit upon authentication / page load
      try {
        const result = await checkAndCreditMonthlyIncome(user.uid)
        if (result?.credited) {
          setToast({
            show: true,
            amount: result.amount,
            period: result.period,
            isSimulation: false,
          })
        }
      } catch (err) {
        console.error("MonthlyIncomeScheduler auto-credit error:", err)
      }

      // 2. Check periodically (every 60s) to catch month roll-overs to the 1st
      intervalId = setInterval(async () => {
        try {
          const res = await checkAndCreditMonthlyIncome(user.uid)
          if (res?.credited) {
            setToast({
              show: true,
              amount: res.amount,
              period: res.period,
              isSimulation: false,
            })
          }
        } catch {}
      }, 60 * 1000)
    })

    // 3. Tab visibility / focus re-check
    const handleVisibility = async () => {
      if (document.visibilityState === "visible" && auth.currentUser) {
        try {
          const res = await checkAndCreditMonthlyIncome(auth.currentUser.uid)
          if (res?.credited) {
            setToast({
              show: true,
              amount: res.amount,
              period: res.period,
              isSimulation: false,
            })
          }
        } catch {}
      }
    }

    // 4. Custom event listener for manual or background credits
    const handleCustomCredit = (e: Event) => {
      const customEvent = e as CustomEvent<{
        amount: number
        period: string
        force?: boolean
      }>
      if (customEvent.detail) {
        setToast({
          show: true,
          amount: customEvent.detail.amount,
          period: customEvent.detail.period,
          isSimulation: customEvent.detail.force,
        })
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("focus", handleVisibility)
    window.addEventListener("aeris-income-credited", handleCustomCredit)

    return () => {
      unsubAuth()
      if (intervalId) clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("focus", handleVisibility)
      window.removeEventListener("aeris-income-credited", handleCustomCredit)
    }
  }, [])

  // Auto-dismiss notification after 7 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }))
      }, 7000)
      return () => clearTimeout(timer)
    }
  }, [toast.show])

  if (!toast.show) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-card/95 p-4 text-card-foreground shadow-2xl shadow-emerald-500/10 backdrop-blur-md">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>

        <div className="flex-1 pr-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">
              {toast.isSimulation ? "Simulated Credit Processed!" : "Monthly Income Auto-Credited!"}
            </h4>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              1st of Month
            </span>
          </div>

          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-emerald-600 dark:text-emerald-400">
              +{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(toast.amount)}
            </strong>{" "}
            has been automatically deposited into your wallet balance. All balances and ledger records have been updated in real-time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setToast((prev) => ({ ...prev, show: false }))}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
