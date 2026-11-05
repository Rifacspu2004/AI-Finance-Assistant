"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2, Lightbulb, ShieldCheck, Sparkles, TrendingUp } from "lucide-react"

type AdviceStep = {
  title: string
  detail: string
}

function parseAdviceSteps(advice: string): AdviceStep[] {
  const lines = advice
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\*\*/g, ""))
    .filter(Boolean)

  const listedLines = lines.filter((line) => /^(?:[-*•]|\d+[.)])\s*/.test(line))
  const contentLines = listedLines.length > 0
    ? listedLines
    : lines

  return contentLines.map((line) => {
    const cleaned = line.replace(/^(?:[-*•]|\d+[.)])\s*/, "")
    const [title, ...detailParts] = cleaned.split(/\s+[—–:]\s+/, 2)

    return {
      title: detailParts.length ? title : listedLines.length > 0 ? "Recommendation" : "Personalized guidance",
      detail: detailParts.length ? detailParts.join(" — ") : cleaned,
    }
  })
}

const stepIcons = [ShieldCheck, TrendingUp, Lightbulb]
const stepColors = ["text-chart-3", "text-primary", "text-chart-4"]

export function AiAdvicePanel({ advice }: { advice: string }) {
  const steps = parseAdviceSteps(advice)
  const [activeStep, setActiveStep] = useState(0)
  if (!steps.length) return null

  const selectedStep = Math.min(activeStep, steps.length - 1)
  const currentStep = steps[selectedStep]
  const StepIcon = stepIcons[selectedStep % stepIcons.length]

  if (!currentStep) return null

  return (
    <section
      aria-label="AI financial stability recommendations"
      className="overflow-hidden rounded-3xl border border-primary/20 bg-card shadow-sm"
    >
      <div className="bg-primary/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Aeris AI • Your next best moves
            </p>
            <h3 className="mt-1 font-serif text-lg font-bold text-card-foreground">
              A clearer path to financial stability
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Explore each recommendation for practical ways to strengthen your plan.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div role="group" aria-label="Financial advice steps" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {steps.map((step, index) => (
            <button
              key={`${step.title}-${index}`}
              type="button"
              aria-current={selectedStep === index ? "step" : undefined}
              onClick={() => setActiveStep(index)}
              className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                selectedStep === index
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-secondary"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-[10px] font-bold">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="line-clamp-2">{step.title}</span>
            </button>
          ))}
        </div>

        <div
          aria-live="polite"
          className="mt-4 rounded-2xl border border-border bg-background p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary ${stepColors[selectedStep % stepColors.length]}`}>
              <StepIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Step {selectedStep + 1} of {steps.length}
              </p>
              <h4 className="mt-1 font-serif text-base font-bold text-foreground">
                {currentStep.title}
              </h4>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {currentStep.detail}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {steps.map((step, index) => (
              <span
                key={`${step.title}-progress-${index}`}
                className={`h-1.5 rounded-full transition-all ${
                  selectedStep === index ? "w-7 bg-primary" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-chart-3" />
            Personalized to your selected strategy
            {selectedStep < steps.length - 1 && (
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
