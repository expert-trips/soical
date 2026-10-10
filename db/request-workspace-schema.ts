import {sqliteTable,text,index} from 'drizzle-orm/sqlite-core';
export const requestAssignments=sqliteTable('request_assignments',{requestId:text('request_id').primaryKey(),staffId:text('staff_id'),updatedAt:text('updated_at').notNull()});
export const requestNotes=sqliteTable('request_notes',{id:text('id').primaryKey(),requestId:text('request_id').notNull(),body:text('body').notNull(),actor:text('actor').notNull(),createdAt:text('created_at').notNull()},t=>[index('idx_request_notes_request').on(t.requestId,t.createdAt)]);
