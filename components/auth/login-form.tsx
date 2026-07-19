"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Mail, Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Mode = "signin" | "signup"

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("signin")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(true)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Simulated auth — wire to a real backend when ready.
    setTimeout(() => setLoading(false), 1400)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground text-balance">
          {mode === "signin" ? "Welcome back" : "Create your wallet"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          {mode === "signin"
            ? "Sign in to your Aeris financial wallet to keep your money moving."
            : "Start your permanent free-tier AI wallet in under a minute."}
        </p>
      </div>

      {/* Mode toggle */}
      <div
        role="tablist"
        aria-label="Authentication mode"
        className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
      >
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-lg py-2 text-sm font-medium transition-colors",
              mode === m
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <Field label="Full name" htmlFor="name">
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Alex Morgan"
                className={inputClass}
              />
            </div>
          </Field>
        )}

        <Field label="Email address" htmlFor="email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          action={
            mode === "signin" ? (
              <Link
                href="#"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            ) : undefined
          }
        >
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              className={cn(inputClass, "pr-11")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
              ) : (
                <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
              )}
            </button>
          </div>
        </Field>

        {mode === "signin" && (
          <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary accent-primary"
            />
            Keep me signed in
          </label>
        )}

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {loading
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          or continue with
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" type="button" className="w-full bg-card">
          <GoogleIcon />
          Google
        </Button>
        <Button variant="outline" type="button" className="w-full bg-card">
          <AppleIcon />
          Apple
        </Button>
      </div>

      <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground text-pretty">
        By continuing you agree to Aeris&apos;{" "}
        <Link href="#" className="font-medium text-primary hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="#" className="font-medium text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}

const inputClass =
  "w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-3 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"

function Field({
  label,
  htmlFor,
  action,
  children,
}: {
  label: string
  htmlFor: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg className="h-[18px] w-[18px] fill-foreground" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.36 12.66c-.02-2.16 1.76-3.2 1.84-3.25-1-1.47-2.56-1.67-3.11-1.69-1.32-.13-2.58.78-3.25.78-.67 0-1.71-.76-2.81-.74-1.45.02-2.78.84-3.53 2.14-1.5 2.61-.38 6.47 1.08 8.59.71 1.04 1.56 2.2 2.67 2.16 1.07-.04 1.48-.69 2.77-.69 1.29 0 1.66.69 2.79.67 1.15-.02 1.88-1.05 2.59-2.09.81-1.2 1.15-2.36 1.17-2.42-.03-.01-2.24-.86-2.26-3.41ZM14.3 6.25c.59-.72.99-1.71.88-2.71-.85.03-1.88.57-2.49 1.28-.55.63-1.03 1.65-.9 2.62.95.07 1.92-.48 2.51-1.19Z" />
    </svg>
  )
}
