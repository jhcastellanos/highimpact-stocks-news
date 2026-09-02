import { NextRequest } from "next/server";
import { jsonError } from "@/backend/http";
import { runIngest } from "@/backend/ingest";
import { flushPendingPushes } from "@/services/notifications/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const quick = request.nextUrl.searchParams.get("quick") === "1";
    const result = await runIngest({
      maxFilings: quick ? 12 : 20,
      includeOptionalSources: !quick,
      includeForm4: !quick,
    });
    const pushes = await flushPendingPushes();
    return Response.json({ ok: true, result, pushes });
  } catch (error) {
    return jsonError(error, 503);
  }
}
