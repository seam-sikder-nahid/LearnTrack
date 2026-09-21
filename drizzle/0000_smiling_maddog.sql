CREATE TABLE `accounts` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `provider_account_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `daily_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`tasks_planned` integer DEFAULT 0 NOT NULL,
	`tasks_completed` integer DEFAULT 0 NOT NULL,
	`minutes_learned` integer DEFAULT 0 NOT NULL,
	`counts_for_streak` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_progress_user_date_idx` ON `daily_progress` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `github_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`github_user_id` text NOT NULL,
	`github_username` text NOT NULL,
	`connected_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `github_connections_user_id_unique` ON `github_connections` (`user_id`);--> statement-breakpoint
CREATE TABLE `github_repositories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`goal_id` text,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`full_name` text NOT NULL,
	`default_branch` text DEFAULT 'main' NOT NULL,
	`is_private` integer DEFAULT true NOT NULL,
	`was_created_by_app` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `github_repo_user_fullname_idx` ON `github_repositories` (`user_id`,`full_name`);--> statement-breakpoint
CREATE INDEX `github_repo_user_idx` ON `github_repositories` (`user_id`);--> statement-breakpoint
CREATE TABLE `github_syncs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`repository_id` text NOT NULL,
	`date` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`commit_message` text,
	`commit_sha` text,
	`files_changed` text,
	`error_code` text,
	`error_message` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`repository_id`) REFERENCES `github_repositories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `github_sync_idempotency_idx` ON `github_syncs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `github_sync_user_idx` ON `github_syncs` (`user_id`);--> statement-breakpoint
CREATE INDEX `github_sync_status_idx` ON `github_syncs` (`status`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`duration_days` integer NOT NULL,
	`start_date` integer NOT NULL,
	`target_date` integer NOT NULL,
	`daily_task_target` integer DEFAULT 2 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`is_seed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `goals_user_id_idx` ON `goals` (`user_id`);--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`goal_id` text,
	`date` text NOT NULL,
	`markdown` text NOT NULL,
	`tasks_completed_count` integer DEFAULT 0 NOT NULL,
	`tasks_planned_count` integer DEFAULT 0 NOT NULL,
	`topics` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_user_date_idx` ON `journal_entries` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `journal_user_idx` ON `journal_entries` (`user_id`);--> statement-breakpoint
CREATE TABLE `learning_resources` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`task_id` text,
	`title` text,
	`url` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `learning_resources_user_idx` ON `learning_resources` (`user_id`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`month_index` integer NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`deadline` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_seed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `milestones_goal_id_idx` ON `milestones` (`goal_id`);--> statement-breakpoint
CREATE INDEX `milestones_goal_order_idx` ON `milestones` (`goal_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`reason` text NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`next_retry_at` integer,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_queue_idempotency_key_unique` ON `sync_queue` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `sync_queue_user_idx` ON `sync_queue` (`user_id`);--> statement-breakpoint
CREATE TABLE `task_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`what_learned` text NOT NULL,
	`notes` text,
	`resources` text,
	`completed_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_completions_idempotency_idx` ON `task_completions` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `task_completions_user_idx` ON `task_completions` (`user_id`);--> statement-breakpoint
CREATE INDEX `task_completions_task_idx` ON `task_completions` (`task_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`goal_id` text NOT NULL,
	`milestone_id` text,
	`title` text NOT NULL,
	`description` text,
	`category` text,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`estimated_minutes` integer DEFAULT 30 NOT NULL,
	`scheduled_date` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`is_seed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_user_date_idx` ON `tasks` (`user_id`,`scheduled_date`);--> statement-breakpoint
CREATE INDEX `tasks_goal_id_idx` ON `tasks` (`goal_id`);--> statement-breakpoint
CREATE INDEX `tasks_milestone_id_idx` ON `tasks` (`milestone_id`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`sync_mode` text DEFAULT 'automatic' NOT NULL,
	`commit_message_format` text DEFAULT 'Learning: {goal} — {date}' NOT NULL,
	`streak_requires_github` integer DEFAULT false NOT NULL,
	`has_completed_onboarding` integer DEFAULT false NOT NULL,
	`notifications_enabled` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`email_verified` integer,
	`image` text,
	`github_username` text,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
