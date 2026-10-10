CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`service` text NOT NULL,
	`category` text NOT NULL,
	`fulfillment_model` text NOT NULL,
	`company` text NOT NULL,
	`traveler` text NOT NULL,
	`destination` text NOT NULL,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`assignee` text NOT NULL,
	`sla_minutes` integer NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`action` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_requests_status_priority` ON `requests` (`status`,`priority`);
--> statement-breakpoint
CREATE INDEX `idx_audit_request_id` ON `audit_events` (`request_id`);
