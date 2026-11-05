import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { InvestmentPortfolio } from "@/components/dashboard/investment-portfolio"
import { BalanceCard } from "@/components/dashboard/balance-card"

export default function InvestmentsPage() {
  return (
    <DashboardShell
      title="Investments"
      subtitle="Plan a diversified monthly investment, compare hypothetical outcomes, and understand the risks."
    >
      <div className="space-y-6">
        <InvestmentPortfolio />
        <BalanceCard title="Live Spendable Wallet Card" badgeLabel="Liquid Reserve" />
      </div>
    </DashboardShell>
  )
}
