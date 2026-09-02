import { parseMoney } from "@/lib/format";
import type { NumericFact } from "@/lib/types";
import { numericFact, ratioPct } from "@/services/classification/materiality";

export type OfferingAnalysis = {
  amountRaised: NumericFact;
  offeringPctMarketCap: NumericFact;
  estimatedDilutionPct: NumericFact;
  offeringPrice: NumericFact;
  discountToLastPrice: NumericFact;
};

export function analyzeOffering(text: string, marketCap: number | null, lastPrice: number | null): OfferingAnalysis {
  const amount = extractOfferingAmount(text);
  const price = extractOfferingPrice(text);
  const dilutionFromShares = extractDilutionPct(text);

  const offeringPct = ratioPct(amount, marketCap);
  const dilution =
    dilutionFromShares.value != null
      ? dilutionFromShares
      : offeringPct.value != null
        ? { value: offeringPct.value, disclosure: "estimated" as const, unit: "percent" }
        : numericFact(null, "unknown");

  let discount = numericFact(null, "unknown");
  if (price != null && lastPrice != null && lastPrice > 0) {
    discount = {
      value: ((lastPrice - price) / lastPrice) * 100,
      disclosure: "estimated",
      unit: "percent",
    };
  }

  return {
    amountRaised: numericFact(amount, amount == null ? "not_disclosed" : "disclosed"),
    offeringPctMarketCap: offeringPct,
    estimatedDilutionPct: dilution,
    offeringPrice: numericFact(price, price == null ? "not_disclosed" : "disclosed"),
    discountToLastPrice: discount,
  };
}

function extractOfferingAmount(text: string): number | null {
  const windowMatch = text.match(
    /(?:aggregate|gross|offering|securities|shares).{0,80}\$?\s*[\d,.]+\s*(?:million|billion|m|bn)?/i,
  );
  if (windowMatch) {
    const parsed = parseMoney(windowMatch[0]);
    if (parsed) return parsed;
  }
  const general = text.match(
    /\$\s*[\d,.]+(?:\s*(?:million|billion))?\s*(?:of\s+)?(?:common stock|shares|securities|notes)?/i,
  );
  return general ? parseMoney(general[0]) : parseMoney(text);
}

function extractOfferingPrice(text: string): number | null {
  const m = text.match(/(?:offering price|public offering price|purchase price)\D{0,20}\$?\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function extractDilutionPct(text: string): NumericFact {
  const m = text.match(/dilut\w*\D{0,24}(\d+(?:\.\d+)?)\s*%/i);
  if (!m) return numericFact(null, "unknown");
  return { value: Number(m[1]), disclosure: "disclosed", unit: "percent" };
}
