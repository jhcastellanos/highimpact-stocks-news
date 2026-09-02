export function normalizeHeadline(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(inc|inc\.|corp|corporation|ltd|llc|co|the|announces|announce|press release)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function headlineSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeHeadline(a).split(" ").filter((w) => w.length > 2));
  const tb = new Set(normalizeHeadline(b).split(" ").filter((w) => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter += 1;
  return inter / Math.min(ta.size, tb.size);
}

export function padCik(cik: string | number): string {
  return String(cik).replace(/\D/g, "").padStart(10, "0");
}

export function accessionNoDashes(accession: string): string {
  return accession.replace(/-/g, "");
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Not disclosed";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatPct(value: number | null | undefined, estimated = false): string {
  if (value == null || !Number.isFinite(value)) return "Unknown";
  const label = `${value.toFixed(1)}%`;
  return estimated ? `ESTIMATED ${label}` : label;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function parseMoney(text: string): number | null {
  const match = text.match(
    /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(billion|bn|million|mn|m|billion|thousand|k)?/i,
  );
  if (!match) return null;
  const n = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const unit = (match[2] ?? "").toLowerCase();
  if (unit === "billion" || unit === "bn") return n * 1_000_000_000;
  if (unit === "million" || unit === "mn" || unit === "m") return n * 1_000_000;
  if (unit === "thousand" || unit === "k") return n * 1_000;
  if (n < 500 && !unit) return null;
  return n;
}
