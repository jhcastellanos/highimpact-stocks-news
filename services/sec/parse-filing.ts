import { XMLParser } from "fast-xml-parser";
import { accessionNoDashes, padCik } from "@/lib/format";
import { secFetchJson, secFetchText } from "@/services/sec/client";
import { ITEM_HINTS } from "@/services/sec/forms";

export type ParsedFiling = {
  cik: string;
  accessionNumber: string;
  form: string;
  companyName: string | null;
  publishedAt: Date;
  indexUrl: string;
  documentUrl: string;
  text: string;
  items: string[];
  form4?: Form4Parse;
};

export type Form4Parse = {
  insiderName: string | null;
  role: string | null;
  code: string | null;
  kind: "OPEN_MARKET_PURCHASE" | "OPEN_MARKET_SALE" | "OPTION_EXERCISE" | "GRANT" | "AUTOMATIC_SALE" | "OTHER";
  shares: number | null;
  price: number | null;
  value: number | null;
  acquiredDisposed: "A" | "D" | null;
};

type IndexJson = {
  directory?: { item?: Array<{ name: string; type?: string; size?: string }> | { name: string; type?: string; size?: string } };
};

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

export function extractAccessionFromUrl(url: string): { cik: string; accession: string } | null {
  const match = url.match(/data\/(\d+)\/(\d+)\/([0-9-]+)/);
  if (!match) return null;
  return { cik: padCik(match[1]), accession: match[3].replace("-index.htm", "").replace("-index.html", "") };
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractItems(text: string): string[] {
  const found = new Set<string>();
  const re = /item\s+(\d+\.\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    found.add(m[1]);
  }
  return [...found].sort();
}

function pickPrimaryDocument(items: Array<{ name: string; type?: string; size?: string }>, form: string): string | null {
  const names = items.map((i) => i.name);
  if (form === "4" || form.startsWith("4")) {
    const xml = names.find((n) => n.toLowerCase().endsWith(".xml") && !n.toLowerCase().includes("xsl"));
    if (xml) return xml;
  }
  const htmlDocs = items
    .filter((i) => /\.(htm|html)$/i.test(i.name) && !/index/i.test(i.name) && !/^r\d/i.test(i.name))
    .sort((a, b) => Number(b.size ?? 0) - Number(a.size ?? 0));
  return htmlDocs[0]?.name ?? names.find((n) => /\.(htm|html|txt)$/i.test(n)) ?? null;
}

function pickExhibit99(items: Array<{ name: string }>, primary: string): string | null {
  const names = items.map((i) => i.name).filter((n) => n !== primary);
  return (
    names.find((n) => {
      const lower = n.toLowerCase();
      if (!/\.(htm|html|txt)$/.test(lower) || /index|xsl/.test(lower)) return false;
      return /ex[-_]?99|exhibit[-_]?99|99[-_.]?1/.test(lower);
    }) ?? null
  );
}

export async function loadFilingDocument(cik: string, accession: string, form: string): Promise<{
  documentUrl: string;
  text: string;
  form4?: Form4Parse;
}> {
  const bareCik = cik.replace(/^0+/, "") || "0";
  const acc = accessionNoDashes(accession);
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${bareCik}/${acc}/index.json`;
  const index = await secFetchJson<IndexJson>(indexUrl);
  const rawItems = index.directory?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  const filename = pickPrimaryDocument(items, form);
  if (!filename) {
    return {
      documentUrl: `https://www.sec.gov/Archives/edgar/data/${bareCik}/${acc}/`,
      text: "",
    };
  }
  const documentUrl = `https://www.sec.gov/Archives/edgar/data/${bareCik}/${acc}/${filename}`;
  const body = await secFetchText(documentUrl);
  if (filename.toLowerCase().endsWith(".xml")) {
    return { documentUrl, text: htmlToText(body), form4: parseForm4Xml(body) };
  }
  let text = htmlToText(body);
  const exhibit = pickExhibit99(items, filename);
  if (exhibit) {
    try {
      const exhibitUrl = `https://www.sec.gov/Archives/edgar/data/${bareCik}/${acc}/${exhibit}`;
      const exhibitBody = await secFetchText(exhibitUrl);
      text = `${text}\n${htmlToText(exhibitBody)}`;
    } catch {
      // Keep the primary 8-K body; never invent exhibit text.
    }
  }
  return { documentUrl, text: text.slice(0, 80_000) };
}

export function parseForm4Xml(xml: string): Form4Parse {
  const doc = xmlParser.parse(xml);
  const root = doc.ownershipDocument ?? doc;
  const owner = root.reportingOwner ?? {};
  const name = owner.reportingOwnerId?.rptOwnerName ?? null;
  const rel = owner.reportingOwnerRelationship ?? {};
  const role = rel.officerTitle
    ? String(rel.officerTitle)
    : rel.isDirector === "1" || rel.isDirector === 1
      ? "Director"
      : rel.isOfficer === "1" || rel.isOfficer === 1
        ? "Officer"
        : rel.isTenPercentOwner === "1"
          ? "10% Owner"
          : null;

  const table = root.nonDerivativeTable?.nonDerivativeTransaction;
  const tx = Array.isArray(table) ? table[0] : table;
  const code = tx?.transactionCoding?.transactionCode ? String(tx.transactionCoding.transactionCode) : null;
  const sharesRaw = tx?.transactionAmounts?.transactionShares?.value ?? tx?.transactionAmounts?.transactionShares;
  const priceRaw =
    tx?.transactionAmounts?.transactionPricePerShare?.value ?? tx?.transactionAmounts?.transactionPricePerShare;
  const ad = tx?.transactionAmounts?.transactionAcquiredDisposedCode?.value ?? tx?.transactionAmounts?.transactionAcquiredDisposedCode;
  const shares = sharesRaw != null ? Number(String(sharesRaw).replace(/,/g, "")) : null;
  const price = priceRaw != null ? Number(String(priceRaw).replace(/,/g, "")) : null;
  const footnotes = JSON.stringify(root.footnotes ?? "");
  const automatic = /10b5-1|rule 10b5/i.test(footnotes + xml.slice(0, 5000));

  let kind: Form4Parse["kind"] = "OTHER";
  if (code === "P") kind = "OPEN_MARKET_PURCHASE";
  else if (code === "S" && automatic) kind = "AUTOMATIC_SALE";
  else if (code === "S") kind = "OPEN_MARKET_SALE";
  else if (code === "M") kind = "OPTION_EXERCISE";
  else if (code === "A") kind = "GRANT";

  return {
    insiderName: name ? String(name) : null,
    role,
    code,
    kind,
    shares: Number.isFinite(shares) ? shares : null,
    price: Number.isFinite(price) ? price : null,
    value:
      shares != null && price != null && Number.isFinite(shares) && Number.isFinite(price) ? shares * price : null,
    acquiredDisposed: ad === "A" || ad === "D" ? ad : null,
  };
}

export function itemLabels(items: string[]): string[] {
  return items.map((i) => ITEM_HINTS[i] ?? `Item ${i}`);
}

export { ITEM_HINTS };
