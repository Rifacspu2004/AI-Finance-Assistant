"use client"

import { useState, useEffect } from "react"
import { ArrowDownLeft, ArrowUpRight, Loader2, Check, X } from "lucide-react"
import { subscribeUserTransactions, respondToRequest, type P2PTransaction } from "@/lib/transactions"
import { MpinModal } from "@/components/dashboard/mpin-modal"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { getUserProfile } from "@/lib/user-profile"

const filters = ["All", "Costs", "Wants", "Savings", "Income", "Pending"] as const

const categoryTone: Record<string, string> = {
  Income: "var(--chart-3)",
  Costs: "var(--chart-1)",
  Wants: "var(--chart-4)",
  Savings: "var(--chart-2)",
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function Ledger() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [txs, setTxs] = useState<P2PTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<(typeof filters)[number]>("All")
  // cache uid → display name
  const [nameCache, setNameCache] = useState<Record<string, string>>({})
  const [responding, setResponding] = useState<Record<string, boolean>>({})
  // The transaction pending MPIN confirmation (null = modal closed)
  const [mpinTx, setMpinTx] = useState<P2PTransaction | null>(null)

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid ?? null)
    })
    return () => unsub()
  }, [])

  // Subscribe to live transactions
  useEffect(() => {
    if (!currentUserId) return
    setLoading(true)
    const unsub = subscribeUserTransactions(currentUserId, (list) => {
      setTxs(list)
      setLoading(false)
      // Fetch display names for unknown participants
      const unknownIds = list.flatMap((tx) => [tx.senderId, tx.recipientId]).filter(
        (id) => id !== currentUserId && !nameCache[id],
      )
      const uniqueIds = [...new Set(unknownIds)]
      uniqueIds.forEach(async (id) => {
        try {
          const profile = await getUserProfile(id)
          if (profile?.fullName) {
            setNameCache((prev) => ({ ...prev, [id]: profile.fullName }))
          }
        } catch {}
      })
    })
    return () => unsub()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  function getName(id: string) {
    if (id === currentUserId) return "You"
    if (id === "aeris-payroll" || id === "monthly-income-system") return "Aeris Automated Payroll"
    if (id === "aeris-investment-portfolio") return "Investment Portfolio"
    return nameCache[id] ?? (id.length > 12 ? id.slice(0, 8) + "…" : id)
  }

  // Apply filter
  const rows = txs.filter((tx) => {
    if (filter === "Pending") return tx.status === "pending"
    if (filter === "All") return true
    return tx.category === filter
  })

  // Step 1: Pay clicked → open MPIN modal
  function handlePayClick(tx: P2PTransaction) {
    setMpinTx(tx)
  }

  // Step 2: MPIN verified → execute the actual respond
  async function executePay() {
    if (!mpinTx?.id) return
    const id = mpinTx.id
    setResponding((p) => ({ ...p, [id]: true }))
    try {
      await respondToRequest(id, "accept")
    } finally {
      setResponding((p) => ({ ...p, [id]: false }))
      setMpinTx(null)
    }
  }

  async function handleDecline(txId: string) {
    setResponding((p) => ({ ...p, [txId]: true }))
    try {
      await respondToRequest(txId, "decline")
    } catch (err: any) {
      console.error(err)
    } finally {
      setResponding((p) => ({ ...p, [txId]: false }))
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold text-card-foreground">P2P Ledger</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Live transaction history</p>
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

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {rows.map((tx) => {
            const isPending = tx.status === "pending"

            // For completed sends: sender paid, recipient received
            // For pending requests: senderId = payer, recipientId = requester
            // "isIn" = money coming in to current user when completed
            const isIn = tx.recipientId === currentUserId && tx.status === "completed"

            // The "other person" label
            const otherName = getName(
              tx.senderId === currentUserId ? tx.recipientId : tx.senderId
            )

            // Payer (senderId) sees Accept/Decline on pending requests
            const canRespond = isPending && tx.senderId === currentUserId

            // Requester (recipientId) sees "waiting" label on pending requests
            const isWaiting = isPending && tx.recipientId === currentUserId

            // Row label
            let label = ""
            if (tx.status === "completed") {
              label = isIn ? `From ${getName(tx.senderId)}` : `To ${getName(tx.recipientId)}`
            } else if (canRespond) {
              label = `${getName(tx.recipientId)} requested`
            } else if (isWaiting) {
              label = `Requested from ${getName(tx.senderId)}`
            } else {
              label = otherName
            }

            return (
              <li key={tx.id ?? tx.createdAt} className="flex items-start gap-3 py-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    isIn ? "bg-chart-3/15" : isPending ? "bg-accent/20" : "bg-secondary",
                  )}
                >
                  {isIn ? (
                    <ArrowDownLeft className="h-5 w-5 text-chart-3" aria-hidden="true" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-card-foreground">{label}</p>
                    {tx.senderId === "aeris-payroll" && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Monthly 1st Auto-Credit
                      </span>
                    )}
                    {isPending && (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                        Pending
                      </span>
                    )}
                    {tx.status === "declined" && (
                      <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                        Declined
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {tx.note ? `${tx.note} · ` : ""}{formatDate(tx.createdAt)}
                  </p>

                  {/* Pay / Decline: shown to the PAYER (senderId) on pending requests */}
                  {canRespond && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={responding[tx.id!]}
                        onClick={() => handlePayClick(tx)}
                        className="flex items-center gap-1 rounded-lg bg-chart-3/15 px-3 py-1 text-xs font-semibold text-chart-3 transition hover:bg-chart-3/25 disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" />
                        Pay
                      </button>
                      <button
                        type="button"
                        disabled={responding[tx.id!]}
                        onClick={() => handleDecline(tx.id!)}
                        className="flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                        Decline
                      </button>
                    </div>
                  )}

                  {/* Waiting label: shown to the REQUESTER */}
                  {isWaiting && (
                    <p className="mt-1 text-xs text-muted-foreground italic">Waiting for payment…</p>
                  )}
                </div>

                <div className="text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      isIn ? "text-chart-3" : "text-card-foreground",
                    )}
                  >
                    {isIn ? "+" : isPending ? "" : "−"}
                    {formatCurrency(tx.amount)}
                  </p>
                  <span
                    className="text-xs font-medium"
                    style={{ color: categoryTone[tx.category] ?? "var(--muted-foreground)" }}
                  >
                    {tx.category}
                  </span>
                </div>
              </li>
            )
          })}

          {rows.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              No transactions yet.
            </li>
          )}
        </ul>
      )}

      {/* MPIN modal for approving payment requests */}
      {currentUserId && mpinTx && (
        <MpinModal
          open={true}
          userId={currentUserId}
          onConfirm={executePay}
          onCancel={() => setMpinTx(null)}
          summary={{
            action: "Pay request",
            amount: formatCurrency(mpinTx.amount),
            to: getName(mpinTx.recipientId),
            note: mpinTx.note,
          }}
        />
      )}
    </section>
  )
}
