// components/dashboard/universal-calculator.tsx
"use client"

import { useState, useEffect } from "react"
import { Sparkles, RefreshCw, UserCheck, HelpCircle, Lock, Flame, Scale, ShieldCheck, ArrowRight, Zap, Target, TrendingUp, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type BudgetMode = "lavish" | "moderate" | "stingy"

export interface BudgetProfile {
  needs: number
  wants: number
  savings: number
  whereToSpend: string[]
  whatToAvoid: string[]
  investmentPicks: string[]
  mindsetTip: string
}

export default function UniversalCalculator() {
  const [targetName, setTargetName] = useState("General Case")
  const [monthlyIncome, setMonthlyIncome] = useState<number>(5000)
  const [selectedMode, setSelectedMode] = useState<BudgetMode>("moderate")

  // AI Integration States
  const [aiAdvice, setAiAdvice] = useState<string>("")
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false)

  const calculateProfile = (amt: number, m: BudgetMode): BudgetProfile => {
    if (m === "lavish") {
      return {
        needs: amt * 0.40,
        wants: amt * 0.45,
        savings: amt * 0.15,
        whereToSpend: ["High-end experiential dining & elite networking", "Time-saving premium services", "International travel & upskilling"],
        whatToAvoid: ["High-interest consumer credit debt", "Leasing depreciating assets without buffers"],
        investmentPicks: ["High-Growth Equities (Tech/AI Sector)", "Index Growth ETFs (QQQ/VOO)", "Venture Assets (5% allocation)"],
        mindsetTip: "Focus on aggressively scaling gross income to sustain high lifestyle expenditure without depleting savings."
      }
    }
    if (m === "stingy") {
      return {
        needs: amt * 0.40,
        wants: amt * 0.10,
        savings: amt * 0.50,
        whereToSpend: ["Bulk meal prep & staple groceries", "High-return certifications", "Utility & energy efficiency"],
        whatToAvoid: ["Impulse retail shopping", "Frequent dining out", "Brand-name luxury markups"],
        investmentPicks: ["High-Yield Savings Accounts (HYSA)", "Short-Term Treasury Bills (T-Bills)", "Dividend Growth ETFs (SCHD)"],
        mindsetTip: "Maximize compounding velocity by automatically routing 50%+ of net cash flow into yield-bearing assets."
      }
    }
    return {
      needs: amt * 0.50,
      wants: amt * 0.30,
      savings: amt * 0.20,
      whereToSpend: ["Quality housing & healthcare insurance", "Balanced entertainment & dining", "Emergency liquid reserves"],
      whatToAvoid: ["Uncontrolled lifestyle creep", "Unused recurring monthly software subscriptions"],
      investmentPicks: ["Total Stock Market Index Funds (VTI)", "Balanced Target-Date Funds", "High-Yield Savings Reserves"],
      mindsetTip: "Maintain strict equilibrium between immediate lifestyle comfort and long-term retirement security."
    }
  }

  const profile = calculateProfile(monthlyIncome, selectedMode)
  const totalAllocated = profile.needs + profile.wants + profile.savings
  const isBalanced = monthlyIncome > 0 && totalAllocated === monthlyIncome

  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false)

  useEffect(() => {
    const mockAuthCheck = localStorage.getItem("user_session_active") === "true"
    setIsUserLoggedIn(mockAuthCheck)
  }, [])

  // Call the Next.js API Route (/api/ai-advice)
  const handleGenerateAiAdvice = async () => {
    setIsLoadingAi(true)
    try {
      const res = await fetch("/api/ai-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          income: monthlyIncome,
          mode: selectedMode,
          needs: profile.needs,
          wants: profile.wants,
          savings: profile.savings,
          persona: targetName,
        }),
      })
      const data = await res.json()
      if (data.advice) {
        setAiAdvice(data.advice)
      } else {
        setAiAdvice("Failed to retrieve custom AI insights.")
      }
    } catch {
      setAiAdvice("Network error connecting to AI endpoint.")
    } finally {
      setIsLoadingAi(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-5">
      {/* Scope Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl font-medium text-white shadow-sm transition-all",
            isUserLoggedIn ? "bg-primary" : "bg-muted-foreground/30"
          )}>
            {isUserLoggedIn ? <UserCheck className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Authentication Workspace Mode</span>
            <h2 className="text-sm font-semibold text-foreground -mt-0.5">
              {isUserLoggedIn ? "Authenticated Asset Workspace" : "Public Guest Mode (Frictionless Sandbox)"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isUserLoggedIn ? (
            <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold" onClick={() => { setTargetName("Dynamic Profile"); setMonthlyIncome(6500); }}>
              <UserCheck className="mr-1.5 h-3.5 w-3.5 text-primary" /> Sync Assets
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="rounded-xl text-xs border-dashed opacity-60 cursor-not-allowed">
              <Lock className="mr-1.5 h-3.5 w-3.5" /> Sync Locked
            </Button>
          )}
          <Button variant="secondary" size="sm" className="rounded-xl text-xs font-semibold" onClick={() => { setTargetName("Guest Scenario"); setMonthlyIncome(4000); setAiAdvice(""); }}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset Sandbox
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Parameters */}
        <section className="rounded-3xl border border-border bg-card p-6 space-y-5 shadow-sm lg:col-span-1">
          <div>
            <h3 className="text-lg font-bold text-foreground">Parameters</h3>
            <p className="text-xs text-muted-foreground">Adjust target metrics and pick your lifestyle mode</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Persona Name</label>
              <input 
                type="text" 
                value={targetName} 
                onChange={(e) => setTargetName(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring transition-all" 
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Monthly Income ($)</label>
              <input 
                type="number" 
                value={monthlyIncome || ""} 
                onChange={(e) => setMonthlyIncome(Math.max(0, Number(e.target.value)))}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm font-mono font-bold text-foreground outline-none focus:border-ring transition-all" 
              />
            </div>

            <hr className="border-border my-2" />

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Strategy & Lifestyle Mode</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { key: "stingy", label: "Frugal / Stingy", desc: "40% Needs | 10% Wants | 50% Yield", icon: ShieldCheck, color: "text-emerald-500" },
                  { key: "moderate", label: "Moderate Standard", desc: "50% Needs | 30% Wants | 20% Savings", icon: Scale, color: "text-sky-500" },
                  { key: "lavish", label: "Lavish / Growth", desc: "40% Needs | 45% Wants | 15% Growth", icon: Flame, color: "text-amber-500" }
                ].map((item) => {
                  const Icon = item.icon
                  const isActive = selectedMode === item.key
                  return (
                    <button
                      key={item.key}
                      onClick={() => setSelectedMode(item.key as BudgetMode)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-2xl border text-left transition-all",
                        isActive 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border bg-background/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Icon className={cn("h-4 w-4", item.color)} />
                          <span className="text-xs font-bold text-foreground">{item.label}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                      <div className={cn("h-2 w-2 rounded-full", isActive ? "bg-primary" : "bg-transparent")} />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Live Calculation & AI Output */}
        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Live Assessment ({targetName})</h3>
                <p className="text-xs text-muted-foreground">Dynamic lifestyle algorithm breakdown</p>
              </div>
              <span className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold font-mono",
                isBalanced ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
              )}>
                {isBalanced ? "Budget Fully Allocated" : "Income Required"}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                <span className="text-xs font-bold text-sky-500 uppercase tracking-wider">Fixed Needs</span>
                <p className="text-2xl font-bold font-mono text-foreground">${profile.needs.toLocaleString()}</p>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-sky-500 transition-all" style={{ width: `${selectedMode === "moderate" ? 50 : 40}%` }} />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Flexible Wants</span>
                <p className="text-2xl font-bold font-mono text-foreground">${profile.wants.toLocaleString()}</p>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all" style={{ width: `${selectedMode === "lavish" ? 45 : selectedMode === "moderate" ? 30 : 10}%` }} />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Savings & Investing</span>
                <p className="text-2xl font-bold font-mono text-emerald-500">${profile.savings.toLocaleString()}</p>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${selectedMode === "stingy" ? 50 : selectedMode === "moderate" ? 20 : 15}%` }} />
                </div>
              </div>
            </div>

            {/* Strategy Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-border pt-5 text-xs">
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                    <Target className="h-4 w-4 text-primary" /> Spend & Living Focus
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground leading-relaxed">
                    {profile.whereToSpend.map((item, idx) => <li key={idx}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-rose-500 flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-500" /> What to Avoid
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground leading-relaxed">
                    {profile.whatToAvoid.map((item, idx) => <li key={idx}>{item}</li>)}
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-emerald-500 flex items-center gap-1.5 mb-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-500" /> Recommended Asset Vehicles
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground leading-relaxed">
                    {profile.investmentPicks.map((item, idx) => <li key={idx}>{item}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl bg-muted/60 p-3 border border-border/80">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wider mb-1">
                    <Zap className="h-3.5 w-3.5 text-amber-500" /> Financial Mindset Tip
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{profile.mindsetTip}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Real AI API Trigger Engine */}
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-bold text-foreground">Live Gemini AI Advisor</h4>
                <Button 
                  size="sm" 
                  onClick={handleGenerateAiAdvice}
                  disabled={isLoadingAi}
                  className="h-8 rounded-xl text-xs font-semibold px-3 shadow-sm"
                >
                  {isLoadingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  {aiAdvice ? "Re-evaluate with AI" : "Generate Custom AI Insights"}
                </Button>
              </div>

              {aiAdvice ? (
                <div className="p-3.5 rounded-2xl bg-background border border-border text-xs text-foreground/90 leading-relaxed font-sans shadow-inner whitespace-pre-line">
                  {aiAdvice}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Click generate to send your monthly income of <strong>${monthlyIncome.toLocaleString()}</strong> and <strong>{selectedMode.toUpperCase()}</strong> strategy directly to Gemini for real-time wealth optimization.
                </p>
              )}

              {!isUserLoggedIn && (
                <div className="pt-2 border-t border-primary/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <p className="text-xs text-foreground/80 font-medium">
                    ⚡ Lock in this strategy! Register to track real assets, get auto notifications, and execute P2P transfers.
                  </p>
                  <Button size="sm" className="h-8 rounded-xl text-xs font-semibold px-4 whitespace-nowrap shadow-sm">
                    Register Free <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}