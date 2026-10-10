CREATE TABLE `service_catalog_versions` (
 `revision` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 `payload` text NOT NULL,
 `actor` text NOT NULL,
 `reason` text NOT NULL,
 `created_at` text NOT NULL
);
CREATE TABLE `service_quote_versions` (
 `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 `quote_id` text NOT NULL,
 `revision` integer NOT NULL,
 `payload` text NOT NULL,
 `actor` text NOT NULL,
 `created_at` text NOT NULL
);
CREATE UNIQUE INDEX `idx_service_quote_revision` ON `service_quote_versions` (`quote_id`,`revision`);
