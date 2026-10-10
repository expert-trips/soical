CREATE TABLE `document_counters` (
	`scope` text PRIMARY KEY NOT NULL,
	`value` integer NOT NULL
);

CREATE TABLE `contract_archive` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`contract_number` text NOT NULL,
	`object_key` text NOT NULL,
	`sha256` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL,
	`actor` text NOT NULL
);

CREATE INDEX `idx_contract_archive_org_date` ON `contract_archive` (`organization_id`,`created_at`);
