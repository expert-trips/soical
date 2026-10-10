import {env} from 'cloudflare:workers';
import type {Organization,OrganizationProfile,OrganizationContract} from './organizations';
import {getProviderProfile} from './provider';
export type ArchiveRow={id:string;organization_id:string;contract_number:string;object_key:string;sha256:string;snapshot:string;created_at:string;actor:string;company_name?:string};
const storage=()=> (env as unknown as {COMPANY_LOGOS:R2Bucket}).COMPANY_LOGOS;
export async function allocateNumber(kind:'client'|'contract'){
 const year=new Date().getFullYear(),scope=kind==='client'?'client':'contract-'+year;
 for(;;){
  const row=await env.DB.prepare('INSERT INTO document_counters(scope,value) VALUES(?,1) ON CONFLICT(scope) DO UPDATE SET value=value+1 RETURNING value').bind(scope).first<{value:number}>();
  if(!row)throw new Error('number_allocation_failed');
  const number=(kind==='client'?'CL-':'TE-'+year+'-')+String(row.value).padStart(6,'0');
  const exists=kind==='client'?await env.DB.prepare('SELECT id FROM organizations WHERE id=?').bind(number).first():await env.DB.prepare('SELECT id FROM organization_contracts WHERE contract_number=?').bind(number).first();
  if(!exists)return number;
 }
}
export async function prepareArchive(organization:Organization,profile:OrganizationProfile,contract:OrganizationContract,actor:string){
 const provider=JSON.parse(contract.snapshot).provider_snapshot||await getProviderProfile(),id=crypto.randomUUID(),now=new Date().toISOString();
 const {renderContract}=await import.meta.viteRsc.import<typeof import('./contract-renderer')>('./contract-renderer',{environment:'ssr'});
 const markup=renderContract({organization,profile,contract,provider});
 const html='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>نسخة عقد محفوظة</title><style>body{font:16px/1.9 Tahoma,Arial,sans-serif;color:#18344c;background:white;margin:30px auto;padding:20px;max-width:900px}img{width:150px;height:auto;display:block;margin:0 auto}h1,h2,h3{color:#064a78;break-after:avoid}h1{text-align:center}h2{font-size:20px;margin-top:24px}h3{font-size:17px}.box,section{border:1px solid #dbe4e9;padding:14px;margin:12px 0}p{overflow-wrap:anywhere}svg{display:none}bdi{direction:ltr}article>div{margin-bottom:20px}@media print{body{margin:0;padding:0;font-size:12pt}@page{size:A4;margin:18mm}img{width:120px}h2,h3{break-after:avoid}}</style></head><body>'+markup+'</body></html>';
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(html));
 const hash=Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('');
 const key='contract-archive/'+organization.id+'/'+id+'.html';
 await storage().put(key,html,{httpMetadata:{contentType:'text/html; charset=utf-8'}});
 return {id,statement:env.DB.prepare('INSERT INTO contract_archive(id,organization_id,contract_number,object_key,sha256,snapshot,created_at,actor) VALUES(?,?,?,?,?,?,?,?)').bind(id,organization.id,contract.contract_number,key,hash,JSON.stringify({organization,profile,contract,provider,template_version:2}),now,actor)};
}
export async function listArchives(organizationId?:string,query=''){
 const sql=organizationId?'SELECT a.*,o.display_name AS company_name FROM contract_archive a JOIN organizations o ON o.id=a.organization_id WHERE a.organization_id=? ORDER BY a.created_at DESC,a.id DESC':'SELECT a.*,o.display_name AS company_name FROM contract_archive a JOIN organizations o ON o.id=a.organization_id WHERE a.contract_number LIKE ? OR o.display_name LIKE ? OR a.organization_id LIKE ? ORDER BY a.created_at DESC,a.id DESC LIMIT 200';
 const statement=env.DB.prepare(sql);
 return (await (organizationId?statement.bind(organizationId):statement.bind('%'+query+'%','%'+query+'%','%'+query+'%')).all<ArchiveRow>()).results;
}
export async function findArchive(id:string){return env.DB.prepare('SELECT * FROM contract_archive WHERE id=?').bind(id).first<ArchiveRow>()}
export async function readArchiveFile(row:ArchiveRow){return storage().get(row.object_key)}
