import {env} from 'cloudflare:workers';
import type {CompanyDocument} from '@/lib/company-documents';
type StoredDocument=CompanyDocument&{object_key:string;sha256:string};
export const documentBucket=()=> (env as unknown as {COMPANY_LOGOS:R2Bucket}).COMPANY_LOGOS;
export async function documentHash(bytes:ArrayBuffer){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function listCompanyDocuments(id:string){return (await env.DB.prepare('SELECT id,organization_id,kind,title,filename,mime_type,size,expires_on,notes,review_status,uploaded_by,created_at,reviewed_by,reviewed_at FROM company_documents WHERE organization_id=? ORDER BY created_at DESC,id DESC').bind(id).all<CompanyDocument>()).results;}
export async function findCompanyDocument(org:string,id:string){return env.DB.prepare('SELECT * FROM company_documents WHERE organization_id=? AND id=?').bind(org,id).first<StoredDocument>();}
export async function saveCompanyDocument(d:StoredDocument,bytes:ArrayBuffer){
 await documentBucket().put(d.object_key,bytes,{httpMetadata:{contentType:d.mime_type}});
 try{await env.DB.batch([
 env.DB.prepare('INSERT INTO company_documents(id,organization_id,kind,title,filename,mime_type,size,object_key,sha256,expires_on,notes,review_status,uploaded_by,created_at,reviewed_by,reviewed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(d.id,d.organization_id,d.kind,d.title,d.filename,d.mime_type,d.size,d.object_key,d.sha256,d.expires_on,d.notes,d.review_status,d.uploaded_by,d.created_at,'',''),
 env.DB.prepare('INSERT INTO organization_audit(organization_id,action,details,actor,created_at) VALUES(?,?,?,?,?)').bind(d.organization_id,'رفع مستند شركة',d.id+' — '+d.kind,d.uploaded_by,d.created_at)
 ]);}catch(e){await documentBucket().delete(d.object_key);throw e;}
}
export async function reviewCompanyDocument(d:StoredDocument,status:string,notes:string,expiry:string,actor:string){const now=new Date().toISOString();await env.DB.batch([
 env.DB.prepare('UPDATE company_documents SET review_status=?,notes=?,expires_on=?,reviewed_by=?,reviewed_at=? WHERE id=? AND organization_id=?').bind(status,notes,expiry,actor,now,d.id,d.organization_id),
 env.DB.prepare('INSERT INTO organization_audit(organization_id,action,details,actor,created_at) VALUES(?,?,?,?,?)').bind(d.organization_id,'مراجعة مستند شركة',JSON.stringify({id:d.id,before:{status:d.review_status,expires_on:d.expires_on},after:{status,expires_on:expiry},notesChanged:notes!==d.notes}),actor,now)
 ]);}
