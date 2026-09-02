import { formatPct, formatUsd } from "@/lib/format";
import type { ClassifiedEvent, ExpectedMarketEffect, NormalizedNewsItem, TimeHorizon } from "@/lib/types";
import { impactBandFromScore } from "@/lib/types";
import { classifyEventType } from "@/services/classification/event-classifier";
import { scoreImpact } from "@/services/classification/impact-score";
import { analyzeWithLlm } from "@/services/classification/llm";
import { describeMateriality, type CompanyFundamentals } from "@/services/classification/materiality";
import { analyzeContract } from "@/services/classification/contract-analyzer";
import { analyzeOffering } from "@/services/classification/offering-analyzer";
import { classifySentiment } from "@/services/classification/sentiment";
import { extractItems } from "@/services/sec/parse-filing";
import type { Form4Parse } from "@/services/sec/parse-filing";

const OFFERING_TYPES = new Set([
  "PUBLIC_OFFERING",
  "REGISTERED_DIRECT_OFFERING",
  "PRIVATE_PLACEMENT",
  "ATM_OFFERING",
  "SHELF_REGISTRATION",
  "DILUTION",
  "CAPITAL_RAISE",
]);

const CONTRACT_TYPES = new Set([
  "MAJOR_CONTRACT",
  "GOVERNMENT_CONTRACT",
  "DEFENSE_CONTRACT",
  "NASA_SPACE_CONTRACT",
  "NEW_CUSTOMER",
  "MAJOR_CUSTOMER_WIN",
]);

export async function classifyItem(
  item: NormalizedNewsItem,
  fundamentals: CompanyFundamentals | null,
  form4?: Form4Parse,
): Promise<ClassifiedEvent> {
  const items = item.originalText ? extractItems(item.originalText) : [];
  const classified = classifyEventType({ item, items, form4Kind: form4?.kind });
  const text = `${item.headline}\n${item.originalText ?? ""}`;

  const offering = OFFERING_TYPES.has(classified.eventType)
    ? analyzeOffering(text, fundamentals?.marketCap ?? null, fundamentals?.lastPrice ?? null)
    : undefined;
  const contract = CONTRACT_TYPES.has(classified.eventType)
    ? analyzeContract(text, item.headline, fundamentals?.annualRevenue ?? null, fundamentals?.marketCap ?? null)
    : undefined;

  const sentiment = classifySentiment({
    eventType: classified.eventType,
    form4Kind: form4?.kind,
    dilutionPct: offering?.estimatedDilutionPct.value ?? null,
    contractToRevenuePct: contract?.contractToRevenuePct.value ?? null,
  });

  const novelty =
    classified.eventType === "NASA_SPACE_CONTRACT" ||
    classified.eventType === "FDA_APPROVAL" ||
    classified.eventType === "DEFENSE_CONTRACT" ||
    classified.eventType === "GUIDANCE_RAISED" ||
    classified.eventType === "REVENUE_BEAT" ||
    classified.eventType === "EPS_BEAT" ||
    Boolean(contract?.isNewCustomer) ||
    Boolean(contract?.isNewMarket);

  const impact = scoreImpact({
    eventType: classified.eventType,
    source: item.source,
    marketCap: fundamentals?.marketCap ?? null,
    annualRevenue: fundamentals?.annualRevenue ?? null,
    contractValue: contract?.contractValue.value ?? null,
    offeringAmount: offering?.amountRaised.value ?? null,
    form4Kind: form4?.kind,
    novelty,
  });

  const expectedMarketEffect = expectedEffect(sentiment, impact.total);
  const timeHorizons = horizons(classified.eventType);
  const materiality = describeMateriality({
    contractValue: contract?.contractValue.value ?? null,
    offeringAmount: offering?.amountRaised.value ?? null,
    annualRevenue: fundamentals?.annualRevenue ?? null,
    marketCap: fundamentals?.marketCap ?? null,
    estimated: contract?.contractValue.disclosure === "estimated" || offering?.amountRaised.disclosure === "estimated",
  });

  const keyFactors = buildKeyFactors(classified.eventType, contract, offering, fundamentals, form4, item);
  const risks = buildRisks(classified.eventType, offering, fundamentals);
  const whyItMatters = buildWhyItMatters({
    eventType: classified.eventType,
    sentiment,
    item,
    fundamentals,
    contract,
    offering,
    materiality,
    form4,
  });
  const summary = buildSummary(item, classified.eventType);

  let llmUsedNarrative = {
    summary,
    whyItMatters,
    keyFactors,
    risks,
    materiality,
    timeHorizon: timeHorizons.join(", "),
    confidence: classified.confidence,
  };

  const llm = await analyzeWithLlm({
    headline: item.headline,
    text: item.originalText ?? item.summary ?? item.headline,
    ticker: item.ticker,
    company: item.company,
    marketCap: fundamentals?.marketCap ?? null,
    revenue: fundamentals?.annualRevenue ?? null,
    source: item.source,
    eventType: classified.eventType,
    sentiment,
    impactScore: impact.total,
  });

  if (llm) {
    llmUsedNarrative = {
      summary: llm.summary || summary,
      whyItMatters: llm.whyItMatters || whyItMatters,
      keyFactors: llm.keyFactors.length ? llm.keyFactors : keyFactors,
      risks: llm.risks.length ? llm.risks : risks,
      materiality: llm.materiality || materiality,
      timeHorizon: llm.timeHorizon || timeHorizons.join(", "),
      confidence: Math.max(classified.confidence, llm.confidence || 0),
    };
  }

  return {
    eventType: classified.eventType,
    sentiment,
    impact,
    impactBand: impactBandFromScore(impact.total),
    confidence: llmUsedNarrative.confidence,
    expectedMarketEffect,
    timeHorizons,
    keyFactors: llmUsedNarrative.keyFactors,
    risks: llmUsedNarrative.risks,
    whyItMatters: llmUsedNarrative.whyItMatters,
    summary: llmUsedNarrative.summary,
    materiality: llmUsedNarrative.materiality,
    keyNumbers: {
      marketCap: fundamentals?.marketCap ?? "Unknown",
      annualRevenue: fundamentals?.annualRevenue ?? "Unknown",
      impactEventImportance: impact.eventImportance,
      impactFinancialMateriality: impact.financialMateriality,
      impactCompanySize: impact.companySizeEffect,
      impactSourceConfidence: impact.sourceConfidence,
      impactNovelty: impact.eventNovelty,
      impactReaction: impact.marketReactionPotential,
      form4Insider: form4?.insiderName ?? "Not disclosed",
      form4Role: form4?.role ?? "Unknown",
      form4Shares: form4?.shares ?? "Not disclosed",
      form4Price: form4?.price ?? "Not disclosed",
      form4Value: form4?.value ?? "Not disclosed",
    },
    form4Kind: form4?.kind,
    offering,
    contract,
  };
}

