import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { TransactionForm } from "@/components/dashboard/transaction-form"
import { Ledger } from "@/components/dashboard/ledger"

export default function SendPage() {
  return (
    <DashboardShell
      title="Send & Request"
      subtitle="Move money across your P2P ledger instantly."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <TransactionForm />
        <Ledger />
      </div>
    </DashboardShell>
  )
}
