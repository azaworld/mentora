import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;
/** Either the database or an open transaction. */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { pool?: Pool; db?: DB };

function create(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = globalForDb.pool ?? new Pool({ connectionString: url, max: 10 });
  if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;
  return drizzle(pool, { schema });
}

/** Lazily created so builds and unit tests never need a database. */
export function getDb(): DB {
  if (!globalForDb.db) globalForDb.db = create();
  return globalForDb.db;
}

export { schema };
