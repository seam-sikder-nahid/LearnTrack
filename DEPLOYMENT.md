# Deploying LearnTrack for free

This gets you a live, working LearnTrack on Vercel's free tier with a free
hosted Postgres database. Total cost: $0.

## 1. Provision a free Postgres database

Pick one (all have a free tier sufficient for a single-user app):

- **[Neon](https://neon.tech)** (recommended — serverless Postgres, generous free tier, works great with Vercel)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app) (free tier is usage-limited, not always-free)

For Neon:

1. Create an account, create a project.
2. Copy the connection string (it looks like `postgresql://user:pass@host/dbname?sslmode=require`).
3. Save it — this is your `DATABASE_URL`.

## 2. Switch the app to Postgres

The app ships with SQLite wired up by default (for local dev, per the spec's
requirement that local dev can stay on SQLite). To point production at
Postgres:

1. Install the Postgres driver:
   ```bash
   npm install postgres
   ```
2. Create `lib/db/client.pg.ts`:
   ```ts
   import postgres from "postgres";
   import { drizzle } from "drizzle-orm/postgres-js";
   import * as schema from "./schema.pg";

   const client = postgres(process.env.DATABASE_URL!, { max: 1 });
   export const db = drizzle(client, { schema });
   export type DbClient = typeof db;
   ```
3. In every file that does `import { db } from "@/lib/db/client"`, change the
   import to `@/lib/db/client.pg` — or simpler, rename `client.ts` to
   `client.sqlite.ts` and rename `client.pg.ts` to `client.ts`, so no other
   file needs to change. (This second approach is recommended — it's a
   one-file swap.)
4. Generate and run the Postgres migration:
   ```bash
   npx drizzle-kit generate --config drizzle.config.pg.ts
   npx drizzle-kit migrate  --config drizzle.config.pg.ts
   ```
   (Run this locally with `DATABASE_URL` set to your Neon connection string —
   it applies the schema to your hosted database before your first deploy.)

## 3. Create the GitHub OAuth App for production

Follow the same steps as local dev (see `README.md`), but:

- **Homepage URL:** `https://<your-app>.vercel.app` (you'll get this domain in step 5, or set it up first and come back)
- **Authorization callback URL:** `https://<your-app>.vercel.app/api/auth/callback/github`

You can create a second OAuth App for production and keep a separate one for
local dev, or update the single app's URLs each time you switch context —
a second app is simpler.

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Initial LearnTrack commit"
git remote add origin https://github.com/<you>/learntrack.git
git push -u origin main
```

## 5. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new), import your GitHub repo.
2. Vercel auto-detects Next.js — no build settings changes needed.
3. Add environment variables (Project Settings → Environment Variables):
   - `DATABASE_URL` — your Neon connection string
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `https://<your-app>.vercel.app`
4. Deploy.
5. If your GitHub OAuth App's URLs used a placeholder, update them now to the
   real `*.vercel.app` domain Vercel assigned you.

## 6. Verify

- Visit your deployed URL, sign in with GitHub, complete onboarding.
- Complete a task, confirm the journal entry appears under Journal.
- Check GitHub Sync — confirm a commit landed in your chosen repository under
  `daily/<today>.md`, `progress.json`, and `README.md`.
- If sync fails, check the Vercel function logs (Project → Deployments → the
  deployment → Functions) for the server-side log line in
  `server/actions/sync-now.ts` (`[github-sync] failed for user=... code=...`)
  — it never logs the access token, only the error code.

## Cron / automation

No cron job is required — sync happens synchronously when a task is
completed (per the sync mode set in Settings). If you want a periodic sweep
of the Pending Sync Queue (e.g. to retry a rate-limited sync after the
backoff window), Vercel's free tier includes [Vercel Cron](https://vercel.com/docs/cron-jobs)
for hobby projects (subject to their current free-tier limits — check
Vercel's docs, as these change). This is optional; the app works correctly
without it, since the next task completion or manual "Sync Now" click will
also drain the queue.

## Known deployment caveats

- This guide was written and the local-side commands (build, migration
  generation) were tested, but the actual Vercel deployment and Neon
  provisioning were not performed from this environment — I don't have
  accounts on either service here. Treat your first deploy as the real
  integration test.
- `lib/db/schema.pg.ts` is a hand-kept mirror of `lib/db/schema.ts`. If you
  change the SQLite schema, update the Postgres one too before regenerating
  the production migration.
