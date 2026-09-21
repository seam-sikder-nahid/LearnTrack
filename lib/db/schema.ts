import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

/**
 * NOTE ON DATABASE PORTABILITY
 * ----------------------------
 * This schema is written against Drizzle's SQLite dialect for local dev
 * (see ARCHITECTURE.md / README "Database" section for why Drizzle was
 * substituted for Prisma). The column types used here (text ids, integer
 * timestamps, integer-as-boolean) are intentionally chosen because they
 * map cleanly to `drizzle-orm/pg-core` for a production Postgres schema.
 * `lib/db/schema.pg.ts` contains the Postgres mirror used in production
 * (see that file + DEPLOYMENT.md).
 */

const now = () => sql`(unixepoch())`;

function id(name = "id") {
  return text(name)
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
}

// ---------------------------------------------------------------------------
// Auth.js (NextAuth) required tables
// ---------------------------------------------------------------------------

export const users = sqliteTable("users", {
  id: id(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("email_verified", { mode: "timestamp" }),
  image: text("image"),
  githubUsername: text("github_username"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(now()),
});

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    // access_token is stored server-side only; never returned to the client.
    // See lib/github/token.ts for the single choke point that reads it.
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_id_idx").on(t.userId),
  ],
);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---------------------------------------------------------------------------
// Learning domain
// ---------------------------------------------------------------------------

export const goals = sqliteTable(
  "goals",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(), // e.g. "Android Pentesting"
    description: text("description"),
    durationDays: integer("duration_days").notNull(), // 30 / 90 / 180 / 365 / custom
    startDate: integer("start_date", { mode: "timestamp" }).notNull(),
    targetDate: integer("target_date", { mode: "timestamp" }).notNull(),
    dailyTaskTarget: integer("daily_task_target").notNull().default(2),
    status: text("status", { enum: ["active", "completed", "archived"] })
      .notNull()
      .default("active"),
    isSeed: integer("is_seed", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).default(now()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(now()),
  },
  (t) => [index("goals_user_id_idx").on(t.userId)],
);

export const milestones = sqliteTable(
  "milestones",
  {
    id: id(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    monthIndex: integer("month_index").notNull(), // 1-based month within the goal
    orderIndex: integer("order_index").notNull().default(0),
    deadline: integer("deadline", { mode: "timestamp" }),
    status: text("status", { enum: ["pending", "in_progress", "completed"] })
      .notNull()
      .default("pending"),
    isSeed: integer("is_seed", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).default(now()),
  },
  (t) => [
    index("milestones_goal_id_idx").on(t.goalId),
    index("milestones_goal_order_idx").on(t.goalId, t.orderIndex),
  ],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    milestoneId: text("milestone_id").references(() => milestones.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"), // e.g. "Static Analysis"
    difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] })
      .notNull()
      .default("medium"),
    estimatedMinutes: integer("estimated_minutes").notNull().default(30),
    scheduledDate: integer("scheduled_date", { mode: "timestamp" }).notNull(),
    status: text("status", {
      enum: ["pending", "in_progress", "completed", "skipped"],
    })
      .notNull()
      .default("pending"),
    orderIndex: integer("order_index").notNull().default(0),
    isSeed: integer("is_seed", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).default(now()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(now()),
  },
  (t) => [
    index("tasks_user_date_idx").on(t.userId, t.scheduledDate),
    index("tasks_goal_id_idx").on(t.goalId),
    index("tasks_milestone_id_idx").on(t.milestoneId),
  ],
);

// A TaskCompletion is the append-only record of *what actually happened*.
// It is intentionally separate from `tasks.status` so re-opening/re-completing
// a task (or a retried sync) never loses the original learning record.
export const taskCompletions = sqliteTable(
  "task_completions",
  {
    id: id(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Idempotency key: deterministic hash of (taskId, completedDate) so a
    // double-click / refresh / retry can never create a second completion
    // row for the same task on the same day. See lib/journal/idempotency.ts.
    idempotencyKey: text("idempotency_key").notNull(),
    whatLearned: text("what_learned").notNull(),
    notes: text("notes"),
    resources: text("resources"), // JSON string array of URLs
    completedAt: integer("completed_at", { mode: "timestamp" }).default(now()),
  },
  (t) => [
    uniqueIndex("task_completions_idempotency_idx").on(t.idempotencyKey),
    index("task_completions_user_idx").on(t.userId),
    index("task_completions_task_idx").on(t.taskId),
  ],
);

export const learningResources = sqliteTable(
  "learning_resources",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: text("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    title: text("title"),
    url: text("url").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(now()),
  },
  (t) => [index("learning_resources_user_idx").on(t.userId)],
);

// One JournalEntry per user per calendar day. Regenerated (not duplicated)
// whenever a new completion lands for that day — see lib/journal/generate.ts.
export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalId: text("goal_id").references(() => goals.id, {
      onDelete: "set null",
    }),
    date: text("date").notNull(), // "YYYY-MM-DD", used for uniqueness + filenames
    markdown: text("markdown").notNull(),
    tasksCompletedCount: integer("tasks_completed_count").notNull().default(0),
    tasksPlannedCount: integer("tasks_planned_count").notNull().default(0),
    topics: text("topics"), // JSON string array, derived from task categories
    createdAt: integer("created_at", { mode: "timestamp" }).default(now()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(now()),
  },
  (t) => [
    uniqueIndex("journal_user_date_idx").on(t.userId, t.date),
    index("journal_user_idx").on(t.userId),
  ],
);

