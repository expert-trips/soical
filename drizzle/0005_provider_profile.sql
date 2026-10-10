CREATE TABLE IF NOT EXISTS provider_profile (
 id TEXT PRIMARY KEY, legal_name TEXT NOT NULL, commercial_registration TEXT NOT NULL,
 national_address TEXT NOT NULL, vat_number TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL,
 authorized_signatory TEXT NOT NULL, signatory_title TEXT NOT NULL, iban TEXT NOT NULL,
 termination_notice_days INTEGER NOT NULL DEFAULT 30, dispute_city TEXT NOT NULL, updated_at TEXT NOT NULL
);
