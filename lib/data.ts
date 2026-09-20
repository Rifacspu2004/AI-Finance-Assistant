export const balanceHistory = [
  12500, 12800, 13100, 12900, 13400, 13800, 14200, 14100, 14600, 15000, 15400, 15850
];

export const budget = {
  income: { limit: 5000, spent: 5000 },
  costs: { limit: 2500, spent: 1800 },
  wants: { limit: 1500, spent: 900 },
  savings: { limit: 1000, spent: 1000 },
};

export const contacts = [
  { id: "1", name: "Alex Rivera", handle: "@alexr", color: "#3b82f6", initials: "AR" },
  { id: "2", name: "Sarah Chen", handle: "@schen", color: "#10b981", initials: "SC" },
  { id: "3", name: "Michael Scott", handle: "@mscott", color: "#f59e0b", initials: "MS" }
];

export const holdings = [
  { id: "1", symbol: "AAPL", ticker: "AAPL", name: "Apple Inc.", shares: 12, value: 2100, change: 2.4, allocation: 35 },
  { id: "2", symbol: "NVDA", ticker: "NVDA", name: "NVIDIA Corp", shares: 5, value: 1400, change: -1.2, allocation: 25 },
  { id: "3", symbol: "BTC", ticker: "BTC", name: "Bitcoin", shares: 0.05, value: 3200, change: 5.8, allocation: 40 },
];

export const ledger = [
  { id: "1", name: "Tech Corp Salary", category: "Income", amount: 4500, date: "2026-08-01", direction: "in", status: "Completed", note: "Monthly Base Pay" },
  { id: "2", name: "Apartment Rent", category: "Costs", amount: -1800, date: "2026-08-02", direction: "out", status: "Completed", note: "Recurring Rent" },
  { id: "3", name: "Grocery Market", category: "Costs", amount: -150, date: "2026-08-05", direction: "out", status: "Completed", note: "Weekly Provisions" },
  { id: "4", name: "Dining Out", category: "Wants", amount: -85, date: "2026-08-10", direction: "out", status: "Pending", note: "Dinner with Team" }
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}