function expectedEffect(sentiment: ClassifiedEvent["sentiment"], score: number): ExpectedMarketEffect {
  if (score >= 85) return "HIGH_VOLATILITY_EXPECTED";
  if (sentiment === "STRONGLY_POSITIVE" || sentiment === "POSITIVE") return "POTENTIALLY_BULLISH";
  if (sentiment === "STRONGLY_NEGATIVE" || sentiment === "NEGATIVE") return "POTENTIALLY_BEARISH";
  if (score >= 50) return "MATERIAL_CATALYST";
  return "LIMITED_REACTION_EXPECTED";
}

function horizons(eventType: string): TimeHorizon[] {
  if (["PUBLIC_OFFERING", "BANKRUPTCY", "FDA_APPROVAL", "FDA_REJECTION"].includes(eventType)) {
    return ["IMMEDIATE", "SHORT_TERM"];
  }
  if (["MAJOR_CONTRACT", "NASA_SPACE_CONTRACT", "DEFENSE_CONTRACT"].includes(eventType)) {
    return ["IMMEDIATE", "SHORT_TERM", "LONG_TERM_VALIDATION"];
  }
  return ["IMMEDIATE", "SHORT_TERM"];
}

function buildSummary(item: NormalizedNewsItem, eventType: string): string {
  const who = item.company || item.ticker || "The company";
  return `${who} filed or published a ${eventType.replaceAll("_", " ").toLowerCase()} event: ${item.headline}`;
}

