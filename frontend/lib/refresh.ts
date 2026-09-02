"use client";

export const REFRESH_EVENT = "market-impact:refresh";

export function emitRefresh() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function onRefresh(handler: () => void) {
  window.addEventListener(REFRESH_EVENT, handler);
  return () => window.removeEventListener(REFRESH_EVENT, handler);
}
