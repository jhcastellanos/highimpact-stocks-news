import { and, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/database/client";
import { headlineSimilarity } from "@/lib/format";
import { eventFingerprint } from "@/lib/hash";
import type { EventType, SourceId } from "@/lib/types";

export function fingerprintFor(input: {
  ticker: string | null;
  eventType: EventType;
  headline: string;
  publishedAt: Date;
}): string {
  const dayUtc = input.publishedAt.toISOString().slice(0, 10);
  return eventFingerprint({
    ticker: input.ticker,
    eventType: input.eventType,
    headline: input.headline,
    dayUtc,
  });
}

export async function findDuplicate(input: {
  ticker: string | null;
  eventType: EventType;
  headline: string;
  sourceUrl: string;
  accessionNumber?: string | null;
  publishedAt: Date;
}): Promise<{ id: string; fingerprint: string } | null> {
  const db = getDb();
  if (input.accessionNumber) {
    const byAcc = await db
      .select({ id: schema.news.id, fingerprint: schema.news.fingerprint })
      .from(schema.news)
      .where(eq(schema.news.accessionNumber, input.accessionNumber))
      .limit(1);
    if (byAcc[0]) return byAcc[0];
  }

  const byUrl = await db
    .select({ id: schema.news.id, fingerprint: schema.news.fingerprint, headline: schema.news.headline })
    .from(schema.news)
    .where(eq(schema.news.sourceUrl, input.sourceUrl))
    .limit(1);
  if (byUrl[0]) return byUrl[0];

  const fp = fingerprintFor(input);
  const byFp = await db
    .select({ id: schema.news.id, fingerprint: schema.news.fingerprint })
    .from(schema.news)
    .where(eq(schema.news.fingerprint, fp))
    .limit(1);
  if (byFp[0]) return byFp[0];

  if (!input.ticker) return null;
  const since = new Date(input.publishedAt.getTime() - 36 * 60 * 60 * 1000);
  const candidates = await db
    .select({
      id: schema.news.id,
      fingerprint: schema.news.fingerprint,
      headline: schema.news.headline,
    })
    .from(schema.news)
    .innerJoin(schema.events, eq(schema.events.newsId, schema.news.id))
    .where(and(eq(schema.news.ticker, input.ticker), eq(schema.events.eventType, input.eventType), gte(schema.news.publishedAt, since)))
    .limit(20);

  for (const c of candidates) {
    if (headlineSimilarity(c.headline, input.headline) >= 0.72) {
      return { id: c.id, fingerprint: c.fingerprint };
    }
  }
  return null;
}

export async function attachSource(newsId: string, source: SourceId, sourceUrl: string, publishedAt: Date) {
  const db = getDb();
  await db
    .insert(schema.newsSources)
    .values({ newsId, source, sourceUrl, publishedAt })
    .onConflictDoNothing();
}
