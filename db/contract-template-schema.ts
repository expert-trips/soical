import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const contractTemplateVersions=sqliteTable('contract_template_versions',{revision:integer('revision').primaryKey({autoIncrement:true}),payload:text('payload').notNull(),actor:text('actor').notNull(),created_at:text('created_at').notNull()});
