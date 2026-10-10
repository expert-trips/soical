CREATE TABLE `internal_staff` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE UNIQUE INDEX `idx_internal_staff_email` ON `internal_staff` (`email`);
