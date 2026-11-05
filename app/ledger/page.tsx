import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Ledger } from "@/components/dashboard/ledger"
import { TransactionForm } from "@/components/dashboard/transaction-form"

export default function LedgerPage() {
  return (
    <DashboardShell
      title="P2P Ledger"
      subtitle="Your complete, stateful transaction history."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Ledger />
        </div>
        <div className="lg:col-span-1">
          <TransactionForm />
        </div>
      </div>
    </DashboardShell>
  )
}
