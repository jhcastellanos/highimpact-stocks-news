import { NextRequest } from "next/server";
import { jsonError } from "@/backend/http";
import { requireDeviceId } from "@/backend/device";
import { getDb, schema } from "@/database/client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireDeviceId();
    const body = (await request.json()) as { endpoint: string; keys: { p256dh: string; auth: string } };
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return Response.json({ error: "Invalid subscription" }, { status: 400 });
    }
    await getDb()
      .insert(schema.pushSubscriptions)
      .values({
        userId,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      })
      .onConflictDoUpdate({
        target: schema.pushSubscriptions.endpoint,
        set: { userId, p256dh: body.keys.p256dh, auth: body.keys.auth },
      });
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error, 503);
  }
}
