export const EVENT_TYPES = [
  "MAJOR_CONTRACT",
  "GOVERNMENT_CONTRACT",
  "DEFENSE_CONTRACT",
  "NASA_SPACE_CONTRACT",
  "NEW_CUSTOMER",
  "PARTNERSHIP",
  "STRATEGIC_PARTNERSHIP",
  "ACQUISITION",
  "MERGER",
  "FDA_APPROVAL",
  "FDA_REJECTION",
  "CLINICAL_TRIAL",
  "EARNINGS",
  "REVENUE_BEAT",
  "EPS_BEAT",
  "REVENUE_MISS",
  "EPS_MISS",
  "GUIDANCE_RAISED",
  "GUIDANCE_LOWERED",
  "SHARE_BUYBACK",
  "DIVIDEND",
  "ANALYST_UPGRADE",
  "ANALYST_DOWNGRADE",
  "PRICE_TARGET_RAISED",
  "PRICE_TARGET_LOWERED",
  "INSIDER_BUY",
  "INSIDER_SELL",
  "ACTIVIST_13D",
  "LARGE_STAKE_13G",
  "NEW_PRODUCT",
  "TECHNOLOGY_BREAKTHROUGH",
  "MAJOR_CUSTOMER_WIN",
  "GOVERNMENT_APPROVAL",
  "CAPITAL_RAISE",
  "PUBLIC_OFFERING",
  "REGISTERED_DIRECT_OFFERING",
  "PRIVATE_PLACEMENT",
  "ATM_OFFERING",
  "SHELF_REGISTRATION",
  "DILUTION",
  "DEBT_FINANCING",
  "BANKRUPTCY",
  "DELISTING",
  "NASDAQ_COMPLIANCE",
  "REVERSE_SPLIT",
  "CEO_CHANGE",
  "CFO_CHANGE",
  "EXECUTIVE_DEPARTURE",
  "INVESTIGATION",
  "LAWSUIT",
  "CYBERSECURITY_INCIDENT",
  "RECALL",
  "OTHER_MATERIAL_EVENT",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const SENTIMENTS = [
  "STRONGLY_POSITIVE",
  "POSITIVE",
  "MIXED",
  "NEUTRAL",
  "NEGATIVE",
  "STRONGLY_NEGATIVE",
] as const;

export type Sentiment = (typeof SENTIMENTS)[number];

export const IMPACT_BANDS = ["LOW", "MODERATE", "IMPORTANT", "HIGH", "EXTREME"] as const;
export type ImpactBand = (typeof IMPACT_BANDS)[number];

export const SOURCE_IDS = [
  "sec",
  "benzinga",
  "globenewswire",
  "businesswire",
  "prnewswire",
] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const MARKET_CAP_BUCKETS = ["MICRO", "SMALL", "MID", "LARGE", "MEGA"] as const;
export type MarketCapBucket = (typeof MARKET_CAP_BUCKETS)[number];

export const FORM4_KINDS = [
  "OPEN_MARKET_PURCHASE",
  "OPEN_MARKET_SALE",
  "OPTION_EXERCISE",
  "GRANT",
  "AUTOMATIC_SALE",
  "OTHER",
] as const;
export type Form4Kind = (typeof FORM4_KINDS)[number];

export const EXPECTED_MARKET_EFFECTS = [
  "POTENTIALLY_BULLISH",
  "POTENTIALLY_BEARISH",
  "HIGH_VOLATILITY_EXPECTED",
  "MATERIAL_CATALYST",
  "LIMITED_REACTION_EXPECTED",
] as const;
export type ExpectedMarketEffect = (typeof EXPECTED_MARKET_EFFECTS)[number];

export const TIME_HORIZONS = [
  "IMMEDIATE",
  "SHORT_TERM",
  "LONG_TERM_VALIDATION",
] as const;
export type TimeHorizon = (typeof TIME_HORIZONS)[number];

export type Disclosure = "disclosed" | "not_disclosed" | "unknown" | "estimated";

export type NumericFact = {
  value: number | null;
  disclosure: Disclosure;
  unit?: string;
  label?: string;
};

export type ImpactBreakdown = {
  eventImportance: number;
  financialMateriality: number;
  companySizeEffect: number;
  sourceConfidence: number;
  eventNovelty: number;
  marketReactionPotential: number;
  total: number;
};

export type NormalizedNewsItem = {
  source: SourceId;
  sourceUrl: string;
  publishedAt: Date;
  retrievedAt: Date;
  ticker: string | null;
  company: string | null;
  cik: string | null;
  headline: string;
  summary: string | null;
  originalText: string | null;
  formType: string | null;
  accessionNumber: string | null;
  documentUrl: string | null;
  category: string | null;
};

export type ClassifiedEvent = {
  eventType: EventType;
  sentiment: Sentiment;
  impact: ImpactBreakdown;
  impactBand: ImpactBand;
  confidence: number;
  expectedMarketEffect: ExpectedMarketEffect;
  timeHorizons: TimeHorizon[];
  keyFactors: string[];
  risks: string[];
  whyItMatters: string;
  summary: string;
  materiality: string;
  keyNumbers: Record<string, NumericFact | string | number | null>;
  form4Kind?: Form4Kind;
  offering?: {
    amountRaised: NumericFact;
    offeringPctMarketCap: NumericFact;
    estimatedDilutionPct: NumericFact;
    offeringPrice: NumericFact;
    discountToLastPrice: NumericFact;
  };
  contract?: {
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
};

export type NewsFilters = {
  minScore?: number;
  sentiment?: Sentiment | "POSITIVE_ANY" | "NEGATIVE_ANY" | "ALL";
  marketCap?: MarketCapBucket;
  eventGroup?: string;
  ticker?: string;
  sector?: string;
  source?: SourceId;
  date?: string;
  watchlistOnly?: boolean;
};

export const EVENT_GROUPS: Record<string, EventType[]> = {
  CONTRACTS: [
    "MAJOR_CONTRACT",
    "GOVERNMENT_CONTRACT",
    "DEFENSE_CONTRACT",
    "NASA_SPACE_CONTRACT",
    "NEW_CUSTOMER",
    "MAJOR_CUSTOMER_WIN",
  ],
  FDA: ["FDA_APPROVAL", "FDA_REJECTION", "CLINICAL_TRIAL"],
  EARNINGS: [
    "EARNINGS",
    "REVENUE_BEAT",
    "EPS_BEAT",
    "REVENUE_MISS",
    "EPS_MISS",
    "GUIDANCE_RAISED",
    "GUIDANCE_LOWERED",
  ],
  OFFERINGS: [
    "CAPITAL_RAISE",
    "PUBLIC_OFFERING",
    "REGISTERED_DIRECT_OFFERING",
    "PRIVATE_PLACEMENT",
    "ATM_OFFERING",
    "SHELF_REGISTRATION",
    "DILUTION",
    "DEBT_FINANCING",
  ],
  MA: ["ACQUISITION", "MERGER"],
  INSIDER: ["INSIDER_BUY", "INSIDER_SELL"],
  ANALYST: [
    "ANALYST_UPGRADE",
    "ANALYST_DOWNGRADE",
    "PRICE_TARGET_RAISED",
    "PRICE_TARGET_LOWERED",
  ],
  GOVERNMENT: ["GOVERNMENT_CONTRACT", "GOVERNMENT_APPROVAL", "DEFENSE_CONTRACT", "NASA_SPACE_CONTRACT"],
  PARTNERSHIPS: ["PARTNERSHIP", "STRATEGIC_PARTNERSHIP"],
  COMPLIANCE: ["BANKRUPTCY", "DELISTING", "NASDAQ_COMPLIANCE", "REVERSE_SPLIT"],
  EXECUTIVE: ["CEO_CHANGE", "CFO_CHANGE", "EXECUTIVE_DEPARTURE"],
  LEGAL: ["INVESTIGATION", "LAWSUIT", "CYBERSECURITY_INCIDENT", "RECALL"],
};

export const NEGATIVE_HIGHLIGHT_TYPES: EventType[] = [
  "PUBLIC_OFFERING",
  "REGISTERED_DIRECT_OFFERING",
  "PRIVATE_PLACEMENT",
  "ATM_OFFERING",
  "DILUTION",
  "BANKRUPTCY",
  "DELISTING",
  "REVERSE_SPLIT",
  "GUIDANCE_LOWERED",
  "FDA_REJECTION",
];

export function impactBandFromScore(score: number): ImpactBand {
  if (score >= 85) return "EXTREME";
  if (score >= 70) return "HIGH";
  if (score >= 50) return "IMPORTANT";
  if (score >= 30) return "MODERATE";
  return "LOW";
}

export function marketCapBucket(marketCap: number | null | undefined): MarketCapBucket | null {
  if (marketCap == null || !Number.isFinite(marketCap) || marketCap <= 0) return null;
  if (marketCap < 300_000_000) return "MICRO";
  if (marketCap < 2_000_000_000) return "SMALL";
  if (marketCap < 10_000_000_000) return "MID";
  if (marketCap < 200_000_000_000) return "LARGE";
  return "MEGA";
}

export function isPositiveSentiment(s: Sentiment): boolean {
  return s === "POSITIVE" || s === "STRONGLY_POSITIVE";
}

export function isNegativeSentiment(s: Sentiment): boolean {
  return s === "NEGATIVE" || s === "STRONGLY_NEGATIVE";
}
