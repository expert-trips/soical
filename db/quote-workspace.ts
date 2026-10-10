import {env} from 'cloudflare:workers';
import {type QuoteInput} from '@/lib/quote-workspace';
import {saudiToday} from '@/lib/booking-workflow';
export async function getQuote(id:string){
 const row=await env.DB.prepare('SELECT quote_id,revision,payload,actor,created_at FROM service_quote_versions WHERE quote_id=? ORDER BY revision DESC LIMIT 1').bind(id).first<{quote_id:string;revision:number;payload:string;actor:string;created_at:string}>();
 return row?{...row,payload:JSON.parse(row.payload)}:null;
}
export async function quoteHistory(id:string){return (await env.DB.prepare('SELECT revision,payload,actor,created_at FROM service_quote_versions WHERE quote_id=? ORDER BY revision DESC').bind(id).all<{revision:number;payload:string;actor:string;created_at:string}>()).results.map(r=>({...r,payload:JSON.parse(r.payload)}));}
export async function quotePage(search='',state='',page=1){
 const where=`q.revision=(SELECT MAX(v.revision) FROM service_quote_versions v WHERE v.quote_id=q.quote_id)
 AND (?='' OR instr(lower(q.quote_id||' '||COALESCE(json_extract(q.payload,'$.company.name'),'')||' '||COALESCE(json_extract(q.payload,'$.requestId'),'')||' '||COALESCE(json_extract(q.payload,'$.service.name'),'')),lower(?))>0)
 AND (?='' OR CASE WHEN EXISTS(SELECT 1 FROM booking_basis b WHERE b.quote_id=q.quote_id) THEN 'مرتبط بحجز' WHEN json_extract(q.payload,'$.status') IN ('ملغي','مرفوض') THEN json_extract(q.payload,'$.status') WHEN json_extract(q.payload,'$.validUntil')<? THEN 'منتهي الصلاحية' ELSE json_extract(q.payload,'$.status') END=?)`;
 const params=[search,search,state,saudiToday(),state];
 const total=(await env.DB.prepare('SELECT COUNT(*) AS n FROM service_quote_versions q WHERE '+where).bind(...params).first<{n:number}>())?.n||0;
 const pages=Math.max(1,Math.ceil(total/20)),current=Math.min(Math.max(1,page),pages);
 const rows=await env.DB.prepare('SELECT q.quote_id,q.revision,q.payload,q.actor,q.created_at,(SELECT b.booking_id FROM booking_basis b WHERE b.quote_id=q.quote_id LIMIT 1) AS bookingId FROM service_quote_versions q WHERE '+where+' ORDER BY q.id DESC LIMIT 20 OFFSET ?').bind(...params,(current-1)*20).all<{quote_id:string;revision:number;payload:string;actor:string;created_at:string;bookingId:string|null}>();
 return {quotes:rows.results.map(r=>({...r,payload:JSON.parse(r.payload)})),total,page:current,pages};
}
export async function listDrafts(owner:string){return (await env.DB.prepare('SELECT id,revision,payload,updated_at FROM quote_drafts d WHERE owner=? AND NOT EXISTS(SELECT 1 FROM service_quote_versions q WHERE q.quote_id=d.id) ORDER BY updated_at DESC LIMIT 100').bind(owner).all<{id:string;revision:number;payload:string;updated_at:string}>()).results.map(r=>({...r,input:JSON.parse(r.payload),payload:undefined}));}
export async function getDraft(id:string){return env.DB.prepare('SELECT id,owner,revision,payload FROM quote_drafts WHERE id=?').bind(id).first<{id:string;owner:string;revision:number;payload:string}>();}
export async function saveDraft(id:string,owner:string,revision:number,input:QuoteInput){
 const payload=JSON.stringify(input),now=new Date().toISOString();
 if(revision===0)return env.DB.prepare('INSERT INTO quote_drafts(id,owner,revision,payload,updated_at) SELECT ?,?,1,?,? WHERE NOT EXISTS(SELECT 1 FROM service_quote_versions WHERE quote_id=?) ON CONFLICT(id) DO NOTHING RETURNING revision').bind(id,owner,payload,now,id).first<{revision:number}>();
 return env.DB.prepare('UPDATE quote_drafts SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND owner=? AND revision=? AND NOT EXISTS(SELECT 1 FROM service_quote_versions WHERE quote_id=?) RETURNING revision').bind(payload,now,id,owner,revision,id).first<{revision:number}>();
}