export const dailyProgress = sqliteTable(
  "daily_progress",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // "YYYY-MM-DD"
    tasksPlanned: integer("tasks_planned").notNull().default(0),
    tasksCompleted: integer("tasks_completed").notNull().default(0),
    minutesLearned: integer("minutes_learned").notNull().default(0),
    countsForStreak: integer("counts_for_streak", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (t) => [uniqueIndex("daily_progress_user_date_idx").on(t.userId, t.date)],
);

// ---------------------------------------------------------------------------
// GitHub integration
// ---------------------------------------------------------------------------

export const githubConnections = sqliteTable("github_connections", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  githubUserId: text("github_user_id").notNull(),
  githubUsername: text("github_username").notNull(),
  connectedAt: integer("connected_at", { mode: "timestamp" }).default(now()),
});

export const githubRepositories = sqliteTable(
  "github_repositories",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalId: text("goal_id").references(() => goals.id, {
      onDelete: "set null",
    }),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(), // "owner/name"
    defaultBranch: text("default_branch").notNull().default("main"),
    isPrivate: integer("is_private", { mode: "boolean" })
      .notNull()
      .default(true),
    wasCreatedByApp: integer("was_created_by_app", { mode: "boolean" })
      .notNull()
      .default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).default(now()),
  },
  (t) => [
    uniqueIndex("github_repo_user_fullname_idx").on(t.userId, t.fullName),
    index("github_repo_user_idx").on(t.userId),
  ],
);

// One row per sync *attempt*. Append-only audit trail (Sync history, §19).
export const githubSyncs = sqliteTable(
  "github_syncs",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    repositoryId: text("repository_id")
      .notNull()
      .references(() => githubRepositories.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // which journal day this sync covers
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status", {
      enum: ["pending", "syncing", "success", "failed"],
    })
      .notNull()
      .default("pending"),
    commitMessage: text("commit_message"),
    commitSha: text("commit_sha"),
    filesChanged: text("files_changed"), // JSON string array of paths
    errorCode: text("error_code"), // e.g. "429", "401"
    errorMessage: text("error_message"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).default(now()),
    completedAt: integer("completed_at", { mode: "timestamp" }),
  },
  (t) => [
    uniqueIndex("github_sync_idempotency_idx").on(t.idempotencyKey),
    index("github_sync_user_idx").on(t.userId),
    index("github_sync_status_idx").on(t.status),
  ],
);

// The pending queue (§13/§14): anything not yet successfully synced.
// Kept separate from githubSyncs (the audit log) so "what still needs to
// go out" is a cheap, small query instead of scanning full sync history.
export const syncQueue = sqliteTable(
  "sync_queue",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    reason: text("reason").notNull(), // "no_repo" | "github_error" | "offline" | "rate_limited"
    retryCount: integer("retry_count").notNull().default(0),
    nextRetryAt: integer("next_retry_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(now()),
  },
  (t) => [index("sync_queue_user_idx").on(t.userId)],
);

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme", { enum: ["light", "dark", "system"] })
    .notNull()
    .default("system"),
  syncMode: text("sync_mode", {
    enum: ["automatic", "manual", "queue_until_confirmed"],
  })
    .notNull()
    .default("automatic"),
  commitMessageFormat: text("commit_message_format")
    .notNull()
    .default("Learning: {goal} — {date}"),
  streakRequiresGithub: integer("streak_requires_github", { mode: "boolean" })
    .notNull()
    .default(false),
  hasCompletedOnboarding: integer("has_completed_onboarding", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  notificationsEnabled: integer("notifications_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
});

// ---------------------------------------------------------------------------
// Relations (for ergonomic query building with `db.query.*`)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many, one }) => ({
  goals: many(goals),
  tasks: many(tasks),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  githubConnection: one(githubConnections, {
    fields: [users.id],
    references: [githubConnections.userId],
  }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
  milestones: many(milestones),
  tasks: many(tasks),
  repository: many(githubRepositories),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  goal: one(goals, { fields: [milestones.goalId], references: [goals.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  goal: one(goals, { fields: [tasks.goalId], references: [goals.id] }),
  milestone: one(milestones, {
    fields: [tasks.milestoneId],
    references: [milestones.id],
  }),
  completions: many(taskCompletions),
}));

export const taskCompletionsRelations = relations(
  taskCompletions,
  ({ one }) => ({
    task: one(tasks, {
      fields: [taskCompletions.taskId],
      references: [tasks.id],
    }),
  }),
);

export const githubRepositoriesRelations = relations(
  githubRepositories,
  ({ one, many }) => ({
    user: one(users, {
      fields: [githubRepositories.userId],
      references: [users.id],
    }),
    goal: one(goals, {
      fields: [githubRepositories.goalId],
      references: [goals.id],
    }),
    syncs: many(githubSyncs),
  }),
);

export type User = typeof users.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type GithubRepository = typeof githubRepositories.$inferSelect;
export type GithubSync = typeof githubSyncs.$inferSelect;
export type SyncQueueItem = typeof syncQueue.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
