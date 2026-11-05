import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { BudgetTracker } from "@/components/dashboard/budget-tracker"

export default function BudgetPage() {
  return (
    <DashboardShell
      title="AI Budget"
      subtitle="Your personalised financial plan, powered by Aeris AI."
    >
      <div className="mx-auto w-full max-w-4xl">
        <BudgetTracker />
      </div>
    </DashboardShell>
  )
}
