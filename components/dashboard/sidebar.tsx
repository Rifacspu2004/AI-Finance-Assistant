// File: components/dashboard/sidebar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Calculator,
  TrendingUp,
  Receipt,
  Bell,
  User,
} from "lucide-react"

const navItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Send & Request", href: "/send", icon: ArrowLeftRight },
  { name: "AI Budget", href: "/budget", icon: PieChart },
  { name: "Universal Calculator", href: "/calculator", icon: Calculator },
  { name: "Investments", href: "/investments", icon: TrendingUp },
  { name: "P2P Ledger", href: "/ledger", icon: Receipt },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Update Profile", href: "/profile", icon: User },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-card min-h-screen p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 px-3 py-4">
          <span className="font-serif text-xl font-bold text-foreground">Aeris</span>
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}