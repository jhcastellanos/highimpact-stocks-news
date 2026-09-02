import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/database/schema";
import { requireDatabaseUrl } from "@/lib/env";

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;
  const url = requireDatabaseUrl();
  client = postgres(url, { max: 4, prepare: false });
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

export { schema };
