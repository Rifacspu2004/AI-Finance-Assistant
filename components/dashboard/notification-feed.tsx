"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Check,
  CircleDollarSign,
  Clock3,
  HandCoins,
  Inbox,
  Loader2,
  ReceiptText,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserProfile } from "@/lib/user-profile"
import { subscribeUserTransactions, type P2PTransaction } from "@/lib/transactions"
import { readNotificationPreferences, type NotificationPreferences } from "@/lib/notification-preferences"
import { cn } from "@/lib/utils"

type NotificationCategory = "transfer" | "request" | "budget"
type FeedFilter = "All" | "Transfers" | "Requests" | "Budget"

type FeedItem = {
  id: string
  category: NotificationCategory
  title: string
  body: string
  amount?: number
  occurredAt: number
  icon: typeof Bell
  positive?: boolean
  actionHref?: string
}

const READ_KEY_PREFIX = "aeris_notification_reads_"

function readIdsForUser(userId: string) {
  try {
    const saved = localStorage.getItem(`${READ_KEY_PREFIX}${userId}`)
    const ids: unknown = saved ? JSON.parse(saved) : []
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [])
  } catch (error) {
    console.error("Could not load notification read state.", error)
    return new Set<string>()
  }
}

function persistReadIds(userId: string, ids: Set<string>) {
  try {
    localStorage.setItem(`${READ_KEY_PREFIX}${userId}`, JSON.stringify([...ids]))
    window.dispatchEvent(new CustomEvent("aeris-notification-reads-changed", {
      detail: { userId },
    }))
  } catch (error) {
    console.error("Could not save notification read state.", error)
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount)
}

function getRelativeTime(timestamp: number) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (elapsedSeconds < 60) return "Just now"
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function transactionToNotification(
  transaction: P2PTransaction,
  userId: string,
  nameFor: (id: string) => string,
): FeedItem {
  const isPayer = transaction.senderId === userId
  const otherUserId = isPayer ? transaction.recipientId : transaction.senderId
  const otherName = nameFor(otherUserId)
  const time = transaction.statusUpdatedAt ?? transaction.createdAt
  const base = {
    id: `transaction-${transaction.id ?? `${transaction.senderId}-${transaction.createdAt}`}-${transaction.status}`,
    amount: transaction.amount,
    occurredAt: time,
    actionHref: "/ledger",
  }

  if (transaction.status === "pending") {
    return isPayer
      ? {
          ...base,
          category: "request",
          title: "Payment request received",
          body: `${otherName} requested ${formatCurrency(transaction.amount)}${transaction.note ? ` · ${transaction.note}` : ""}. Review it in your ledger.`,
          icon: HandCoins,
        }
      : {
          ...base,
          category: "request",
          title: "Payment request sent",
          body: `Your request for ${formatCurrency(transaction.amount)} is waiting for ${otherName}.${transaction.note ? ` · ${transaction.note}` : ""}`,
          icon: Clock3,
        }
  }

  if (transaction.status === "declined") {
    return isPayer
      ? {
          ...base,
          category: "request",
          title: "Payment request declined",
          body: `${otherName} declined your request for ${formatCurrency(transaction.amount)}.`,
          icon: ShieldAlert,
        }
      : {
          ...base,
          category: "request",
          title: "Request declined",
          body: `Your request to ${otherName} for ${formatCurrency(transaction.amount)} was declined.`,
          icon: ShieldAlert,
        }
  }

  if (transaction.kind === "request") {
    return isPayer
      ? {
          ...base,
          category: "request",
          title: "Payment request paid",
          body: `You paid ${formatCurrency(transaction.amount)} requested by ${otherName}.${transaction.note ? ` · ${transaction.note}` : ""}`,
          icon: Check,
        }
      : {
          ...base,
          category: "request",
          title: "Request received",
          body: `${otherName} paid your request for ${formatCurrency(transaction.amount)}.${transaction.note ? ` · ${transaction.note}` : ""}`,
          icon: ArrowDownLeft,
          positive: true,
        }
  }

  return isPayer
    ? {
        ...base,
        category: "transfer",
        title: "Money sent",
        body: `Your transfer of ${formatCurrency(transaction.amount)} to ${otherName} is complete.${transaction.note ? ` · ${transaction.note}` : ""}`,
        icon: Send,
      }
    : {
        ...base,
        category: "transfer",
        title: transaction.senderId === "aeris-payroll" ? "Monthly Income Auto-Credited" : "Money received",
        body: transaction.senderId === "aeris-payroll"
          ? `${formatCurrency(transaction.amount)} was automatically deposited into your wallet balance for the monthly 1st credit cycle.`
          : `${formatCurrency(transaction.amount)} was received from ${otherName}.${transaction.note ? ` · ${transaction.note}` : ""}`,
        icon: transaction.senderId === "aeris-payroll" ? Sparkles : ArrowDownLeft,
        positive: true,
      }
}

