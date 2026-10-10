import {sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const providerSettings=sqliteTable('provider_settings',{id:text('id').primaryKey(),payload:text('payload').notNull(),updatedAt:text('updated_at').notNull()});
