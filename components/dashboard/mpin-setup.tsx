// components/dashboard/mpin-setup.tsx
"use client"

import { useRef, useState, KeyboardEvent, ClipboardEvent } from "react"
import { Eye, EyeOff, CheckCircle2, KeyRound } from "lucide-react"
import { setMpin } from "@/lib/mpin"
import { cn } from "@/lib/utils"

type Step = "set" | "confirm"

interface Props {
  userId: string
  hasMpin: boolean
  onSaved: () => void
}

const PIN_LENGTH = 6

/** Six individual single-digit input boxes — auto-advance, backspace-to-previous, paste support */
function PinInputRow({
  value,
  onChange,
  show,
  disabled,
  label,
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  disabled?: boolean
  label: string
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  function focus(i: number) {
    refs.current[i]?.focus()
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault()
      if (value[i]) {
        // clear current
        const next = value.split("")
        next[i] = ""
        onChange(next.join(""))
      } else if (i > 0) {
        // move to previous and clear it
        const next = value.split("")
        next[i - 1] = ""
        onChange(next.join(""))
        focus(i - 1)
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      focus(i - 1)
    } else if (e.key === "ArrowRight" && i < PIN_LENGTH - 1) {
      focus(i + 1)
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
    <div>
      <label className="mb-2 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const char = value[i] ?? ""
          const isFilled = char !== ""
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
                "h-12 w-10 rounded-xl border text-center text-lg font-bold outline-none transition",
                "focus:border-ring focus:ring-2 focus:ring-ring/30",
                isFilled
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input bg-card text-foreground",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

export function MpinSetup({ userId, hasMpin, onSaved }: Props) {
  const [step, setStep] = useState<Step>("set")
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  function handlePinChange(v: string) { setPin(v); setError(null) }
  function handleConfirmChange(v: string) { setConfirmPin(v); setError(null) }

  function handleNext() {
    if (pin.replace(/\s/g, "").length < PIN_LENGTH) {
      setError("Enter all 6 digits.")
      return
    }
    setConfirmPin("")
    setStep("confirm")
  }

  async function handleConfirm() {
    if (confirmPin.replace(/\s/g, "").length < PIN_LENGTH) {
      setError("Enter all 6 digits to confirm.")
      return
    }
    if (pin !== confirmPin) {
      setError("PINs do not match. Please start over.")
      setPin("")
      setConfirmPin("")
      setStep("set")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await setMpin(userId, pin)
      setDone(true)
      onSaved()
    } catch (err: any) {
      setError(err.message ?? "Failed to save MPIN.")
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
        <div>
          <p className="text-sm font-semibold text-green-700">MPIN set successfully</p>
          <p className="text-xs text-green-600">You'll be asked for it before every payment.</p>
        </div>
      </div>
    )
  }

  const showToggle = (
    <button
      type="button"
      onClick={() => setShow((s) => !s)}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {show ? "Hide" : "Show"} digits
    </button>
  )

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", step === "set" ? "bg-primary text-primary-foreground" : "bg-chart-3 text-white")}>1</span>
        <span className={step === "set" ? "font-medium text-foreground" : "text-muted-foreground"}>New MPIN</span>
        <span className="mx-1">→</span>
        <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", step === "confirm" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>2</span>
        <span className={step === "confirm" ? "font-medium text-foreground" : "text-muted-foreground"}>Confirm MPIN</span>
      </div>

      {/* Step 1 — enter new PIN */}
      {step === "set" && (
        <div className="space-y-4">
          <PinInputRow
            label={hasMpin ? "Enter new MPIN" : "Enter 6-digit MPIN"}
            value={pin}
            onChange={handlePinChange}
            show={show}
          />
          <div className="flex items-center justify-between">
            {showToggle}
            <p className="text-xs text-muted-foreground">{pin.replace(/\s/g,"").length}/6 digits entered</p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="button"
            onClick={handleNext}
            disabled={pin.replace(/\s/g,"").length < PIN_LENGTH}
            className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2 — confirm PIN */}
      {step === "confirm" && (
        <div className="space-y-4">
          <PinInputRow
            label="Re-enter MPIN to confirm"
            value={confirmPin}
            onChange={handleConfirmChange}
            show={show}
            disabled={saving}
          />
          <div className="flex items-center justify-between">
            {showToggle}
            <p className="text-xs text-muted-foreground">{confirmPin.replace(/\s/g,"").length}/6 digits entered</p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep("set"); setPin(""); setConfirmPin(""); setError(null) }}
              className="h-10 flex-1 rounded-xl border border-border bg-secondary text-sm font-medium text-foreground hover:bg-muted transition"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirmPin.replace(/\s/g,"").length < PIN_LENGTH || saving}
              className="h-10 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
            >
              {saving ? "Saving…" : "Set MPIN"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
