"use client";

import { useEffect, useRef, useState } from "react";
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
  return iOS && /WebKit/.test(ua) && !/CriOS|FxiOS/.test(ua);
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
  const vapidKey = useRef<string | null>(null);

  useEffect(() => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState(isIosSafari() && !isStandalonePwa() ? "ios" : "missing");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    void navigator.serviceWorker.register("/sw.js");
    void fetch("/api/push/vapid", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { publicKey?: string }) => {
        if (json.publicKey) vapidKey.current = json.publicKey;
      })
      .catch(() => undefined);
    void navigator.serviceWorker.ready
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
        window.alert(t("alertsNeedPwa"));
        setState("ios");
        return;
      }
      if (typeof Notification === "undefined") {
        window.alert(t("alertsUnavailable"));
        setState("missing");
        return;
      }

      // Must run in the same turn as the click. Any await before this
      // makes Chrome/Safari skip the permission prompt.
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("denied");
        window.alert(t("notificationsBlocked"));
        return;
      }

      await fetch("/api/device").catch(() => undefined);

      let key = vapidKey.current;
      if (!key) {
        const keyRes = await fetch("/api/push/vapid", { cache: "no-store" });
        const keyJson = (await keyRes.json()) as { publicKey?: string };
        key = keyJson.publicKey ?? null;
        vapidKey.current = key;
      }
      if (!key) {
        setError(t("alertsFailed"));
        window.alert(t("alertsFailed"));
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
        window.alert(t("alertsFailed"));
        return;
      }

      setState("on");
      await reg.showNotification("Market Impact", {
        body: t("alertsOn"),
        icon: "/icons/192",
        badge: "/icons/192",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("alertsFailed");
      setError(message);
      window.alert(message);
    } finally {
      setBusy(false);
    }
  }

  if (state === "on") {
    return (
      <div className="rounded-xl border border-accent/40 bg-accent/15 px-4 py-3 text-center font-mono text-xs uppercase tracking-widest text-accent">
        {t("alertsOn")}
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div className="rounded-xl border border-neg/40 bg-neg/10 px-4 py-3 text-center font-mono text-xs uppercase tracking-widest text-neg">
        {t("notificationsBlocked")}
      </div>
    );
  }
  if (state === "ios") {
    return (
      <div className="rounded-xl border border-line bg-panel px-4 py-3 text-center text-sm text-mute">{t("alertsNeedPwa")}</div>
    );
  }
  if (state === "missing") {
    return (
      <div className="rounded-xl border border-line bg-panel px-4 py-3 text-center font-mono text-xs uppercase tracking-widest text-mute">
        {t("alertsUnavailable")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void enable()}
        disabled={busy}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold tracking-wide text-white disabled:opacity-50"
      >
        {busy ? t("enablingAlerts") : t("enableAlerts")}
      </button>
      {error ? <p className="text-center text-sm text-neg">{error}</p> : null}
    </div>
  );
}
