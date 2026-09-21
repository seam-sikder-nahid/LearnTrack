/**
 * Production (Postgres) mirror of ./schema.ts.
 *
 * Drizzle does not have a single dialect-agnostic schema format, so this is
 * a deliberate, hand-kept mirror of the SQLite schema used in dev — same
 * table names, same columns, same indexes — targeting `drizzle-orm/pg-core`
 * instead. Swap `lib/db/client.ts` -> `lib/db/client.pg.ts` and this file
 * becomes the active schema (see DEPLOYMENT.md, "Switching to Postgres").
 *
 * Only the column *type constructors* differ from schema.ts:
 *   - text(...).primaryKey()  -> same
 *   - integer(mode: "timestamp") -> timestamp(...)
 *   - integer(mode: "boolean")   -> boolean(...)
 * Table/column names, relations, and application code are unchanged.
 */

import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

function id(name = "id") {
  return text(name)
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
}

export const users = pgTable("users", {
  id: id(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  githubUsername: text("github_username"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
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

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const goals = pgTable(
  "goals",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    durationDays: integer("duration_days").notNull(),
    startDate: timestamp("start_date").notNull(),
    targetDate: timestamp("target_date").notNull(),
    dailyTaskTarget: integer("daily_task_target").notNull().default(2),
    status: text("status", { enum: ["active", "completed", "archived"] })
      .notNull()
      .default("active"),
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("goals_user_id_idx").on(t.userId)],
);

export const milestones = pgTable(
  "milestones",
  {
    id: id(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    monthIndex: integer("month_index").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    deadline: timestamp("deadline"),
    status: text("status", { enum: ["pending", "in_progress", "completed"] })
      .notNull()
      .default("pending"),
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("milestones_goal_id_idx").on(t.goalId),
    index("milestones_goal_order_idx").on(t.goalId, t.orderIndex),
  ],
);

export const tasks = pgTable(
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
    category: text("category"),
    difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] })
      .notNull()
      .default("medium"),
    estimatedMinutes: integer("estimated_minutes").notNull().default(30),
    scheduledDate: timestamp("scheduled_date").notNull(),
    status: text("status", {
      enum: ["pending", "in_progress", "completed", "skipped"],
    })
      .notNull()
      .default("pending"),
    orderIndex: integer("order_index").notNull().default(0),
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("tasks_user_date_idx").on(t.userId, t.scheduledDate),
    index("tasks_goal_id_idx").on(t.goalId),
    index("tasks_milestone_id_idx").on(t.milestoneId),
  ],
);

export const taskCompletions = pgTable(
  "task_completions",
  {
    id: id(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    whatLearned: text("what_learned").notNull(),
    notes: text("notes"),
    resources: text("resources"),
    completedAt: timestamp("completed_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("task_completions_idempotency_idx").on(t.idempotencyKey),
    index("task_completions_user_idx").on(t.userId),
    index("task_completions_task_idx").on(t.taskId),
  ],
);

export const learningResources = pgTable(
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
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("learning_resources_user_idx").on(t.userId)],
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalId: text("goal_id").references(() => goals.id, {
      onDelete: "set null",
    }),
    date: text("date").notNull(),
    markdown: text("markdown").notNull(),
    tasksCompletedCount: integer("tasks_completed_count").notNull().default(0),
    tasksPlannedCount: integer("tasks_planned_count").notNull().default(0),
    topics: text("topics"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("journal_user_date_idx").on(t.userId, t.date),
    index("journal_user_idx").on(t.userId),
  ],
);

export const dailyProgress = pgTable(
  "daily_progress",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    tasksPlanned: integer("tasks_planned").notNull().default(0),
    tasksCompleted: integer("tasks_completed").notNull().default(0),
    minutesLearned: integer("minutes_learned").notNull().default(0),
    countsForStreak: boolean("counts_for_streak").notNull().default(false),
  },
  (t) => [uniqueIndex("daily_progress_user_date_idx").on(t.userId, t.date)],
);

export const githubConnections = pgTable("github_connections", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  githubUserId: text("github_user_id").notNull(),
  githubUsername: text("github_username").notNull(),
  connectedAt: timestamp("connected_at").defaultNow(),
});

export const githubRepositories = pgTable(
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
    fullName: text("full_name").notNull(),
    defaultBranch: text("default_branch").notNull().default("main"),
    isPrivate: boolean("is_private").notNull().default(true),
    wasCreatedByApp: boolean("was_created_by_app").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("github_repo_user_fullname_idx").on(t.userId, t.fullName),
    index("github_repo_user_idx").on(t.userId),
  ],
);

export const githubSyncs = pgTable(
  "github_syncs",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    repositoryId: text("repository_id")
      .notNull()
      .references(() => githubRepositories.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status", {
      enum: ["pending", "syncing", "success", "failed"],
    })
      .notNull()
      .default("pending"),
    commitMessage: text("commit_message"),
    commitSha: text("commit_sha"),
    filesChanged: text("files_changed"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [
    uniqueIndex("github_sync_idempotency_idx").on(t.idempotencyKey),
    index("github_sync_user_idx").on(t.userId),
    index("github_sync_status_idx").on(t.status),
  ],
);

export const syncQueue = pgTable(
  "sync_queue",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    reason: text("reason").notNull(),
    retryCount: integer("retry_count").notNull().default(0),
    nextRetryAt: timestamp("next_retry_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("sync_queue_user_idx").on(t.userId)],
);

export const userSettings = pgTable("user_settings", {
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
  streakRequiresGithub: boolean("streak_requires_github")
    .notNull()
    .default(false),
  hasCompletedOnboarding: boolean("has_completed_onboarding")
    .notNull()
    .default(false),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
});

export type Milestone = typeof milestones.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
