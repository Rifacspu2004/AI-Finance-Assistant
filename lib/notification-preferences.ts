export type NotificationPreferences = {
  transfers: boolean
  requests: boolean
  budget: boolean
}

const STORAGE_PREFIX = "aeris_notification_preferences_"
const DEFAULT_PREFERENCES: NotificationPreferences = {
  transfers: true,
  requests: true,
  budget: true,
}

export function readNotificationPreferences(userId: string): NotificationPreferences {
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
    if (!saved) return DEFAULT_PREFERENCES
    const value: unknown = JSON.parse(saved)
    if (!value || typeof value !== "object") return DEFAULT_PREFERENCES
    const record = value as Record<string, unknown>
    return {
      transfers: typeof record.transfers === "boolean" ? record.transfers : true,
      requests: typeof record.requests === "boolean" ? record.requests : true,
      budget: typeof record.budget === "boolean" ? record.budget : true,
    }
  } catch (error) {
    console.error("Could not load notification preferences.", error)
    return DEFAULT_PREFERENCES
  }
}

export function saveNotificationPreferences(userId: string, preferences: NotificationPreferences) {
  localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(preferences))
  window.dispatchEvent(new CustomEvent("aeris-notification-preferences-changed", {
    detail: { userId, preferences },
  }))
}
