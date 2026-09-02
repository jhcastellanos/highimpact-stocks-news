"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/frontend/i18n/LocaleProvider";

function urlBase64ToUint8Array(base64String: string) {
  const trimmed = base64String.replace(/['"\s]/g, "");
  const padding = "=".repeat((4 - (trimmed.length % 4)) % 4);
  const base64 = (trimmed + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  return iOS && webkit;
}

function isStandalonePwa() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PushToggle() {
  const { t } = useI18n();
  const [state, setState] = useState<"off" | "on" | "denied" | "missing" | "ios">("off");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
      setState(isIosSafari() && !isStandalonePwa() ? "ios" : "missing");
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => setState("missing"));
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setState("on");
      })
      .catch(() => undefined);
  }, []);

  async function enable() {
    setError(null);
    setBusy(true);
    try {
      if (isIosSafari() && !isStandalonePwa()) {
        setState("ios");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("missing");
        return;
      }

      await fetch("/api/device").catch(() => undefined);

      const keyRes = await fetch("/api/push/vapid", { cache: "no-store" });
      const keyJson = (await keyRes.json()) as { publicKey?: string; error?: string };
      const key = keyJson.publicKey;
      if (!keyRes.ok || !key) {
        setError(t("alertsFailed"));
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("denied");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }

      const json = sub.toJSON();
      const save = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!save.ok) {
        setError(t("alertsFailed"));
        return;
      }

      setState("on");
      try {
        await new Notification("Market Impact", {
          body: t("alertsOn"),
          icon: "/icons/192",
        });
      } catch {
        /* permission granted but some browsers block the constructor */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("alertsFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (state === "on") {
    return (
      <span className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent">
        {t("alertsOn")}
      </span>
    );
  }
  if (state === "denied") {
    return <span className="font-mono text-[10px] uppercase tracking-widest text-neg">{t("notificationsBlocked")}</span>;
  }
  if (state === "ios") {
    return <span className="max-w-[11rem] text-right font-mono text-[10px] leading-snug text-mute">{t("alertsNeedPwa")}</span>;
  }
  if (state === "missing") {
    return <span className="font-mono text-[10px] uppercase tracking-widest text-mute">{t("alertsUnavailable")}</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void enable()}
        disabled={busy}
        className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent disabled:opacity-50"
      >
        {busy ? t("enablingAlerts") : t("enableAlerts")}
      </button>
      {error ? <span className="max-w-[12rem] text-right font-mono text-[10px] leading-snug text-neg">{error}</span> : null}
    </div>
  );
}
