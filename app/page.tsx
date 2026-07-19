"use client"

import { useRef, useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Topbar } from "@/components/dashboard/topbar"
import { BalanceCard } from "@/components/dashboard/balance-card"
import { StatCards } from "@/components/dashboard/stat-cards"
import { BudgetTracker } from "@/components/dashboard/budget-tracker"
import { TransactionForm } from "@/components/dashboard/transaction-form"
import { Ledger } from "@/components/dashboard/ledger"
import { InvestmentPortfolio } from "@/components/dashboard/investment-portfolio"
import { NotificationSettings } from "@/components/dashboard/notification-settings"
import { MobileNav } from "@/components/dashboard/mobile-nav"

const meta: Record<string, { title: string; subtitle: string }> = {
  overview: { title: "Good morning, Alex", subtitle: "Here's how your money is moving today." },
  send: { title: "Send & Request", subtitle: "Move money across your P2P ledger instantly." },
  budget: { title: "AI Budget", subtitle: "Smart allocation validated against your income." },
  invest: { title: "Investments", subtitle: "Track your holdings and portfolio growth." },
  ledger: { title: "P2P Ledger", subtitle: "Your complete, stateful transaction history." },
  alerts: { title: "Notifications", subtitle: "Control what Aeris pings you about." },
  settings: { title: "Settings", subtitle: "Manage your notifications and preferences." },
}

export default function Page() {
  const [active, setActive] = useState("overview")
  const formRef = useRef<HTMLDivElement>(null)

  function goSend() {
    setActive("send")
  }

  const m = meta[active] ?? meta.overview

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active={active} onSelect={setActive} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={m.title} subtitle={m.subtitle} onSend={goSend} />

        <main className="flex-1 px-5 py-6 pb-24 md:px-8 lg:pb-6">
          {active === "overview" && (
            <div className="space-y-6">
              <StatCards />
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <BalanceCard />
                </div>
                <div className="lg:col-span-2">
                  <BudgetTracker />
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Ledger />
                <InvestmentPortfolio />
              </div>
            </div>
          )}

          {active === "send" && (
            <div ref={formRef} className="grid gap-6 lg:grid-cols-2">
              <TransactionForm />
              <Ledger />
            </div>
          )}

          {active === "budget" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <BudgetTracker />
              </div>
              <div className="lg:col-span-1">
                <BalanceCard />
              </div>
            </div>
          )}

          {active === "invest" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <InvestmentPortfolio />
              </div>
              <div className="lg:col-span-1">
                <BalanceCard />
              </div>
            </div>
          )}

          {active === "ledger" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Ledger />
              </div>
              <div className="lg:col-span-1">
                <TransactionForm />
              </div>
            </div>
          )}

          {(active === "alerts" || active === "settings") && (
            <div className="grid gap-6 lg:grid-cols-2">
              <NotificationSettings />
              <BudgetTracker />
            </div>
          )}
        </main>
      </div>

      <MobileNav active={active} onSelect={setActive} />
    </div>
  )
}
