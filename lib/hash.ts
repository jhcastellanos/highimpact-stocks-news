import { createHash } from "node:crypto";
import { normalizeHeadline } from "@/lib/format";

export function eventFingerprint(input: {
  ticker: string | null;
  eventType: string;
  headline: string;
  dayUtc: string;
}): string {
  const raw = [
    (input.ticker ?? "UNK").toUpperCase(),
    input.eventType,
    normalizeHeadline(input.headline),
    input.dayUtc,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}
