"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { BellRing, CircleHelp, Loader2 } from "lucide-react"
import { auth } from "@/lib/firebase"
import {
  readNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences as Preferences,
} from "@/lib/notification-preferences"
import { cn } from "@/lib/utils"

const settingDetails: Array<{
  id: keyof Preferences
  label: string
  description: string
}> = [
  {
    id: "transfers",
    label: "Money sent and received",
    description: "In-app alert when a completed P2P transfer appears in your ledger.",
  },
  {
    id: "requests",
    label: "Payment requests",
    description: "In-app alerts for sent, received, paid, and declined requests.",
  },
  {
    id: "budget",
    label: "Budget thresholds",
    description: "In-app alert when recorded P2P Costs or Wants reach 80% or exceed the illustrative 50/30 guide. Other spending is not included.",
  },
]

function Toggle({
  on,
  onClick,
  label,
  disabled,
}: {
  on: boolean
  onClick: () => void
  label: string
  disabled: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        on ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform",
          on ? "translate-x-5.5" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

export function NotificationSettings() {
  const [userId, setUserId] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<Preferences>({ transfers: true, requests: true, budget: true })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => onAuthStateChanged(auth, (user) => {
    const nextUserId = user?.uid ?? null
    setUserId(nextUserId)
    setPreferences(nextUserId
      ? readNotificationPreferences(nextUserId)
      : { transfers: true, requests: true, budget: true })
    setLoading(false)
  }, (authError) => {
    console.error("Notification settings could not verify the current user.", authError)
    setError("Your account could not be verified. Refresh the page or sign in again.")
    setLoading(false)
  }), [])

  function toggle(id: keyof Preferences) {
    if (!userId) {
      setError("Sign in to change notification preferences.")
      return
    }
    const next = { ...preferences, [id]: !preferences[id] }
    try {
      saveNotificationPreferences(userId, next)
      setPreferences(next)
      setError(null)
    } catch (saveError) {
      console.error("Could not save notification preferences.", saveError)
      setError("Your preference could not be saved in this browser.")
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BellRing className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-serif text-lg font-bold text-card-foreground">Notification preferences</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Choose which live ledger events appear in your in-app alerts.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {settingDetails.map((setting) => (
            <li key={setting.id} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-semibold text-card-foreground">{setting.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{setting.description}</p>
              </div>
              <Toggle
                on={preferences[setting.id]}
                onClick={() => toggle(setting.id)}
                label={setting.label}
                disabled={!userId}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/70 p-3 text-xs leading-relaxed text-muted-foreground">
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>Preferences are saved in this browser. Alerts update while Aeris is open; mobile push and email delivery are not enabled. Budget and market check-ins are guidance, not background alerts.</p>
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
    </section>
  )
}
