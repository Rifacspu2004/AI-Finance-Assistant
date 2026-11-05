// app/api/ai-advice/route.ts
import { NextResponse } from "next/server"

async function callGroq(apiKey: string, systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string | null> {
  const models = ["openai/gpt-oss-20b"]
  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_completion_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) {
        console.error(`[AI advice] Groq returned HTTP ${res.status} for model ${model}.`)
        if (res.status === 401 || res.status === 403) {
          console.error("[AI advice] Check that GROQ_API_KEY is valid and enabled; restart the dev server after changing .env.local.")
          return null
        }
        continue
      }
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (typeof content === "string" && content.trim() && !/^no advice generated\.?$/i.test(content.trim())) {
        return content.trim()
      }
    } catch (error) {
      console.error(
        `[AI advice] Groq request failed: ${error instanceof Error ? error.message : "Unknown network error."}`
      )
    }
  }
  return null
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string | null> {
  // Google AI Studio OpenAI-compatible endpoint
  const models = ["gemini-1.5-flash", "gemini-2.0-flash"]
  for (const model of models) {
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) continue
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (typeof content === "string" && content.trim() && !/^no advice generated\.?$/i.test(content.trim())) {
        return content.trim()
      }
    } catch {
      continue
    }
  }
  return null
}

function generateFallbackBudgetPlan(data: Record<string, unknown>): string {
  const needs = Number(data.needs) || 0
  const wants = Number(data.wants) || 0
  const savings = Number(data.savings) || 0
  const monthly = Number(data.monthlyIncome) || 0

  return `SUMMARY
Based on your income profile of $${monthly}/month, this plan applies the balanced 50/30/20 framework as a structured starting blueprint. It organizes essentials, discretionary spending, and savings into predictable targets without guessing your private obligations.

NEEDS — $${needs}/month
Your $${needs}/month needs allocation should support foundational essentials including housing, utilities, groceries, transit, and healthcare. Keep fixed commitments within this boundary to preserve financial resilience.

WANTS — $${wants}/month
Your $${wants}/month wants allocation accommodates leisure, dining out, hobbies, and personal subscriptions. Setting this deliberate ceiling helps prevent lifestyle creep while allowing balanced lifestyle enjoyment.

SAVINGS — $${savings}/month
Your $${savings}/month savings target is recommended in progressive phases: first establish an immediate liquid reserve, resolve high-interest liabilities, and then channel surplus funds into diversified long-term wealth generation.

INVESTMENTS
Once short-term emergency liquidity is secured, consider broad-market index funds and stable fixed-income instruments. A long-term horizon and low expense ratios are essential pillars for compounding returns safely.

EMERGENCY FUND
Aim to build 3 to 6 months of essential living expenses stored in an accessible, low-risk cash account. This reserve shields your core assets from being liquidated during unexpected life events.

KEY TIPS
1. Automate your monthly $${savings} transfer on payday to ensure consistent savings habits.
2. Audit recurring subscriptions and renegotiate utility rates periodically to minimize fixed overhead.
3. Separate emergency cash into a dedicated high-yield account away from daily spending accounts.
4. Review your financial allocations annually or whenever your compensation structure adjusts.

WARNINGS
The 50/30/20 guideline is an educational framework that must be adapted to your local cost of living and specific obligations. Never allocate emergency funds or bill money to volatile financial assets.`
}

