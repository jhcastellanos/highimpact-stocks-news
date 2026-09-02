import webpush from "web-push";
import { getEnv } from "@/lib/env";

let configured = false;

export function configurePush() {
  if (configured) return true;
  const env = getEnv();
  if (!env.vapidPublicKey || !env.vapidPrivateKey) return false;
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  configured = true;
  return true;
}

export async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; url: string },
) {
  if (!configurePush()) return;
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
