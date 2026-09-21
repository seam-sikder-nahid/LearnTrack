import { defineConfig } from "drizzle-kit";

// Production config (Postgres). Run with:
//   npx drizzle-kit generate --config drizzle.config.pg.ts
//   npx drizzle-kit migrate  --config drizzle.config.pg.ts
// See DEPLOYMENT.md.
export default defineConfig({
  schema: "./lib/db/schema.pg.ts",
  out: "./drizzle/pg",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
});
