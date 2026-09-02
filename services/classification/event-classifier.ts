import type { EventType, Form4Kind, NormalizedNewsItem } from "@/lib/types";

type KeywordRule = { type: EventType; patterns: RegExp[]; weight: number };

const KEYWORD_RULES: KeywordRule[] = [
  { type: "BANKRUPTCY", patterns: [/\bbankrupt(cy|cies)?\b/i, /\breceivership\b/i, /\bchapter\s+11\b/i], weight: 10 },
  { type: "DELISTING", patterns: [/\bdelist/i, /\bnasdaq\s+compliance\b/i, /\bnyse\s+non[- ]compliance\b/i], weight: 9 },
  { type: "REVERSE_SPLIT", patterns: [/\breverse\s+split\b/i], weight: 9 },
  { type: "FDA_REJECTION", patterns: [/\bcomplete\s+response\s+letter\b/i, /\bfda\s+(denied|rejection|rejects)\b/i], weight: 10 },
  { type: "FDA_APPROVAL", patterns: [/\bfda\s+(approv|clear)/i, /\baccelerated\s+approval\b/i, /\bbla\s+approval\b/i], weight: 10 },
  { type: "CLINICAL_TRIAL", patterns: [/\bphase\s+(i{1,3}|[123])\b/i, /\bclinical\s+trial\b/i, /\btopline\s+data\b/i], weight: 7 },
  { type: "NASA_SPACE_CONTRACT", patterns: [/\bnasa\b/i, /\blunar\b/i, /\bspace\s+force\b/i], weight: 8 },
  { type: "DEFENSE_CONTRACT", patterns: [/\bdepartment\s+of\s+defense\b/i, /\bpentagon\b/i, /\bu\.?s\.?\s+army\b/i, /\bdefense\s+(contract|award)\b/i], weight: 8 },
  { type: "GOVERNMENT_CONTRACT", patterns: [/\bgovernment\s+(contract|award)\b/i, /\bfederal\s+award\b/i], weight: 7 },
  { type: "PUBLIC_OFFERING", patterns: [/\bpublic\s+offering\b/i, /\bfollow[- ]on\s+offering\b/i, /\bunderwritten\s+offering\b/i], weight: 9 },
  { type: "REGISTERED_DIRECT_OFFERING", patterns: [/\bregistered\s+direct\b/i], weight: 9 },
  { type: "ATM_OFFERING", patterns: [/\bat[- ]the[- ]market\b/i, /\batm\s+(offering|program|facility)\b/i], weight: 8 },
  { type: "PRIVATE_PLACEMENT", patterns: [/\bprivate\s+placement\b/i, /\bpip[eé]\b/i], weight: 8 },
  { type: "SHELF_REGISTRATION", patterns: [/\bshelf\s+registration\b/i, /\bform\s+s-3\b/i], weight: 6 },
  { type: "DILUTION", patterns: [/\bdilut/i], weight: 5 },
  { type: "ACQUISITION", patterns: [/\bacquir(e|es|ed|ing)\b/i, /\bacquisition\b/i], weight: 8 },
  { type: "MERGER", patterns: [/\bmerger\b/i, /\bcombine\s+with\b/i], weight: 8 },
  { type: "MAJOR_CONTRACT", patterns: [/\b(multi[- ]?million|multi[- ]?year)\b.*\b(contract|agreement|award)\b/i, /\bawarded\s+a\b.*\bcontract\b/i, /\bselected\b.*\b(contract|supplier|vendor)\b/i, /\bcommercial\s+contract\b/i], weight: 7 },
  { type: "NEW_CUSTOMER", patterns: [/\bnew\s+(customer|client)\b/i, /\bselected\s+by\b/i], weight: 6 },
  { type: "STRATEGIC_PARTNERSHIP", patterns: [/\bstrategic\s+partnership\b/i, /\bstrategic\s+alliance\b/i], weight: 6 },
  { type: "PARTNERSHIP", patterns: [/\bpartnership\b/i, /\bcollaboration\b/i], weight: 5 },
  { type: "SHARE_BUYBACK", patterns: [/\bshare\s+repurchase\b/i, /\bbuyback\b/i], weight: 6 },
  { type: "DIVIDEND", patterns: [/\bdividend\b/i], weight: 5 },
  {
    type: "GUIDANCE_RAISED",
    patterns: [
      /\braises?\s+(its\s+)?(full[- ]year\s+|fy\s+|annual\s+|q[1-4]\s+)?guidance\b/i,
      /\bguidance\s+raised\b/i,
      /\braises?\s+outlook\b/i,
      /\bincreases?\s+(full[- ]year\s+|fy\s+)?guidance\b/i,
    ],
    weight: 9,
  },
  { type: "GUIDANCE_LOWERED", patterns: [/\bcuts?\s+guidance\b/i, /\bguidance\s+(lowered|reduced|cut)\b/i, /\bwithdraws?\s+guidance\b/i], weight: 8 },
  {
    type: "REVENUE_BEAT",
    patterns: [
      /\brevenue\s+beat\b/i,
      /\b(net\s+)?(sales|revenue)s?\b.{0,48}\b(exceeded|above|beat)\b.{0,32}\b(estimate|consensus|expectation|forecast)/i,
      /\b(exceeded|beat)\b.{0,32}\b(estimate|consensus|expectation).{0,24}\b(revenue|sales)\b/i,
      /\brecord\s+(revenue|net\s+sales)\b/i,
    ],
    weight: 8,
  },
  {
    type: "EPS_BEAT",
    patterns: [
      /\beps\s+beat\b/i,
      /\b(earnings per share|diluted eps|eps)\b.{0,48}\b(exceeded|above|beat)\b.{0,32}\b(estimate|consensus|expectation|forecast)/i,
    ],
    weight: 8,
  },
  { type: "REVENUE_MISS", patterns: [/\brevenue\s+miss\b/i, /\bmissed\b.{0,24}\b(revenue|sales)\b.{0,24}\b(estimate|consensus|expectation)/i], weight: 8 },
  { type: "EPS_MISS", patterns: [/\beps\s+miss\b/i, /\bmissed\b.{0,24}\b(eps|earnings)\b.{0,24}\b(estimate|consensus|expectation)/i], weight: 8 },
  { type: "CYBERSECURITY_INCIDENT", patterns: [/\bcyber(security)?\s+incident\b/i, /\bransomware\b/i, /\bdata\s+breach\b/i], weight: 8 },
  { type: "RECALL", patterns: [/\bproduct\s+recall\b/i], weight: 7 },
  { type: "LAWSUIT", patterns: [/\bclass\s+action\b/i, /\blitigation\b/i, /\blawsuit\b/i], weight: 5 },
  { type: "INVESTIGATION", patterns: [/\bdoj\s+investigation\b/i, /\bsec\s+investigation\b/i, /\binvestigation\b/i], weight: 6 },
  { type: "CEO_CHANGE", patterns: [/\bchief\s+executive\s+officer\b.*\b(resign|depart|appoint|name)/i, /\bceo\b.*\b(resign|depart|appoint|name)/i], weight: 6 },
  { type: "CFO_CHANGE", patterns: [/\bchief\s+financial\s+officer\b.*\b(resign|depart|appoint|name)/i, /\bcfo\b.*\b(resign|depart|appoint|name)/i], weight: 5 },
  { type: "NEW_PRODUCT", patterns: [/\blaunches?\b/i, /\bnew\s+product\b/i], weight: 4 },
  { type: "DEBT_FINANCING", patterns: [/\bcredit\s+facility\b/i, /\bterm\s+loan\b/i, /\bsenior\s+notes\b/i], weight: 5 },
];

