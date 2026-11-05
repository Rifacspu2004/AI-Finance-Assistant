// File: components/dashboard/transaction-form.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { Send, HandCoins, Check, Search, X, UserRound, Eye, EyeOff } from "lucide-react"
import { getRegisteredUsers, searchUsers, createTransaction, subscribeUserBalance } from "@/lib/transactions"
import { MpinModal } from "@/components/dashboard/mpin-modal"
import { BalanceVisibilityModal } from "@/components/dashboard/balance-visibility-modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"

const categories = ["Costs", "Wants", "Savings", "Income"] as const

type Contact = { id: string; name: string; email?: string }

export function TransactionForm() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [mode, setMode] = useState<"send" | "request">("send")
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [recipient, setRecipient] = useState<Contact | null>(null)
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<typeof categories[number]>("Wants")
  const [note, setNote] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [balanceVisible, setBalanceVisible] = useState(false)
  const [balanceModalOpen, setBalanceModalOpen] = useState(false)
  const [mpinOpen, setMpinOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid ?? null)
      setBalanceVisible(false)
      setBalanceModalOpen(false)
    })
    return () => unsub()
  }, [])

  // Load contacts once we have a uid
  useEffect(() => {
    if (!currentUserId) return
    getRegisteredUsers(currentUserId)
      .then(setAllContacts)
      .catch((err) => console.error("getRegisteredUsers failed:", err))
  }, [currentUserId])

  // Subscribe to live balance updates — stays in sync when other transactions complete
  useEffect(() => {
    if (!currentUserId) return
    const unsub = subscribeUserBalance(currentUserId, setBalance)
    return () => unsub()
  }, [currentUserId])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = searchUsers(allContacts, searchQuery)
  const amountNum = Number.parseFloat(amount)
  const canSend = mode === "send"
  const valid = recipient && amountNum > 0 && (!canSend || amountNum <= balance)

  function selectRecipient(c: Contact) {
    setRecipient(c)
    setSearchQuery("")
    setDropdownOpen(false)
  }

  function clearRecipient() {
    setRecipient(null)
    setSearchQuery("")
  }

  // Step 1: form submit → open MPIN modal (don't pay yet)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || !currentUserId || !recipient) return
    setError(null)
    setMpinOpen(true)
  }

  // Step 2: called by MpinModal after correct PIN — execute the actual payment
  async function executePayment() {
    if (!currentUserId || !recipient) return
    await createTransaction(mode, currentUserId, recipient.id, amountNum, category, note)
    // Balance updates automatically via live subscription
    setDone(true)
    setMpinOpen(false)
    setTimeout(() => {
      setDone(false)
      setAmount("")
      setNote("")
      setRecipient(null)
    }, 1800)
  }

  const initials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-serif text-lg font-bold text-card-foreground">New transaction</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Move money on your P2P ledger</p>

      {/* Send / Request toggle */}
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        {(["send", "request"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium capitalize transition",
              mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "send" ? <Send className="h-4 w-4" aria-hidden="true" /> : <HandCoins className="h-4 w-4" aria-hidden="true" />}
            {m}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* ── Recipient search ── */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Recipient</label>

          {recipient ? (
            /* Selected chip */
            <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary/5 px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initials(recipient.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-card-foreground">{recipient.name}</p>
                {recipient.email && (
                  <p className="truncate text-xs text-muted-foreground">{recipient.email}</p>
                )}
              </div>
              <button
                type="button"
                onClick={clearRecipient}
                aria-label="Remove recipient"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            /* Search input + dropdown */
            <div ref={searchRef} className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setDropdownOpen(true) }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Search by name or email…"
                className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              />

              {dropdownOpen && (
                <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  {filtered.length === 0 ? (
                    <li className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                      <UserRound className="h-4 w-4" />
                      No users found
                    </li>
                  ) : (
                    filtered.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => selectRecipient(c)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-secondary"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {initials(c.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-card-foreground">{c.name}</p>
                            {c.email && (
                              <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Amount ── */}
        <div>
          <label htmlFor="amount" className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-serif text-lg font-semibold text-muted-foreground">$</span>
            <input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              className="h-14 w-full rounded-xl border border-input bg-background pl-9 pr-4 font-serif text-2xl font-bold text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          {canSend && (
            <div className="mt-3 rounded-xl border border-border bg-secondary/50 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Available balance
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Income Included
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      • Credits 1st of month
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-lg font-bold tracking-wide text-foreground">
                    {balanceVisible
                      ? balance.toLocaleString(undefined, { style: "currency", currency: "USD" })
                      : "$••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => balanceVisible ? setBalanceVisible(false) : setBalanceModalOpen(true)}
                    aria-label={balanceVisible ? "Hide wallet balance" : "Show wallet balance"}
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-background hover:text-foreground"
                  >
                    {balanceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Category ── */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Ledger category</label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-lg border py-2 text-xs font-medium transition",
                  category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-ring/50",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* ── Note ── */}
        <div>
          <label htmlFor="note" className="mb-1.5 block text-xs font-medium text-muted-foreground">Note</label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's it for?"
            className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          disabled={!valid || done}
          className="h-12 w-full gap-2 rounded-xl text-sm font-semibold"
        >
          {done ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              {mode === "send" ? "Sent!" : "Requested!"}
            </>
          ) : (
            <>
              {mode === "send" ? "Send" : "Request"}
              {amountNum > 0 ? ` $${amountNum.toFixed(2)}` : " money"}
              {recipient
                ? mode === "send"
                  ? ` to ${recipient.name.split(" ")[0]}`
                  : ` from ${recipient.name.split(" ")[0]}`
                : ""}
            </>
          )}
        </Button>
      </form>

      {/* MPIN confirmation modal */}
      {currentUserId && recipient && (
        <MpinModal
          open={mpinOpen}
          userId={currentUserId}
          onConfirm={executePayment}
          onCancel={() => setMpinOpen(false)}
          summary={{
            action: mode === "send" ? "Send money" : "Request money",
            amount: `$${amountNum.toFixed(2)}`,
            to: recipient.name,
            note: note || undefined,
          }}
        />
      )}
      {currentUserId && (
        <BalanceVisibilityModal
          open={balanceModalOpen}
          userId={currentUserId}
          onReveal={() => setBalanceVisible(true)}
          onClose={() => setBalanceModalOpen(false)}
        />
      )}
    </section>
  )
}
