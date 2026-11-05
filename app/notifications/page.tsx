import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { NotificationInbox } from "@/components/dashboard/notification-feed"
import { NotificationSettings } from "@/components/dashboard/notification-settings"

export default function NotificationsPage() {
  return (
    <DashboardShell
      title="Notifications"
      subtitle="Live transfer activity, payment requests, ledger summaries, and useful money check-ins."
    >
      <div className="space-y-6">
        <NotificationInbox />
        <NotificationSettings />
      </div>
    </DashboardShell>
  )
}
