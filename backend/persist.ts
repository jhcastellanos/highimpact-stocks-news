import { eq } from "drizzle-orm";
import { getDb, schema } from "@/database/client";
import type { NormalizedNewsItem } from "@/lib/types";
import { classifyItem } from "@/services/classification/pipeline";
import { attachSource, findDuplicate, fingerprintFor } from "@/services/classification/dedup";
import { getCompanyFundamentals } from "@/services/market-data/fundamentals";
import { isSp500OrNasdaq } from "@/services/market-data/listings";
import type { SecNewsItem } from "@/services/sec/ingest";
import { dispatchAlertsForNews } from "@/services/notifications/dispatch";

export async function persistNormalizedItem(item: SecNewsItem | NormalizedNewsItem): Promise<{
  newsId: string;
  duplicate: boolean;
  impactScore: number | null;
  skipped?: boolean;
}> {
  if (!(await isSp500OrNasdaq(item.ticker))) {
    return { newsId: "", duplicate: false, impactScore: null, skipped: true };
  }
  const fundamentals = item.ticker ? await getCompanyFundamentals(item.ticker, item.cik) : null;
  const classified = await classifyItem(item, fundamentals, "form4" in item ? item.form4 : undefined);
  const duplicate = await findDuplicate({
    ticker: item.ticker,
    eventType: classified.eventType,
    headline: item.headline,
    sourceUrl: item.sourceUrl,
    accessionNumber: item.accessionNumber || null,
    publishedAt: item.publishedAt,
  });

  if (duplicate) {
    await attachSource(duplicate.id, item.source, item.sourceUrl, item.publishedAt);
    const existing = await getDb()
      .select({ score: schema.events.impactScore })
      .from(schema.events)
      .where(eq(schema.events.newsId, duplicate.id))
      .limit(1);
    return { newsId: duplicate.id, duplicate: true, impactScore: existing[0]?.score ?? null };
  }

  const db = getDb();
  const fingerprint = fingerprintFor({
    ticker: item.ticker,
    eventType: classified.eventType,
    headline: item.headline,
    publishedAt: item.publishedAt,
  });

  const inserted = await db
    .insert(schema.news)
    .values({
      fingerprint,
      ticker: item.ticker,
      company: item.company,
      headline: item.headline,
      summary: classified.summary,
      originalText: item.originalText,
      primarySource: item.source,
      sourceUrl: item.sourceUrl,
      publishedAt: item.publishedAt,
      retrievedAt: item.retrievedAt,
      formType: item.formType,
      accessionNumber: item.accessionNumber || null,
      documentUrl: item.documentUrl,
    })
    .onConflictDoNothing({ target: schema.news.fingerprint })
    .returning({ id: schema.news.id });

  const newsId = inserted[0]?.id;
  if (!newsId) {
    const raced = await findDuplicate({
      ticker: item.ticker,
      eventType: classified.eventType,
      headline: item.headline,
      sourceUrl: item.sourceUrl,
      accessionNumber: item.accessionNumber || null,
      publishedAt: item.publishedAt,
    });
    if (raced) {
      await attachSource(raced.id, item.source, item.sourceUrl, item.publishedAt);
      return { newsId: raced.id, duplicate: true, impactScore: classified.impact.total };
    }
    throw new Error("Failed to persist news item");
  }

  await attachSource(newsId, item.source, item.sourceUrl, item.publishedAt);

  await db.insert(schema.events).values({
    newsId,
    eventType: classified.eventType,
    sentiment: classified.sentiment,
    impactScore: classified.impact.total,
    impactBand: classified.impactBand,
    confidence: classified.confidence,
    eventImportance: classified.impact.eventImportance,
    financialMateriality: classified.impact.financialMateriality,
    companySizeEffect: classified.impact.companySizeEffect,
    sourceConfidence: classified.impact.sourceConfidence,
    eventNovelty: classified.impact.eventNovelty,
    marketReactionPotential: classified.impact.marketReactionPotential,
    expectedMarketEffect: classified.expectedMarketEffect,
  });

  await db.insert(schema.analysis).values({
    newsId,
    whyItMatters: classified.whyItMatters,
    keyFactors: classified.keyFactors,
    risks: classified.risks,
    materiality: classified.materiality,
    timeHorizon: classified.timeHorizons.join(", "),
    keyNumbers: classified.keyNumbers,
    contractJson: classified.contract ?? null,
    offeringJson: classified.offering ?? null,
    form4Kind: classified.form4Kind ?? null,
    llmUsed: false,
  });

  if (item.source === "sec" && item.accessionNumber && item.cik) {
    await db
      .insert(schema.secFilings)
      .values({
        ticker: item.ticker,
        cik: item.cik,
        form: item.formType ?? "UNKNOWN",
        accessionNumber: item.accessionNumber,
        filingDate: item.publishedAt.toISOString().slice(0, 10),
        acceptanceDatetime: item.publishedAt,
        documentUrl: item.documentUrl ?? item.sourceUrl,
        newsId,
      })
      .onConflictDoNothing();
  }

  await dispatchAlertsForNews({
    newsId,
    ticker: item.ticker,
    company: item.company,
    headline: item.headline,
    eventType: classified.eventType,
    sentiment: classified.sentiment,
    impactScore: classified.impact.total,
    impactBand: classified.impactBand,
  });

  return { newsId, duplicate: false, impactScore: classified.impact.total };
}
