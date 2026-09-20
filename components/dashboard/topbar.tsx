// File: components/dashboard/topbar.tsx
"use client"

import { useState } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Search, Bell, Plus, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProfileModal } from "@/components/dashboard/profile-modal"

export function Topbar({
  title,
  subtitle,
  onSend,
}: {
  title: string
  subtitle: string
  onSend: () => void
}) {
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      document.cookie = "dev-bypass=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
      document.cookie = "firebase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
      router.refresh()
      router.push("/login")
    } catch (err: any) {
      console.error("Logout Error:", err.message)
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border bg-background/70 px-5 py-5 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <h1 className="text-balance font-serif text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search people, transactions…"
              aria-label="Search"
              className="h-10 w-56 rounded-xl border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-input bg-card text-muted-foreground transition hover:text-foreground cursor-pointer"
          >
            <Bell className="h-4.5 w-4.5" aria-hidden="true" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive" />
          </button>

          <Button onClick={onSend} className="h-10 gap-1.5 rounded-xl font-medium cursor-pointer">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Send money
          </Button>

          {/* Profile Pill opens inline popup modal directly inside dashboard */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2.5 rounded-xl border border-input bg-card py-1.5 pl-1.5 pr-3 transition hover:bg-accent cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              AK
            </div>
            <div className="hidden leading-tight sm:block text-left">
              <p className="text-sm font-semibold text-foreground">Alex Kim</p>
              <p className="text-xs text-muted-foreground">@alexk</p>
            </div>
          </button>

          {/* Log Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-input bg-card text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Embedded Profile Modal Component */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  )
}