import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import UniversalCalculator from "@/components/dashboard/universal-calculator"

export default function CalculatorPage() {
  return (
    <DashboardShell
      title="Universal Calculator"
      subtitle="Simulate dynamic budget tiers and resource maps instantly."
    >
      <div className="w-full">
        <UniversalCalculator />
      </div>
    </DashboardShell>
  )
}