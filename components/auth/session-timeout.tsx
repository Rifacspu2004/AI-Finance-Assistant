"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import {
  AUTH_LOGIN_PENDING_KEY,
  IDLE_SESSION_TIMEOUT_MS,
  SESSION_ACTIVITY_COOKIE,
  SESSION_ACTIVITY_STORAGE_PREFIX,
} from "@/lib/auth-session"

export function SessionTimeout() {
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef(0)
  const userIdRef = useRef<string | null>(null)
  const expiredRef = useRef(false)

  useEffect(() => {
    const clearTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    const writeActivityCookie = () => {
      document.cookie = `${SESSION_ACTIVITY_COOKIE}=1; path=/; max-age=${Math.floor(IDLE_SESSION_TIMEOUT_MS / 1000)}; SameSite=Lax`
    }

    const removeActivityCookie = () => {
      document.cookie = `${SESSION_ACTIVITY_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
      document.cookie = "firebase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax"
    }

    const expireSession = () => {
      if (expiredRef.current) return
      expiredRef.current = true
      clearTimer()
      removeActivityCookie()

      signOut(auth)
        .catch((error: unknown) => {
          console.error("Could not end the inactive session:", error)
        })
        .finally(() => router.replace("/login"))
    }

    const scheduleExpiry = () => {
      clearTimer()
      const remaining = IDLE_SESSION_TIMEOUT_MS - (Date.now() - lastActivityRef.current)
      timeoutRef.current = setTimeout(expireSession, Math.max(remaining, 0))
    }

    const recordActivity = () => {
      if (!userIdRef.current || expiredRef.current) return

      const now = Date.now()
      const idleTime = now - lastActivityRef.current
      if (idleTime >= IDLE_SESSION_TIMEOUT_MS) {
        expireSession()
        return
      }
      if (idleTime < 1000) return

      lastActivityRef.current = now
      localStorage.setItem(
        `${SESSION_ACTIVITY_STORAGE_PREFIX}${userIdRef.current}`,
        String(lastActivityRef.current)
      )
      writeActivityCookie()
      scheduleExpiry()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && userIdRef.current) {
        recordActivity()
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        clearTimer()
        if (userIdRef.current) {
          localStorage.removeItem(`${SESSION_ACTIVITY_STORAGE_PREFIX}${userIdRef.current}`)
        }
        userIdRef.current = null
        lastActivityRef.current = 0
        expiredRef.current = false
        return
      }

      if (userIdRef.current === user.uid && timeoutRef.current) return

      clearTimer()
      userIdRef.current = user.uid
      expiredRef.current = false
      const storageKey = `${SESSION_ACTIVITY_STORAGE_PREFIX}${user.uid}`
      const loginPendingAt = Number(sessionStorage.getItem(AUTH_LOGIN_PENDING_KEY))
      const loginPending =
        Number.isFinite(loginPendingAt) && Date.now() - loginPendingAt < 60_000
      const storedActivity = Number(localStorage.getItem(storageKey))

      if (!loginPending && storedActivity && Date.now() - storedActivity >= IDLE_SESSION_TIMEOUT_MS) {
        expireSession()
        return
      }

      sessionStorage.removeItem(AUTH_LOGIN_PENDING_KEY)
      lastActivityRef.current =
        !loginPending && Number.isFinite(storedActivity) && storedActivity > 0
          ? storedActivity
          : Date.now()
      localStorage.setItem(storageKey, String(lastActivityRef.current))
      writeActivityCookie()
      scheduleExpiry()
    })

    const handleStorage = (event: StorageEvent) => {
      if (!userIdRef.current || event.key !== `${SESSION_ACTIVITY_STORAGE_PREFIX}${userIdRef.current}`) return
      const activity = Number(event.newValue)
      if (Number.isFinite(activity) && activity > lastActivityRef.current) {
        lastActivityRef.current = activity
        writeActivityCookie()
        scheduleExpiry()
      }
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ]
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true })
    })
    window.addEventListener("storage", handleStorage)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearTimer()
      unsubscribe()
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity)
      })
      window.removeEventListener("storage", handleStorage)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [router])

  return null
}