function buildKeyFactors(
  eventType: string,
  contract: ClassifiedEvent["contract"],
  offering: ClassifiedEvent["offering"],
  fundamentals: CompanyFundamentals | null,
  form4: Form4Parse | undefined,
  item: NormalizedNewsItem,
): string[] {
  const factors: string[] = [];
  factors.push(`Event type: ${eventType.replaceAll("_", " ")}`);
  if (item.source === "sec") factors.push("SEC filing confirmed");
  if (fundamentals?.marketCap) factors.push(`Market cap ${formatUsd(fundamentals.marketCap)}`);
  if (contract?.contractValue.value) factors.push(`Disclosed amount ${formatUsd(contract.contractValue.value)}`);
  if (contract?.isNewCustomer) factors.push("Described as a new customer");
  if (contract?.isNewMarket) factors.push("Described as a new market/vertical");
  if (contract?.contractToRevenuePct.value != null) {
    factors.push(`ESTIMATED contract / revenue ${formatPct(contract.contractToRevenuePct.value, true)}`);
  }
  if (offering?.amountRaised.value) factors.push(`Offering ${formatUsd(offering.amountRaised.value)}`);
  if (offering?.estimatedDilutionPct.value != null) {
    factors.push(`${offering.estimatedDilutionPct.disclosure === "estimated" ? "ESTIMATED " : ""}dilution ${formatPct(offering.estimatedDilutionPct.value, offering.estimatedDilutionPct.disclosure === "estimated")}`);
  }
  if (form4?.kind === "OPEN_MARKET_PURCHASE") factors.push("Open-market insider purchase");
  if (form4?.kind === "GRANT") factors.push("Equity grant — not an open-market buy");
  return factors.slice(0, 8);
}

function buildRisks(
  eventType: string,
  offering: ClassifiedEvent["offering"],
  fundamentals: CompanyFundamentals | null,
): string[] {
  const risks: string[] = [];
  if (!fundamentals?.annualRevenue) risks.push("Annual revenue is unknown, so relative size may be misread.");
  if (!fundamentals?.marketCap) risks.push("Market cap is unknown.");
  if (OFFERING_TYPES.has(eventType)) risks.push("Equity issuance can dilute existing shareholders.");
  if (offering?.estimatedDilutionPct.value && offering.estimatedDilutionPct.value >= 20) {
    risks.push("Offering size is large relative to market cap.");
  }
  if (CONTRACT_TYPES.has(eventType)) {
    risks.push("Contract economics, timing, and cancellability may not be fully disclosed.");
  }
  if (risks.length === 0) risks.push("Source text may omit material details.");
  return risks;
}

function buildWhyItMatters(input: {
  eventType: string;
  sentiment: ClassifiedEvent["sentiment"];
  item: NormalizedNewsItem;
  fundamentals: CompanyFundamentals | null;
  contract: ClassifiedEvent["contract"];
  offering: ClassifiedEvent["offering"];
  materiality: string;
  form4?: Form4Parse;
}): string {
  const name = input.item.company || input.item.ticker || "This issuer";
  if (input.offering?.amountRaised.value && input.fundamentals?.marketCap) {
    const pct = input.offering.offeringPctMarketCap.value;
    return `Although the language around a capital raise can sound constructive, ${name} is raising ${formatUsd(input.offering.amountRaised.value)} versus a ${formatUsd(input.fundamentals.marketCap)} market cap (${pct != null ? formatPct(pct, true) : "unknown"}). That is a dilution and supply event for existing holders, not a customer win.`;
  }
  if (input.contract?.contractValue.value && input.fundamentals?.annualRevenue) {
    return `This contract is especially relevant because ${name} currently generates about ${formatUsd(input.fundamentals.annualRevenue)} of annual revenue and the disclosed amount is ${formatUsd(input.contract.contractValue.value)}. ${input.materiality}`;
  }
  if (input.form4?.kind === "OPEN_MARKET_PURCHASE") {
    return `Open-market purchases are more informative than option exercises or grants because the insider is putting personal capital to work. ${input.form4.insiderName ?? "The insider"} (${input.form4.role ?? "role unknown"}) transacted ${input.form4.shares ?? "an undisclosed number of"} shares.`;
  }
  if (input.form4?.kind === "GRANT" || input.form4?.kind === "OPTION_EXERCISE") {
    return `This Form 4 is ${input.form4.kind.replaceAll("_", " ").toLowerCase()}, which is not the same as an open-market buy and usually carries less signal.`;
  }
  return `${name} published a ${input.eventType.replaceAll("_", " ").toLowerCase()} event. ${input.materiality} Sentiment is based on the likely effect on the stock, not the tone of the document.`;
}
