import { jsonError } from "@/backend/http";
import { requireDeviceId } from "@/backend/device";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireDeviceId();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error, 503);
  }
}
