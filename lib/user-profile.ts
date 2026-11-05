// File: lib/user-profile.ts

import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"

export interface UserBankProfile {
  fullName: string
  email?: string
  kycStatus?: string

  dateOfBirth: string
  gender: string
  phoneNumber: string
  nationalId: string

  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string

  employmentStatus: string
  annualIncome: string
  monthlyIncome: string
  sourceOfFunds: string
  accountType: "checking" | "savings" | "investment"
  walletBalance?: number
  investedBalance?: number

  mpinHash?: string // SHA-256 hash of the 6-digit MPIN

  updatedAt?: string
}

const LOCAL_STORAGE_KEY_PREFIX = "aeris_profile_"
const memoryCache = new Map<string, UserBankProfile>()

function getLocalProfile(userId: string): UserBankProfile | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`)
    return raw ? (JSON.parse(raw) as UserBankProfile) : null
  } catch {
    return null
  }
}

function saveLocalProfile(userId: string, data: UserBankProfile): void {
  memoryCache.set(userId, data)
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data))
  } catch {}
}

export async function updateUserProfile(
  userId: string,
  data: UserBankProfile
): Promise<void> {
  const profileWithDate: UserBankProfile = {
    ...data,
    updatedAt: new Date().toISOString(),
  }

  // 1. Immediately cache in memory and localStorage (instant 0ms)
  saveLocalProfile(userId, profileWithDate)

  // 2. Persist to Firestore
  const userRef = doc(db, "users", userId)
  await setDoc(userRef, profileWithDate, { merge: true })
}

export async function getUserProfile(
  userId: string
): Promise<UserBankProfile | null> {
  // 1. Instant return from in-memory cache (< 1ms)
  if (memoryCache.has(userId)) {
    return memoryCache.get(userId)!
  }

  // 2. Instant return from localStorage (< 2ms)
  const cached = getLocalProfile(userId)
  if (cached) {
    memoryCache.set(userId, cached)
    // Refresh in background without blocking rendering
    getDoc(doc(db, "users", userId))
      .then((snap) => {
        if (snap.exists()) {
          const fresh = snap.data() as UserBankProfile
          saveLocalProfile(userId, fresh)
        }
      })
      .catch(() => {})
    return cached
  }

  // 3. Fallback to Firestore network fetch if no cache exists
  try {
    const userRef = doc(db, "users", userId)
    const snap = await getDoc(userRef)

    if (snap.exists()) {
      const data = snap.data() as UserBankProfile
      saveLocalProfile(userId, data)
      return data
    }
    return null
  } catch (err: any) {
    console.warn("Firestore getUserProfile note (using fallback):", err?.message || err)
    return null
  }
}