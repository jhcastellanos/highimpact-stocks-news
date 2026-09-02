import { clamp } from "@/lib/format";
import type { EventType, Form4Kind, ImpactBreakdown, SourceId } from "@/lib/types";
import { impactBandFromScore, marketCapBucket } from "@/lib/types";

const EVENT_IMPORTANCE: Record<EventType, number> = {
  BANKRUPTCY: 25,
  DELISTING: 24,
  FDA_APPROVAL: 23,
  FDA_REJECTION: 23,
  ACQUISITION: 22,
  MERGER: 21,
  NASA_SPACE_CONTRACT: 20,
  DEFENSE_CONTRACT: 19,
  GOVERNMENT_CONTRACT: 18,
  MAJOR_CONTRACT: 17,
  MAJOR_CUSTOMER_WIN: 16,
  PUBLIC_OFFERING: 18,
  REGISTERED_DIRECT_OFFERING: 18,
  REVERSE_SPLIT: 20,
  GUIDANCE_LOWERED: 17,
  GUIDANCE_RAISED: 20,
  CLINICAL_TRIAL: 14,
  NEW_CUSTOMER: 13,
  STRATEGIC_PARTNERSHIP: 12,
  ACTIVIST_13D: 14,
  INSIDER_BUY: 12,
  CYBERSECURITY_INCIDENT: 16,
  NASDAQ_COMPLIANCE: 14,
  DILUTION: 16,
  ATM_OFFERING: 14,
  PRIVATE_PLACEMENT: 15,
  SHELF_REGISTRATION: 10,
  CAPITAL_RAISE: 14,
  EARNINGS: 11,
  REVENUE_BEAT: 19,
  EPS_BEAT: 19,
  REVENUE_MISS: 13,
  EPS_MISS: 13,
  SHARE_BUYBACK: 10,
  DIVIDEND: 8,
  ANALYST_UPGRADE: 8,
  ANALYST_DOWNGRADE: 9,
  PRICE_TARGET_RAISED: 7,
  PRICE_TARGET_LOWERED: 7,
  INSIDER_SELL: 6,
  LARGE_STAKE_13G: 8,
  NEW_PRODUCT: 9,
  TECHNOLOGY_BREAKTHROUGH: 13,
  GOVERNMENT_APPROVAL: 14,
  DEBT_FINANCING: 9,
  PARTNERSHIP: 9,
  CEO_CHANGE: 12,
  CFO_CHANGE: 10,
  EXECUTIVE_DEPARTURE: 9,
  INVESTIGATION: 14,
  LAWSUIT: 10,
  RECALL: 14,
  OTHER_MATERIAL_EVENT: 8,
};

const MARKET_REACTION: Record<EventType, number> = {
  BANKRUPTCY: 15,
  DELISTING: 14,
  FDA_APPROVAL: 15,
  FDA_REJECTION: 15,
  REVERSE_SPLIT: 13,
  PUBLIC_OFFERING: 13,
  REGISTERED_DIRECT_OFFERING: 13,
  ACQUISITION: 12,
  NASA_SPACE_CONTRACT: 12,
  DEFENSE_CONTRACT: 11,
  GUIDANCE_LOWERED: 12,
  MAJOR_CONTRACT: 10,
  INSIDER_BUY: 8,
  EARNINGS: 9,
  OTHER_MATERIAL_EVENT: 5,
  GOVERNMENT_CONTRACT: 11,
  MERGER: 12,
  CLINICAL_TRIAL: 10,
  NEW_CUSTOMER: 8,
  PARTNERSHIP: 6,
  STRATEGIC_PARTNERSHIP: 7,
  REVENUE_BEAT: 14,
  EPS_BEAT: 14,
  REVENUE_MISS: 9,
  EPS_MISS: 9,
  GUIDANCE_RAISED: 14,
  SHARE_BUYBACK: 6,
  DIVIDEND: 5,
  ANALYST_UPGRADE: 5,
  ANALYST_DOWNGRADE: 6,
  PRICE_TARGET_RAISED: 4,
  PRICE_TARGET_LOWERED: 4,
  INSIDER_SELL: 4,
  ACTIVIST_13D: 10,
  LARGE_STAKE_13G: 5,
  NEW_PRODUCT: 6,
  TECHNOLOGY_BREAKTHROUGH: 9,
  MAJOR_CUSTOMER_WIN: 9,
  GOVERNMENT_APPROVAL: 10,
  CAPITAL_RAISE: 10,
  PRIVATE_PLACEMENT: 11,
  ATM_OFFERING: 9,
  SHELF_REGISTRATION: 6,
  DILUTION: 12,
  DEBT_FINANCING: 6,
  NASDAQ_COMPLIANCE: 9,
  CEO_CHANGE: 8,
  CFO_CHANGE: 6,
  EXECUTIVE_DEPARTURE: 6,
  INVESTIGATION: 10,
  LAWSUIT: 7,
  CYBERSECURITY_INCIDENT: 11,
  RECALL: 10,
};

