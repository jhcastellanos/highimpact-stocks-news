"use client";

import { useState } from "react";
import { emitRefresh } from "@/frontend/lib/refresh";
import { useI18n } from "@/frontend/i18n/LocaleProvider";

export function RefreshButton() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const json = await res.json();
      if (!res.ok) setMsg(json.error ?? t("ingestFailed"));
      else {
        setMsg(`+${json.result?.inserted ?? 0} new · ${json.result?.duplicates ?? 0} dup`);
        emitRefresh();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("ingestFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy}
        className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-mute hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {busy ? t("ingesting") : t("scanSec")}
      </button>
      {msg ? <span className="font-mono text-[10px] text-mute">{msg}</span> : null}
    </div>
  );
}
