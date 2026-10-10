CREATE TABLE `catalog_preset_versions` (
	`row_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`revision` integer NOT NULL,
	`payload` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL
);

--> statement-breakpoint
CREATE UNIQUE INDEX `idx_catalog_preset_revision` ON `catalog_preset_versions` (`id`,`revision`);
