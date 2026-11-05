import { NextResponse } from "next/server"

type IndexQuote = {
  symbol: string
  name: string
  currency: string
  price: number
  changePercent: number
  asOf: string
}

type YahooChartResponse = {
  chart?: {
    error?: { description?: string } | null
    result?: Array<{
      meta?: {
        currency?: string
        longName?: string
        shortName?: string
        regularMarketPrice?: number
        regularMarketChangePercent?: number
        regularMarketTime?: number
      }
    }> | null
  }
}

const marketIndices = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^NSEI", label: "NIFTY 50" },
  { symbol: "^STOXX50E", label: "EURO STOXX 50" },
  { symbol: "^N225", label: "Nikkei 225" },
]

async function fetchIndex(
  index: (typeof marketIndices)[number],
  signal: AbortSignal,
): Promise<IndexQuote> {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(index.symbol)}`)
  url.searchParams.set("range", "5d")
  url.searchParams.set("interval", "1d")

  const response = await fetch(url, {
    signal,
    cache: "no-store",
    headers: { "User-Agent": "AerisFinanceDashboard/1.0" },
  })
  if (!response.ok) {
    throw new Error(`${index.label} quote request failed (${response.status}).`)
  }

  const payload = await response.json() as YahooChartResponse
  const result = payload.chart?.result?.[0]
  const meta = result?.meta
  if (
    !meta ||
    typeof meta.regularMarketPrice !== "number" ||
    !Number.isFinite(meta.regularMarketPrice) ||
    typeof meta.regularMarketChangePercent !== "number" ||
    !Number.isFinite(meta.regularMarketChangePercent) ||
    typeof meta.regularMarketTime !== "number"
  ) {
    throw new Error(payload.chart?.error?.description || `${index.label} quote was missing current market fields.`)
  }

  return {
    symbol: index.symbol,
    name: meta.longName || meta.shortName || index.label,
    currency: meta.currency || "Index points",
    price: meta.regularMarketPrice,
    changePercent: meta.regularMarketChangePercent,
    asOf: new Date(meta.regularMarketTime * 1000).toISOString(),
  }
}

async function callGroq(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string | null> {
  const models = ["openai/gpt-oss-20b", "llama-3.3-70b-versatile"]
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
          temperature: 0.2,
          max_completion_tokens: 900,
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) continue
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (typeof content === "string" && content.trim()) {
        return content.trim()
      }
    } catch {
      continue
    }
  }
  return null
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string | null> {
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
          temperature: 0.2,
          max_tokens: 900,
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) continue
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (typeof content === "string" && content.trim()) {
        return content.trim()
      }
    } catch {
      continue
    }
  }
  return null
}

function generateDeterministicInsight(quotes: IndexQuote[], monthlyInvestment: number, reserve: number): string {
  const avgChange = quotes.reduce((acc, q) => acc + q.changePercent, 0) / (quotes.length || 1)
  const tone = avgChange >= 0 ? "modestly positive" : "cautious"

  return `CURRENT SNAPSHOT
Global market benchmarks are currently trading in ${tone} territory across major exchanges. Leading indices including the S&P 500, Nifty 50, Euro Stoxx 50, and Nikkei 225 reflect normal daily session movements. These short-term price adjustments represent typical macroeconomic flow rather than structural portfolio disruptions.

WHAT THIS MEANS FOR THE PLAN
With a proposed monthly allocation of $${monthlyInvestment.toFixed(2)}, maintaining a disciplined dollar-cost averaging approach across broad-market global equities and bonds helps insulate your portfolio from day-to-day noise. Daily market oscillations should not dictate emotional portfolio changes.

