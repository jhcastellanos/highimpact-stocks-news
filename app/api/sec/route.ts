import { desc, eq } from "drizzle-orm";
import { jsonError } from "@/backend/http";
import { getDb, schema } from "@/database/client";
import { isSp500OrNasdaq } from "@/services/market-data/listings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        ticker: schema.secFilings.ticker,
        cik: schema.secFilings.cik,
        form: schema.secFilings.form,
        accessionNumber: schema.secFilings.accessionNumber,
        acceptanceDatetime: schema.secFilings.acceptanceDatetime,
        documentUrl: schema.secFilings.documentUrl,
        newsId: schema.secFilings.newsId,
        eventType: schema.events.eventType,
        impactScore: schema.events.impactScore,
        sentiment: schema.events.sentiment,
      })
      .from(schema.secFilings)
      .leftJoin(schema.events, eq(schema.events.newsId, schema.secFilings.newsId))
      .orderBy(desc(schema.secFilings.acceptanceDatetime))
      .limit(120);
    const items = [];
    for (const r of rows) {
      if (r.sentiment !== "STRONGLY_POSITIVE") continue;
      if (!(await isSp500OrNasdaq(r.ticker))) continue;
      items.push({
        ...r,
        acceptanceDatetime: r.acceptanceDatetime?.toISOString() ?? null,
      });
    }
    return Response.json({ items });
  } catch (error) {
    return jsonError(error, 503);
  }
}
