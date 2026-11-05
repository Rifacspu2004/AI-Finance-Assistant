"use client"

import { useEffect, useState } from "react"
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeInfo,
  Banknote,
  CheckCircle2,
  Coins,
  ExternalLink,
  Globe2,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react"
import { onAuthStateChanged } from "firebase/auth"
import { doc, onSnapshot } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { UserBankProfile } from "@/lib/user-profile"
import {
  subscribeUserBalance,
  subscribeUserInvestedBalance,
  investFromWallet,
  withdrawInvestedToWallet,
  DEFAULT_STARTING_BALANCE,
  DEFAULT_MONTHLY_INCOME,
} from "@/lib/transactions"
import { hasMpin, verifyMpin } from "@/lib/mpin"
import { BalanceVisibilityModal } from "@/components/dashboard/balance-visibility-modal"

type ExchangeRates = {
  date: string
  rates: {
    EUR: number
    INR: number
  }
}

type MarketQuote = {
  symbol: string
  name: string
  currency: string
  price: number
  changePercent: number
  asOf: string
}

type MarketReview = {
  insight: string
  quotes: MarketQuote[]
  dataAsOf: string
  sourceUrl: string
}

const reviewSections = [
  "CURRENT SNAPSHOT",
  "WHAT THIS MEANS FOR THE PLAN",
  "PRACTICAL NEXT STEPS",
]