PRACTICAL NEXT STEPS
Confirm that costly short-term debt is extinguished and that your emergency cash reserve ($${reserve.toFixed(2)} target) is intact before committing new investment capital. Deploy savings into low-fee, broadly diversified index funds aligned with your country, tax profile, and time horizon.`
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid investment review request." }, { status: 400 })
    }
    const input = body as Record<string, unknown>
    const monthlyIncome = input.monthlyIncome
    if (
      typeof monthlyIncome !== "number" ||
      !Number.isFinite(monthlyIncome) ||
      monthlyIncome <= 0 ||
      monthlyIncome > 1_000_000_000
    ) {
      return NextResponse.json({ error: "A valid, positive monthly income is required." }, { status: 400 })
    }

    const monthlySavings = monthlyIncome * 0.2
    const monthlyInvestment = monthlySavings * 0.7
    const reserve = monthlySavings - monthlyInvestment

    const groqKey = process.env.GROQ_API_KEY?.trim()
    const geminiKey = process.env.GEMINI_API_KEY?.trim()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)
    let marketQuotes: IndexQuote[]
    try {
      const results = await Promise.allSettled(
        marketIndices.map((index) => fetchIndex(index, controller.signal)),
      )
      marketQuotes = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : [])
    } finally {
      clearTimeout(timeout)
    }

    if (marketQuotes.length === 0) {
      return NextResponse.json(
        { error: "Current market data could not be retrieved. Please retry later; no market-based AI advice was generated." },
        { status: 502 },
      )
    }

    const marketAsOf = marketQuotes
      .map((quote) => new Date(quote.asOf).getTime())
      .reduce((latest, time) => Math.max(latest, time), 0)
    const sourceUrl = "https://finance.yahoo.com/"

    const systemPrompt = `You are Aeris AI, a cautious financial education assistant. You are given factual market quotes retrieved moments ago from a market data feed. Do not claim to have researched any facts beyond the supplied data. Never predict or guarantee profit, tell the user to buy or sell a specific security, or imply that short-term index changes forecast long-term returns. Explain uncertainty clearly.`
    const userPrompt = `Write a clear, professional current-market investment review using only these supplied facts.

User's monthly profile income (entered in USD): $${monthlyIncome.toFixed(2)}
Illustrative amount to invest this month (70% of a 20% savings target): $${monthlyInvestment.toFixed(2)}
Illustrative amount retained for debt/emergency savings (30% of that savings target): $${reserve.toFixed(2)}

Retrieved market index snapshots:
${marketQuotes.map((quote) => `- ${quote.name} (${quote.symbol}): ${quote.price.toLocaleString()} ${quote.currency}; reported daily change ${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%; quote time ${quote.asOf}.`).join("\n")}

Market data source: Yahoo Finance chart feed (${sourceUrl}). These are index snapshots, not a complete assessment of all world markets. Quote timestamps can differ by exchange and quotes may be delayed or from the latest session, not live.

Give 3 titled, distinct short sections in plain text:
CURRENT SNAPSHOT — summarize the observed data neutrally; explicitly mention that markets are mixed or limited if appropriate.
WHAT THIS MEANS FOR THE PLAN — connect the supplied monthly amount with a diversified, regular-investing approach; explain that one-day moves are not a reason to chase or panic.
PRACTICAL NEXT STEPS — mention checking emergency savings and high-interest debt before investing, using regulated low-cost diversified funds suited to the user's country, fees, tax rules, time horizon, and risk tolerance; do not name a fund as a buy recommendation.

Use the actual quote values and dates. Limit the whole answer to 180 words. State that the 70/30 rule is only an adjustable illustration. Do not invent an asset allocation or assume the user has no debt/emergency fund. Include that this is educational, not personalized financial advice.`

    let insight: string | null = null

    // 1. Try Groq (Primary)
    if (groqKey) {
      insight = await callGroq(groqKey, systemPrompt, userPrompt)
    }

    // 2. Try Google Gemini (Fallback)
    if (!insight && geminiKey) {
      insight = await callGemini(geminiKey, systemPrompt, userPrompt)
    }

    // 3. Deterministic market insight using real quotes (Guarantee)
    if (!insight) {
      insight = generateDeterministicInsight(marketQuotes, monthlyInvestment, reserve)
    }

    return NextResponse.json({
      insight,
      quotes: marketQuotes,
      dataAsOf: new Date(marketAsOf).toISOString(),
      sourceUrl,
    })
  } catch (error) {
    const aborted = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")
    console.error("Investment review route failed:", error)
    return NextResponse.json(
      { error: aborted ? "Fetching current market data timed out. Please try again." : "Unable to generate a current-market review. Please try again." },
      { status: aborted ? 504 : 500 },
    )
  }
}
