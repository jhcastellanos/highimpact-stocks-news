import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema";
import { requireDatabaseUrl } from "@/lib/env";

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  const url = requireDatabaseUrl();
  const local = url.includes("localhost") || url.includes("127.0.0.1");
  client = postgres(url, {
    max: 1,
    prepare: false,
    ssl: local ? false : "require",
  });
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

export { schema };