function parseReviewSections(insight: string) {
  const sections: Array<{ title: string; body: string }> = []
  const lines = insight.replace(/\r\n?/g, "\n").split("\n")
  let currentTitle = ""
  let content: string[] = []

  const saveSection = () => {
    const body = content.join("\n").replace(/\*\*/g, "").trim()
    if (currentTitle && body) sections.push({ title: currentTitle, body })
  }

  for (const line of lines) {
    const normalized = line.trim().replace(/^#+\s*/, "").replace(/\*\*/g, "").toUpperCase()
    const nextTitle = reviewSections.find((title) => normalized.startsWith(title))
    if (nextTitle) {
      saveSection()
      currentTitle = nextTitle
      content = [line.trim().replace(/^#+\s*/, "").replace(/\*\*/g, "").slice(nextTitle.length).replace(/^[\s:—–-]+/, "")]
    } else {
      content.push(line)
    }
  }
  saveSection()

  return sections.length > 0
    ? sections
    : [{ title: "Aeris AI market review", body: insight.replace(/\*\*/g, "").trim() }]
}

const investmentMix = [
  {
    name: "Global equity index",
    share: 70,
    color: "var(--chart-1)",
    icon: Globe2,
    description:
      "A low-cost, broad-market index fund can spread exposure across many companies and countries. Consider a global all-country index such as MSCI ACWI or FTSE All-World; these are benchmarks, not specific fund endorsements.",
    horizon: "5+ years",
  },
  {
    name: "High-quality bonds",
    share: 20,
    color: "var(--chart-2)",
    icon: ShieldCheck,
    description:
      "A diversified, high-quality bond fund or suitable government securities may reduce portfolio swings. Bond funds can still lose value, and currency exposure matters.",
    horizon: "Match to your goals",
  },
  {
    name: "Optional gold",
    share: 10,
    color: "var(--chart-4)",
    icon: Coins,
    description:
      "Gold is optional and can be volatile; it does not produce income. Keep the allocation modest and compare fees, tax rules, and the risks of the available product.",
    horizon: "Diversifier, not a guarantee",
  },
]

const returnScenarios = [
  { label: "Lower illustration", annualReturn: 0.04, color: "text-chart-2" },
  { label: "Middle illustration", annualReturn: 0.07, color: "text-primary" },
  { label: "Higher illustration", annualReturn: 0.1, color: "text-chart-3" },
]
const projectionYears = [3, 5, 10]

function getMonthlyIncome(profile: UserBankProfile | null) {
  if (!profile) return DEFAULT_MONTHLY_INCOME
  const monthly = Number(profile.monthlyIncome)
  if (Number.isFinite(monthly) && monthly > 0) return monthly
  const annual = Number(profile.annualIncome)
  return Number.isFinite(annual) && annual > 0 ? annual / 12 : DEFAULT_MONTHLY_INCOME
}

function formatAmount(amount: number, currency: "USD" | "EUR" | "INR") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function monthlySipValue(contribution: number, annualReturn: number, years: number) {
  const months = years * 12
  const monthlyRate = (1 + annualReturn) ** (1 / 12) - 1
  if (monthlyRate === 0) return contribution * months
  return contribution * (((1 + monthlyRate) ** months - 1) / monthlyRate)
}

function convertAmount(
  amount: number,
  currency: "USD" | "EUR" | "INR",
  exchangeRates: ExchangeRates | null,
) {
  if (currency === "USD") return amount
  if (!exchangeRates) return null
  return currency === "EUR"
    ? amount * exchangeRates.rates.EUR
    : amount * exchangeRates.rates.INR
}

function CurrencyAmount({
  amount,
  exchangeRates,
  className = "",
}: {
  amount: number
  exchangeRates: ExchangeRates | null
  className?: string
}) {
  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {(["USD", "EUR", "INR"] as const).map((currency) => {
        const converted = convertAmount(amount, currency, exchangeRates)
        return (
          <div key={currency} className="min-w-0 rounded-xl bg-secondary/70 px-2 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{currency}</p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-card-foreground">
              {converted === null ? "—" : formatAmount(converted, currency)}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function formatProjectionAmount(amount: number, exchangeRates: ExchangeRates | null) {
  if (!exchangeRates) return `${formatAmount(amount, "USD")} USD`
  return [
    `${formatAmount(amount, "USD")} USD`,
    `${formatAmount(amount * exchangeRates.rates.EUR, "EUR")} EUR`,
    `${formatAmount(amount * exchangeRates.rates.INR, "INR")} INR`,
  ].join(" · ")
}

function ProjectionTable({
  monthlyInvestment,
  exchangeRates,
}: {
  monthlyInvestment: number
  exchangeRates: ExchangeRates | null
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[610px] text-left text-sm">
        <thead className="bg-secondary/70 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">Illustrative annual return</th>
            <th className="px-4 py-3 font-semibold">Period</th>
            <th className="px-4 py-3 text-right font-semibold">Contributions</th>
            <th className="px-4 py-3 text-right font-semibold">Illustrative value</th>
          </tr>
        </thead>
        <tbody>
          {returnScenarios.flatMap((scenario) =>
            projectionYears.map((years) => {
              const contributed = monthlyInvestment * years * 12
              const projected = monthlySipValue(monthlyInvestment, scenario.annualReturn, years)
              return (
                <tr key={`${scenario.annualReturn}-${years}`} className="border-t border-border">
                  <td className={`px-4 py-3 font-medium ${scenario.color}`}>{scenario.label} ({scenario.annualReturn * 100}%)</td>
                  <td className="px-4 py-3 text-card-foreground">{years} years</td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">{formatProjectionAmount(contributed, exchangeRates)}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-card-foreground">{formatProjectionAmount(projected, exchangeRates)}</td>
                </tr>
              )
            }),
          )}
        </tbody>
      </table>
    </div>
  )
}

export function InvestmentPortfolio({ compact = false }: { compact?: boolean }) {
  const [profile, setProfile] = useState<UserBankProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null)
  const [exchangeRateError, setExchangeRateError] = useState<string | null>(null)
  const [refreshRates, setRefreshRates] = useState(0)
  const [marketReview, setMarketReview] = useState<MarketReview | null>(null)
  const [marketReviewError, setMarketReviewError] = useState<string | null>(null)
  const [loadingMarketReview, setLoadingMarketReview] = useState(false)

  // Wallet & Portfolio Investment State
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState<number>(DEFAULT_STARTING_BALANCE)
  const [investedBalance, setInvestedBalance] = useState<number>(0)
  const [userHasMpin, setUserHasMpin] = useState(false)
  const [balanceVisible, setBalanceVisible] = useState(false)
  const [balanceModalOpen, setBalanceModalOpen] = useState(false)

  const [investModalOpen, setInvestModalOpen] = useState(false)
  const [liquidateModalOpen, setLiquidateModalOpen] = useState(false)
  const [investAmount, setInvestAmount] = useState<string>("")
  const [liquidateAmount, setLiquidateAmount] = useState<string>("")
  const [mpinInput, setMpinInput] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined
    let unsubscribeBalance: (() => void) | undefined
    let unsubscribeInvested: (() => void) | undefined

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile?.()
      unsubscribeBalance?.()
      unsubscribeInvested?.()
      unsubscribeProfile = undefined
      unsubscribeBalance = undefined
      unsubscribeInvested = undefined

      if (!user) {
        setCurrentUserId(null)
        setProfile(null)
        setProfileError(null)
        setLoadingProfile(false)
        setWalletBalance(DEFAULT_STARTING_BALANCE)
        setInvestedBalance(0)
        setUserHasMpin(false)
        return
      }

      setCurrentUserId(user.uid)
      setLoadingProfile(true)
      setProfileError(null)

      unsubscribeBalance = subscribeUserBalance(user.uid, (bal) => setWalletBalance(bal))
      unsubscribeInvested = subscribeUserInvestedBalance(user.uid, (inv) => setInvestedBalance(inv))
      hasMpin(user.uid).then(setUserHasMpin).catch(() => {})

      unsubscribeProfile = onSnapshot(
        doc(db, "users", user.uid),
        (snapshot) => {
          setProfile(snapshot.exists() ? (snapshot.data() as UserBankProfile) : null)
          setLoadingProfile(false)
        },
        (error) => {
          console.error("Investment planner could not load the user profile.", error)
          setProfileError("Your income profile could not be loaded. Refresh the page or check your connection.")
          setLoadingProfile(false)
        },
      )
    }, (error) => {
      console.error("Investment planner could not verify the signed-in user.", error)
      setProfileError("Your account could not be verified. Refresh the page or sign in again.")
      setLoadingProfile(false)
    })

    return () => {
      unsubscribeAuth()
      unsubscribeProfile?.()
      unsubscribeBalance?.()
      unsubscribeInvested?.()
    }
  }, [])

  async function handleInvest(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId) return
    const num = parseFloat(investAmount)
    if (!num || num <= 0 || isNaN(num)) {
      setActionError("Please enter a valid investment amount.")
      return
    }
    if (num > walletBalance) {
      setActionError(`Amount exceeds available wallet balance ($${walletBalance.toFixed(2)}).`)
      return
    }
    if (userHasMpin) {
      if (!mpinInput || mpinInput.length !== 6) {
        setActionError("Please enter your 6-digit MPIN.")
        return
      }
      const valid = await verifyMpin(currentUserId, mpinInput)
      if (!valid) {
        setActionError("Incorrect MPIN. Please try again.")
        return
      }
    }

    setActionLoading(true)
    setActionError(null)
    try {
      await investFromWallet(currentUserId, num)
      setActionSuccess(`Successfully allocated $${num.toFixed(2)} from your wallet into your portfolio!`)
      setInvestAmount("")
      setMpinInput("")
      setTimeout(() => {
        setInvestModalOpen(false)
        setActionSuccess(null)
      }, 1500)
    } catch (err: any) {
      setActionError(err?.message || "Investment failed.")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleLiquidate(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId) return
    const num = parseFloat(liquidateAmount)
    if (!num || num <= 0 || isNaN(num)) {
      setActionError("Please enter a valid amount to liquidate.")
      return
    }
    if (num > investedBalance) {
      setActionError(`Amount exceeds current invested portfolio ($${investedBalance.toFixed(2)}).`)
      return
    }
    if (userHasMpin) {
      if (!mpinInput || mpinInput.length !== 6) {
        setActionError("Please enter your 6-digit MPIN.")
        return
      }
      const valid = await verifyMpin(currentUserId, mpinInput)
      if (!valid) {
        setActionError("Incorrect MPIN. Please try again.")
        return
      }
    }

    setActionLoading(true)
    setActionError(null)
    try {
      await withdrawInvestedToWallet(currentUserId, num)
      setActionSuccess(`Successfully liquidated $${num.toFixed(2)} back into your spendable wallet!`)
      setLiquidateAmount("")
      setMpinInput("")
      setTimeout(() => {
        setLiquidateModalOpen(false)
        setActionSuccess(null)
      }, 1500)
    } catch (err: any) {
      setActionError(err?.message || "Withdrawal failed.")
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    setExchangeRateError(null)

    async function loadRates() {
      try {
        const response = await fetch(
          "https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR%2CINR",
          { signal: controller.signal, cache: "no-store" },
        )
        if (!response.ok) throw new Error(`Exchange-rate service returned ${response.status}.`)

        const data = await response.json() as ExchangeRates
        if (
          !data.date ||
          !Number.isFinite(data.rates?.EUR) ||
          !Number.isFinite(data.rates?.INR) ||
          data.rates.EUR <= 0 ||
          data.rates.INR <= 0
        ) {
          throw new Error("Exchange-rate service returned incomplete currency data.")
        }
        setExchangeRates(data)
      } catch (error) {
        if (controller.signal.aborted) return
        setExchangeRateError(error instanceof Error ? error.message : "Could not load exchange rates.")
      }
    }

    void loadRates()
    return () => controller.abort()
  }, [refreshRates])

  const monthlyIncome = getMonthlyIncome(profile)
  const monthlySavings = monthlyIncome * 0.2
  const monthlyInvestment = monthlySavings * 0.7
  const monthlyReserve = monthlySavings - monthlyInvestment

  useEffect(() => {
    setMarketReview(null)
    setMarketReviewError(null)
  }, [monthlyIncome, monthlyInvestment, monthlyReserve])

  async function generateMarketReview() {
    setLoadingMarketReview(true)
    setMarketReview(null)
    setMarketReviewError(null)
    try {
      const response = await fetch("/api/investment-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyIncome }),
      })
      const data = await response.json()
      if (!response.ok || typeof data.insight !== "string" || !Array.isArray(data.quotes)) {
        throw new Error(typeof data.error === "string" ? data.error : "The current-market review could not be generated.")
      }
      setMarketReview(data as MarketReview)
    } catch (error) {
      setMarketReviewError(error instanceof Error ? error.message : "Unable to generate the market review.")
    } finally {
      setLoadingMarketReview(false)
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-3xl border border-border bg-card">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Loading income profile" />
      </div>
    )
  }

  if (monthlyIncome <= 0) {
    return (
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-card-foreground">Start your investment plan</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {profileError ?? "Add monthly or annual income to your profile to calculate a savings-based SIP plan. No investment amount or returns are assumed."}
            </p>
            <a href="/profile" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Update income <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    )
  }

  if (compact) {
    return (
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-card-foreground">Monthly investment plan</h2>
              <p className="text-xs text-muted-foreground">70% of your savings allocation</p>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            70/20/10 Split
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-secondary/50 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Proposed Monthly</p>
            <p className="mt-1 font-mono text-lg font-bold text-card-foreground">
              {formatAmount(monthlyInvestment, "USD")}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/50 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Active Invested</p>
            <p className="mt-1 font-mono text-lg font-bold text-chart-3">
              {formatAmount(investedBalance, "USD")}
            </p>
          </div>
        </div>

        <CurrencyAmount amount={monthlyInvestment} exchangeRates={exchangeRates} className="mt-3" />

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <button
            type="button"
            onClick={() => {
              if (balanceVisible) {
                setBalanceVisible(false)
              } else {
                if (currentUserId) setBalanceModalOpen(true)
                else setBalanceVisible(true)
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-card-foreground transition cursor-pointer"
            title={balanceVisible ? "Hide balance" : "Reveal with MPIN"}
          >
            <span>Liquid Wallet:</span>
            <strong className="font-mono text-card-foreground">
              {balanceVisible ? formatAmount(walletBalance, "USD") : "••••••••"}
            </strong>
            {balanceVisible ? (
              <EyeOff className="h-3 w-3 opacity-70" />
            ) : (
              <Eye className="h-3 w-3 opacity-70" />
            )}
          </button>
          <a href="/investments" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Manage Portfolio <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
    )
  }

  const numInvestAmount = parseFloat(investAmount) || 0
  const numLiquidateAmount = parseFloat(liquidateAmount) || 0

  return (
    <div className="space-y-6">
      {/* ── Investment Capital & Liquid Wallet Hub ── */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-card-foreground">Portfolio Capital & Liquid Runway</h2>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  Live Firestore Sync
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Deploy spendable wallet funds into your diversified portfolio or liquidate back anytime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (balanceVisible) {
                  setBalanceVisible(false)
                } else {
                  if (currentUserId) setBalanceModalOpen(true)
                  else setBalanceVisible(true)
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-card-foreground hover:bg-secondary transition cursor-pointer"
            >
              {balanceVisible ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Hide Balances</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Reveal with MPIN</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setInvestModalOpen(true)
                setActionError(null)
                setActionSuccess(null)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition cursor-pointer"
            >
              <Wallet className="h-4 w-4" /> Invest from Wallet
            </button>

            <button
              type="button"
              disabled={investedBalance <= 0}
              onClick={() => {
                setLiquidateModalOpen(true)
                setActionError(null)
                setActionSuccess(null)
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-semibold text-card-foreground hover:bg-secondary transition disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ArrowDownLeft className="h-4 w-4 text-muted-foreground" /> Liquidate
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/80 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Spendable Wallet</span>
              <button
                type="button"
                onClick={() => {
                  if (balanceVisible) setBalanceVisible(false)
                  else if (currentUserId) setBalanceModalOpen(true)
                  else setBalanceVisible(true)
                }}
                className="text-primary hover:opacity-80 transition cursor-pointer"
                title={balanceVisible ? "Hide balance" : "Reveal with MPIN"}
              >
                {balanceVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-card-foreground">
              {balanceVisible ? formatAmount(walletBalance, "USD") : "••••••••"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {balanceVisible ? "Available liquid cash" : "Protected by MPIN"}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/80 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Active Invested</span>
              <Landmark className="h-3.5 w-3.5 text-chart-3" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-chart-3">
              {formatAmount(investedBalance, "USD")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Allocated in 70/20/10 split</p>
          </div>

          <div className="rounded-2xl border border-border bg-background/80 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Combined Worth</span>
              <button
                type="button"
                onClick={() => {
                  if (balanceVisible) setBalanceVisible(false)
                  else if (currentUserId) setBalanceModalOpen(true)
                  else setBalanceVisible(true)
                }}
                className="text-primary hover:opacity-80 transition cursor-pointer"
                title={balanceVisible ? "Hide balance" : "Reveal with MPIN"}
              >
                {balanceVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-card-foreground">
              {balanceVisible ? formatAmount(walletBalance + investedBalance, "USD") : "••••••••"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {balanceVisible ? "Liquid + Invested capital" : "Protected by MPIN"}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/80 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Investment Runway</span>
              <ShieldCheck className="h-3.5 w-3.5 text-chart-2" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-card-foreground">
              {balanceVisible
                ? (monthlyInvestment > 0 ? `${(walletBalance / monthlyInvestment).toFixed(1)} mos` : "—")
                : "••• mos"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {balanceVisible
                ? (walletBalance >= monthlyInvestment ? "Sufficient liquid runway" : "Build emergency cash first")
                : "Reveal with MPIN"}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Globe2 className="h-3.5 w-3.5" /> Global investing • USD / EUR / INR
              </span>
              <h2 className="mt-3 font-serif text-2xl font-bold text-card-foreground">A steady plan beats chasing hot stocks</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This illustrative plan starts with 20% of the income entered in your profile as a savings target, then directs 70% of that target to a diversified monthly investment. It is a planning example—not a universal rule or personalized regulated investment recommendation.
              </p>
            </div>
            <div className="min-w-52 rounded-2xl border border-primary/20 bg-background/80 p-4">
              <p className="text-xs font-medium text-muted-foreground">Proposed monthly investment</p>
              <p className="mt-1 font-mono text-2xl font-bold text-card-foreground">{formatAmount(monthlyInvestment, "USD")}</p>
              <p className="text-xs text-muted-foreground">based on USD income entered</p>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-chart-3">
                <ArrowDownRight className="h-3.5 w-3.5" />
                70% of the 20% savings allocation
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Income entered", amount: monthlyIncome, note: "monthly profile income" },
              { label: "Savings target · 20%", amount: monthlySavings, note: "starting budget assumption" },
              { label: "Keep in reserve · 30%", amount: monthlyReserve, note: "emergency fund / costly debt" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-mono text-lg font-bold text-card-foreground">{formatAmount(item.amount, "USD")}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{item.note}</p>
              </div>
            ))}
          </div>
          <CurrencyAmount amount={monthlyInvestment} exchangeRates={exchangeRates} className="mt-3 max-w-xl" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            {exchangeRates ? (
              <span>Reference conversion rates for 1 USD, dated {exchangeRates.date}. EUR and INR values are estimates.</span>
            ) : (
              <span role={exchangeRateError ? "status" : undefined}>
                {exchangeRateError
                  ? `Currency conversion unavailable: ${exchangeRateError} USD amounts remain available.`
                  : "Loading the latest available reference exchange rates…"}
              </span>
            )}
            <button
              type="button"
              onClick={() => setRefreshRates((value) => value + 1)}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <RefreshCw className="h-3 w-3" /> Refresh rates
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Illustrative allocation</p>
              <h3 className="mt-1 font-serif text-lg font-bold text-card-foreground">Diversify across different risk drivers</h3>
            </div>
            <span className="text-xs text-muted-foreground">Percentages apply to the proposed investment amount</span>
          </div>

          <div className="flex h-3 overflow-hidden rounded-full bg-secondary" aria-label="Investment allocation: 70% global equity, 20% bonds, 10% optional gold">
            {investmentMix.map((asset) => (
              <div key={asset.name} style={{ width: `${asset.share}%`, backgroundColor: asset.color }} title={`${asset.name}: ${asset.share}%`} />
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {investmentMix.map((asset) => {
              const Icon = asset.icon
              const amount = monthlyInvestment * asset.share / 100
              return (
                <article key={asset.name} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary" style={{ color: asset.color }}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-card-foreground">{asset.name}</h4>
                        <p className="text-xs text-muted-foreground">{asset.share}% of proposed investment</p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 font-mono text-lg font-bold text-card-foreground">{formatAmount(amount, "USD")}<span className="text-xs font-medium text-muted-foreground">/mo</span></p>
                  <CurrencyAmount amount={amount} exchangeRates={exchangeRates} className="mt-2" />
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{asset.description}</p>
                  <p className="mt-3 border-t border-border pt-2 text-[11px] font-medium text-primary">Consideration: {asset.horizon}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-sm">
        <div className="flex flex-col gap-4 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Aeris AI • Market-aware review</p>
              <h3 className="mt-1 font-serif text-lg font-bold text-card-foreground">Ground the plan in current market data</h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Fetch recent US, India, Europe, and Japan index snapshots, then ask AI to explain the context for your illustrative monthly plan. The review is educational, not a buy/sell signal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={generateMarketReview}
            disabled={loadingMarketReview}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {loadingMarketReview
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking markets…</>
              : <><Sparkles className="h-4 w-4" /> {marketReview ? "Refresh AI review" : "Generate AI market review"}</>}
          </button>
        </div>

        {loadingMarketReview && (
          <div className="space-y-3 p-5 sm:p-6" aria-live="polite">
            <div className="h-5 w-48 animate-pulse rounded bg-secondary" />
            <div className="h-16 animate-pulse rounded-2xl bg-secondary" />
            <div className="h-16 animate-pulse rounded-2xl bg-secondary" />
          </div>
        )}

        {marketReviewError && !loadingMarketReview && (
          <p role="alert" className="m-5 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive sm:m-6">
            {marketReviewError}
          </p>
        )}

        {marketReview && !loadingMarketReview && (
          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-card-foreground">Market snapshot</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Latest available session • retrieved {new Date(marketReview.dataAsOf).toLocaleString()}
                  </p>
                </div>
                <a
                  href={marketReview.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Source: Yahoo Finance <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {marketReview.quotes.map((quote) => {
                  const positive = quote.changePercent >= 0
                  return (
                    <div key={quote.symbol} className="rounded-2xl border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <a
                            href={`https://finance.yahoo.com/quote/${encodeURIComponent(quote.symbol)}/`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-card-foreground hover:text-primary"
                          >
                            {quote.name} <ExternalLink className="h-3 w-3" />
                          </a>
                          <p className="text-[10px] text-muted-foreground">{quote.symbol} · {quote.currency}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${positive ? "bg-chart-3/10 text-chart-3" : "bg-destructive/10 text-destructive"}`}>
                          {positive ? "+" : ""}{quote.changePercent.toFixed(2)}%
                        </span>
                      </div>
                      <p className="mt-2 font-mono text-base font-bold tabular-nums text-card-foreground">
                        {new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(quote.price)}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Quote time: {new Date(quote.asOf).toLocaleString()}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold text-card-foreground">AI explanation for your plan</h4>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {parseReviewSections(marketReview.insight).map((section) => (
                  <article key={section.title} className="rounded-2xl border border-border bg-background p-4">
                    <h5 className="text-xs font-bold uppercase tracking-wide text-primary">{section.title}</h5>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                  </article>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Index data is supplied by Yahoo Finance and may be delayed or reflect the last market session. Short-term movements do not predict future performance. Verify product prices, fees, and regulations with official providers before investing.
              </p>
            </div>
          </div>
        )}

        {!marketReview && !marketReviewError && !loadingMarketReview && (
          <p className="p-5 text-sm text-muted-foreground sm:px-6">
            Generate a review to fetch recent index data. AI will only receive these retrieved quotes and your displayed monthly plan; without available market data, it will not generate a market-based review.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">What could regular investing look like?</p>
            <h3 className="mt-1 font-serif text-lg font-bold text-card-foreground">SIP scenarios—not a return promise</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              These estimates assume a fixed monthly contribution of {formatAmount(monthlyInvestment, "USD")}, paid at each month-end, and a constant annualized rate converted to a monthly rate. Real markets do not grow smoothly; actual outcomes can be lower, including a loss.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <ProjectionTable monthlyInvestment={monthlyInvestment} exchangeRates={exchangeRates} />
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/70 p-3 text-xs leading-relaxed text-muted-foreground">
          <BadgeInfo className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Illustrations use 4%, 7%, and 10% nominal annual rates, are calculated in USD before currency conversion, and exclude fees, taxes, inflation, and exchange-rate movement. They are not based on current market prices or historical performance and are not a forecast.
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            <h3 className="font-serif text-base font-bold text-card-foreground">Before you invest</h3>
          </div>
          <ol className="mt-4 space-y-3">
            {[
              "First cover essential bills and make minimum debt payments. If you have high-interest debt, compare its cost with uncertain investment returns; paying it down may be the priority.",
              "Build an accessible emergency fund—often 3–6 months of essential expenses—before committing this entire investment amount. The target depends on your actual expenses and job stability.",
              "Use a regulated broker or fund platform in your country, compare total fees and tax treatment, and verify that a fund tracks the index it claims to track.",
              "Prefer diversified index funds over trying to pick the next winning company. A Nifty 50 index fund can provide India large-cap exposure, but it is not globally diversified and can fall substantially.",
            ].map((tip, index) => (
              <li key={tip} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{String(index + 1).padStart(2, "0")}</span>
                <p className="text-sm leading-relaxed text-muted-foreground">{tip}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-3xl border border-chart-4/30 bg-chart-4/5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <BadgeInfo className="h-5 w-5 text-chart-4" />
            <h3 className="font-serif text-base font-bold text-card-foreground">A note about the 70/30 rule</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Directing 70% of the savings target to investing and 30% to reserves is a configurable starting heuristic for this planner, not a standard rule that suits everyone. If the emergency fund is not ready or expensive debt remains, temporarily direct more—or all—of that amount to those priorities instead. Review the plan when income, expenses, goals, or risk tolerance change.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">No individual stock picks</span>
            <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">No guaranteed gains</span>
            <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">Review yearly</span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-chart-4/30 bg-chart-4/5 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <BadgeInfo className="h-5 w-5 text-chart-4" />
          <h3 className="font-serif text-base font-bold text-card-foreground">Market-data transparency</h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This planner does not currently retrieve live index levels, individual share prices, fund NAVs, or current market rankings. It therefore does not label any company or fund as a current top performer. Use the official exchange or fund provider to verify today’s price, NAV, costs, and available products before investing. The SIP figures above are hypothetical compounding illustrations—not market forecasts.
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-card-foreground">Sources & further reading</h3>
        </div>
        <ul className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <li><a className="font-medium text-primary hover:underline" href="https://www.msci.com/indexes/index/892400" target="_blank" rel="noreferrer">MSCI ACWI — global equity index information <ExternalLink className="inline h-3 w-3" /></a></li>
          <li><a className="font-medium text-primary hover:underline" href="https://www.niftyindices.com/" target="_blank" rel="noreferrer">Nifty Indices — official index information <ExternalLink className="inline h-3 w-3" /></a></li>
          <li><a className="font-medium text-primary hover:underline" href="https://investor.sebi.gov.in/" target="_blank" rel="noreferrer">SEBI Investor — Indian investor education <ExternalLink className="inline h-3 w-3" /></a></li>
          <li><a className="font-medium text-primary hover:underline" href="https://www.frankfurter.dev/" target="_blank" rel="noreferrer">Frankfurter — daily rates from central banks and official sources <ExternalLink className="inline h-3 w-3" /></a></li>
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <ArrowUpRight className="h-3 w-3 shrink-0" />
          Currency conversions use the latest available daily reference rates returned by Frankfurter from central banks and official sources; these are not live trading quotes. Investment examples are educational and are not personalized financial advice.
        </p>
        {exchangeRateError && (
          <p role="status" className="mt-2 text-xs text-destructive">
            Exchange-rate refresh failed: {exchangeRateError}. The investment plan remains available in USD.
          </p>
        )}
      </section>

      {/* ── Invest from Wallet Modal ── */}
      {investModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setInvestModalOpen(false)
                setActionError(null)
                setActionSuccess(null)
              }}
              className="absolute right-5 top-5 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-card-foreground transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-card-foreground">Invest from Wallet</h3>
                <p className="text-xs text-muted-foreground">Allocate liquid funds into your 70/20/10 portfolio</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground">Available in Spendable Wallet</p>
                <p className="font-mono text-lg font-bold text-card-foreground">{formatAmount(walletBalance, "USD")}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                Liquid Balance
              </span>
            </div>

            <form onSubmit={handleInvest} className="mt-4 space-y-4">
              <div>
                <label htmlFor="invest-amount-input" className="block text-xs font-semibold text-card-foreground">
                  Investment Amount (USD)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">$</span>
                  <input
                    id="invest-amount-input"
                    type="number"
                    min="1"
                    max={walletBalance}
                    step="any"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-8 pr-4 text-sm font-semibold text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Quick preset chips */}
              <div className="flex flex-wrap gap-2">
                {[50, 100, 250, Math.round(monthlyInvestment)].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setInvestAmount(val.toString())}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-card-foreground hover:bg-secondary transition cursor-pointer"
                  >
                    +${val} {val === Math.round(monthlyInvestment) ? "(Target)" : ""}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setInvestAmount(walletBalance.toString())}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition cursor-pointer"
                >
                  Max (${walletBalance.toFixed(0)})
                </button>
              </div>

              {/* Live allocation preview */}
              {numInvestAmount > 0 && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
                  <p className="text-xs font-semibold text-card-foreground">Planned Asset Deployment (70/20/10):</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-background/80 p-2">
                      <p className="text-[10px] text-muted-foreground">Equity (70%)</p>
                      <p className="font-mono font-bold text-card-foreground">{formatAmount(numInvestAmount * 0.7, "USD")}</p>
                    </div>
                    <div className="rounded-xl bg-background/80 p-2">
                      <p className="text-[10px] text-muted-foreground">Bonds (20%)</p>
                      <p className="font-mono font-bold text-card-foreground">{formatAmount(numInvestAmount * 0.2, "USD")}</p>
                    </div>
                    <div className="rounded-xl bg-background/80 p-2">
                      <p className="text-[10px] text-muted-foreground">Gold (10%)</p>
                      <p className="font-mono font-bold text-card-foreground">{formatAmount(numInvestAmount * 0.1, "USD")}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
                    <span>Remaining Wallet:</span>
                    <span className="font-mono font-semibold text-card-foreground">
                      {formatAmount(Math.max(0, walletBalance - numInvestAmount), "USD")}
                    </span>
                  </div>
                </div>
              )}

              {userHasMpin && (
                <div>
                  <label htmlFor="invest-mpin" className="flex items-center gap-1.5 text-xs font-semibold text-card-foreground">
                    <Lock className="h-3.5 w-3.5 text-primary" /> Security MPIN (6-digit)
                  </label>
                  <input
                    id="invest-mpin"
                    type="password"
                    maxLength={6}
                    value={mpinInput}
                    onChange={(e) => setMpinInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="mt-1 w-full tracking-[0.3em] rounded-xl border border-border bg-background py-2 px-3 text-center text-sm font-mono font-bold text-card-foreground placeholder:tracking-normal focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              )}

              {actionError && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                  {actionError}
                </p>
              )}

              {actionSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-chart-3/20 bg-chart-3/10 p-2.5 text-xs text-chart-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setInvestModalOpen(false)
                    setActionError(null)
                    setActionSuccess(null)
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || numInvestAmount <= 0 || numInvestAmount > walletBalance}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
                  Confirm Investment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Liquidate to Wallet Modal ── */}
      {liquidateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setLiquidateModalOpen(false)
                setActionError(null)
                setActionSuccess(null)
              }}
              className="absolute right-5 top-5 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-card-foreground transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-card-foreground">Liquidate Invested Capital</h3>
                <p className="text-xs text-muted-foreground">Return funds from portfolio back into your spendable wallet</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground">Active Invested Capital</p>
                <p className="font-mono text-lg font-bold text-chart-3">{formatAmount(investedBalance, "USD")}</p>
              </div>
              <span className="rounded-full bg-chart-3/15 px-2.5 py-1 text-xs font-semibold text-chart-3">
                Portfolio Assets
              </span>
            </div>

            <form onSubmit={handleLiquidate} className="mt-4 space-y-4">
              <div>
                <label htmlFor="liquidate-amount-input" className="block text-xs font-semibold text-card-foreground">
                  Liquidation Amount (USD)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">$</span>
                  <input
                    id="liquidate-amount-input"
                    type="number"
                    min="1"
                    max={investedBalance}
                    step="any"
                    value={liquidateAmount}
                    onChange={(e) => setLiquidateAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-8 pr-4 text-sm font-semibold text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Quick preset chips */}
              <div className="flex flex-wrap gap-2">
                {[0.25, 0.5, 1].map((ratio) => {
                  const val = Math.round(investedBalance * ratio * 100) / 100
                  if (val <= 0) return null
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setLiquidateAmount(val.toString())}
                      className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-card-foreground hover:bg-secondary transition cursor-pointer"
                    >
                      {ratio === 1 ? "100% (All)" : `${ratio * 100}%`} (${val})
                    </button>
                  )
                })}
              </div>

              {numLiquidateAmount > 0 && (
                <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-xs space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>New Spendable Wallet Balance:</span>
                    <span className="font-mono font-semibold text-card-foreground">
                      {formatAmount(walletBalance + numLiquidateAmount, "USD")}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Remaining Invested Capital:</span>
                    <span className="font-mono font-semibold text-chart-3">
                      {formatAmount(Math.max(0, investedBalance - numLiquidateAmount), "USD")}
                    </span>
                  </div>
                </div>
              )}

              {userHasMpin && (
                <div>
                  <label htmlFor="liquidate-mpin" className="flex items-center gap-1.5 text-xs font-semibold text-card-foreground">
                    <Lock className="h-3.5 w-3.5 text-primary" /> Security MPIN (6-digit)
                  </label>
                  <input
                    id="liquidate-mpin"
                    type="password"
                    maxLength={6}
                    value={mpinInput}
                    onChange={(e) => setMpinInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="mt-1 w-full tracking-[0.3em] rounded-xl border border-border bg-background py-2 px-3 text-center text-sm font-mono font-bold text-card-foreground placeholder:tracking-normal focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              )}

              {actionError && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                  {actionError}
                </p>
              )}

              {actionSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-chart-3/20 bg-chart-3/10 p-2.5 text-xs text-chart-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLiquidateModalOpen(false)
                    setActionError(null)
                    setActionSuccess(null)
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || numLiquidateAmount <= 0 || numLiquidateAmount > investedBalance}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                  Confirm Liquidation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentUserId && (
        <BalanceVisibilityModal
          open={balanceModalOpen}
          userId={currentUserId}
          onReveal={() => setBalanceVisible(true)}
          onClose={() => setBalanceModalOpen(false)}
        />
      )}
    </div>
  )
}
