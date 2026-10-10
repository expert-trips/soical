import {integer,sqliteTable,text} from 'drizzle-orm/sqlite-core';

export const projectInquiries=sqliteTable('project_inquiries',{
 id:text('id').primaryKey(),organizationId:text('organization_id').notNull(),title:text('title').notNull(),kind:text('kind').notNull(),destination:text('destination').notNull(),startDate:text('start_date').notNull(),endDate:text('end_date').notNull(),travelerCount:integer('traveler_count').notNull(),services:text('services').notNull(),brief:text('brief').notNull(),contactName:text('contact_name').notNull(),contactPhone:text('contact_phone').notNull(),status:text('status').notNull(),rfqNotes:text('rfq_notes').notNull(),createdBy:text('created_by').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
});
