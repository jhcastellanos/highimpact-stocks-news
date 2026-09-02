import { parseMoney } from "@/lib/format";
import type { NumericFact } from "@/lib/types";
import { numericFact, ratioPct } from "@/services/classification/materiality";

export type ContractAnalysis = {
  customer: string | null;
  contractValue: NumericFact;
  duration: string | null;
  industry: string | null;
  isGovernment: boolean | null;
  revenueImpact: string | null;
  isNewCustomer: boolean | null;
  isNewMarket: boolean | null;
  contractToRevenuePct: NumericFact;
  contractToMarketCapPct: NumericFact;
};

export function analyzeContract(
  text: string,
  headline: string,
  annualRevenue: number | null,
  marketCap: number | null,
): ContractAnalysis {
  const blob = `${headline}\n${text}`;
  const extracted = extractContractValue(blob);
  const value = extracted?.value ?? null;
  const customer = extractCustomer(blob);
  const duration = extractDuration(blob);
  const isGovernment = /\b(nasa|artemis|dod|department of defense|u\.?s\.? (army|navy|air force|government)|federal|pentagon|gsa)\b/i.test(
    blob,
  )
    ? true
    : null;
  const isNewCustomer = /\b(new\s+(customer|client|commercial customer)|selected by)\b/i.test(blob) ? true : null;
  const isNewMarket = /\bnew\s+(market|vertical|industry|category)\b/i.test(blob) ? true : null;

  return {
    customer,
    contractValue: numericFact(value, extracted?.disclosure ?? (value == null ? "not_disclosed" : "disclosed")),
    duration,
    industry: null,
    isGovernment,
    revenueImpact: null,
    isNewCustomer,
    isNewMarket,
    contractToRevenuePct: ratioPct(value, annualRevenue),
    contractToMarketCapPct: ratioPct(value, marketCap),
  };
}

function extractContractValue(text: string): { value: number; disclosure: NumericFact["disclosure"] } | null {
  const patterns = [
    /(?:contract|award|agreement|order).{0,80}\$?\s*[\d,.]+\s*(?:million|billion|m|bn)?/i,
    /\$\s*[\d,.]+\s*(?:million|billion)\s*(?:contract|award|agreement)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;
    if (/multi[- ]?million/i.test(m[0])) continue;
    const parsed = parseMoney(m[0]);
    if (parsed) return { value: parsed, disclosure: "disclosed" };
  }
  // Floor of "multi-million" is $1M. Never treat this as a disclosed exact size.
  if (/multi[- ]?million([- ]dollar)?/i.test(text)) {
    return { value: 1_000_000, disclosure: "estimated" };
  }
  return null;
}

function extractCustomer(text: string): string | null {
  const m = text.match(
    /(?:selected by|awarded by|from)\s+([A-Z][A-Za-z0-9&.\- ]{2,50}?)(?:,|\s+(?:to|for|has|will|for integration))/ ,
  );
  if (!m) return null;
  const name = m[1].trim();
  if (name.length < 3 || /the company|registrant/i.test(name)) return null;
  return name;
}

function extractDuration(text: string): string | null {
  const m = text.match(/(\d+)\s*[- ]\s*year|\b(multi[- ]year)\b|\b(\d+)\s+years?\b/i);
  return m ? m[0] : null;
}
