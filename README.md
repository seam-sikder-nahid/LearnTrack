# LearnTrack

> Learn every day. Track everything. Build your GitHub history automatically.

LearnTrack is a personal learning management app for long-term study goals
(e.g. "Android Pentesting — 6 Months"). It breaks a goal into milestones and
daily tasks, keeps a Markdown learning journal, tracks a **learning streak**,
and — as a side effect of real learning activity, never the point of it —
syncs your progress to a GitHub repository you choose.

**Core principle:** GitHub contribution is a side effect. Learning is the
primary purpose. The Learning Streak and GitHub Sync Status are tracked and
shown as two separate things; completing tasks never requires GitHub to
succeed, and GitHub sync is never a substitute for actually learning
something.

---

## Features

- **Goal → Milestones → Daily Tasks** planning, with an editable visual roadmap
- **Today's Tasks** with a lightweight completion flow: what you learned, optional resources/notes
- **Automatic Markdown journal** (`daily/YYYY-MM-DD.md`), generated only from what you actually wrote — never fabricated content
- **Learning streak**, decoupled from GitHub (configurable if you want to couple them)
- **GitHub sync engine**: one meaningful commit per day, idempotent (safe against double-clicks, refreshes, retries), with a typed error/retry system and a visible Pending Sync Queue
- **Learning Activity heatmap** (calendar), explicitly labeled as LearnTrack's own data, not GitHub's contribution graph
- **Journal search**, progress analytics, settings for sync mode and commit message format
- Works fully offline of GitHub — task completion, journaling, and the streak never depend on network access to GitHub

---

## Architecture

```
app/            Next.js App Router pages (route groups: (app) = authenticated shell)
components/     UI components (ui/, dashboard/, tasks/, roadmap/, journal/, github/, settings/, onboarding/, calendar/, layout/)
lib/            Business logic: db/ (schema+client), auth/, github/ (sync engine), journal/, streak/, dates.ts, utils.ts
server/         Server actions (server/actions/*) — the only things that touch the DB or GitHub API
drizzle/        Generated SQL migrations
tests/          Vitest unit tests for the pure logic (streak, idempotency, journal generation, commit formatting, sync error mapping)
```

Key design choices:

- **Server actions, not a REST API layer.** Every mutation (`server/actions/*.ts`) is a `"use server"` function called directly from Server/Client Components. Each one re-validates input with Zod and re-checks ownership (`userId` from the session, never trusted from the client) before touching the database — this is the IDOR protection required by §30.
- **GitHub access tokens never reach the client.** `lib/github/token.ts` is the single function allowed to read a raw OAuth token from the database, and it's guarded by the `server-only` package (a build-time error if it's ever imported into client code), not just convention.
- **Idempotency is enforced at the database level**, not just in application logic: `taskCompletions.idempotencyKey` and `githubSyncs.idempotencyKey` are unique-indexed columns derived deterministically from `(userId, taskId, date)` / `(userId, date)`. A double-click, browser refresh, or network retry hits a unique-constraint violation, which the app treats as "already done," not an error. This was verified against a real SQLite database during development (see "Known limitations," below, for exactly what was and wasn't tested).
- **One commit per day, not one per task.** All of a day's completions are coalesced into a single `GithubSync` row (keyed by `(userId, date)`), so completing four tasks produces one meaningful commit, matching the product principle in the spec.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript + Tailwind CSS | as specified |
| Database ORM | **Drizzle ORM**, not Prisma | see "Why Drizzle instead of Prisma" below |
| Local DB | SQLite (via `better-sqlite3`) | as specified, for local dev |
| Production DB | Postgres (any free-tier host: Neon, Supabase, Railway) | SQLite doesn't survive serverless deployments |
| Auth | Auth.js v5 (`next-auth@beta`) with GitHub OAuth | as specified |
| GitHub API | Octokit | as specified |
| Deployment | Vercel free tier | as specified |

### Why Drizzle instead of Prisma

The spec calls for Prisma. During development, Prisma's CLI (`prisma generate`,
`prisma migrate`) needed to download a Rust query/schema engine binary from
`binaries.prisma.sh`. In the sandboxed environment used to build this project,
that domain wasn't reachable, so Prisma could not actually be generated, run,
or tested — I could not verify a Prisma-based version of this app compiles or
works. Drizzle ORM is pure TypeScript with no native binary to fetch, models
the same relational schema (see `lib/db/schema.ts`, with a hand-mirrored
Postgres version in `lib/db/schema.pg.ts` for production), and every
migration/seed/build/test command below was actually run against it. This
should not be a real constraint in your own environment — if you have
unrestricted network access and prefer Prisma, the schema in `lib/db/schema.ts`
is a straightforward translation.

---

## Local installation

```bash
git clone <your-fork-url> learntrack
cd learntrack
npm install
cp .env.example .env.local
```

Fill in `.env.local` (see "Environment variables" and "GitHub OAuth setup"
below), then:

```bash
npx drizzle-kit migrate   # creates learntrack.db and applies the schema
npm run db:seed           # optional: seeds a demo "Android Pentesting" goal
npm run dev
```

Visit `http://localhost:3000`.

## Environment variables

See `.env.example` for the full list with explanations. Summary:

| Variable | Required | Where it comes from |
|---|---|---|
| `SQLITE_PATH` | local dev only | any file path; defaults to `./learntrack.db` |
| `DATABASE_URL` | production only | your Postgres provider's connection string |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | yes | your GitHub OAuth App (see below) |
| `NEXTAUTH_SECRET` | yes | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | yes | `http://localhost:3000` locally, your deployed URL in production |

