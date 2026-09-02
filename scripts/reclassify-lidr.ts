import { eq } from "drizzle-orm";
import { getDb, schema } from "@/database/client";
import type { NormalizedNewsItem } from "@/lib/types";
import { classifyItem } from "@/services/classification/pipeline";
import { getCompanyFundamentals } from "@/services/market-data/fundamentals";

async function main() {
  const db = getDb();
  const rows = await db.select().from(schema.news).where(eq(schema.news.ticker, "LIDR")).limit(1);
  const news = rows[0];
  if (!news) {
    console.log("LIDR not in database");
    return;
  }
  const item: NormalizedNewsItem = {
    source: news.primarySource as NormalizedNewsItem["source"],
    sourceUrl: news.sourceUrl,
    publishedAt: news.publishedAt,
    retrievedAt: news.retrievedAt,
    ticker: news.ticker,
    company: news.company,
    cik: null,
    headline: news.headline,
    summary: news.summary,
    originalText: news.originalText,
    formType: news.formType,
    accessionNumber: news.accessionNumber,
    documentUrl: news.documentUrl,
    category: news.formType,
  };
  const fundamentals = news.ticker ? await getCompanyFundamentals(news.ticker) : null;
  const classified = await classifyItem(item, fundamentals);
  await db
    .update(schema.news)
    .set({
      summary: classified.summary,
    })
    .where(eq(schema.news.id, news.id));
  await db
    .update(schema.events)
    .set({
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
    })
    .where(eq(schema.events.newsId, news.id));
  await db
    .update(schema.analysis)
    .set({
      whyItMatters: classified.whyItMatters,
      keyFactors: classified.keyFactors,
      risks: classified.risks,
      materiality: classified.materiality,
      timeHorizon: classified.timeHorizons.join(", "),
      keyNumbers: classified.keyNumbers,
      contractJson: classified.contract ?? null,
      offeringJson: classified.offering ?? null,
    })
    .where(eq(schema.analysis.newsId, news.id));

  console.log({
    ticker: news.ticker,
    score: classified.impact.total,
    band: classified.impactBand,
    sentiment: classified.sentiment,
    eventType: classified.eventType,
    breakdown: classified.impact,
    materiality: classified.materiality,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
