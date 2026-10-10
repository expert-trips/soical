import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export {providerSettings} from './provider-settings-schema';
export {documentCounters,contractArchive} from './archive-schema';

export const requests = sqliteTable('requests', {
  id: text('id').primaryKey(),
  service: text('service').notNull(),
  category: text('category').notNull(),
  fulfillmentModel: text('fulfillment_model').notNull(),
  company: text('company').notNull(),
  traveler: text('traveler').notNull(),
  destination: text('destination').notNull(),
  status: text('status').notNull(),
  priority: text('priority').notNull(),
  assignee: text('assignee').notNull(),
  slaMinutes: integer('sla_minutes').notNull(),
  summary: text('summary').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const auditEvents = sqliteTable('audit_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  requestId: text('request_id').notNull(),
  action: text('action').notNull(),
  actor: text('actor').notNull(),
  createdAt: text('created_at').notNull(),
});

export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  requestId: text('request_id').notNull(),
  service: text('service').notNull(),
  company: text('company').notNull(),
  status: text('status').notNull(),
  supplierReference: text('supplier_reference'),
  connectorStatus: text('connector_status').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(), legalName: text('legal_name').notNull(), displayName: text('display_name').notNull(),
  reference: text('reference').notNull(), sector: text('sector').notNull(), contactName: text('contact_name').notNull(), contactEmail: text('contact_email').notNull(),
  accountManager: text('account_manager').notNull(), status: text('status').notNull(), contractStatus: text('contract_status').notNull(), contractVersion: text('contract_version').notNull(),
  contractStart: text('contract_start').notNull(), contractEnd: text('contract_end').notNull(), paymentTerms: text('payment_terms').notNull(), currency: text('currency').notNull(),
  creditLimit: integer('credit_limit').notNull(), creditUsed: integer('credit_used').notNull(), slaHours: integer('sla_hours').notNull(),
  directBookingAllowed: integer('direct_booking_allowed').notNull(), approvalRequired: integer('approval_required').notNull(), approvalRole: text('approval_role').notNull(),
  priceBoundary: integer('price_boundary'), permittedServices: text('permitted_services').notNull(), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});

export const organizationAudit = sqliteTable('organization_audit', {
  id: integer('id').primaryKey({autoIncrement:true}), organizationId: text('organization_id').notNull(), action: text('action').notNull(), details: text('details').notNull(), actor: text('actor').notNull(), createdAt: text('created_at').notNull(),
});

export const organizationMembers = sqliteTable('organization_members', {
  id: text('id').primaryKey(), organizationId: text('organization_id').notNull(), name: text('name').notNull(), email: text('email').notNull(),
  role: text('role').notNull(), status: text('status').notNull(), canAddMembers: integer('can_add_members').notNull(), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});
export const organizationProfiles=sqliteTable('organization_profiles',{organizationId:text('organization_id').primaryKey(),contactPhone:text('contact_phone').notNull(),address:text('address').notNull(),vatNumber:text('vat_number').notNull(),authorizedSignatory:text('authorized_signatory').notNull(),signatoryTitle:text('signatory_title').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
export const organizationContracts=sqliteTable('organization_contracts',{id:text('id').primaryKey(),organizationId:text('organization_id').notNull(),contractNumber:text('contract_number').notNull(),status:text('status').notNull(),snapshot:text('snapshot').notNull(),generatedAt:text('generated_at').notNull(),updatedAt:text('updated_at').notNull()});
export const providerProfile=sqliteTable('provider_profile',{id:text('id').primaryKey(),legalName:text('legal_name').notNull(),commercialRegistration:text('commercial_registration').notNull(),nationalAddress:text('national_address').notNull(),vatNumber:text('vat_number').notNull(),phone:text('phone').notNull(),email:text('email').notNull(),authorizedSignatory:text('authorized_signatory').notNull(),signatoryTitle:text('signatory_title').notNull(),iban:text('iban').notNull(),terminationNoticeDays:integer('termination_notice_days').notNull(),disputeCity:text('dispute_city').notNull(),updatedAt:text('updated_at').notNull()});
export {companyDocuments} from './company-documents-schema';
export {contractTemplateVersions} from './contract-template-schema';
export {staff} from './staff-schema';
export {serviceCatalogVersions,serviceQuoteVersions} from './service-catalog-schema';
export {supplierRecords,supplierHistory,supplierOfferings} from './supplier-catalog-schema';
export {bookingBasis} from './booking-workflow-schema';
export {requestAssignments,requestNotes} from './request-workspace-schema';
export {quoteDrafts} from './quote-drafts-schema';
export {catalogPresetVersions} from './catalog-presets-schema';
export {projectInquiries} from './projects-schema';