function generateFallbackCalculatorAdvice(data: Record<string, unknown>): string {
  const needs = Number(data.needs) || 0
  const wants = Number(data.wants) || 0
  const savings = Number(data.savings) || 0

  return `1. Formalize Your Allocation — Direct $${needs} to essentials, $${wants} to lifestyle, and $${savings} toward savings each month. Automating these transfers right when your income arrives ensures consistency across all cycles.

2. Build and Safeguard Liquidity — Focus your initial savings effort on securing 3 to 6 months of basic living needs in accessible, low-risk accounts. Having an accessible reserve protects you from unexpected market or life shocks without derailing your plan.

3. Schedule Periodic Financial Reviews — Rebalance your categories every six months to verify that actual spending aligns with your intended targets. Making gradual adjustments keeps your financial strategy resilient against changing costs.`
}

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>

    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json(
        { advice: "Invalid request payload. Please retry with a valid JSON body." },
        { status: 400 }
      )
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { advice: "Invalid request payload. Expected an object." },
        { status: 400 }
      )
    }

    const groqKey = process.env.GROQ_API_KEY?.trim()
    const geminiKey = process.env.GEMINI_API_KEY?.trim()

    // ── Budget page calls with { budgetMode: "full_plan", ... }
    // ── Calculator calls with { income, mode, needs, wants, savings, persona }
    const isBudgetPage = body.budgetMode === "full_plan"

    let systemPrompt: string
    let userPrompt: string

    if (isBudgetPage) {
      const { fullName, annualIncome, monthlyIncome, employmentStatus, sourceOfFunds, accountType, country, needs, wants, savings } = body

      systemPrompt = `You are Aeris AI, a careful personal-finance education assistant. Be clear, practical, and honest about uncertainty. Never claim to be a licensed or certified financial professional, invent personal facts, guarantee returns, or present estimates as promises.`

      userPrompt = `Create a comprehensive financial plan for this person:

Name: ${fullName || "User"}
Country: ${country || "Unknown"}
Employment: ${employmentStatus || "Unknown"}
Source of Funds: ${sourceOfFunds || "Unknown"}
Account Type: ${accountType || "checking"}
Annual Income: $${annualIncome}
Monthly Income: $${monthlyIncome}

MONTHLY 50/30/20 SPLIT:
- Needs (50%): $${needs}/month
- Wants (30%): $${wants}/month  
- Savings/Investments (20%): $${savings}/month

Write your response in this EXACT format with these EXACT section headers. Put each section header on its own line without Markdown characters. Do not wrap headers or phrases in asterisks. Use numbered plain-text lines for KEY TIPS. Treat each allocation as a planning target, not a known expense:

SUMMARY
[2-3 useful sentences connecting the stated profile and income to the plan. Do not infer their actual expenses, debts, dependants, or goals.]

NEEDS — $${needs}/month
[Explain that this is the needs allocation. Suggest categories such as housing, utilities, groceries, transport, and healthcare, but do not assign made-up dollar amounts to individual categories.]

WANTS — $${wants}/month
[Explain that this is the wants allocation and give practical examples, without inventing their actual spending.]

SAVINGS — $${savings}/month
[Give a sensible order of priorities: meet essential bills, address high-interest debt, build an accessible emergency reserve, then consider diversified long-term investing if suitable. If splitting this amount, clearly label it as an example rather than a known requirement.]

INVESTMENTS
[Discuss broad, diversified investment categories and the importance of time horizon, fees, and risk tolerance. Do not promise or forecast returns, provide individual security picks, or assume the person is ready to invest before addressing expensive debt and emergency savings.]

EMERGENCY FUND
[Describe a common target of 3-6 months of essential expenses, explain that the exact target depends on actual expenses and income stability, and suggest keeping it accessible and low risk. Do not calculate a target from income alone.]

KEY TIPS
[Give 4 specific, actionable tips tied to this plan and stated information. Do not assume debts, expenses, or family circumstances.]

WARNINGS
[Give relevant cautions, including that the 50/30/20 split is a starting point that may need adjustment to local costs and actual obligations. Do not invent risks specific to this person.]`

    } else {
      // Calculator page — original format
      const { income, mode, needs, wants, savings, persona } = body
      systemPrompt = `You are Aeris AI, a careful personal-finance education assistant. Give clear, practical recommendations based only on the supplied numbers. Never claim to be a licensed financial professional, invent personal facts, or guarantee investment returns.`
      userPrompt = `Analyze this budget profile:
Monthly income: $${income}
Strategy: ${mode}
Needs: $${needs}
Wants: $${wants}
Savings: $${savings}
Persona: ${persona}

Return exactly 3 substantial, personalized recommendations, one per paragraph, in this format:
1. [Concise action title] — [Two or three complete sentences. Explain a concrete action, why it fits this income and strategy, and how to start this month.]
2. [Concise action title] — [Two or three complete sentences. Give a distinct financial-stability improvement, using the supplied allocation amounts accurately where relevant.]
3. [Concise action title] — [Two or three complete sentences. Give a distinct, realistic next step and a way to review progress.]

Recommendations must be financially responsible: prioritize essential expenses, high-interest debt repayment, and an accessible emergency reserve before suggesting investing. Do not assume the person has debt or savings already; phrase those as conditional checks. Treat the supplied allocation as a proposed budget, not as verified actual spending. Do not recommend individual securities or predict returns. Do not repeat generic slogans. Do not add an introduction, markdown headings, or a conclusion.`
    }

    const maxTokens = isBudgetPage ? 3000 : 1200

    // 1. Try Groq (Primary)
    if (groqKey) {
      const groqAdvice = await callGroq(groqKey, systemPrompt, userPrompt, maxTokens)
      if (groqAdvice) {
        return NextResponse.json({ advice: groqAdvice, provider: "groq" })
      }
    }

    // 2. Try Google Gemini (Fallback Model)
    if (geminiKey) {
      const geminiAdvice = await callGemini(geminiKey, systemPrompt, userPrompt, maxTokens)
      if (geminiAdvice) {
        return NextResponse.json({ advice: geminiAdvice, provider: "gemini" })
      }
    }

    // 3. High-Quality Deterministic Educational Fallback (Never leaves user with error)
    const fallbackAdvice = isBudgetPage
      ? generateFallbackBudgetPlan(body)
      : generateFallbackCalculatorAdvice(body)

    return NextResponse.json({ advice: fallbackAdvice, provider: "fallback" })

  } catch (error) {
    console.error("AI Advice API Error:", error)
    return NextResponse.json(
      { advice: `Internal Server Error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    )
  }
}
