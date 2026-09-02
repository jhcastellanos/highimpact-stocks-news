import { formatPct, formatUsd } from "@/lib/format";
import type { NumericFact } from "@/lib/types";

export type CompanyFundamentals = {
  ticker: string;
  companyName: string;
  marketCap: number | null;
  annualRevenue: number | null;
  lastPrice: number | null;
  sector: string | null;
  industry: string | null;
};

export function numericFact(value: number | null, disclosure: NumericFact["disclosure"] = value == null ? "unknown" : "disclosed"): NumericFact {
  return { value, disclosure };
}

export function describeMateriality(input: {
  contractValue?: number | null;
  offeringAmount?: number | null;
  annualRevenue?: number | null;
  marketCap?: number | null;
  estimated?: boolean;
}): string {
  const prefix = input.estimated ? "ESTIMATED: " : "";
  if (input.contractValue && input.annualRevenue && input.annualRevenue > 0) {
    const pct = (input.contractValue / input.annualRevenue) * 100;
    return `${prefix}Contract represents approximately ${pct.toFixed(0)}% of current annual revenue (${formatUsd(input.contractValue)} vs ${formatUsd(input.annualRevenue)} revenue).`;
  }
  if (input.contractValue && input.marketCap && input.marketCap > 0) {
    const pct = (input.contractValue / input.marketCap) * 100;
    return `Contract value is ${formatPct(pct, true)} of current market cap. Annual revenue is unknown.`;
  }
  if (input.offeringAmount && input.marketCap && input.marketCap > 0) {
    const pct = (input.offeringAmount / input.marketCap) * 100;
    return `Offering size is ${formatPct(pct, true)} of current market cap (${formatUsd(input.offeringAmount)} vs ${formatUsd(input.marketCap)}).`;
  }
  if (input.contractValue) {
    return `Disclosed amount ${formatUsd(input.contractValue)}. Revenue and market cap not available, so relative materiality is unknown.`;
  }
  if (input.offeringAmount) {
    return `Disclosed offering ${formatUsd(input.offeringAmount)}. Market cap not available, so dilution is unknown.`;
  }
  return "Materiality versus revenue or market cap is unknown because the required figures were not disclosed.";
}

export function ratioPct(numerator: number | null, denominator: number | null): NumericFact {
  if (numerator == null || denominator == null || denominator <= 0) {
    return { value: null, disclosure: "unknown" };
  }
  return { value: (numerator / denominator) * 100, disclosure: "estimated", unit: "percent" };
}
