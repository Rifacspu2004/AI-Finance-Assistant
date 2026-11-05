// File: lib/transactions.ts

import { db } from "@/lib/firebase";
import { collection, doc, addDoc, setDoc, updateDoc, runTransaction, onSnapshot, query, where, getDocs, getDoc } from "firebase/firestore";
import { getUserProfile } from "@/lib/user-profile";
export { formatCurrency } from "@/lib/data";

/** Default starter base balance for new users (dummy currency) */
export const DEFAULT_BASE_BALANCE = 1000;

/** Default monthly income allocated to user if not specified in profile */
export const DEFAULT_MONTHLY_INCOME = 5000;

/** Total starting balance combining base funds and the initial monthly income */
export const DEFAULT_STARTING_BALANCE = DEFAULT_BASE_BALANCE + DEFAULT_MONTHLY_INCOME;

/** P2P transaction status */
export type TransactionStatus = "pending" | "completed" | "declined";

/** Transaction direction */
export type TransactionDirection = "in" | "out";

export interface P2PTransaction {
  id?: string; // Firestore doc ID
  kind?: "send" | "request";
  senderId: string;
  recipientId: string;
  amount: number; // always positive
  note?: string;
  category: string;
  createdAt: number; // timestamp ms
  statusUpdatedAt?: number;
  status: TransactionStatus;
}

/** Return YYYY-MM key for monthly credit tracking (e.g. "2026-10") */
export function getCurrentMonthPeriodKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Get the next 1st of the month date at midnight */
export function getNextMonthlyCreditDate(from: Date = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth() + 1, 1, 0, 0, 0, 0);
}

/** Calculate days remaining until next 1st of the month */
export function getDaysUntilNextCredit(from: Date = new Date()): number {
  const next = getNextMonthlyCreditDate(from);
  const diffMs = next.getTime() - from.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export interface IncomeCreditResult {
  credited: boolean;
  amount: number;
  period: string;
  newBalance: number;
  message: string;
}

export interface IncomeInfo {
  monthlyIncome: number;
  lastCreditPeriod: string | null;
  lastCreditTimestamp: number | null;
  nextCreditDate: Date;
  daysUntilNextCredit: number;
  isCreditedThisPeriod: boolean;
}

/** Automatically check if monthly income should be credited on 1st of month (or right now if pending) */
export async function checkAndCreditMonthlyIncome(
  userId: string,
  force: boolean = false
): Promise<IncomeCreditResult | null> {
  if (!userId) return null;

  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);

    let currentBalance = DEFAULT_BASE_BALANCE;
    let userMonthlyIncome = DEFAULT_MONTHLY_INCOME;
    let lastPeriod: string | undefined = undefined;

    if (snap.exists()) {
      const data = snap.data() as any;
      if (data.walletBalance != null) {
        currentBalance = Number(data.walletBalance);
      }
      if (data.monthlyIncome && Number(data.monthlyIncome) > 0) {
        userMonthlyIncome = Number(data.monthlyIncome);
      }
      lastPeriod = data.lastIncomeCreditPeriod;
    } else {
      const profile = await getUserProfile(userId);
      if (profile?.monthlyIncome && Number(profile.monthlyIncome) > 0) {
        userMonthlyIncome = Number(profile.monthlyIncome);
      }
    }

    const currentPeriod = getCurrentMonthPeriodKey();

    // If already credited for this month and not a manual simulation, skip
    if (lastPeriod === currentPeriod && !force) {
      return {
        credited: false,
        amount: userMonthlyIncome,
        period: currentPeriod,
        newBalance: currentBalance,
        message: `Monthly income of $${userMonthlyIncome.toLocaleString()} is already credited for ${currentPeriod}. Next auto-credit on 1st of next month.`,
      };
    }

    // Compute updated wallet balance
    const newBalance = Math.round((currentBalance + userMonthlyIncome) * 100) / 100;
    const now = new Date();
    const monthName = now.toLocaleString("en-US", { month: "long" });
    const year = now.getFullYear();

    // 1. Update user record in Firestore
    await setDoc(
      userRef,
      {
        walletBalance: newBalance,
        monthlyIncome: String(userMonthlyIncome),
        lastIncomeCreditPeriod: currentPeriod,
        lastIncomeCreditTimestamp: Date.now(),
      },
      { merge: true }
    );

    // 2. Append completed Income transaction in ledger
    const txRef = collection(db, "transactions");
    const newTx: P2PTransaction = {
      senderId: "aeris-payroll",
      recipientId: userId,
      kind: "send",
      amount: userMonthlyIncome,
      category: "Income",
      note: force
        ? `Monthly Salary Simulated Credit • ${monthName} ${year}`
        : `Monthly Salary Auto-Credit • 1st of ${monthName} ${year}`,
      createdAt: Date.now(),
      statusUpdatedAt: Date.now(),
      status: "completed",
    };
    const txDoc = await addDoc(txRef, newTx);
    await updateDoc(txDoc, { id: txDoc.id });

    // 3. Dispatch custom event for reactive UI toasts / sounds
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("aeris-income-credited", {
          detail: {
            userId,
            amount: userMonthlyIncome,
            period: currentPeriod,
            newBalance,
            force,
          },
        })
      );
    }

    return {
      credited: true,
      amount: userMonthlyIncome,
      period: currentPeriod,
      newBalance,
      message: `Successfully credited monthly income of $${userMonthlyIncome.toLocaleString()} to your wallet balance.`,
    };
  } catch (err: any) {
    console.error("Error checking/crediting monthly income:", err);
    return null;
  }
}

