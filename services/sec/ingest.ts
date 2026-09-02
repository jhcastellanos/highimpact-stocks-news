import { XMLParser } from "fast-xml-parser";
import type { NormalizedNewsItem } from "@/lib/types";
import { padCik } from "@/lib/format";
import { DISPLAY_TZ } from "@/lib/time";
import { formatInTimeZone } from "date-fns-tz";
import { secFetchJson, secFetchText } from "@/services/sec/client";
import { SEC_PRIORITY_FORMS } from "@/services/sec/forms";
import { extractAccessionFromUrl, loadFilingDocument } from "@/services/sec/parse-filing";
import { resolveTicker } from "@/services/sec/ticker-map";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export type SecFeedEntry = {
  form: string;
  title: string;
  companyName: string | null;
  cik: string;
  publishedAt: Date;
  indexUrl: string;
  accessionNumber: string;
};

export async function fetchRecentSecFilings(forms: readonly string[] = SEC_PRIORITY_FORMS, perForm = 20): Promise<SecFeedEntry[]> {
  const entries: SecFeedEntry[] = [];
  for (const form of forms) {
    const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=${encodeURIComponent(form)}&owner=include&count=${perForm}&output=atom`;
    try {
      const xml = await secFetchText(url);
      entries.push(...parseAtom(xml, form));
    } catch {
      continue;
    }
  }
  const seen = new Set<string>();
  return entries.filter((e) => {
    if (seen.has(e.accessionNumber)) return false;
    seen.add(e.accessionNumber);
    return true;
  });
}

type EftsResponse = {
  hits?: {
    hits?: Array<{
      _source?: {
        adsh?: string;
        form?: string | string[];
        file_date?: string;
        file_date_time?: string;
        ciks?: string[];
        display_names?: string[];
        period_ending?: string;
      };
    }>;
  };
};

export async function fetchTodaysPriorityFilings(
  day = formatInTimeZone(new Date(), DISPLAY_TZ, "yyyy-MM-dd"),
  opts?: { includeForm4?: boolean },
): Promise<SecFeedEntry[]> {
  const groups: Array<{ forms: string[]; size: number }> = [
    { forms: ["8-K", "8-K/A", "6-K", "10-Q"], size: 80 },
    { forms: ["424B5", "S-3"], size: 40 },
  ];
  if (opts?.includeForm4 !== false) {
    groups.push({ forms: ["4"], size: 40 });
  }
  const out: SecFeedEntry[] = [];
  for (const group of groups) {
    out.push(...(await fetchEftsDay(day, group.forms, group.size)));
  }
  const seen = new Set<string>();
  return out.filter((e) => {
    if (seen.has(e.accessionNumber)) return false;
    seen.add(e.accessionNumber);
    return true;
  });
}

async function fetchEftsDay(day: string, forms: string[], size: number): Promise<SecFeedEntry[]> {
  const url = `https://efts.sec.gov/LATEST/search-index?dateRange=custom&startdt=${day}&enddt=${day}&forms=${encodeURIComponent(forms.join(","))}&from=0&size=${size}`;
  try {
    const data = await secFetchJson<EftsResponse>(url);
    const hits = data.hits?.hits ?? [];
    const out: SecFeedEntry[] = [];
    for (const hit of hits) {
      const src = hit._source ?? {};
      const accession = normalizeAccession(String(src.adsh ?? ""));
      const cik = padCik(src.ciks?.[0] ?? "");
      if (!accession || !cik) continue;
      const form = Array.isArray(src.form) ? src.form[0] : src.form ?? "8-K";
      const cikNum = cik.replace(/^0+/, "") || "0";
      const accNodash = accession.replace(/-/g, "");
      out.push({
        form,
        title: `${form} - ${src.display_names?.[0] ?? cik} (${cik})`,
        companyName: src.display_names?.[0] ?? null,
        cik,
        publishedAt: src.file_date_time ? new Date(src.file_date_time) : new Date(`${src.file_date ?? day}T12:00:00Z`),
        indexUrl: `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNodash}/${accession}-index.htm`,
        accessionNumber: accession,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function parseAtom(xml: string, fallbackForm: string): SecFeedEntry[] {
  const doc = parser.parse(xml);
  const raw = doc.feed?.entry;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const out: SecFeedEntry[] = [];
  for (const entry of list) {
    const title = String(entry.title ?? "");
    const href = String(entry.link?.["@_href"] ?? entry.link ?? "");
    const parsed = parseTitle(title);
    const acc = extractAccessionFromUrl(href);
    if (!acc) continue;
    out.push({
      form: parsed.form || fallbackForm,
      title,
      companyName: parsed.company,
      cik: parsed.cik || acc.cik,
      publishedAt: entry.updated ? new Date(String(entry.updated)) : new Date(),
      indexUrl: href,
      accessionNumber: normalizeAccession(acc.accession),
    });
  }
  return out;
}

function parseTitle(title: string): { form: string; company: string | null; cik: string } {
  const m = title.match(/^(.*?)\s+-\s+(.*?)\s+\((\d{6,10})\)/);
  if (!m) return { form: "", company: null, cik: "" };
  return { form: m[1].trim(), company: m[2].trim(), cik: padCik(m[3]) };
}

function normalizeAccession(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 18) {
    return `${digits.slice(0, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
  }
  return value;
}

export async function filingToNewsItem(entry: SecFeedEntry): Promise<NormalizedNewsItem | null> {
  const mapped = await resolveTicker(entry.cik);
  let documentUrl = entry.indexUrl;
  let text = entry.title;
  let form4;
  try {
    const doc = await loadFilingDocument(entry.cik, entry.accessionNumber, entry.form);
    documentUrl = doc.documentUrl;
    text = doc.text || entry.title;
    form4 = doc.form4;
  } catch {
    // Keep the index URL and title; never invent body text.
  }
  const ticker = mapped?.ticker ?? null;
  const company = mapped?.companyName ?? entry.companyName;
  const headline = headlineFromText(ticker, entry.form, company, text);

  const item: NormalizedNewsItem & { form4?: typeof form4 } = {
    source: "sec",
    sourceUrl: entry.indexUrl,
    publishedAt: entry.publishedAt,
    retrievedAt: new Date(),
    ticker,
    company,
    cik: entry.cik,
    headline,
    summary: `${entry.form} accepted ${entry.publishedAt.toISOString()}`,
    originalText: text,
    formType: entry.form,
    accessionNumber: entry.accessionNumber,
    documentUrl,
    category: entry.form,
  };
  if (form4) (item as { form4?: typeof form4 }).form4 = form4;
  return item;
}

export type SecNewsItem = NormalizedNewsItem & {
  form4?: Awaited<ReturnType<typeof loadFilingDocument>>["form4"];
};

function headlineFromText(ticker: string | null, form: string, company: string | null, text: string): string {
  const snippet = text.match(
    /\b([A-Z][^.]{12,180}?(?:selected by|has been selected|awarded|enters into|announces)[^.!]{8,160})/,
  );
  if (snippet) {
    const line = snippet[1].replace(/\s+/g, " ").trim();
    return ticker ? `${ticker}: ${line}` : line;
  }
  return ticker ? `${ticker} ${form}: ${company ?? "Issuer"}` : `${form}: ${company ?? "Unknown issuer"}`;
}
