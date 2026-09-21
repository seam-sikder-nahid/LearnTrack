# LearnTrack

> **Learn every day. Track everything. Build your GitHub history automatically.**

**LearnTrack** is a personal learning management app designed for long-term study goals such as **“Android Pentesting — 6 Months.”**

It breaks a learning goal into milestones and daily tasks, records what you actually learned in a Markdown journal, tracks a learning streak, and can synchronize meaningful learning activity to a GitHub repository.

**Live Demo:** https://learn-track-ten.vercel.app/

---

## Core Principle

> **Learning comes first. GitHub activity is only a side effect.**

LearnTrack keeps the **Learning Streak** and **GitHub Sync Status** as separate concepts.

Completing a task does not require GitHub synchronization to succeed, and GitHub activity is never treated as a replacement for actually learning something.

---

## Features

* **Goal → Milestones → Daily Tasks**

  * Break large learning goals into structured milestones and daily tasks.
  * Edit and visualize your learning roadmap.

* **Today's Tasks**

  * See what needs to be completed today.
  * Record what you learned when completing a task.
  * Add optional resources and notes.

* **Automatic Markdown Journal**

  * Creates daily journal entries such as:
    `daily/2026-09-22.md`
  * Journal content is generated from what the learner actually writes.
  * LearnTrack never fabricates learning activity.

* **Learning Streak**

  * Tracks consecutive learning activity independently from GitHub.
  * GitHub synchronization does not determine whether a learning day counts.

* **GitHub Sync**

  * Synchronizes meaningful learning activity to a GitHub repository chosen by the user.
  * Designed around **one meaningful commit per day**, rather than one commit per task.
  * Idempotent sync behavior helps prevent duplicate commits.
  * Includes a visible pending synchronization queue.
  * Uses typed GitHub synchronization errors and retry handling.

* **Learning Activity Calendar**

  * Visualizes LearnTrack's own learning activity.
  * Explicitly separate from GitHub's contribution graph.

* **Journal Search**

  * Search and filter recorded learning entries.

* **Progress Analytics**

  * View learning progress and completion information.

* **Settings**

  * Configure synchronization behavior.
  * Configure GitHub commit message formatting.

* **GitHub-Independent Learning**

  * Task completion, journaling, and streak tracking are designed to continue independently of GitHub availability.

---

## Architecture

```text
app/
├── (app)/                 # Authenticated application shell
├── api/auth/[...nextauth] # Auth.js API route
└── ...                    # Application pages

components/
├── ui/
├── dashboard/
├── tasks/
├── roadmap/
├── journal/
├── github/
├── settings/
├── onboarding/
├── calendar/
└── layout/

lib/
├── db/                    # Database client and schemas
├── auth/                  # Authentication configuration
├── github/                # GitHub integration and sync engine
├── journal/               # Journal generation
├── streak/                # Learning streak logic
└── ...

server/
├── actions/               # Server Actions
└── seed.ts                # Development seed script

drizzle/
├── ...                    # SQLite migrations
└── pg/                    # PostgreSQL migrations

tests/
└── ...                    # Vitest unit tests
```

### Key Design Choices

#### Server Actions

LearnTrack uses Next.js Server Actions instead of introducing a separate REST API layer.

Mutations in `server/actions/`:

* Revalidate input with Zod.
* Obtain the authenticated `userId` from the session.
* Verify resource ownership.
* Only then interact with the database or GitHub API.

This prevents the application from trusting a client-supplied user ID.

#### Server-Side GitHub Tokens

GitHub OAuth access tokens remain server-side.

`lib/github/token.ts` is the controlled access point for retrieving raw OAuth tokens from the database and is protected with the `server-only` package.

This provides a build-time safeguard against accidentally importing token-handling code into client-side code.

#### Database-Level Idempotency

Important operations use deterministic idempotency keys backed by database uniqueness constraints.

For example:

```text
(userId, taskId, date)
(userId, date)
```

This protects against duplicate operations caused by:

* Double-clicks
* Browser refreshes
* Network retries
* Repeated requests

#### One GitHub Commit Per Day

LearnTrack intentionally coalesces a day's learning activity into a meaningful GitHub synchronization rather than creating a separate commit for every completed task.

---

## Tech Stack

| Layer                        | Technology              |
| ---------------------------- | ----------------------- |
| Framework                    | Next.js 16 + App Router |
| Language                     | TypeScript              |
| Styling                      | Tailwind CSS            |
| Database ORM                 | Drizzle ORM             |
| Local Database               | SQLite + better-sqlite3 |
| Production Database          | PostgreSQL              |
| Production Database Provider | Neon                    |
| Authentication               | Auth.js / NextAuth v5   |
| OAuth Provider               | GitHub                  |
| GitHub API                   | Octokit                 |
| Validation                   | Zod                     |
| Testing                      | Vitest                  |
| Deployment                   | Vercel                  |

---

## Database

LearnTrack uses different database backends for local development and production.

### Local Development

Local development uses:

```text
SQLite
↓
better-sqlite3
↓
Drizzle ORM
```

The SQLite schema is maintained in:

```text
lib/db/schema.sqlite.ts
```

### Production

The deployed application uses:

```text
PostgreSQL
↓
Neon
↓
Drizzle ORM
```

The production schema is:

```text
lib/db/schema.ts
```

PostgreSQL migrations are stored under:

```text
drizzle/pg/
```

The current production database has been migrated successfully.

---

## Authentication

LearnTrack uses **GitHub OAuth** through Auth.js.

The production OAuth callback is:

```text
https://learn-track-ten.vercel.app/api/auth/callback/github
```

For local development:

```text
http://localhost:3000/api/auth/callback/github
```

### GitHub OAuth Configuration

Create a GitHub OAuth App from:

https://github.com/settings/developers

