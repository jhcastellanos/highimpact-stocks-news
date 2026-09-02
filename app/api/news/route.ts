import { NextRequest } from "next/server";
import { jsonError } from "@/backend/http";
import { queryNews } from "@/backend/news-query";
import { listWatchlist } from "@/backend/watchlist";
import { getDeviceId } from "@/backend/device";
import type { NewsFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const filters: NewsFilters & { limit?: number; today?: boolean; maxAgeHours?: number } = {
      minScore: sp.get("minScore") ? Number(sp.get("minScore")) : undefined,
      sentiment: (sp.get("sentiment") as NewsFilters["sentiment"]) || "ALL",
      marketCap: (sp.get("marketCap") as NewsFilters["marketCap"]) || undefined,
      eventGroup: sp.get("eventGroup") || undefined,
      ticker: sp.get("ticker") || undefined,
      source: (sp.get("source") as NewsFilters["source"]) || undefined,
      date: sp.get("date") || undefined,
      today: sp.get("today") === "1",
      maxAgeHours: sp.get("maxAgeHours") ? Number(sp.get("maxAgeHours")) : undefined,
      limit: sp.get("limit") ? Number(sp.get("limit")) : 80,
    };
    const items = await queryNews(filters);
    const device = await getDeviceId();
    const watched = new Set(
      device ? (await listWatchlist(device)).map((w) => w.ticker) : [],
    );
    return Response.json({
      items: items.map((item) => ({ ...item, watchlist: Boolean(item.ticker && watched.has(item.ticker)) })),
    });
  } catch (error) {
    return jsonError(error, 503);
  }
}
