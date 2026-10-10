import {sqliteTable,text,integer,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const bookingBasis=sqliteTable('booking_basis',{
 bookingId:text('booking_id').primaryKey(),requestId:text('request_id').notNull(),companyId:text('company_id').notNull(),
 quoteId:text('quote_id').notNull(),quoteRevision:integer('quote_revision').notNull(),quoteSnapshot:text('quote_snapshot').notNull(),
 supplierProof:text('supplier_proof'),actor:text('actor').notNull(),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('idx_booking_basis_request').on(t.requestId),uniqueIndex('idx_booking_basis_quote').on(t.quoteId)]);
