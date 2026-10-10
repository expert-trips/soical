CREATE TABLE `quote_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`revision` integer NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL
);

--> statement-breakpoint
CREATE INDEX `idx_quote_drafts_owner_updated` ON `quote_drafts` (`owner`,`updated_at`);
