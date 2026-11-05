"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ArrowLeftRight, PieChart, TrendingUp, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/send", label: "Send", icon: ArrowLeftRight },
  { href: "/budget", label: "Budget", icon: PieChart },
  { href: "/investments", label: "Invest", icon: TrendingUp },
  { href: "/notifications", label: "Alerts", icon: Bell },
]

export function MobileNav({
  active,
  onSelect,
}: {
  active?: string
  onSelect?: (id: string) => void
}) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-card/95 px-2 py-2 backdrop-blur lg:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon
        const isActive = onSelect
          ? active === (item.href === "/" ? "overview" : item.href.replace("/", ""))
          : pathname === item.href

        if (onSelect) {
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => onSelect(item.href === "/" ? "overview" : item.href.replace("/", ""))}
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
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
