"use client";

import { emitRefresh } from "@/frontend/lib/refresh";

const INTERVAL_MS = 30_000;

let started = false;
let inflight = false;

export function startSourcePolling() {
  if (started) return;
  started = true;
  void requestSources();
  window.setInterval(() => {
    void requestSources();
  }, INTERVAL_MS);
}

async function requestSources() {
  if (inflight) return;
  inflight = true;
  try {
    const res = await fetch("/api/ingest?quick=1", { method: "POST" });
    if (res.ok) emitRefresh();
  } catch {
    /* next tick retries */
  } finally {
    inflight = false;
  }
}
