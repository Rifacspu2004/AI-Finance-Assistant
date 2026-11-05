// lib/mpin.ts
// MPIN is a 6-digit numeric PIN.
// We store a SHA-256 hash of it in the user's Firestore profile — never the raw PIN.

import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"

/** SHA-256 hash a string using the Web Crypto API (browser-native, no package needed). */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/** Save a new MPIN for a user (stores the hash, never the raw PIN). */
export async function setMpin(userId: string, pin: string): Promise<void> {
  if (!/^\d{6}$/.test(pin)) throw new Error("MPIN must be exactly 6 digits.")
  const hash = await sha256(pin)
  const userRef = doc(db, "users", userId)
  await updateDoc(userRef, { mpinHash: hash })
}

/** Check whether a user has set an MPIN. */
export async function hasMpin(userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", userId))
  if (!snap.exists()) return false
  return Boolean((snap.data() as any).mpinHash)
}

/** Verify a PIN against the stored hash. Returns true if correct. */
export async function verifyMpin(userId: string, pin: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", userId))
  if (!snap.exists()) return false
  const stored = (snap.data() as any).mpinHash as string | undefined
  if (!stored) return false
  const entered = await sha256(pin)
  return entered === stored
}