/** Subscribe to live income automation metadata for a user */
export function subscribeUserIncomeInfo(
  userId: string,
  callback: (info: IncomeInfo) => void
): () => void {
  const userRef = doc(db, "users", userId);
  return onSnapshot(userRef, (snap) => {
    const data = snap.exists() ? (snap.data() as any) : {};
    const monthlyIncome = Number(data.monthlyIncome) > 0 ? Number(data.monthlyIncome) : DEFAULT_MONTHLY_INCOME;
    const lastCreditPeriod = data.lastIncomeCreditPeriod || null;
    const lastCreditTimestamp = data.lastIncomeCreditTimestamp || null;
    const currentPeriod = getCurrentMonthPeriodKey();
    const isCreditedThisPeriod = lastCreditPeriod === currentPeriod;
    const nextCreditDate = getNextMonthlyCreditDate();
    const daysUntilNextCredit = getDaysUntilNextCredit();

    callback({
      monthlyIncome,
      lastCreditPeriod,
      lastCreditTimestamp,
      nextCreditDate,
      daysUntilNextCredit,
      isCreditedThisPeriod,
    });
  });
}

/** Ensure a user has a walletBalance field; set starter balance + credit monthly income */
async function ensureBalance(userId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    // No document yet – create with initial balance + credit initial monthly income
    const currentPeriod = getCurrentMonthPeriodKey();
    await setDoc(
      userRef,
      {
        walletBalance: DEFAULT_STARTING_BALANCE,
        monthlyIncome: String(DEFAULT_MONTHLY_INCOME),
        lastIncomeCreditPeriod: currentPeriod,
        lastIncomeCreditTimestamp: Date.now(),
      },
      { merge: true }
    );

    const txRef = collection(db, "transactions");
    const newTx: P2PTransaction = {
      senderId: "aeris-payroll",
      recipientId: userId,
      kind: "send",
      amount: DEFAULT_MONTHLY_INCOME,
      category: "Income",
      note: `Monthly Salary Auto-Credit • 1st of ${new Date().toLocaleString("en-US", { month: "long" })} ${new Date().getFullYear()}`,
      createdAt: Date.now(),
      statusUpdatedAt: Date.now(),
      status: "completed",
    };
    const txDoc = await addDoc(txRef, newTx);
    await updateDoc(txDoc, { id: txDoc.id });
    return;
  }

  const data = snap.data() as any;
  if (data.walletBalance == null) {
    await updateDoc(userRef, { walletBalance: DEFAULT_STARTING_BALANCE });
  }

  // Check if monthly income credit is due for current period
  await checkAndCreditMonthlyIncome(userId);
}
/** Create a transaction (send or request).
 *  - "send":    currentUser → recipient, funds move immediately.
 *  - "request": currentUser asks targetUser to pay them.
 *               Stored as senderId=targetUser (payer), recipientId=currentUser (requester)
 *               so that respondToRequest can debit sender and credit recipient uniformly.
 */
