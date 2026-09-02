import { cookies } from "next/headers";
import { DEVICE_COOKIE } from "@/lib/device-cookie";

export { DEVICE_COOKIE };

export async function getDeviceId(): Promise<string | null> {
  const store = await cookies();
  return store.get(DEVICE_COOKIE)?.value ?? null;
}

export async function requireDeviceId(): Promise<string> {
  const id = await getDeviceId();
  if (!id) throw new Error("Missing device cookie");
  return id;
}
