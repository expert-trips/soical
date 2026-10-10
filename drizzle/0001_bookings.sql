CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL UNIQUE,
	`service` text NOT NULL,
	`company` text NOT NULL,
	`status` text NOT NULL,
	`supplier_reference` text,
	`connector_status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bookings_status` ON `bookings` (`status`);
