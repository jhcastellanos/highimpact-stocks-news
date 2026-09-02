import { getEnv } from "@/lib/env";
import type { Locale } from "@/lib/locale";

const memory = new Map<string, string>();
const MAX_CACHE = 2_000;

function memKey(target: Locale, text: string) {
  return `${target}:${text}`;
}

function remember(target: Locale, text: string, translated: string) {
  if (memory.size > MAX_CACHE) {
    const first = memory.keys().next().value;
    if (first) memory.delete(first);
  }
  memory.set(memKey(target, text), translated);
}

export async function translateTexts(texts: string[], target: Locale): Promise<string[]> {
  if (target === "en") return texts;
  const unique = [...new Set(texts)];
  const pending = unique.filter((text) => text.trim() && !memory.has(memKey(target, text)));

  if (pending.length) {
    const viaLlm = await translateWithOpenAi(pending, target);
    if (viaLlm) {
      pending.forEach((text, i) => remember(target, text, viaLlm[i] ?? text));
    } else {
      await translateWithGoogle(pending, target);
    }
  }

  return texts.map((text) => {
    const trimmed = text.trim();
    if (!trimmed) return text;
    return memory.get(memKey(target, trimmed)) ?? text;
  });
}

async function translateWithOpenAi(texts: string[], target: Locale): Promise<string[] | null> {
  const env = getEnv();
  if (!env.openaiApiKey) return null;

  const targetName = target === "es" ? "Spanish" : "English";
  try {
    const res = await fetch(`${env.openaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.openaiModel,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a faithful translator into ${targetName} for US equity news.
Translate only. Do not add, drop, or invent facts, figures, customers, contracts, or affiliations.
Keep tickers, company legal names, CUSIPs, accession numbers, form types (8-K, 10-Q, Form 4), dollar amounts, and percentages unchanged.
Translate "Not disclosed" to "No divulgado", "Unknown" to "Desconocido", and "ESTIMATED" to "ESTIMADO" when the target is Spanish.
Return JSON {"translations": string[]} with the same length and order as the input.`,
          },
          { role: "user", content: JSON.stringify({ texts }) },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { translations?: unknown };
    if (!Array.isArray(parsed.translations) || parsed.translations.length !== texts.length) return null;
    return parsed.translations.map((item, i) => (typeof item === "string" && item.trim() ? item : texts[i]));
  } catch {
    return null;
  }
}

async function translateWithGoogle(texts: string[], target: Locale) {
  const source = target === "es" ? "en" : "es";
  const queue = [...texts];
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const text = queue.shift();
      if (!text) break;
      const translated = (await googleOne(text, source, target)) ?? (await myMemoryOne(text, source, target)) ?? text;
      remember(target, text, translated);
    }
  });
  await Promise.all(workers);
}

async function googleOne(text: string, source: string, target: string): Promise<string | null> {
  try {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", source);
    url.searchParams.set("tl", target);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", text.slice(0, 4500));
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    if (!Array.isArray(json) || !Array.isArray(json[0])) return null;
    const out = json[0]
      .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
      .join("");
    return out.trim() || null;
  } catch {
    return null;
  }
}

async function myMemoryOne(text: string, source: string, target: string): Promise<string | null> {
  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text.slice(0, 480));
    url.searchParams.set("langpair", `${source}|${target}`);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const json = (await res.json()) as { responseData?: { translatedText?: string } };
    const out = json.responseData?.translatedText?.trim();
    return out || null;
  } catch {
    return null;
  }
}
