"use client"

import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Topbar } from "@/components/dashboard/topbar"
import { MonthlyIncomeScheduler } from "@/components/dashboard/monthly-income-scheduler"
// Preserved for future re-enabling:
import { MobileNav } from "@/components/dashboard/mobile-nav"

export function DashboardShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen bg-background">
      <MonthlyIncomeScheduler />
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          subtitle={subtitle}
          onSend={() => router.push("/send")}
        />

        <main className="flex-1 px-6 py-6 lg:px-8">
          {children}
        </main>
      </div>

      {/* MobileNav temporarily disabled for desktop-only mode to maximize rendering speed */}
      {/* <MobileNav /> */}
    </div>
  )
}
