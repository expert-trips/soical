CREATE TABLE `request_assignments` (
	`request_id` text PRIMARY KEY NOT NULL,
	`staff_id` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `request_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`body` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_request_notes_request` ON `request_notes` (`request_id`,`created_at`);
