// File: components/dashboard/profile-modal.tsx
"use client"

import { useState, useEffect } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { updateUserProfile, getUserProfile, UserBankProfile } from "@/lib/user-profile"
import { X } from "lucide-react"

export function ProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<UserBankProfile>({
    fullName: "",
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
    employmentStatus: "employed",
    annualIncome: "",
    sourceOfFunds: "salary",
    accountType: "checking",
    updatedAt: "",
  })

  useEffect(() => {
    if (!isOpen) return
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        const existingData = await getUserProfile(user.uid)
        if (existingData) setFormData(existingData)
      } else {
        setUserId("dev-user-id")
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [isOpen])

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    try {
      await updateUserProfile(userId, formData)
      alert("Bank Profile updated successfully!")
      onClose()
    } catch (err: any) {
      console.error("Error updating profile:", err)
      alert("Failed to update profile: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-background p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-foreground">KYC & Banking Profile</h2>
            <p className="text-xs text-muted-foreground">Complete regulatory identity & financial details.</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading bank records...</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Personal Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal Information</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Legal Full Name</label>
                  <input
                    required
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Date of Birth</label>
                  <input
                    required
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Phone Number</label>
                  <input
                    required
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">National ID / SSN / Passport</label>
                  <input
                    required
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Residential Address</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-muted-foreground">Address Line 1</label>
                  <input
                    required
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">City</label>
                  <input
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">State / Province</label>
                  <input
                    required
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Postal Code</label>
                  <input
                    required
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Country</label>
                  <input
                    required
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Financial Info */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial & Employment Details</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Employment Status</label>
                  <select
                    name="employmentStatus"
                    value={formData.employmentStatus}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground"
                  >
                    <option value="employed">Employed</option>
                    <option value="self_employed">Self-Employed</option>
                    <option value="student">Student</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Estimated Annual Income ($)</label>
                  <input
                    required
                    type="number"
                    name="annualIncome"
                    value={formData.annualIncome}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving to Firebase..." : "Update Profile"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}