function sourceScore(source: SourceId): number {
  if (source === "sec") return 10;
  if (source === "globenewswire" || source === "businesswire" || source === "prnewswire") return 8;
  return 6;
}

function companySizeEffect(marketCap: number | null, annualRevenue: number | null): number {
  const bucket = marketCapBucket(marketCap);
  if (bucket === "MICRO") return 15;
  if (bucket === "SMALL") return 12;
  if (bucket === "MID") return 6;
  if (bucket === "LARGE") return 3;
  if (bucket === "MEGA") return 1;
  if (annualRevenue != null && annualRevenue > 0) {
    if (annualRevenue < 50_000_000) return 15;
    if (annualRevenue < 500_000_000) return 12;
    if (annualRevenue < 5_000_000_000) return 6;
    return 3;
  }
  return 5;
}

function form4Importance(kind?: Form4Kind): number | null {
  if (kind === "OPEN_MARKET_PURCHASE") return 16;
  if (kind === "OPEN_MARKET_SALE") return 8;
  if (kind === "AUTOMATIC_SALE") return 3;
  if (kind === "GRANT" || kind === "OPTION_EXERCISE") return 2;
  return null;
}

export function scoreImpact(input: {
  eventType: EventType;
  source: SourceId;
  marketCap: number | null;
  annualRevenue: number | null;
  contractValue: number | null;
  offeringAmount: number | null;
  form4Kind?: Form4Kind;
  novelty: boolean;
}): ImpactBreakdown {
  let eventImportance = EVENT_IMPORTANCE[input.eventType] ?? 8;
  const f4 = form4Importance(input.form4Kind);
  if (f4 != null) eventImportance = f4;

  let financialMateriality = 4;
  const revenue = input.annualRevenue;
  const mcap = input.marketCap;
  if (input.contractValue && revenue && revenue > 0) {
    const ratio = input.contractValue / revenue;
    if (ratio >= 2) financialMateriality = 25;
    else if (ratio >= 1) financialMateriality = 22;
    else if (ratio >= 0.5) financialMateriality = 18;
    else if (ratio >= 0.2) financialMateriality = 14;
    else if (ratio >= 0.05) financialMateriality = 8;
    else financialMateriality = 3;
  } else if (input.contractValue && mcap && mcap > 0) {
    const ratio = input.contractValue / mcap;
    if (ratio >= 0.5) financialMateriality = 22;
    else if (ratio >= 0.2) financialMateriality = 16;
    else if (ratio >= 0.05) financialMateriality = 10;
    else financialMateriality = 4;
  } else if (input.offeringAmount && mcap && mcap > 0) {
    const ratio = input.offeringAmount / mcap;
    if (ratio >= 0.35) financialMateriality = 25;
    else if (ratio >= 0.2) financialMateriality = 20;
    else if (ratio >= 0.1) financialMateriality = 14;
    else financialMateriality = 8;
  } else if (input.eventType === "GUIDANCE_RAISED") {
    financialMateriality = 16;
  } else if (input.eventType === "REVENUE_BEAT" || input.eventType === "EPS_BEAT") {
    financialMateriality = 16;
  }

  const size = companySizeEffect(input.marketCap, input.annualRevenue);
  const sourceConfidence = sourceScore(input.source);
  const eventNovelty = input.novelty ? 10 : 4;
  const marketReactionPotential = MARKET_REACTION[input.eventType] ?? 5;

  const total = clamp(
    Math.round(
      eventImportance +
        financialMateriality +
        size +
        sourceConfidence +
        eventNovelty +
        marketReactionPotential,
    ),
    0,
    100,
  );

  return {
    eventImportance,
    financialMateriality,
    companySizeEffect: size,
    sourceConfidence,
    eventNovelty,
    marketReactionPotential,
    total,
  };
}

export { impactBandFromScore };
