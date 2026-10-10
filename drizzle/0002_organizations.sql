CREATE TABLE IF NOT EXISTS organizations (
 id TEXT PRIMARY KEY, legal_name TEXT NOT NULL, display_name TEXT NOT NULL, reference TEXT NOT NULL,
 sector TEXT NOT NULL, contact_name TEXT NOT NULL, contact_email TEXT NOT NULL, account_manager TEXT NOT NULL,
 status TEXT NOT NULL, contract_status TEXT NOT NULL, contract_version TEXT NOT NULL, contract_start TEXT NOT NULL,
 contract_end TEXT NOT NULL, payment_terms TEXT NOT NULL, currency TEXT NOT NULL, credit_limit INTEGER NOT NULL,
 credit_used INTEGER NOT NULL, sla_hours INTEGER NOT NULL, direct_booking_allowed INTEGER NOT NULL,
 approval_required INTEGER NOT NULL, approval_role TEXT NOT NULL, price_boundary INTEGER,
 permitted_services TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS organization_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id TEXT NOT NULL, action TEXT NOT NULL,
 details TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_organizations_status_manager ON organizations(status, account_manager);
CREATE INDEX IF NOT EXISTS idx_organizations_contract_end ON organizations(contract_end);
CREATE INDEX IF NOT EXISTS idx_organization_audit_org ON organization_audit(organization_id);
