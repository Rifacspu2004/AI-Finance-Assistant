"use client"

import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  TrendingUp,
  Users,
  Bell,
  Settings,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "send", label: "Send & Request", icon: ArrowLeftRight },
  { id: "budget", label: "AI Budget", icon: PieChart },
  { id: "invest", label: "Investments", icon: TrendingUp },
  { id: "ledger", label: "P2P Ledger", icon: Users },
  { id: "alerts", label: "Notifications", icon: Bell },
]

export function Sidebar({
  active,
  onSelect,
}: {
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-5 lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="font-serif text-lg font-bold tracking-tight text-sidebar-foreground">
          Aeris
        </span>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Primary">
        {nav.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-4 rounded-2xl bg-accent p-4">
        <div className="flex items-center gap-2 text-accent-foreground">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-semibold">Free tier active</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Your permanent free wallet is running on the maximum-efficiency engine.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onSelect("settings")}
        className={cn(
          "mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active === "settings"
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
        Settings
      </button>
    </aside>
  )
}
