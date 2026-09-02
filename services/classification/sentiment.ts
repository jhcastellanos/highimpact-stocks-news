import type { EventType, Form4Kind, Sentiment } from "@/lib/types";
import { NEGATIVE_HIGHLIGHT_TYPES } from "@/lib/types";

const STRONGLY_NEGATIVE: EventType[] = [
  "BANKRUPTCY",
  "DELISTING",
  "FDA_REJECTION",
  "GUIDANCE_LOWERED",
  "REVERSE_SPLIT",
];

const NEGATIVE: EventType[] = [
  ...NEGATIVE_HIGHLIGHT_TYPES.filter((t) => !STRONGLY_NEGATIVE.includes(t)),
  "INSIDER_SELL",
  "ANALYST_DOWNGRADE",
  "PRICE_TARGET_LOWERED",
  "EPS_MISS",
  "REVENUE_MISS",
  "LAWSUIT",
  "INVESTIGATION",
  "CYBERSECURITY_INCIDENT",
  "RECALL",
];

const STRONGLY_POSITIVE: EventType[] = [
  "FDA_APPROVAL",
  "ACQUISITION",
  "NASA_SPACE_CONTRACT",
  "DEFENSE_CONTRACT",
  "GOVERNMENT_CONTRACT",
  "REVENUE_BEAT",
  "EPS_BEAT",
  "GUIDANCE_RAISED",
];

const POSITIVE: EventType[] = [
  "MAJOR_CONTRACT",
  "NEW_CUSTOMER",
  "MAJOR_CUSTOMER_WIN",
  "PARTNERSHIP",
  "STRATEGIC_PARTNERSHIP",
  "MERGER",
  "SHARE_BUYBACK",
  "DIVIDEND",
  "ANALYST_UPGRADE",
  "PRICE_TARGET_RAISED",
  "INSIDER_BUY",
  "NEW_PRODUCT",
  "TECHNOLOGY_BREAKTHROUGH",
  "GOVERNMENT_APPROVAL",
];

export function classifySentiment(input: {
  eventType: EventType;
  form4Kind?: Form4Kind;
  dilutionPct?: number | null;
  contractToRevenuePct?: number | null;
}): Sentiment {
  if (input.form4Kind === "GRANT" || input.form4Kind === "OPTION_EXERCISE") return "NEUTRAL";
  if (input.form4Kind === "AUTOMATIC_SALE") return "NEUTRAL";

  if (input.eventType === "SHELF_REGISTRATION") return "MIXED";
  if (input.eventType === "PUBLIC_OFFERING" || input.eventType === "REGISTERED_DIRECT_OFFERING") {
    if ((input.dilutionPct ?? 0) >= 20) return "STRONGLY_NEGATIVE";
    return "NEGATIVE";
  }

  if (STRONGLY_NEGATIVE.includes(input.eventType)) return "STRONGLY_NEGATIVE";
  if (NEGATIVE.includes(input.eventType)) return "NEGATIVE";
  if (STRONGLY_POSITIVE.includes(input.eventType)) {
    if ((input.contractToRevenuePct ?? 0) >= 50) return "STRONGLY_POSITIVE";
    return "STRONGLY_POSITIVE";
  }
  if (POSITIVE.includes(input.eventType)) {
    if ((input.contractToRevenuePct ?? 0) >= 100) return "STRONGLY_POSITIVE";
    return "POSITIVE";
  }
  if (input.eventType === "EARNINGS" || input.eventType === "CEO_CHANGE" || input.eventType === "CFO_CHANGE") {
    return "MIXED";
  }
  return "NEUTRAL";
}