export async function createTransaction(
  mode: "send" | "request",
  currentUserId: string,
  targetUserId: string,
  amount: number,
  category: string,
  note?: string,
): Promise<void> {
  if (amount <= 0) throw new Error("Amount must be positive");

  // For send: currentUser is sender, targetUser is recipient
  // For request: targetUser is sender (payer), currentUser is recipient (gets money)
  const senderId = mode === "send" ? currentUserId : targetUserId;
  const recipientId = mode === "send" ? targetUserId : currentUserId;

  // Only ensure our own balance doc exists — we cannot write to the other user's doc.
  // The runTransaction for send handles the recipient's balance inline with a fallback.
  await ensureBalance(currentUserId);

  const txRef = collection(db, "transactions");
  const newTx: P2PTransaction = {
    senderId,
    recipientId,
    kind: mode,
    amount,
    category,
    note,
    createdAt: Date.now(),
    statusUpdatedAt: Date.now(),
    status: mode === "send" ? "completed" : "pending",
  };

  if (mode === "send") {
    await runTransaction(db, async (t) => {
      const senderRef = doc(db, "users", senderId);
      const recipientRef = doc(db, "users", recipientId);

      const senderSnap = await t.get(senderRef);
      const recipientSnap = await t.get(recipientRef);

      const senderData = senderSnap.data() as any;
      const recipientData = recipientSnap.data() as any;

      const senderBal = senderData.walletBalance ?? DEFAULT_STARTING_BALANCE;
      if (senderBal < amount) throw new Error("Insufficient balance");

      t.update(senderRef, { walletBalance: senderBal - amount });
      t.update(recipientRef, {
        walletBalance: (recipientData.walletBalance ?? DEFAULT_STARTING_BALANCE) + amount,
      });

      const newDocRef = doc(txRef);
      t.set(newDocRef, { ...newTx, id: newDocRef.id });
    });
  } else {
    const docRef = await addDoc(txRef, newTx);
    await updateDoc(docRef, { id: docRef.id });
  }
}

/** Respond to a pending request.
 *  - "accept" performs the transfer (balance must be sufficient).
 *  - "decline" only updates the status.
 */
export async function respondToRequest(
  txId: string,
  action: "accept" | "decline",
): Promise<void> {
  const txDoc = doc(db, "transactions", txId);
  const txSnap = await getDoc(txDoc);
  if (!txSnap.exists()) throw new Error("Transaction not found");
  const tx = txSnap.data() as P2PTransaction;

  if (tx.status !== "pending") throw new Error("Transaction is not pending");

  if (action === "decline") {
    await updateDoc(txDoc, { status: "declined", statusUpdatedAt: Date.now() });
    return;
  }

  // accept – perform atomic transfer
  await runTransaction(db, async (t) => {
    const senderRef = doc(db, "users", tx.senderId);
    const recipientRef = doc(db, "users", tx.recipientId);
    const senderSnap = await t.get(senderRef);
    const recipientSnap = await t.get(recipientRef);
    const senderData = senderSnap.data() as any;
    const recipientData = recipientSnap.data() as any;
    const senderBal = senderData.walletBalance ?? DEFAULT_STARTING_BALANCE;
    if (senderBal < tx.amount) throw new Error("Insufficient balance to accept request");
    t.update(senderRef, { walletBalance: senderBal - tx.amount });
    t.update(recipientRef, {
      walletBalance: (recipientData.walletBalance ?? DEFAULT_STARTING_BALANCE) + tx.amount,
    });
    t.update(txDoc, { status: "completed", statusUpdatedAt: Date.now() });
  });
}

/** Subscribe to real‑time transaction updates for a user (as sender or recipient).
 *  Both queries fire independently; we merge their snapshots before calling back. */