export function useNotificationFeed() {
  const [userId, setUserId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<P2PTransaction[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [names, setNames] = useState<Record<string, string>>({})
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [preferences, setPreferences] = useState<NotificationPreferences>({ transfers: true, requests: true, budget: true })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setUserId(user?.uid ?? null)
    setTransactions([])
    setNames({})
    setMonthlyIncome(0)
    setError(null)
    setLoading(Boolean(user))
    setReadIds(user ? readIdsForUser(user.uid) : new Set())
    setPreferences(user ? readNotificationPreferences(user.uid) : { transfers: true, requests: true, budget: true })
  }, (authError) => {
    console.error("Notification feed could not verify the current user.", authError)
    setError("Could not verify your account. Refresh the page or sign in again.")
    setLoading(false)
  }), [])

  useEffect(() => {
    if (!userId) {
      setMonthlyIncome(0)
      return
    }
    let active = true
    void getUserProfile(userId).then((profile) => {
      if (!active) return
      const profileMonthly = Number(profile?.monthlyIncome)
      const annual = Number(profile?.annualIncome)
      setMonthlyIncome(Number.isFinite(profileMonthly) && profileMonthly > 0
        ? profileMonthly
        : Number.isFinite(annual) && annual > 0
          ? annual / 12
          : 0)
    }).catch((profileError) => {
      console.error("Budget notifications could not load the income profile.", profileError)
    })
    return () => { active = false }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    function syncPreferences(event: Event) {
      if (event instanceof StorageEvent) {
        setPreferences(readNotificationPreferences(userId))
        return
      }
      const detail = (event as CustomEvent<{ userId?: string; preferences?: NotificationPreferences }>).detail
      if (detail?.userId === userId && detail.preferences) setPreferences(detail.preferences)
    }
    window.addEventListener("storage", syncPreferences)
    window.addEventListener("aeris-notification-preferences-changed", syncPreferences)
    return () => {
      window.removeEventListener("storage", syncPreferences)
      window.removeEventListener("aeris-notification-preferences-changed", syncPreferences)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    function syncReadState(event: Event) {
      if (event instanceof StorageEvent) {
        setReadIds(readIdsForUser(userId))
        return
      }
      const detail = (event as CustomEvent<{ userId?: string }>).detail
      if (detail?.userId === userId) setReadIds(readIdsForUser(userId))
    }
    window.addEventListener("storage", syncReadState)
    window.addEventListener("aeris-notification-reads-changed", syncReadState)
    return () => {
      window.removeEventListener("storage", syncReadState)
      window.removeEventListener("aeris-notification-reads-changed", syncReadState)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    return subscribeUserTransactions(
      userId,
      (nextTransactions) => {
        setTransactions(nextTransactions)
        setLoading(false)
        setError(null)
      },
      (subscriptionError) => {
        console.error("Notification feed could not load transactions.", subscriptionError)
        setError("Transaction notifications could not be loaded. Check your connection and try again.")
        setLoading(false)
      },
    )
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const otherIds = [...new Set(transactions.flatMap((transaction) => [
      transaction.senderId,
      transaction.recipientId,
    ]).filter((id) => id !== userId && !names[id]))]
    if (!otherIds.length) return

    let active = true
    void Promise.all(otherIds.map(async (id) => {
      try {
        const profile = await getUserProfile(id)
        if (profile?.fullName) return [id, profile.fullName] as const
      } catch (profileError) {
        console.error(`Could not load a participant name for notification ${id}.`, profileError)
      }
      return null
    })).then((results) => {
      if (!active) return
      const resolved = Object.fromEntries(results.filter((result): result is readonly [string, string] => result !== null))
      if (Object.keys(resolved).length) setNames((current) => ({ ...current, ...resolved }))
    })
    return () => { active = false }
  }, [names, transactions, userId])

  const items = useMemo(() => {
    if (!userId) return []
    const nameFor = (id: string) =>
      id === "aeris-payroll"
        ? "Aeris Automated Payroll"
        : id === "aeris-investment-portfolio"
          ? "Aeris Portfolio"
          : names[id] ?? "another user"
    const transactionItems = transactions
      .filter((transaction) => transaction.id && ["pending", "completed", "declined"].includes(transaction.status))
      .map((transaction) => transactionToNotification(transaction, userId, nameFor))

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const spendByCategory = new Map<string, number>()
    for (const transaction of transactions) {
      if (
        transaction.senderId === userId &&
        transaction.status === "completed" &&
        transaction.kind !== "request" &&
        transaction.createdAt >= monthStart &&
        (transaction.category === "Costs" || transaction.category === "Wants")
      ) {
        spendByCategory.set(
          transaction.category,
          (spendByCategory.get(transaction.category) ?? 0) + transaction.amount,
        )
      }
    }

    const budgetItems: FeedItem[] = monthlyIncome > 0
      ? (["Costs", "Wants"] as const).flatMap((category) => {
          const spent = spendByCategory.get(category) ?? 0
          const monthlyLimit = monthlyIncome * (category === "Costs" ? 0.5 : 0.3)
          if (spent < monthlyLimit * 0.8) return []
          const exceeded = spent >= monthlyLimit
          return [{
            id: `budget-${monthKey}-${category}-${exceeded ? "limit" : "near"}`,
            category: "budget" as const,
            title: exceeded ? `${category} budget guide exceeded` : `${category} budget guide nearly reached`,
            body: `Your recorded P2P ${category.toLowerCase()} transactions total ${formatCurrency(spent)} this month, ${exceeded ? "above" : "at least 80% of"} the illustrative ${formatCurrency(monthlyLimit)} monthly guide. This does not include spending outside Aeris; review your complete budget before making changes.`,
            amount: spent,
            occurredAt: now.getTime(),
            icon: exceeded ? ShieldAlert : CircleDollarSign,
            actionHref: "/budget",
          }]
        })
      : []

    return [...transactionItems, ...budgetItems]
      .filter((item) => item.category === "request"
        ? preferences.requests
        : item.category === "budget"
          ? preferences.budget
          : preferences.transfers)
      .sort((left, right) => right.occurredAt - left.occurredAt)
  }, [monthlyIncome, names, preferences, transactions, userId])

  function markRead(id: string) {
    if (!userId) return
    const next = new Set(readIds)
    next.add(id)
    setReadIds(next)
    persistReadIds(userId, next)
  }

  function markAllRead() {
    if (!userId) return
    const next = new Set([...readIds, ...items.map((item) => item.id)])
    setReadIds(next)
    persistReadIds(userId, next)
  }

  const unreadCount = items.filter((item) => !readIds.has(item.id)).length
  return { userId, items, readIds, unreadCount, loading, error, markRead, markAllRead }
}

function NotificationRow({
  item,
  unread,
  onRead,
  compact = false,
}: {
  item: FeedItem
  unread: boolean
  onRead: () => void
  compact?: boolean
}) {
  const Icon = item.icon
  const content = (
    <div className={cn(
      "flex items-start gap-3 rounded-2xl border p-3 transition",
      unread ? "border-primary/20 bg-primary/5" : "border-border bg-card",
    )}>
      <span className={cn(
        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        item.positive ? "bg-chart-3/10 text-chart-3" : "bg-secondary text-primary",
      )}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-card-foreground">{item.title}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{getRelativeTime(item.occurredAt)}</span>
        </span>
        <span className={cn("mt-1 block text-xs leading-relaxed text-muted-foreground", compact && "line-clamp-2")}>
          {item.body}
        </span>
      </span>
      {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
    </div>
  )

  if (item.actionHref) {
    return (
      <Link href={item.actionHref} onClick={onRead} className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {content}
      </Link>
    )
  }
  return <div onClick={onRead}>{content}</div>
}

export function NotificationBellMenu() {
  const [open, setOpen] = useState(false)
  const feed = useNotificationFeed()
  const unreadItems = feed.items.filter((item) => !feed.readIds.has(item.id))
  const recent = unreadItems.slice(0, 5)

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={feed.unreadCount ? `Notifications, ${feed.unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-input bg-card text-muted-foreground transition hover:text-foreground"
      >
        <Bell className="h-4.5 w-4.5" aria-hidden="true" />
        {feed.unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {feed.unreadCount > 9 ? "9+" : feed.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <section className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3 shadow-xl">
            <div className="flex items-center justify-between gap-2 px-1 pb-2">
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Notifications</h2>
                <p className="text-[11px] text-muted-foreground">{feed.unreadCount} unread</p>
              </div>
              {feed.unreadCount > 0 && (
                <button type="button" onClick={feed.markAllRead} className="text-xs font-semibold text-primary hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            {feed.loading ? (
              <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : feed.error ? (
              <p role="alert" className="rounded-xl bg-destructive/5 p-3 text-xs text-destructive">{feed.error}</p>
            ) : recent.length ? (
              <ul className="space-y-2">
                {recent.map((item) => (
                  <li key={item.id}>
                    <NotificationRow item={item} unread={!feed.readIds.has(item.id)} onRead={() => { feed.markRead(item.id); setOpen(false) }} compact />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-7 text-center">
                <Inbox className="mx-auto h-7 w-7 text-muted-foreground/60" />
                <p className="mt-2 text-sm font-medium text-card-foreground">You’re all caught up</p>
                <p className="text-xs text-muted-foreground">New transfers and requests will appear here.</p>
              </div>
            )}
            <Link href="/notifications" onClick={() => setOpen(false)} className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent">
              View all notifications <ReceiptText className="h-3.5 w-3.5" />
            </Link>
          </section>
        </>
      )}
    </div>
  )
}

export function NotificationInbox() {
  const feed = useNotificationFeed()
  const [filter, setFilter] = useState<FeedFilter>("All")
  const filteredItems = feed.items.filter((item) => {
    if (filter === "Transfers") return item.category === "transfer"
    if (filter === "Requests") return item.category === "request"
    if (filter === "Budget") return item.category === "budget"
    return true
  })
  const visibleItems = filteredItems.slice(0, 4)
  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)
  const thisMonthActivity = feed.items.filter((item) => item.occurredAt >= thisMonthStart.getTime())
  const sentThisMonth = thisMonthActivity
    .filter((item) => item.title === "Money sent" || item.title === "Payment request paid")
    .reduce((total, item) => total + (item.amount ?? 0), 0)
  const receivedThisMonth = thisMonthActivity
    .filter((item) => item.title === "Money received" || item.title === "Request received")
    .reduce((total, item) => total + (item.amount ?? 0), 0)
  const pendingCount = feed.items.filter((item) => item.category === "request" && item.title === "Payment request received").length

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Your activity, in real time</p>
            <h2 className="mt-1 font-serif text-xl font-bold text-card-foreground">Notification center</h2>
            <p className="mt-1 text-sm text-muted-foreground">Transfer and payment-request alerts are generated from your live P2P ledger.</p>
          </div>
          {feed.unreadCount > 0 && (
            <button type="button" onClick={feed.markAllRead} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-primary hover:bg-secondary">
              Mark all {feed.unreadCount} as read
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Sent this month</p>
            <p className="mt-1 font-mono text-lg font-bold text-card-foreground">{formatCurrency(sentThisMonth)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Received this month</p>
            <p className="mt-1 font-mono text-lg font-bold text-chart-3">{formatCurrency(receivedThisMonth)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Requests needing your attention</p>
            <p className="mt-1 flex items-center gap-2 font-mono text-lg font-bold text-card-foreground">
              {pendingCount}<span className="font-sans text-sm font-medium text-muted-foreground">pending</span>
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-lg font-bold text-card-foreground">Recent activity</h3>
              <p className="text-xs text-muted-foreground">Showing the latest four matching activities. Open a transfer to view its ledger entry.</p>
            </div>
            <div className="flex gap-1 rounded-xl bg-secondary p-1">
              {(["All", "Transfers", "Requests", "Budget"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  aria-pressed={filter === item}
                  className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition", filter === item ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {feed.loading ? (
            <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : feed.error ? (
            <p role="alert" className="mt-4 rounded-xl bg-destructive/5 p-4 text-sm text-destructive">{feed.error}</p>
          ) : visibleItems.length ? (
            <ul className="mt-4 space-y-2">
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <NotificationRow item={item} unread={!feed.readIds.has(item.id)} onRead={() => feed.markRead(item.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-border px-5 py-12 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-semibold text-card-foreground">No activity yet</p>
              <p className="mt-1 text-xs text-muted-foreground">When you send money, receive a payment, or get a request, it will appear here.</p>
              <Link href="/send" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                Go to Send & Request <CircleDollarSign className="h-4 w-4" />
              </Link>
            </div>
          )}
          {!feed.loading && !feed.error && filteredItems.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Showing {visibleItems.length} of {filteredItems.length} recent notifications.
              </p>
              <Link href="/send" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90">
                See all transactions <ReceiptText className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-serif text-base font-bold text-card-foreground">Useful money check-ins</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Review your budget after a change in income or regular bills.</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Before investing, check emergency savings and expensive debt.</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Verify the recipient and amount before approving a payment request.</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/budget" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                Review AI budget plan <ReceiptText className="h-3.5 w-3.5" />
              </Link>
              <Link href="/investments" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                Check AI market review <Sparkles className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-card-foreground">Stay secure</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Aeris displays P2P events from the signed-in account’s ledger. It does not send push notifications or email in the background. Never share your MPIN or approve a request you do not recognize.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
