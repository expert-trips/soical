CREATE TABLE `company_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`object_key` text NOT NULL,
	`sha256` text NOT NULL,
	`expires_on` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`review_status` text DEFAULT 'لم يُراجع' NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_by` text DEFAULT '' NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL
);

CREATE INDEX `idx_company_documents_org` ON `company_documents` (`organization_id`,`created_at`);
