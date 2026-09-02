"use client";

import { useI18n } from "@/frontend/i18n/LocaleProvider";
import type { Locale } from "@/lib/locale";

const OPTIONS: Array<{ id: Locale; label: string }> = [
  { id: "en", label: "EN" },
  { id: "es", label: "ES" },
];

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex rounded-full border border-line bg-panel/80 p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = locale === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLocale(opt.id)}
            className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${
              active ? "bg-accent text-white" : "text-mute hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
