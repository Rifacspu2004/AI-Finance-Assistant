"use client"

import { LayoutDashboard, ArrowLeftRight, PieChart, TrendingUp, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { id: "overview", label: "Home", icon: LayoutDashboard },
  { id: "send", label: "Send", icon: ArrowLeftRight },
  { id: "budget", label: "Budget", icon: PieChart },
  { id: "invest", label: "Invest", icon: TrendingUp },
  { id: "alerts", label: "Alerts", icon: Bell },
]

export function MobileNav({
  active,
  onSelect,
}: {
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-card/95 px-2 py-2 backdrop-blur lg:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
