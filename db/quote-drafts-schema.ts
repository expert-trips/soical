import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const quoteDrafts=sqliteTable('quote_drafts',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),revision:integer('revision').notNull(),
 payload:text('payload').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('idx_quote_drafts_owner_updated').on(t.owner,t.updatedAt)]);
