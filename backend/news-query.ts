import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/database/client";
import { startOfEtDay } from "@/lib/time";
import { EVENT_GROUPS, isNegativeSentiment, isPositiveSentiment, type NewsFilters } from "@/lib/types";
import { isSp500OrNasdaq } from "@/services/market-data/listings";

export type NewsCard = {
  id: string;
  ticker: string | null;
  company: string | null;
  headline: string;
  summary: string | null;
  source: string;
  sources: string[];
  sourceUrl: string;
  publishedAt: string;
  formType: string | null;
  accessionNumber: string | null;
  documentUrl: string | null;
  eventType: string;
  sentiment: string;
  impactScore: number;
  impactBand: string;
  confidence: number;
  expectedMarketEffect: string | null;
  marketCap: string | null;
  sector: string | null;
  watchlist: boolean;
};

export async function queryNews(filters: NewsFilters & { limit?: number; today?: boolean; maxAgeHours?: number } = {}) {
  const db = getDb();
  const limit = filters.limit ?? 80;

  const conditions = [];
  if (filters.minScore != null) conditions.push(gte(schema.events.impactScore, filters.minScore));
  if (filters.ticker) conditions.push(eq(schema.news.ticker, filters.ticker.toUpperCase()));
  if (filters.source) conditions.push(eq(schema.news.primarySource, filters.source));
  if (filters.eventGroup && EVENT_GROUPS[filters.eventGroup]) {
    conditions.push(inArray(schema.events.eventType, EVENT_GROUPS[filters.eventGroup]));
  }
  if (filters.today) conditions.push(gte(schema.news.publishedAt, startOfEtDay()));
  if (filters.maxAgeHours && filters.maxAgeHours > 0) {
    conditions.push(gte(schema.news.publishedAt, new Date(Date.now() - filters.maxAgeHours * 60 * 60 * 1000)));
  }
  if (filters.date) {
    const start = new Date(`${filters.date}T00:00:00-05:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    conditions.push(gte(schema.news.publishedAt, start));
    conditions.push(lte(schema.news.publishedAt, end));
  }

  const rows = await db
    .select({
      id: schema.news.id,
      ticker: schema.news.ticker,
      company: schema.news.company,
      headline: schema.news.headline,
      summary: schema.news.summary,
      source: schema.news.primarySource,
      sourceUrl: schema.news.sourceUrl,
      publishedAt: schema.news.publishedAt,
      formType: schema.news.formType,
      accessionNumber: schema.news.accessionNumber,
      documentUrl: schema.news.documentUrl,
      eventType: schema.events.eventType,
      sentiment: schema.events.sentiment,
      impactScore: schema.events.impactScore,
      impactBand: schema.events.impactBand,
      confidence: schema.events.confidence,
      expectedMarketEffect: schema.events.expectedMarketEffect,
      marketCap: schema.companies.marketCap,
      sector: schema.companies.sector,
    })
    .from(schema.news)
    .innerJoin(schema.events, eq(schema.events.newsId, schema.news.id))
    .leftJoin(schema.companies, eq(schema.companies.ticker, schema.news.ticker))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.news.publishedAt), desc(schema.events.impactScore))
    .limit(200);

  let filtered = rows.filter((r) => r.sentiment === "STRONGLY_POSITIVE");
  const allowed: typeof filtered = [];
  for (const row of filtered) {
    if (await isSp500OrNasdaq(row.ticker)) allowed.push(row);
  }
  filtered = allowed;
  filtered.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  if (filters.sentiment === "POSITIVE_ANY") filtered = filtered.filter((r) => isPositiveSentiment(r.sentiment as never));
  if (filters.sentiment === "NEGATIVE_ANY") filtered = filtered.filter((r) => isNegativeSentiment(r.sentiment as never));
  if (filters.sentiment && !["ALL", "POSITIVE_ANY", "NEGATIVE_ANY", "STRONGLY_POSITIVE"].includes(filters.sentiment)) {
    filtered = filtered.filter((r) => r.sentiment === filters.sentiment);
  }
  if (filters.marketCap) {
    filtered = filtered.filter((r) => bucket(Number(r.marketCap)) === filters.marketCap);
  }

  const ids = filtered.slice(0, limit).map((r) => r.id);
  const sourceRows = ids.length
    ? await db.select().from(schema.newsSources).where(inArray(schema.newsSources.newsId, ids))
    : [];
  const sourceMap = new Map<string, string[]>();
  for (const s of sourceRows) {
    const list = sourceMap.get(s.newsId) ?? [];
    list.push(s.source);
    sourceMap.set(s.newsId, list);
  }

  return filtered.slice(0, limit).map((r) => ({
    ...r,
    publishedAt: r.publishedAt.toISOString(),
    sources: sourceMap.get(r.id) ?? [r.source],
    watchlist: false,
  })) satisfies NewsCard[];
}

export async function getNewsDetail(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.news)
    .innerJoin(schema.events, eq(schema.events.newsId, schema.news.id))
    .innerJoin(schema.analysis, eq(schema.analysis.newsId, schema.news.id))
    .leftJoin(schema.companies, eq(schema.companies.ticker, schema.news.ticker))
    .where(eq(schema.news.id, id))
    .limit(1);
  if (!rows[0]) return null;
  const sources = await db.select().from(schema.newsSources).where(eq(schema.newsSources.newsId, id));
  return { ...rows[0], sources };
}

export async function todayStats() {
  const db = getDb();
  const start = startOfEtDay();
  const rows = await db
    .select({
      impactBand: schema.events.impactBand,
      sentiment: schema.events.sentiment,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.events)
    .innerJoin(schema.news, eq(schema.news.id, schema.events.newsId))
    .where(and(gte(schema.news.publishedAt, start), eq(schema.events.sentiment, "STRONGLY_POSITIVE")))
    .groupBy(schema.events.impactBand, schema.events.sentiment);
  return rows;
}

function bucket(marketCap: number): string | null {
  if (!Number.isFinite(marketCap) || marketCap <= 0) return null;
  if (marketCap < 300_000_000) return "MICRO";
  if (marketCap < 2_000_000_000) return "SMALL";
  if (marketCap < 10_000_000_000) return "MID";
  if (marketCap < 200_000_000_000) return "LARGE";
  return "MEGA";
}
