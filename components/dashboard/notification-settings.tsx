"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

type Setting = { id: string; label: string; desc: string; on: boolean }

const initial: Setting[] = [
  { id: "p2p", label: "P2P transfers", desc: "When you send or receive money", on: true },
  { id: "budget", label: "Budget alerts", desc: "Warn me before a category is overspent", on: true },
  { id: "ai", label: "AI insights", desc: "Weekly smart savings suggestions", on: true },
  { id: "invest", label: "Market moves", desc: "Big swings in your holdings", on: false },
  { id: "digest", label: "Monthly digest", desc: "Email summary of your ledger", on: false },
]

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform",
          on ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

export function NotificationSettings() {
  const [settings, setSettings] = useState(initial)

  function toggle(id: string) {
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, on: !s.on } : s)))
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-serif text-lg font-bold text-card-foreground">Notifications</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Choose what Aeris pings you about</p>

      <ul className="mt-4 divide-y divide-border">
        {settings.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-card-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
            <Toggle on={s.on} onClick={() => toggle(s.id)} label={s.label} />
          </li>
        ))}
      </ul>
    </section>
  )
}
