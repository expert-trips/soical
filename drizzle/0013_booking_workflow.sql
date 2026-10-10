CREATE TABLE `booking_basis` (
	`booking_id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`company_id` text NOT NULL,
	`quote_id` text NOT NULL,
	`quote_revision` integer NOT NULL,
	`quote_snapshot` text NOT NULL,
	`supplier_proof` text,
	`actor` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_booking_basis_request` ON `booking_basis` (`request_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_booking_basis_quote` ON `booking_basis` (`quote_id`);
