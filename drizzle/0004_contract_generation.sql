CREATE TABLE IF NOT EXISTS organization_profiles (
 organization_id TEXT PRIMARY KEY, contact_phone TEXT NOT NULL, address TEXT NOT NULL,
 vat_number TEXT NOT NULL, authorized_signatory TEXT NOT NULL, signatory_title TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS organization_contracts (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL UNIQUE, contract_number TEXT NOT NULL,
 status TEXT NOT NULL, snapshot TEXT NOT NULL, generated_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_org_contracts_status ON organization_contracts(status);
