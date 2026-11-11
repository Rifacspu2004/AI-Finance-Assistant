// File: components/dashboard/topbar.tsx

"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  LogOut,
  UserRound,
} from "lucide-react"

import { auth } from "@/lib/firebase"
import { SESSION_ACTIVITY_COOKIE, SESSION_ACTIVITY_STORAGE_PREFIX } from "@/lib/auth-session"
import { getUserProfile, UserBankProfile } from "@/lib/user-profile"
import { Button } from "@/components/ui/button"
import { ProfileModal } from "@/components/dashboard/profile-modal"
import { NotificationBellMenu } from "@/components/dashboard/notification-feed"

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
  const [profile, setProfile] = useState<UserBankProfile | null>(null)
  const [authUserName, setAuthUserName] = useState("")
  const [authEmail, setAuthEmail] = useState("")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setProfile(null)
        setAuthUserName("")
        setAuthEmail("")
        return
      }

      setAuthUserName(user.displayName ?? "")
      setAuthEmail(user.email ?? "")

      try {
        const firestoreProfile = await getUserProfile(user.uid)

        if (firestoreProfile) {
          setProfile({
            ...firestoreProfile,
            email: user.email ?? firestoreProfile.email ?? "",
          })
        }
      } catch (error: any) {
        console.warn("Topbar profile note (using Auth display name):", error?.message || error)
      }
    })

    return () => unsubscribe()
  }, [])

  const displayName =
    profile?.fullName ||
    authUserName ||
    "User"

  const displayEmail =
    profile?.email ||
    authEmail ||
    ""

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  const handleLogout = async () => {
    try {
      const userId = auth.currentUser?.uid
      await signOut(auth)

      document.cookie =
        "dev-bypass=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"

      document.cookie =
        "firebase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
      document.cookie =
        `${SESSION_ACTIVITY_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`
      if (userId) {
        localStorage.removeItem(`${SESSION_ACTIVITY_STORAGE_PREFIX}${userId}`)
      }

      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout Error:", error)
    }
  }

  return (
    <>
      <header className="flex flex-row items-center justify-between gap-4 border-b border-border bg-background/70 px-6 py-4 backdrop-blur-sm lg:px-8">
        {/* Page heading */}
        <div>
          <h1 className="text-balance font-serif text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>

          <p className="mt-0.5 text-sm text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <input
              type="search"
              placeholder="Search people, transactions…"
              aria-label="Search"
              className="h-10 w-56 rounded-xl border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {/* Notifications */}
          <NotificationBellMenu />

          {/* Send Money */}
          <Button
            onClick={onSend}
            className="h-10 gap-1.5 rounded-xl font-medium"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Send money
          </Button>

          {/* REAL USER PROFILE */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            aria-label="Open profile"
            className="flex items-center gap-2.5 rounded-xl border border-input bg-card py-1.5 pl-1.5 pr-3 transition hover:bg-accent"
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              {initials}
            </div>

            {/* Name + email */}
            <div className="hidden min-w-0 text-left leading-tight sm:block">
              <p className="max-w-[130px] truncate text-sm font-semibold text-foreground">
                {displayName}
              </p>

              <p className="max-w-[150px] truncate text-xs text-muted-foreground">
                {displayEmail}
              </p>
            </div>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-input bg-card text-muted-foreground transition hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSaved={(updatedProfile) => {
          setProfile(updatedProfile)
          setAuthUserName(updatedProfile.fullName)
        }}
      />
    </>
  )
}