## GitHub OAuth setup

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App** (https://github.com/settings/developers).
2. **Application name:** `LearnTrack` (or anything).
3. **Homepage URL:** `http://localhost:3000` for local dev, or your Vercel URL in production.
4. **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github` locally, or `https://<your-domain>/api/auth/callback/github` in production.
5. Create the app, then copy the **Client ID** and generate a **Client Secret** into `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.
6. LearnTrack requests the `read:user repo` scope — `repo` is required to create/read/write files in the repository you choose during onboarding.

If you deploy to a second URL later (e.g. adding a custom domain), either add a second OAuth App or update the callback URL — GitHub OAuth Apps support only one callback URL each in the classic flow used here.

## Database setup

Local development uses SQLite automatically (`lib/db/client.ts`). For
production, see `DEPLOYMENT.md` for switching to Postgres — the short version
is: provision a free Postgres database, set `DATABASE_URL`, swap the one
import in `lib/db/client.ts`, and run `drizzle-kit migrate --config
drizzle.config.pg.ts`.

## Development commands

```bash
npm run dev            # start the dev server
npm run build          # production build
npm run start          # run the production build
npm run lint            # eslint
npm run typecheck       # tsc --noEmit
npm run test             # vitest (unit tests for streak/idempotency/journal/sync logic)
npm run db:generate      # generate a new SQLite migration after schema changes
npm run db:migrate       # apply migrations
npm run db:studio        # Drizzle Studio (visual DB browser)
npm run db:seed          # seed demo data
```

## Production deployment

See **`DEPLOYMENT.md`** for full step-by-step instructions (Vercel + a free
Postgres provider).

## Security notes

- OAuth access tokens are stored server-side (in the `accounts` table managed
  by the Auth.js Drizzle adapter) and are only ever read by
  `lib/github/token.ts`, which is marked `server-only`.
- Every server action re-derives `userId` from the authenticated session and
  checks resource ownership before reading/writing — no server action trusts
  a `userId` passed from the client.
- Input is validated with Zod at every server action boundary.
- GitHub API failures are mapped to typed, user-safe error messages
  (`lib/github/sync-engine.ts`); raw errors/stack traces are never sent to the
  browser, only logged server-side (and never include the access token).
- Task completions and GitHub syncs are protected against duplication by
  database-level unique constraints on deterministic idempotency keys.

## Known limitations (read before relying on this in production)

Being direct about what was and wasn't verified:

- **GitHub OAuth login and a live GitHub commit were not tested against a real
  GitHub App** — I don't have credentials to do that from this environment.
  What *was* verified: the OAuth provider is correctly configured and
  reachable (`/api/auth/providers` returns the expected GitHub provider
  metadata against a running production build), the sign-in flow redirects
  correctly, and the Octokit calls in `lib/github/sync-engine.ts` follow the
  documented GitHub Contents API correctly (get-sha-then-put), but I have not
  confirmed a byte-for-byte successful commit against api.github.com.
- **Deployment to Vercel was not performed** — I don't have access to a Vercel
  account from this environment. `DEPLOYMENT.md` gives exact steps, but you
  should treat the first deploy as the real test of the production
  configuration (particularly the Postgres schema mirror in
  `lib/db/schema.pg.ts`, which is hand-kept in sync with `schema.ts` rather
  than generated from a single source of truth).
- **Prisma was replaced with Drizzle** (see above) — if your evaluation
  specifically requires Prisma, this doesn't meet that requirement as written.
- **Notifications (§24) are a settings toggle only** — no actual push/email
  notification delivery is implemented; there's no free, credential-free
  notification channel to test in this environment.
- **Export/Import (§25/§26) and global command-palette search (§23) are not
  yet implemented.** The Journal page has in-page search/filtering; a
  Ctrl+K command palette across tasks/journal/roadmap/resources is not built.
- **Task resource URLs are validated as URLs by Zod**, so pasting non-URL text
  into the "Resources" field on task completion will currently fail
  validation rather than being saved as freeform text — a minor UX gap, not a
  data-safety issue.
- Rate limiting (§30, "rate limiting where appropriate") is not implemented;
  in production, put this behind Vercel's platform-level abuse protection or
  add an explicit limiter (e.g. Upstash's free-tier rate limiter) if you
  expect it to be internet-facing rather than single-user.
- The Postgres production schema (`schema.pg.ts`) is a manually-maintained
  mirror of the SQLite dev schema, not generated from one source — if you
  change `schema.ts`, make the matching change there too.

## What was actually verified during development

To be concrete rather than just asserting "it works":

- `npm run build`, `npm run lint`, `npm run typecheck`, and `npm run test`
  (28 unit tests) all pass with zero errors and zero warnings.
- A real SQLite database was migrated (`drizzle-kit migrate`) and seeded
  (`npm run db:seed`), and the resulting rows were inspected directly.
- The idempotency guarantee was verified against that real database: inserting
  the same `(userId, taskId, date)` completion twice succeeds once and is
  rejected the second time by the database's unique constraint — not just
  asserted in a mocked test.
- A production build was started as a real HTTP server and hit with `curl`:
  `/` redirects unauthenticated users, `/login` renders real HTML, `/dashboard`
  correctly redirects to `/login` when unauthenticated, and
  `/api/auth/providers` returns the correctly-configured GitHub OAuth provider
  metadata.
- What was **not** run: an actual GitHub OAuth handshake (needs a real OAuth
  App + a browser to click through consent) and an actual push to a GitHub
  repository (needs a real user access token).

## Roadmap (beyond this initial build)

- Global Ctrl+K command palette (§23)
- Data export/import (§25/§26)
- Optional AI features (§40): goal → milestone breakdown, weak-topic detection — designed to bolt on without being required for the core product to work
- Real notification delivery (email digest via a free provider, e.g. Resend's free tier)

## License

MIT — do whatever you like with this.