Configure:

```text
Application name:
LearnTrack

Homepage URL:
http://localhost:3000
```

For production, use the deployed LearnTrack URL.

Authorization callback:

```text
http://localhost:3000/api/auth/callback/github
```

Production:

```text
https://learn-track-ten.vercel.app/api/auth/callback/github
```

The application uses GitHub permissions required for its repository synchronization functionality.

---

## Local Installation

Clone the repository:

```bash
git clone https://github.com/seam-sikder-nahid/LearnTrack.git
cd LearnTrack
npm install
```

Create your local environment file:

```bash
cp .env.example .env.local
```

Configure the required environment variables.

Then run the local database migration:

```bash
npx drizzle-kit migrate
```

Optionally seed development data:

```bash
npm run db:seed
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Environment Variables

See `.env.example` for the complete configuration.

| Variable               | Local | Production | Description                       |
| ---------------------- | ----: | ---------: | --------------------------------- |
| `SQLITE_PATH`          |     ✅ |          — | SQLite database path              |
| `DATABASE_URL`         |     — |          ✅ | PostgreSQL/Neon connection string |
| `GITHUB_CLIENT_ID`     |     ✅ |          ✅ | GitHub OAuth Client ID            |
| `GITHUB_CLIENT_SECRET` |     ✅ |          ✅ | GitHub OAuth Client Secret        |
| `NEXTAUTH_SECRET`      |     ✅ |          ✅ | Auth.js signing/encryption secret |
| `NEXTAUTH_URL`         |     ✅ |          ✅ | Application base URL              |

Generate a secure `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

**Never commit ****`.env.local`**** or any real secrets to GitHub.**

---

## Development Commands

```bash
npm run dev
```

Start the development server.

```bash
npm run build
```

Create a production build.

```bash
npm run start
```

Start the production build locally.

```bash
npm run lint
```

Run ESLint.

```bash
npm run typecheck
```

Run TypeScript type checking.

```bash
npm run test
```

Run the Vitest test suite.

```bash
npm run db:generate
```

Generate a SQLite migration after schema changes.

```bash
npm run db:migrate
```

Apply SQLite migrations.

```bash
npm run db:studio
```

Open Drizzle Studio.

```bash
npm run db:seed
```

Seed development data.

---

## Production Deployment

LearnTrack is currently deployed using:

```text
GitHub
   ↓
Vercel
   ↓
Next.js application
   ↓
Neon PostgreSQL
```

### Production URL

**https://learn-track-ten.vercel.app/**

### Production Database

The production PostgreSQL database is hosted on **Neon**.

The PostgreSQL migration has been applied successfully and the deployed application has been tested against the production configuration.

### Vercel Environment Variables

The production deployment requires:

```text
DATABASE_URL
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL
```

---

## Security Design

LearnTrack includes several security-focused design decisions.

### Authentication-Based Ownership

Server Actions derive the authenticated user from the server-side session rather than trusting a client-provided `userId`.

### Input Validation

Inputs crossing Server Action boundaries are validated using Zod.

### Server-Side OAuth Tokens

GitHub access tokens are stored and accessed server-side and are not intentionally exposed to browser-side code.

### Idempotency

Task completions and GitHub synchronization records use deterministic unique keys to prevent accidental duplication.

### Safe Error Handling

GitHub API failures are mapped to typed, user-safe errors instead of exposing raw exceptions or stack traces to the browser.

---

## Verification

The project was tested throughout development and deployment.

### Build Verification

The production build currently passes:

```text
✓ Compiled successfully
✓ Finished TypeScript
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

The current production build was successfully generated using:

```bash
npm run build
```

### Database Verification

The Neon PostgreSQL connection was tested successfully.

The production database currently contains the application's migrated tables.

### Production Verification

The deployed Vercel application was tested manually.

Verified:

* Application loads successfully.
* Authentication page loads.
* GitHub OAuth login works.
* GitHub OAuth callback works.
* Authenticated application pages work.
* Production PostgreSQL connection works.
* Deployment completes successfully on Vercel.

---

## Known Limitations

LearnTrack is functional, but some planned features are intentionally not yet implemented.

### Notifications

Notification settings exist, but full push/email notification delivery is not currently implemented.

### Data Export / Import

The planned data export/import functionality is not yet implemented.

### Global Command Palette

A global `Ctrl+K` command palette across tasks, journals, roadmap items, and resources is planned but not currently implemented.

### Rate Limiting

Application-level rate limiting is not currently implemented.

If LearnTrack is opened to a larger public audience, an explicit rate-limiting layer should be considered.

### PostgreSQL Schema Maintenance

The production PostgreSQL schema is maintained separately from the SQLite development schema.

When changing the database structure, both database schemas and their corresponding migrations need to be considered.

---

## Roadmap

Planned improvements include:

* [ ] Global `Ctrl+K` command palette
* [ ] Data export/import
* [ ] Real notification delivery
* [ ] Optional AI-assisted goal → milestone planning
* [ ] Weak-topic detection
* [ ] Improved GitHub synchronization controls
* [ ] Additional learning analytics
* [ ] Production-grade rate limiting

---

## Contributing

Contributions, suggestions, and improvements are welcome.

Typical workflow:

```bash
git clone https://github.com/seam-sikder-nahid/LearnTrack.git
cd LearnTrack
npm install
```

Create a feature branch:

```bash
git checkout -b feature/your-feature
```

Make your changes, test them, and open a pull request.

Before submitting:

```bash
npm run typecheck
npm run build
npm run test
```

---

## License

MIT License.

You are free to use, modify, and distribute this project according to the terms of the license.

---

## Links

**Live Application:**
https://learn-track-ten.vercel.app/

**GitHub Repository:**
https://github.com/seam-sikder-nahid/LearnTrack
