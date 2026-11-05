// components/dashboard/mpin-modal.tsx
// Real bank flow (SBI-style):
//   1. Summary screen  — "You are about to pay $X to Y. Proceed?"
//   2. PIN entry screen — 6 individual input boxes (OTP-style, auto-advance)
//   3. Verify → success callback OR error
//   Cancel at any stage → abort, payment never happens

"use client"

import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from "react"
import { X, ShieldAlert, Lock, AlertTriangle, Eye, EyeOff } from "lucide-react"
import { verifyMpin, hasMpin } from "@/lib/mpin"
import { cn } from "@/lib/utils"

export interface MpinModalProps {
  open: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
  userId: string
  summary: {
    action: string   // "Send money" | "Pay request"
    amount: string   // "$12.00"
    to: string       // "Vishnu"
    note?: string
  }
}

type Screen = "confirm" | "pin" | "processing" | "no-mpin"
const PIN_LENGTH = 6
const MAX_ATTEMPTS = 3

// ── Reusable 6-box OTP input ────────────────────────────────────────────────
function PinInputRow({
  value,
  onChange,
  show,
  disabled,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  disabled?: boolean
  autoFocus?: boolean
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  // Auto-focus first empty box when row mounts
  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  function focus(i: number) { refs.current[i]?.focus() }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault()
      if (value[i]) {
        const next = value.split("")
        next[i] = ""
        onChange(next.join(""))
      } else if (i > 0) {
        const next = value.split("")
        next[i - 1] = ""
        onChange(next.join(""))
        focus(i - 1)
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      focus(i - 1)
    } else if (e.key === "ArrowRight" && i < PIN_LENGTH - 1) {
      focus(i + 1)
    } else if (e.key === "Enter") {
      // bubble up to trigger verify
      e.currentTarget.closest("form")?.requestSubmit()
    }
  }

  function handleInput(i: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1)
    if (!digit) return
    const next = value.padEnd(PIN_LENGTH, "").split("")
    next[i] = digit
    onChange(next.join("").slice(0, PIN_LENGTH))
    if (i < PIN_LENGTH - 1) focus(i + 1)
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH)
    if (!pasted) return
    onChange(pasted.padEnd(PIN_LENGTH, "").slice(0, PIN_LENGTH))
    focus(Math.min(pasted.length, PIN_LENGTH - 1))
  }

  return (
    <div className="flex justify-center gap-2.5">
      {Array.from({ length: PIN_LENGTH }).map((_, i) => {
        const char = value[i] ?? ""
        return (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el }}
            type={show ? "text" : "password"}
            inputMode="numeric"
            maxLength={1}
            value={char}
            disabled={disabled}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={cn(
              "h-12 w-11 rounded-xl border text-center text-lg font-bold outline-none transition",
              "focus:border-ring focus:ring-2 focus:ring-ring/30",
              char
                ? "border-primary bg-primary/5 text-primary"
                : "border-input bg-background text-foreground",
              disabled && "cursor-not-allowed opacity-50"
            )}
          />
        )
      })}
    </div>
  )
}
// ────────────────────────────────────────────────────────────────────────────

export function MpinModal({ open, onConfirm, onCancel, userId, summary }: MpinModalProps) {
  const [screen, setScreen] = useState<Screen>("confirm")
  const [pin, setPin] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [processing, setProcessing] = useState(false)

  // Reset every time modal opens
  useEffect(() => {
    if (open) {
      setScreen("confirm")
      setPin("")
      setShow(false)
      setError(null)
      setAttempts(0)
      setProcessing(false)
      hasMpin(userId).then((has) => {
        if (!has) setScreen("no-mpin")
      }).catch(() => {})
    }
  }, [open, userId])

  if (!open) return null

  async function handleVerify() {
    if (pin.length < PIN_LENGTH) { setError("Enter all 6 digits."); return }
    setProcessing(true)
    setError(null)
    try {
      const ok = await verifyMpin(userId, pin)
      if (!ok) {
        const next = attempts + 1
        setAttempts(next)
        setPin("")
        if (next >= MAX_ATTEMPTS) {
          setError("Too many wrong attempts. Transaction cancelled.")
          setTimeout(onCancel, 2000)
        } else {
          setError(`Wrong MPIN. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next === 1 ? "" : "s"} left.`)
        }
        setProcessing(false)
        return
      }
      setScreen("processing")
      await onConfirm()
    } catch (err: any) {
      setError(err.message ?? "Transaction failed.")
      setScreen("pin")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="w-full max-w-sm rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl">

        {/* ── No MPIN ── */}
        {screen === "no-mpin" && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-foreground">MPIN not set</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Go to <strong>Update Profile</strong> and set your 6-digit MPIN before making payments.
              </p>
            </div>
            <button
              onClick={onCancel}
              className="mt-2 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              Go back
            </button>
          </div>
        )}

        {/* ── Confirmation screen ── */}
        {screen === "confirm" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Confirm Payment</span>
              </div>
              <button onClick={onCancel} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-secondary p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Action</span>
                <span className="font-semibold text-foreground">{summary.action}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-foreground text-base">{summary.amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">To</span>
                <span className="font-semibold text-foreground">{summary.to}</span>
              </div>
              {summary.note && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Note</span>
                  <span className="text-foreground">{summary.note}</span>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Once confirmed with your MPIN, this transaction cannot be reversed.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onCancel}
                className="h-12 rounded-xl border border-border bg-secondary text-sm font-semibold text-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setScreen("pin")}
                className="h-12 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
              >
                Proceed
              </button>
            </div>
          </div>
        )}

        {/* ── PIN entry screen ── */}
        {screen === "pin" && (
          <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setScreen("confirm"); setPin(""); setError(null) }}
                className="rounded-lg p-1.5 text-sm text-muted-foreground hover:bg-secondary"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Enter MPIN</span>
              </div>
              <button onClick={onCancel} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Authorise <strong className="text-foreground">{summary.amount}</strong> to <strong className="text-foreground">{summary.to}</strong>
            </p>

            {/* 6-box OTP input */}
            <PinInputRow
              value={pin}
              onChange={(v) => { setPin(v); setError(null) }}
              show={show}
              disabled={processing}
              autoFocus
            />

            {/* Show / hide toggle */}
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {show ? "Hide" : "Show"} digits
              </button>
              <p className="text-xs text-muted-foreground">{pin.length}/6</p>
            </div>

            {error && (
              <p className="text-center text-xs font-medium text-destructive">{error}</p>
            )}

            <button
              onClick={handleVerify}
              disabled={pin.length < PIN_LENGTH || processing}
              className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
            >
              {processing ? "Verifying…" : "Confirm & Pay"}
            </button>

            <button
              onClick={onCancel}
              className="text-center text-xs text-muted-foreground hover:text-foreground underline"
            >
              Cancel transaction
            </button>
          </div>
        )}

        {/* ── Processing ── */}
        {screen === "processing" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-semibold text-foreground">Processing payment…</p>
            <p className="text-xs text-muted-foreground">Please wait, do not close this window.</p>
          </div>
        )}

      </div>
    </div>
  )
}
