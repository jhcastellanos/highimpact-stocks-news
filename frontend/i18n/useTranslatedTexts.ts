"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/frontend/i18n/LocaleProvider";
import type { Locale } from "@/lib/locale";

const CACHE_PREFIX = "mi_tr_v1:";

function cacheKey(locale: Locale, text: string) {
  return `${CACHE_PREFIX}${locale}:${text}`;
}

function readCache(locale: Locale, text: string): string | null {
  try {
    return window.sessionStorage.getItem(cacheKey(locale, text));
  } catch {
    return null;
  }
}

function writeCache(locale: Locale, text: string, translated: string) {
  try {
    window.sessionStorage.setItem(cacheKey(locale, text), translated);
  } catch {
    /* quota — ignore */
  }
}

export function useTranslatedTexts(sourceTexts: string[]): { texts: string[]; pending: boolean } {
  const { locale } = useI18n();
  const fingerprint = sourceTexts.join("\u0001");
  const [map, setMap] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (locale === "en") {
      setMap({});
      setPending(false);
      return;
    }

    const unique = [...new Set(sourceTexts.map((s) => s.trim()).filter(Boolean))];
    const fromCache: Record<string, string> = {};
    const missing: string[] = [];
    for (const text of unique) {
      const cached = readCache(locale, text);
      if (cached) fromCache[text] = cached;
      else missing.push(text);
    }
    setMap(fromCache);
    if (!missing.length) {
      setPending(false);
      return;
    }

    let cancelled = false;
    setPending(true);
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: locale, texts: missing }),
    })
      .then((res) => res.json())
      .then((json: { translations?: string[] }) => {
        if (cancelled) return;
        const translations = json.translations ?? [];
        const next = { ...fromCache };
        missing.forEach((text, i) => {
          const translated = translations[i]?.trim() || text;
          writeCache(locale, text, translated);
          next[text] = translated;
        });
        setMap(next);
      })
      .catch(() => {
        if (!cancelled) setMap(fromCache);
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });

    return () => {
      cancelled = true;
    };
    // fingerprint captures sourceTexts contents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, fingerprint]);

  const texts = useMemo(() => {
    if (locale === "en") return sourceTexts;
    return sourceTexts.map((text) => {
      const key = text.trim();
      return key ? (map[key] ?? text) : text;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, fingerprint, map]);

  return { texts, pending };
}

export function useTranslatedText(source: string | null | undefined): string {
  const { texts } = useTranslatedTexts(source ? [source] : []);
  return texts[0] ?? source ?? "";
}
