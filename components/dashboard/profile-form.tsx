// File: components/dashboard/profile-form.tsx

"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase"
import {
  getUserProfile,
  updateUserProfile,
  UserBankProfile,
} from "@/lib/user-profile"
import { hasMpin } from "@/lib/mpin"
import { MpinSetup } from "@/components/dashboard/mpin-setup"
import { Save, UserRound, ShieldCheck, KeyRound } from "lucide-react"

const emptyProfile: UserBankProfile = {
  fullName: "",
  email: "",
  kycStatus: "pending",

  dateOfBirth: "",
  gender: "prefer_not_to_say",
  phoneNumber: "",
  nationalId: "",

  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",

  employmentStatus: "student",
  annualIncome: "",
  monthlyIncome: "",
  sourceOfFunds: "salary",
  accountType: "checking",

  updatedAt: "",
}

export function ProfileForm({
  onSaved,
}: {
  onSaved?: (profile: UserBankProfile) => void
}) {
  const [userId, setUserId] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mpinSet, setMpinSet] = useState(false)

  const [formData, setFormData] =
    useState<UserBankProfile>(emptyProfile)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true)
      setMessage("")
      setError("")

      if (!user) {
        setUserId(null)
        setAuthEmail("")
        setLoading(false)
        return
      }

      setUserId(user.uid)
      setAuthEmail(user.email ?? "")

      // Check if MPIN already set
      hasMpin(user.uid).then(setMpinSet).catch(() => {})

      try {
        const existingProfile = await getUserProfile(user.uid)

        if (existingProfile) {
          setFormData({
            ...emptyProfile,
            ...existingProfile,
            fullName: existingProfile.fullName || user.displayName || "",
            email: user.email ?? existingProfile.email ?? "",
          })
        } else {
          setFormData({
            ...emptyProfile,
            fullName: user.displayName ?? "",
            email: user.email ?? "",
          })
        }
      } catch (err: any) {
        console.warn("Could not load profile from Firestore:", err?.message || err)
        setFormData({
          ...emptyProfile,
          fullName: user.displayName ?? "",
          email: user.email ?? "",
        })
        if (
          err?.code === "permission-denied" ||
          err?.message?.includes("Missing or insufficient permissions")
        ) {
          setError("Cloud sync note: Firestore Security Rules in Firebase Console need to allow access to the 'users' collection.")
        }
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target

    setFormData((previous) => {
      const updated: any = { ...previous, [name]: value }
      // Auto-sync: when annual changes → compute monthly; when monthly changes → compute annual
      if (name === "annualIncome" && value) {
        const annual = parseFloat(value)
        if (!isNaN(annual)) updated.monthlyIncome = (annual / 12).toFixed(2)
      }
      if (name === "monthlyIncome" && value) {
        const monthly = parseFloat(value)
        if (!isNaN(monthly)) updated.annualIncome = (monthly * 12).toFixed(2)
      }
      return updated
    })

    setMessage("")
    setError("")
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!userId) {
      setError("You must be signed in to update your profile.")
      return
    }

    if (!formData.fullName.trim()) {
      setError("Full name is required.")
      return
    }

    setSaving(true)
    setMessage("")
    setError("")

    const updatedProfile: UserBankProfile = {
      ...formData,
      fullName: formData.fullName.trim(),
      email: authEmail,
      updatedAt: new Date().toISOString(),
    }

    try {
      // 1. Keep Firebase Authentication display name synchronized first
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: updatedProfile.fullName,
          })
        } catch (authErr) {
          console.warn("Auth displayName update warning:", authErr)
        }
      }

      // 2. Save profile information to Firestore (and local cache)
      try {
        await updateUserProfile(userId, updatedProfile)
        setFormData(updatedProfile)
        setMessage("Profile updated successfully.")
      } catch (firestoreErr: any) {
        console.warn("Firestore save warning:", firestoreErr)
        setFormData(updatedProfile)
        if (
          firestoreErr?.code === "permission-denied" ||
          firestoreErr?.message?.includes("Missing or insufficient permissions")
        ) {
          setMessage(
            "Profile saved locally. Note: Cloud sync is blocked by Firestore Security Rules. Please update rules in Firebase Console to enable cloud persistence."
          )
        } else {
          setMessage("Profile saved locally (offline / cloud sync pending).")
        }
      }

      onSaved?.(updatedProfile)
    } catch (err) {
      console.error("Error updating profile:", err)

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update profile."
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading your profile...
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-medium text-foreground">
          You are not signed in.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign in to view and update your profile.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Profile Header */}
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <UserRound className="h-7 w-7" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Profile Information
          </h2>

          <p className="text-sm text-muted-foreground">
            Manage your personal and financial profile information.
          </p>
        </div>
      </div>

      {/* Account Information */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Account Information
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Your authentication identity and account status.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Email
            </label>

            <input
              type="email"
              value={formData.email || authEmail}
              disabled
              className="mt-1 w-full rounded-xl border border-input bg-muted p-3 text-sm text-muted-foreground"
            />

            <p className="mt-1 text-[11px] text-muted-foreground">
              Email is managed by Firebase Authentication.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              KYC Status
            </label>

            <div className="mt-1 flex items-center gap-2 rounded-xl border border-input bg-muted p-3">
              <ShieldCheck className="h-4 w-4 text-primary" />

              <span className="text-sm capitalize text-foreground">
                {(formData.kycStatus || "pending").replaceAll("_", " ")}
              </span>
            </div>

            <p className="mt-1 text-[11px] text-muted-foreground">
              KYC status is controlled by the system.
            </p>
          </div>
        </div>
      </section>

      {/* ── MPIN Setup (after Account Info) ── */}
      <section className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {mpinSet ? "Change MPIN" : "Set Up MPIN"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {mpinSet
                ? "Your MPIN is set. You can change it below."
                : "Set a 6-digit MPIN — required before you can send or approve payments."}
            </p>
          </div>
        </div>

        {userId && (
          <MpinSetup
            userId={userId}
            hasMpin={mpinSet}
            onSaved={() => setMpinSet(true)}
          />
        )}
      </section>

      {/* Personal Information */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Personal Information
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Update your basic personal details.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Full Name
            </label>

            <input
              required
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Date of Birth
            </label>

            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Gender
            </label>

            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="prefer_not_to_say">
                Prefer not to say
              </option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Phone Number
            </label>

            <input
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Enter phone number"
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              National ID / Passport
            </label>

            <input
              name="nationalId"
              value={formData.nationalId}
              onChange={handleChange}
              placeholder="Enter identification number"
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Residential Address
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Keep your address information up to date.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              Address Line 1
            </label>

            <input
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleChange}
              placeholder="Street / building / house"
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              Address Line 2
            </label>

            <input
              name="addressLine2"
              value={formData.addressLine2 || ""}
              onChange={handleChange}
              placeholder="Apartment / area / landmark"
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              City
            </label>

            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              State / Province
            </label>

            <input
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="State"
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Postal Code
            </label>

            <input
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="Postal code"
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Country
            </label>

            <input
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Country"
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
      </section>

      {/* Financial Information */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Financial & Employment Details
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Information used for your financial profile.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Employment Status
            </label>

            <select
              name="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="student">Student</option>
              <option value="employed">Employed</option>
              <option value="self_employed">
                Self-Employed
              </option>
              <option value="unemployed">Unemployed</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Annual Income ($)
            </label>
            <input
              type="number"
              min="0"
              name="annualIncome"
              value={formData.annualIncome}
              onChange={handleChange}
              placeholder="e.g. 36000"
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Updates monthly income automatically.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Monthly Income ($)
            </label>
            <input
              type="number"
              min="0"
              name="monthlyIncome"
              value={formData.monthlyIncome}
              onChange={handleChange}
              placeholder="e.g. 3000"
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Updates annual income automatically. Used for AI budget plan.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Source of Funds
            </label>

            <select
              name="sourceOfFunds"
              value={formData.sourceOfFunds}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="salary">Salary</option>
              <option value="business">Business</option>
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
              <option value="family">Family Support</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Account Type
            </label>

            <select
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
            </select>
          </div>
        </div>
      </section>

      {/* Status */}
      {message && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end border-t border-border pt-6">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />

          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  )
}