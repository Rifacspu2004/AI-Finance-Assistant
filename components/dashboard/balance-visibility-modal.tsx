"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, KeyRound, ShieldAlert, X } from "lucide-react"
import { hasMpin, verifyMpin } from "@/lib/mpin"

interface BalanceVisibilityModalProps {
  open: boolean
  userId: string
  onReveal: () => void
  onClose: () => void
}

export function BalanceVisibilityModal({
  open,
  userId,
  onReveal,
  onClose,
}: BalanceVisibilityModalProps) {
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [hasConfiguredMpin, setHasConfiguredMpin] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (!open) return

    setPin("")
    setShowPin(false)
    setError(null)
    setHasConfiguredMpin(null)
    hasMpin(userId)
      .then(setHasConfiguredMpin)
      .catch(() => setError("Could not check your MPIN. Please try again."))
  }, [open, userId])

  if (!open) return null

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 6) {
      setError("Enter your 6-digit MPIN.")
      return
    }

    setVerifying(true)
    setError(null)
    try {
      const valid = await verifyMpin(userId, pin)
      if (!valid) {
        setPin("")
        setError("Incorrect MPIN. Please try again.")
        return
      }
      onReveal()
      onClose()
    } catch {
      setError("Could not verify your MPIN. Please try again.")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-semibold text-foreground">Reveal wallet balance</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close balance verification"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {hasConfiguredMpin === null ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Checking your security settings…</p>
        ) : !hasConfiguredMpin ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Set your MPIN first</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your 6-digit MPIN protects sensitive wallet information.
              </p>
            </div>
            <Link
              href="/profile"
              onClick={onClose}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Go to Update Profile
            </Link>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="mt-5 space-y-5">
            <p className="text-sm text-muted-foreground">
              Enter your MPIN to view your current wallet balance.
            </p>
            <div className="relative">
              <input
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  setError(null)
                }}
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Enter 6-digit MPIN"
                aria-label="6-digit MPIN"
                autoFocus
                className="h-12 w-full rounded-xl border border-input bg-background px-4 pr-11 text-center text-lg font-bold tracking-[0.4em] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <button
                type="button"
                onClick={() => setShowPin((value) => !value)}
                aria-label={showPin ? "Hide MPIN" : "Show MPIN"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={verifying}
              className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {verifying ? "Verifying…" : "Show balance"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
