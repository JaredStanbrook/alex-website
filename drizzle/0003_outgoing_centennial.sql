CREATE TABLE `assignment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subject_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`mark` real,
	`max_mark` real,
	`weight` real,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subject`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assignment_user_idx` ON `assignment` (`user_id`);--> statement-breakpoint
CREATE INDEX `assignment_subject_idx` ON `assignment` (`subject_id`);--> statement-breakpoint
CREATE TABLE `exam` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subject_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`date` text NOT NULL,
	`time` text,
	`mark` real,
	`max_mark` real,
	`weight` real,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subject`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exam_user_idx` ON `exam` (`user_id`);--> statement-breakpoint
CREATE INDEX `exam_subject_idx` ON `exam` (`subject_id`);--> statement-breakpoint
CREATE TABLE `content_link` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_type` text NOT NULL,
	`item_id` integer NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_link_unique_idx` ON `content_link` (`item_type`,`item_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `content_link_target_idx` ON `content_link` (`user_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `content_link_item_idx` ON `content_link` (`user_id`,`item_type`,`item_id`);--> statement-breakpoint
CREATE TABLE `flashcard` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`set_id` integer NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`confidence` text DEFAULT 'new' NOT NULL,
	`review_count` integer DEFAULT 0 NOT NULL,
	`last_reviewed_at` text,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `flashcard_set`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flashcard_user_idx` ON `flashcard` (`user_id`);--> statement-breakpoint
CREATE INDEX `flashcard_set_idx` ON `flashcard` (`set_id`);--> statement-breakpoint
CREATE TABLE `flashcard_set` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`is_public` integer DEFAULT false NOT NULL,
	`last_studied_at` text,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flashcard_set_user_idx` ON `flashcard_set` (`user_id`);--> statement-breakpoint
CREATE TABLE `resource` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`description` text,
	`is_public` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resource_user_idx` ON `resource` (`user_id`);--> statement-breakpoint
CREATE TABLE `semester` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`description` text,
	`is_current` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `semester_user_idx` ON `semester` (`user_id`);--> statement-breakpoint
CREATE TABLE `study_session` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`duration_minutes` integer,
	`status` text DEFAULT 'planned' NOT NULL,
	`notes` text,
	`subject_id` integer,
	`assignment_id` integer,
	`exam_id` integer,
	`completed_at` text,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subject`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignment`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exam_id`) REFERENCES `exam`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `study_session_user_idx` ON `study_session` (`user_id`);--> statement-breakpoint
CREATE INDEX `study_session_date_idx` ON `study_session` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `subject` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`semester_id` integer NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`description` text,
	`colour` text DEFAULT '1' NOT NULL,
	`credits` real DEFAULT 1 NOT NULL,
	`final_mark` real,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`semester_id`) REFERENCES `semester`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subject_user_idx` ON `subject` (`user_id`);--> statement-breakpoint
CREATE INDEX `subject_semester_idx` ON `subject` (`semester_id`);--> statement-breakpoint
ALTER TABLE `note` ADD `is_public` integer DEFAULT false NOT NULL;