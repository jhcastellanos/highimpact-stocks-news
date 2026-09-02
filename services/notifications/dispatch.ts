import { and, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/database/client";
import { isFloridaPushWindow } from "@/lib/time";
import { isSp500OrNasdaq } from "@/services/market-data/listings";
import { sendPush } from "@/services/notifications/push";

function payload(input: {
  newsId: string;
  ticker: string | null;
  headline: string;
  impactScore: number;
}) {
  const ticker = input.ticker ?? "FILING";
  return {
    title: ticker,
    body: `${ticker} · HIGH IMPACT ${input.impactScore}\n${input.headline}`,
    url: `/news/${input.newsId}`,
  };
}

export async function dispatchAlertsForNews(input: {
  newsId: string;
  ticker: string | null;
  company: string | null;
  headline: string;
  eventType: string;
  sentiment: string;
  impactScore: number;
  impactBand: string;
}) {
  if (input.sentiment !== "STRONGLY_POSITIVE" || input.impactScore < 70) return;
  if (!(await isSp500OrNasdaq(input.ticker))) return;
  if (!isFloridaPushWindow()) return;

  const db = getDb();
  const subscribers = await db.select().from(schema.pushSubscriptions);
  if (!subscribers.length) return;

  const users = [...new Set(subscribers.map((s) => s.userId))];
  const message = payload(input);

  for (const userId of users) {
    await deliverToUser(userId, input.newsId, input.ticker, message);
  }
}

export async function flushPendingPushes() {
  if (!isFloridaPushWindow()) return { sent: 0, skipped: "outside_florida_window" as const };
  const db = getDb();
  const since = new Date(Date.now() - 16 * 60 * 60 * 1000);
  const candidates = await db
    .select({
      newsId: schema.news.id,
      ticker: schema.news.ticker,
      headline: schema.news.headline,
      impactScore: schema.events.impactScore,
      sentiment: schema.events.sentiment,
    })
    .from(schema.news)
    .innerJoin(schema.events, eq(schema.events.newsId, schema.news.id))
    .where(and(gte(schema.news.publishedAt, since), eq(schema.events.sentiment, "STRONGLY_POSITIVE"), gte(schema.events.impactScore, 70)));

  const subscribers = await db.select().from(schema.pushSubscriptions);
  const users = [...new Set(subscribers.map((s) => s.userId))];
  let sent = 0;
  for (const item of candidates) {
    if (!(await isSp500OrNasdaq(item.ticker))) continue;
    const message = payload(item);
    for (const userId of users) {
      const already = await db
        .select({ id: schema.alerts.id })
        .from(schema.alerts)
        .where(and(eq(schema.alerts.userId, userId), eq(schema.alerts.newsId, item.newsId)))
        .limit(1);
      if (already[0]) continue;
      await deliverToUser(userId, item.newsId, item.ticker, message);
      sent += 1;
    }
  }
  return { sent };
}

async function deliverToUser(
  userId: string,
  newsId: string,
  ticker: string | null,
  message: { title: string; body: string; url: string },
) {
  const db = getDb();
  const already = await db
    .select({ id: schema.alerts.id })
    .from(schema.alerts)
    .where(and(eq(schema.alerts.userId, userId), eq(schema.alerts.newsId, newsId)))
    .limit(1);
  if (already[0]) return;

  await db.insert(schema.alerts).values({
    userId,
    ticker,
    newsId,
  });

  const subs = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, userId));
  for (const sub of subs) {
    try {
      await sendPush({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, message);
    } catch {
      await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, sub.id));
    }
  }
}
