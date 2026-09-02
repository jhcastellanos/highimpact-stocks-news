import { NextResponse } from "next/server";
import { z } from "zod";
import { translateTexts } from "@/services/translate";

const Body = z.object({
  target: z.enum(["es", "en"]),
  texts: z.array(z.string().max(8_000)).max(60),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid translate payload" }, { status: 400 });
  }
  const translations = await translateTexts(parsed.data.texts, parsed.data.target);
  return NextResponse.json({ translations });
}
