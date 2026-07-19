"use client"

import { useState } from "react"
import { Send, HandCoins, Check } from "lucide-react"
import { contacts } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const categories = ["Costs", "Wants", "Savings", "Income"] as const

export function TransactionForm() {
  const [mode, setMode] = useState<"send" | "request">("send")
  const [recipient, setRecipient] = useState(contacts[0].id)
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<(typeof categories)[number]>("Wants")
  const [note, setNote] = useState("")
  const [done, setDone] = useState(false)

  const amountNum = Number.parseFloat(amount)
  const valid = recipient && amountNum > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setDone(true)
    setTimeout(() => {
      setDone(false)
      setAmount("")
      setNote("")
    }, 1800)
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-serif text-lg font-bold text-card-foreground">New transaction</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Move money on your P2P ledger</p>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        {(["send", "request"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium capitalize transition",
              mode === m
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "send" ? (
              <Send className="h-4 w-4" aria-hidden="true" />
            ) : (
              <HandCoins className="h-4 w-4" aria-hidden="true" />
            )}
            {m}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Recipient
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setRecipient(c.id)}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-1.5 rounded-xl border px-3 py-2 transition",
                  recipient === c.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-ring/50",
                )}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground"
                  style={{ backgroundColor: c.color }}
                >
                  {c.initials}
                </span>
                <span className="text-xs font-medium text-card-foreground">
                  {c.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="amount"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-serif text-lg font-semibold text-muted-foreground">
              $
            </span>
            <input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              className="h-14 w-full rounded-xl border border-input bg-background pl-9 pr-4 font-serif text-2xl font-bold text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Ledger category
          </label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-lg border py-2 text-xs font-medium transition",
                  category === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-ring/50",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="note" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Note
          </label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's it for?"
            className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

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
            </>
          )}
        </Button>
      </form>
    </section>
  )
}
