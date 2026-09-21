import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

/**
 * Local/dev database client (SQLite via better-sqlite3).
 *
 * PRODUCTION NOTE: SQLite lives on the local filesystem, which does not
 * persist on serverless platforms like Vercel (§34 / §45 of the spec — "the
 * production architecture must not depend on a local filesystem"). In
 * production this file is swapped for `lib/db/client.pg.ts`, which points
 * Drizzle at a free-tier hosted Postgres instance (e.g. Neon or Supabase)
 * over `DATABASE_URL`. Application code never imports `better-sqlite3`
 * directly — it always imports `db` from this module, so the swap is a
 * one-file change. See DEPLOYMENT.md.
 */

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
};

const sqlite =
  globalForDb.sqlite ??
  new Database(process.env.SQLITE_PATH ?? "./learntrack.db");

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export type DbClient = typeof db;
