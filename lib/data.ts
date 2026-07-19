export type Contact = {
  id: string
  name: string
  handle: string
  initials: string
  color: string
}

export type LedgerEntry = {
  id: string
  name: string
  handle: string
  initials: string
  direction: "in" | "out"
  amount: number
  category: "Costs" | "Wants" | "Savings" | "Income"
  note: string
  date: string
  status: "settled" | "pending"
}

export type Holding = {
  id: string
  ticker: string
  name: string
  value: number
  change: number
  allocation: number
}

export const contacts: Contact[] = [
  { id: "c1", name: "Maya Rivera", handle: "@maya", initials: "MR", color: "var(--chart-1)" },
  { id: "c2", name: "Devin Cole", handle: "@devinc", initials: "DC", color: "var(--chart-2)" },
  { id: "c3", name: "Priya Nair", handle: "@priya", initials: "PN", color: "var(--chart-3)" },
  { id: "c4", name: "Leo Fischer", handle: "@leof", initials: "LF", color: "var(--chart-5)" },
]

export const ledger: LedgerEntry[] = [
  {
    id: "t1",
    name: "Maya Rivera",
    handle: "@maya",
    initials: "MR",
    direction: "in",
    amount: 240,
    category: "Income",
    note: "Split — weekend trip refund",
    date: "Today, 09:24",
    status: "settled",
  },
  {
    id: "t2",
    name: "Blue Bottle Coffee",
    handle: "@bluebottle",
    initials: "BB",
    direction: "out",
    amount: 18.5,
    category: "Wants",
    note: "Cortado + pastry",
    date: "Today, 08:10",
    status: "settled",
  },
  {
    id: "t3",
    name: "City Power & Light",
    handle: "@citypower",
    initials: "CP",
    direction: "out",
    amount: 132.4,
    category: "Costs",
    note: "Monthly electricity",
    date: "Yesterday",
    status: "settled",
  },
  {
    id: "t4",
    name: "Vault Savings",
    handle: "@vault",
    initials: "VS",
    direction: "out",
    amount: 400,
    category: "Savings",
    note: "Auto-transfer to goal",
    date: "Yesterday",
    status: "settled",
  },
  {
    id: "t5",
    name: "Devin Cole",
    handle: "@devinc",
    initials: "DC",
    direction: "out",
    amount: 65,
    category: "Wants",
    note: "Concert tickets",
    date: "Mar 12",
    status: "pending",
  },
  {
    id: "t6",
    name: "Priya Nair",
    handle: "@priya",
    initials: "PN",
    direction: "in",
    amount: 1200,
    category: "Income",
    note: "Freelance invoice #204",
    date: "Mar 11",
    status: "settled",
  },
]

export const holdings: Holding[] = [
  { id: "h1", ticker: "VTI", name: "Total Market ETF", value: 4820.32, change: 1.8, allocation: 42 },
  { id: "h2", ticker: "BND", name: "Total Bond ETF", value: 2110.5, change: -0.3, allocation: 18 },
  { id: "h3", ticker: "AAPL", name: "Apple Inc.", value: 2680.0, change: 2.4, allocation: 23 },
  { id: "h4", ticker: "BTC", name: "Bitcoin", value: 1975.18, change: -1.1, allocation: 17 },
]

// Operational formula: Costs + Wants + Savings = Income (C + W + S = I)
export const budget = {
  income: 4200,
  costs: { spent: 1640, limit: 2100 }, // ~50%
  wants: { spent: 980, limit: 1260 }, // ~30%
  savings: { spent: 620, limit: 840 }, // ~20%
}

export const balanceHistory = [
  3200, 3320, 3180, 3450, 3610, 3540, 3720, 3890, 3810, 4020, 4180, 4090, 4320, 4510, 4680, 4620,
  4880, 5040, 4960, 5220,
]

export function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}
