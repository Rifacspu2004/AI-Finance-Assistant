// File: lib/user-profile.ts
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"

export interface UserBankProfile {
  fullName: string
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
  sourceOfFunds: string
  accountType: "checking" | "savings" | "investment"
  updatedAt: string
}

export async function updateUserProfile(userId: string, data: UserBankProfile) {
  const userRef = doc(db, "users", userId)
  await setDoc(userRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true })
}

export async function getUserProfile(userId: string): Promise<UserBankProfile | null> {
  const userRef = doc(db, "users", userId)
  const snap = await getDoc(userRef)
  return snap.exists() ? (snap.data() as UserBankProfile) : null
}