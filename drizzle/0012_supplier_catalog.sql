CREATE TABLE `supplier_records` (
 `id` text PRIMARY KEY NOT NULL,
 `revision` integer NOT NULL,
 `payload` text NOT NULL,
 `updated_at` text NOT NULL
);
CREATE TABLE `supplier_history` (
 `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 `supplier_id` text NOT NULL,
 `revision` integer NOT NULL,
 `payload` text NOT NULL,
 `actor` text NOT NULL,
 `created_at` text NOT NULL,
 FOREIGN KEY (`supplier_id`) REFERENCES `supplier_records`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `idx_supplier_history_revision` ON `supplier_history` (`supplier_id`,`revision`);
CREATE TABLE `supplier_offerings` (
 `row_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
 `id` text NOT NULL,
 `revision` integer NOT NULL,
 `supplier_id` text NOT NULL,
 `service` text NOT NULL,
 `payload` text NOT NULL,
 `actor` text NOT NULL,
 `created_at` text NOT NULL,
 FOREIGN KEY (`supplier_id`) REFERENCES `supplier_records`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `idx_supplier_offerings_revision` ON `supplier_offerings` (`id`,`revision`);
CREATE INDEX `idx_supplier_offerings_service` ON `supplier_offerings` (`service`);