export function subscribeUserTransactions(
  userId: string,
  callback: (txs: P2PTransaction[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const sentQuery = query(collection(db, "transactions"), where("senderId", "==", userId));
  const receivedQuery = query(collection(db, "transactions"), where("recipientId", "==", userId));

  // Keep the latest snapshot from each side so we always merge both
  const snapshots: { sent: P2PTransaction[]; received: P2PTransaction[] } = { sent: [], received: [] };

  function emit() {
    const seen = new Set<string>();
    const merged: P2PTransaction[] = [];
    for (const tx of [...snapshots.sent, ...snapshots.received]) {
      const key = tx.id ?? `${tx.senderId}-${tx.recipientId}-${tx.createdAt}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(tx);
      }
    }
    merged.sort((a, b) => b.createdAt - a.createdAt);
    callback(merged);
  }

  const handleError = (error: Error) => onError?.(error)
  const unsubSent = onSnapshot(sentQuery, (snap) => {
    snapshots.sent = snap.docs.map((d) => d.data() as P2PTransaction);
    emit();
  }, handleError);

  const unsubReceived = onSnapshot(receivedQuery, (snap) => {
    snapshots.received = snap.docs.map((d) => d.data() as P2PTransaction);
    emit();
  }, handleError);

  return () => {
    unsubSent();
    unsubReceived();
  };
}

/** Get a user's wallet balance — always reads fresh from Firestore (bypasses cache). */
export async function getUserBalance(userId: string): Promise<number> {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return DEFAULT_STARTING_BALANCE;
  return (snap.data() as any).walletBalance ?? DEFAULT_STARTING_BALANCE;
}

/** Subscribe to real-time balance updates for a user. Returns unsubscribe fn. */
export function subscribeUserBalance(
  userId: string,
  callback: (balance: number) => void,
): () => void {
  const userRef = doc(db, "users", userId);
  return onSnapshot(userRef, (snap) => {
    if (!snap.exists()) {
      callback(DEFAULT_STARTING_BALANCE);
      return;
    }
    callback((snap.data() as any).walletBalance ?? DEFAULT_STARTING_BALANCE);
  });
}

/** Retrieve a list of other registered users (id, name, optional email). */
export async function getRegisteredUsers(currentUserId: string): Promise<Array<{ id: string; name: string; email?: string }>> {
  const usersCol = collection(db, "users");
  const snap = await getDocs(usersCol);
  const result: Array<{ id: string; name: string; email?: string }> = [];
  snap.forEach((doc) => {
    if (doc.id === currentUserId) return;
    const data = doc.data() as any;
    result.push({ id: doc.id, name: data.fullName ?? data.displayName ?? "Unknown", email: data.email });
  });
  return result;
}

/** Search registered users by name or email (client-side filter over already-fetched list). */
export function searchUsers(
  users: Array<{ id: string; name: string; email?: string }>,
  query: string,
): Array<{ id: string; name: string; email?: string }> {
  const q = query.trim().toLowerCase();
  if (!q) return users;
  return users.filter(
    (u) =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q),
  );
}

/** Subscribe to real-time invested balance updates for a user. */
export function subscribeUserInvestedBalance(
  userId: string,
  callback: (invested: number) => void,
): () => void {
  const userRef = doc(db, "users", userId);
  return onSnapshot(userRef, (snap) => {
    if (!snap.exists()) {
      callback(0);
      return;
    }
    callback(Number((snap.data() as any).investedBalance) || 0);
  });
}

/** Invest funds directly from walletBalance into investedBalance. */
export async function investFromWallet(userId: string, amount: number): Promise<void> {
  if (amount <= 0 || !Number.isFinite(amount)) {
    throw new Error("Investment amount must be positive");
  }

  await ensureBalance(userId);

  await runTransaction(db, async (t) => {
    const userRef = doc(db, "users", userId);
    const snap = await t.get(userRef);
    if (!snap.exists()) throw new Error("User record not found");

    const data = snap.data() as any;
    const currentWallet = Number(data.walletBalance) ?? DEFAULT_STARTING_BALANCE;
    const currentInvested = Number(data.investedBalance) || 0;

    if (currentWallet < amount) {
      throw new Error(`Insufficient wallet balance ($${currentWallet.toFixed(2)}). Unable to allocate $${amount.toFixed(2)}.`);
    }

    t.update(userRef, {
      walletBalance: Math.round((currentWallet - amount) * 100) / 100,
      investedBalance: Math.round((currentInvested + amount) * 100) / 100,
    });
  });

  const txRef = collection(db, "transactions");
  await addDoc(txRef, {
    senderId: userId,
    recipientId: "aeris-investment-portfolio",
    kind: "send",
    amount,
    category: "Savings",
    note: "Invested in 70/20/10 Portfolio (Equity, Bonds, Gold)",
    createdAt: Date.now(),
    statusUpdatedAt: Date.now(),
    status: "completed",
  } as P2PTransaction);
}

/** Withdraw / liquidate funds from investedBalance back into spendable walletBalance. */
export async function withdrawInvestedToWallet(userId: string, amount: number): Promise<void> {
  if (amount <= 0 || !Number.isFinite(amount)) {
    throw new Error("Withdrawal amount must be positive");
  }

  await ensureBalance(userId);

  await runTransaction(db, async (t) => {
    const userRef = doc(db, "users", userId);
    const snap = await t.get(userRef);
    if (!snap.exists()) throw new Error("User record not found");

    const data = snap.data() as any;
    const currentWallet = Number(data.walletBalance) ?? DEFAULT_STARTING_BALANCE;
    const currentInvested = Number(data.investedBalance) || 0;

    if (currentInvested < amount) {
      throw new Error(`Cannot withdraw $${amount.toFixed(2)}. Current invested portfolio is $${currentInvested.toFixed(2)}.`);
    }

    t.update(userRef, {
      walletBalance: Math.round((currentWallet + amount) * 100) / 100,
      investedBalance: Math.max(0, Math.round((currentInvested - amount) * 100) / 100),
    });
  });

  const txRef = collection(db, "transactions");
  await addDoc(txRef, {
    senderId: "aeris-investment-portfolio",
    recipientId: userId,
    kind: "send",
    amount,
    category: "Income",
    note: "Liquidated Portfolio Allocation to Wallet",
    createdAt: Date.now(),
    statusUpdatedAt: Date.now(),
    status: "completed",
  } as P2PTransaction);
}
