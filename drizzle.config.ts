import { defineConfig } from "drizzle-kit";

// Local/dev config (SQLite). Production uses drizzle.config.pg.ts against
// DATABASE_URL — see package.json scripts and DEPLOYMENT.md.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.SQLITE_PATH ?? "./learntrack.db",
  },
});
