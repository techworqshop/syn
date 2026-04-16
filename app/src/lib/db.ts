import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getClient() {
  if (_client) return _client;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  _client = postgres(url, { max: 10 });
  return _client;
}

export function getDb() {
  if (_db) return _db;
  _db = drizzle(getClient(), { schema });
  return _db;
}

// Backwards-compat export as a Proxy so `db.select()` still works.
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get: (_t, prop) => Reflect.get(getDb(), prop)
});
