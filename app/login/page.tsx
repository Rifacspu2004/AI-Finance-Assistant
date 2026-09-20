import Link from "next/link"
import { Sparkles, ShieldCheck, TrendingUp, Users, ArrowRight } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-background">
      {/* Brand panel */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary-foreground/10" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-primary-foreground/5" aria-hidden="true" />

        <Link href="/" className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="font-serif text-lg font-bold tracking-tight">Aeris</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="font-serif text-4xl font-bold leading-tight tracking-tight text-balance">
            Your money, intelligently in motion.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/80 text-pretty">
            A permanent free-tier AI wallet with a stateful P2P ledger, smart budgeting,
            and investment tracking — all in one place.
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            <Feature icon={ShieldCheck} title="Bank-grade security" desc="Encrypted, permission-scoped, and always in your control." />
            <Feature icon={Users} title="Stateful P2P ledger" desc="Send, request, and settle with a full transaction history." />
            <Feature icon={TrendingUp} title="AI budgeting & investing" desc="Smart allocation validated against your income in real time." />
          </ul>
        </div>

        <p className="relative text-sm text-primary-foreground/70">
          Trusted by early adopters managing their everyday finances.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex w-full flex-1 flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="mb-10 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="font-serif text-lg font-bold tracking-tight text-foreground">Aeris</span>
        </div>

        {/* Primary UI: Maintains native login/registration flows */}
        <LoginForm />

        {/* Alternate Route: Bypasses failed auth block */}
        <div className="mt-6 flex w-full max-w-[350px] flex-col items-center gap-2 pt-4">
          <div className="relative flex w-full items-center py-2">
            <div className="grow border-t border-muted" />
            <span className="mx-2 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Bypass Route</span>
            <div className="grow border-t border-muted" />
          </div>
          <Link 
            href="/dashboard" 
            className="flex w-full items-center justify-center gap-2 rounded-md bg-secondary/50 px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary border border-border"
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  desc: string
}) {
  return (
    <li className="flex items-start gap-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
        <Icon className="h-5 w-5" aria-hidden={true} />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-primary-foreground/75">{desc}</p>
      </div>
    </li>
  )
}