import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/database/client";

export async function listWatchlist(userId: string) {
  return getDb().select().from(schema.watchlists).where(eq(schema.watchlists.userId, userId));
}

export async function addWatchTicker(userId: string, ticker: string) {
  const t = ticker.trim().toUpperCase();
  await getDb().insert(schema.watchlists).values({ userId, ticker: t }).onConflictDoNothing();
  return listWatchlist(userId);
}

export async function removeWatchTicker(userId: string, ticker: string) {
  await getDb()
    .delete(schema.watchlists)
    .where(and(eq(schema.watchlists.userId, userId), eq(schema.watchlists.ticker, ticker.trim().toUpperCase())));
  return listWatchlist(userId);
}

export async function getSettings(userId: string) {
  const db = getDb();
  const rows = await db.select().from(schema.alertSettings).where(eq(schema.alertSettings.userId, userId)).limit(1);
  if (rows[0]) return rows[0];
  await db.insert(schema.alertSettings).values({ userId }).onConflictDoNothing();
  const created = await db.select().from(schema.alertSettings).where(eq(schema.alertSettings.userId, userId)).limit(1);
  return created[0] ?? { userId, minImpactScore: 70, watchlistAlways: true, updatedAt: new Date() };
}

export async function updateSettings(userId: string, minImpactScore: number, watchlistAlways: boolean) {
  const db = getDb();
  await db
    .insert(schema.alertSettings)
    .values({ userId, minImpactScore, watchlistAlways, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.alertSettings.userId,
      set: { minImpactScore, watchlistAlways, updatedAt: new Date() },
    });
  return getSettings(userId);
}
