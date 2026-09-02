import { NextRequest } from "next/server";
import { jsonError } from "@/backend/http";
import { runIngest } from "@/backend/ingest";
import { getEnv } from "@/lib/env";
import { flushPendingPushes } from "@/services/notifications/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = getEnv().cronSecret;
  if (!secret) return true;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runIngest({ maxFilings: 20, includeOptionalSources: true });
    const pushes = await flushPendingPushes();
    return Response.json({ ok: true, result, pushes });
  } catch (error) {
    return jsonError(error, 503);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
