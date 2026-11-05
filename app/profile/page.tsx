"use client"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ProfileForm } from "@/components/dashboard/profile-form"

export default function ProfilePage() {
  return (
    <DashboardShell
      title="Update Profile"
      subtitle="Manage your personal, contact, and banking information."
    >
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-8">
          <ProfileForm />
        </div>
      </div>
    </DashboardShell>
  )
}