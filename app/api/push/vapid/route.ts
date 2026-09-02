import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = getEnv().vapidPublicKey.trim();
  if (!key) {
    return Response.json({ error: "Push is not configured" }, { status: 503 });
  }
  return Response.json({ publicKey: key });
}
