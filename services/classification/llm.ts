import { getEnv } from "@/lib/env";
import type { EventType, Sentiment } from "@/lib/types";
import { EVENT_TYPES, SENTIMENTS } from "@/lib/types";

export type LlmAnalysis = {
  ticker: string;
  company: string;
  eventType: EventType;
  sentiment: Sentiment;
  impactScore: number;
  summary: string;
  whyItMatters: string;
  keyFactors: string[];
  risks: string[];
  materiality: string;
  timeHorizon: string;
  confidence: number;
};

const SYSTEM = `You are a market-moving news analyst. You only use facts present in the source text and provided fundamentals.
Never invent numbers, contracts, customers, relationships, or prices.
If a figure is missing, say "Not disclosed" or "Unknown".
If you compute a ratio from provided fundamentals, prefix with ESTIMATED.
Classify impact by likely effect on the stock, not by the press-release tone.
An offering described with upbeat language is still dilution for shareholders.
Do not predict that a stock will rise or fall by a percent. You may say Potentially Bullish, Potentially Bearish, High volatility expected, or Material catalyst.
Return JSON only.`;

export async function analyzeWithLlm(input: {
  headline: string;
  text: string;
  ticker: string | null;
  company: string | null;
  marketCap: number | null;
  revenue: number | null;
  source: string;
  eventType: EventType;
  sentiment: Sentiment;
  impactScore: number;
}): Promise<LlmAnalysis | null> {
  const env = getEnv();
  if (!env.openaiApiKey) return null;

  const user = JSON.stringify({
    headline: input.headline,
    articleOrFilingText: input.text.slice(0, 24_000),
    ticker: input.ticker,
    company: input.company,
    marketCap: input.marketCap ?? "Unknown",
    annualRevenue: input.revenue ?? "Unknown",
    source: input.source,
    precomputedEventType: input.eventType,
    precomputedSentiment: input.sentiment,
    precomputedImpactScore: input.impactScore,
    outputSchema: {
      ticker: "",
      company: "",
      eventType: "",
      sentiment: "",
      impactScore: 0,
      summary: "",
      whyItMatters: "",
      keyFactors: [],
      risks: [],
      materiality: "",
      timeHorizon: "",
      confidence: 0,
    },
  });

  try {
    const res = await fetch(`${env.openaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.openaiModel,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as LlmAnalysis;
    if (!EVENT_TYPES.includes(parsed.eventType)) parsed.eventType = input.eventType;
    if (!SENTIMENTS.includes(parsed.sentiment)) parsed.sentiment = input.sentiment;
    if (!Number.isFinite(parsed.impactScore)) parsed.impactScore = input.impactScore;
    parsed.ticker = parsed.ticker || input.ticker || "";
    parsed.company = parsed.company || input.company || "";
    parsed.keyFactors = Array.isArray(parsed.keyFactors) ? parsed.keyFactors.map(String) : [];
    parsed.risks = Array.isArray(parsed.risks) ? parsed.risks.map(String) : [];
    return parsed;
  } catch {
    return null;
  }
}