function fromFormType(form: string | null): EventType | null {
  const f = (form ?? "").toUpperCase();
  if (f === "424B5") return "PUBLIC_OFFERING";
  if (f === "S-3" || f === "S-3ASR") return "SHELF_REGISTRATION";
  if (f === "SC 13D" || f === "SC 13D/A") return "ACTIVIST_13D";
  if (f === "SC 13G" || f === "SC 13G/A") return "LARGE_STAKE_13G";
  if (f === "10-Q" || f === "10-K") return "EARNINGS";
  return null;
}

function fromItems(items: string[]): EventType | null {
  if (items.includes("1.03")) return "BANKRUPTCY";
  if (items.includes("3.01")) return "DELISTING";
  if (items.includes("3.02")) return "DILUTION";
  if (items.includes("2.01")) return "ACQUISITION";
  if (items.includes("2.02")) return "EARNINGS";
  if (items.includes("2.03")) return "DEBT_FINANCING";
  if (items.includes("5.02")) return "EXECUTIVE_DEPARTURE";
  if (items.includes("1.01")) return "MAJOR_CONTRACT";
  return null;
}

function fromForm4(kind?: Form4Kind): EventType | null {
  if (!kind) return null;
  if (kind === "OPEN_MARKET_PURCHASE") return "INSIDER_BUY";
  if (kind === "OPEN_MARKET_SALE" || kind === "AUTOMATIC_SALE") return "INSIDER_SELL";
  return "INSIDER_SELL";
}

export function classifyEventType(input: {
  item: NormalizedNewsItem;
  items?: string[];
  form4Kind?: Form4Kind;
}): { eventType: EventType; confidence: number; matched: string[] } {
  const text = `${input.item.headline}\n${input.item.summary ?? ""}\n${input.item.originalText ?? ""}`;
  const matched: string[] = [];

  if (input.item.formType === "4" || input.item.formType?.startsWith("4")) {
    const t = fromForm4(input.form4Kind);
    if (t) return { eventType: t, confidence: 0.9, matched: [input.form4Kind ?? "FORM4"] };
  }

  let best: { type: EventType; weight: number } | null = null;
  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      matched.push(rule.type);
      if (!best || rule.weight > best.weight) best = { type: rule.type, weight: rule.weight };
    }
  }

  const fromForm = fromFormType(input.item.formType);
  const fromItem = fromItems(input.items ?? []);

  if (best && best.weight >= 8) {
    return { eventType: best.type, confidence: 0.82, matched };
  }
  if (fromForm && ["PUBLIC_OFFERING", "SHELF_REGISTRATION", "ACTIVIST_13D", "LARGE_STAKE_13G"].includes(fromForm)) {
    return { eventType: fromForm, confidence: 0.88, matched: [...matched, fromForm] };
  }
  if (best) return { eventType: best.type, confidence: 0.7, matched };
  if (fromItem) return { eventType: fromItem, confidence: 0.62, matched: [...matched, fromItem] };
  if (fromForm) return { eventType: fromForm, confidence: 0.55, matched: [...matched, fromForm] };
  return { eventType: "OTHER_MATERIAL_EVENT", confidence: 0.4, matched };
}
