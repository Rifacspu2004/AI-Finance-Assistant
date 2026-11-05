"use client"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { BalanceCard } from "@/components/dashboard/balance-card"
import { BudgetTracker } from "@/components/dashboard/budget-tracker"
import { InvestmentPortfolio } from "@/components/dashboard/investment-portfolio"
import UniversalCalculator from "@/components/dashboard/universal-calculator"

export default function OverviewPage() {
  return (
    <DashboardShell
      title="Financial Overview"
      subtitle="Here's how your money is moving today."
    >
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <BalanceCard />
          </div>
          <div className="lg:col-span-2">
            <BudgetTracker />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="lg:col-span-1">
            <UniversalCalculator />
          </div>
          <div className="lg:col-span-1">
            <InvestmentPortfolio compact />
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}