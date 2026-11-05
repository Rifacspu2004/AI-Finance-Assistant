// File: components/dashboard/profile-modal.tsx

"use client"

import { X } from "lucide-react"
import { ProfileForm } from "@/components/dashboard/profile-form"
import { UserBankProfile } from "@/lib/user-profile"

export function ProfileModal({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  onSaved?: (profile: UserBankProfile) => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative my-8 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-foreground">
              Update Profile
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Manage your personal, address, and financial information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ProfileForm
          onSaved={(profile) => {
            onSaved?.(profile)
            onClose()
          }}
        />
      </div>
    </div>
  )
}