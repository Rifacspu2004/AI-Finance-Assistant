// app/api/ai-advice/route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { income, mode, needs, wants, savings, persona } = await req.json()

    const apiKey = process.env.GROQ_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        { advice: "Error: GROQ_API_KEY is missing in your .env.local file." },
        { status: 400 }
      )
    }

    const promptText = `Analyze this budget profile: Monthly Income: $${income}, Mode: ${mode}, Needs: $${needs}, Wants: $${wants}, Savings: $${savings}, Persona Name: ${persona}. Provide 3 direct, tactical wealth optimization bullet points in conversational advice.`

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b", // Updated active Groq model
        messages: [
          {
            role: "system",
            content: "You are an expert financial advisor. Provide concise, direct advice."
          },
          {
            role: "user",
            content: promptText
          }
        ],
        temperature: 0.2
      })
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        { advice: `Groq Cloud Error: ${data.error?.message || response.statusText}` },
        { status: response.status }
      )
    }

    const adviceText = data.choices?.[0]?.message?.content || "No advice generated."

    return NextResponse.json({ advice: adviceText })
  } catch (error: any) {
    console.error("Groq Cloud API Error:", error)
    return NextResponse.json(
      { advice: "Internal Server Error: Failed to reach Groq Cloud API." },
      { status: 500 }
    )
  }
}