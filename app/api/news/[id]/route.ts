import { jsonError } from "@/backend/http";
import { getNewsDetail } from "@/backend/news-query";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const detail = await getNewsDetail(id);
    if (!detail) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ item: detail });
  } catch (error) {
    return jsonError(error, 503);
  }
}
