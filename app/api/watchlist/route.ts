import { NextRequest } from "next/server";
import { jsonError } from "@/backend/http";
import { requireDeviceId } from "@/backend/device";
import { addWatchTicker, getSettings, listWatchlist, removeWatchTicker, updateSettings } from "@/backend/watchlist";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireDeviceId();
    const [items, settings] = await Promise.all([listWatchlist(userId), getSettings(userId)]);
    return Response.json({ items, settings });
  } catch (error) {
    return jsonError(error, 503);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireDeviceId();
    const body = (await request.json()) as { ticker?: string; minImpactScore?: number; watchlistAlways?: boolean };
    if (body.ticker) {
      const items = await addWatchTicker(userId, body.ticker);
      return Response.json({ items });
    }
    if (body.minImpactScore != null || body.watchlistAlways != null) {
      const current = await getSettings(userId);
      const settings = await updateSettings(
        userId,
        body.minImpactScore ?? current.minImpactScore,
        body.watchlistAlways ?? current.watchlistAlways,
      );
      return Response.json({ settings });
    }
    return Response.json({ error: "No changes" }, { status: 400 });
  } catch (error) {
    return jsonError(error, 503);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireDeviceId();
    const ticker = request.nextUrl.searchParams.get("ticker");
    if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 });
    const items = await removeWatchTicker(userId, ticker);
    return Response.json({ items });
  } catch (error) {
    return jsonError(error, 503);
  }
}
