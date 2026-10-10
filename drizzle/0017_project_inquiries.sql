CREATE TABLE project_inquiries (
 id TEXT PRIMARY KEY NOT NULL,
 organization_id TEXT NOT NULL,
 title TEXT NOT NULL,
 kind TEXT NOT NULL,
 destination TEXT NOT NULL,
 start_date TEXT NOT NULL,
 end_date TEXT NOT NULL,
 traveler_count INTEGER NOT NULL,
 services TEXT NOT NULL,
 brief TEXT NOT NULL,
 contact_name TEXT NOT NULL,
 contact_phone TEXT NOT NULL,
 status TEXT NOT NULL,
 rfq_notes TEXT NOT NULL,
 created_by TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_project_inquiries_status_updated ON project_inquiries(status,updated_at);
--> statement-breakpoint
CREATE INDEX idx_project_inquiries_organization ON project_inquiries(organization_id);
