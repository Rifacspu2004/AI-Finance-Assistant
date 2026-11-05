import Link from "next/link"
import { Home, AlertTriangle } from "lucide-react"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground">404</h1>
      <p className="mt-2 text-lg font-semibold text-foreground">Page not found</p>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </Link>
    </main>
  )
}
