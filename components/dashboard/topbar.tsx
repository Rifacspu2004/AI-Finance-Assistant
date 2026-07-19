"use client"

import { Search, Bell, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Topbar({
  title,
  subtitle,
  onSend,
}: {
  title: string
  subtitle: string
  onSend: () => void
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border bg-background/70 px-5 py-5 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:px-8">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground text-balance">
          {title}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search people, transactions…"
            aria-label="Search"
            className="h-10 w-56 rounded-xl border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-input bg-card text-muted-foreground transition hover:text-foreground"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive" />
        </button>

        <Button onClick={onSend} className="h-10 gap-1.5 rounded-xl font-medium">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Send money
        </Button>

        <div className="flex items-center gap-2.5 rounded-xl border border-input bg-card py-1.5 pl-1.5 pr-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            AK
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold text-foreground">Alex Kim</p>
            <p className="text-xs text-muted-foreground">@alexk</p>
          </div>
        </div>
      </div>
    </header>
  )
}
