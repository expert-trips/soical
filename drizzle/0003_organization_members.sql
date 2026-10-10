CREATE TABLE IF NOT EXISTS organization_members (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
 role TEXT NOT NULL, status TEXT NOT NULL, can_add_members INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_org_email ON organization_members(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_org_members_org_status ON organization_members(organization_id, status);
