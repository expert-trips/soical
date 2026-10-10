import {headers} from 'next/headers';
import {findOrganization} from '@/db/organizations';
import {documentBucket,documentHash,listCompanyDocuments,findCompanyDocument,saveCompanyDocument,reviewCompanyDocument} from '@/db/company-documents';
import {documentTypes,documentStatuses,documentLimit} from '@/lib/company-documents';
import {validDate} from '@/lib/organization-fields';
type Context={params:Promise<{id:string}>};
async function access(req:Request,id:string){const h=await headers(),uid=h.get('oai-authenticated-user-id'),email=h.get('oai-authenticated-user-email')?.toLowerCase();if(!uid)return new Response(null,{status:401});
 // Sensitive company records are owner-only, independently of the site's viewer list.
 if(email!=='keldy66@gmail.com'&&!(import.meta.env.DEV&&email==='seedy@sites.test'))return Response.json({error:'هذه المستندات متاحة لمالك النظام فقط.'},{status:403});
 if(req.method!=='GET'&&req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});if(!await findOrganization(id))return new Response(null,{status:404});return email!;
}
const error=(message:string,status=400)=>Response.json({error:message},{status});
export async function GET(req:Request,{params}:Context){const {id}=await params,a=await access(req,id);if(a instanceof Response)return a;const key=new URL(req.url).searchParams.get('document');
 if(!key)return Response.json({documents:await listCompanyDocuments(id)},{headers:{'cache-control':'private, no-store'}});
 const d=await findCompanyDocument(id,key);if(!d)return new Response(null,{status:404});const file=await documentBucket().get(d.object_key);if(!file)return new Response(null,{status:404});const bytes=await file.arrayBuffer();if(await documentHash(bytes)!==d.sha256)return error('تعذر التحقق من سلامة الملف.',409);
 return new Response(bytes,{headers:{'content-type':'application/octet-stream','content-disposition':"attachment; filename=company-document; filename*=UTF-8''"+encodeURIComponent(d.filename),'cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"}});
}
export async function POST(req:Request,{params}:Context){const {id}=await params,actor=await access(req,id);if(actor instanceof Response)return actor;let m:Record<string,unknown>;try{m=JSON.parse(decodeURIComponent(req.headers.get('x-document-meta')||''))}catch{return error('بيانات المستند غير صالحة.');}
 if(!m||typeof m!=='object'||Array.isArray(m))return error('بيانات المستند غير صالحة.');
 const kind=String(m.kind||''),title=String(m.title||kind).trim(),filename=String(m.filename||'').replace(/[\x00-\x1f\x7f\\/]/g,'_'),expires_on=String(m.expires_on||''),notes=String(m.notes||'');
 if(!(documentTypes as readonly string[]).includes(kind)||!title||title.length>200||!filename||filename.length>200||notes.length>2000||(expires_on&&!validDate(expires_on)))return error('تحقق من نوع المستند والاسم وتاريخ الانتهاء.');
 const mime=req.headers.get('content-type')||'';if(!['application/pdf','image/png','image/jpeg','image/webp'].includes(mime))return error('الملفات المسموحة PDF أو PNG أو JPG أو WebP.',415);
 const reader=req.body?.getReader();if(!reader)return error('اختر ملفًا.');let size=0;const chunks:Uint8Array[]=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>documentLimit){await reader.cancel();return error('الحد الأقصى للملف ١٠ ميجابايت.',413);}chunks.push(value);}
 const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}const head=new TextDecoder().decode(data.slice(0,12));
 const valid=mime==='application/pdf'?head.startsWith('%PDF-'):mime==='image/png'?[137,80,78,71,13,10,26,10].every((x,i)=>data[i]===x):mime==='image/jpeg'?data[0]===255&&data[1]===216&&data[2]===255:head.startsWith('RIFF')&&head.slice(8)==='WEBP';if(!valid)return error('محتوى الملف لا يطابق نوعه.');
 const docId=crypto.randomUUID();await saveCompanyDocument({id:docId,organization_id:id,kind,title,filename,mime_type:mime,size,object_key:'company-documents/'+id+'/'+docId,sha256:await documentHash(data.buffer),expires_on,notes,review_status:'لم يُراجع',uploaded_by:actor,created_at:new Date().toISOString(),reviewed_by:'',reviewed_at:''},data.buffer);return Response.json({documents:await listCompanyDocuments(id)},{status:201});
}
export async function PATCH(req:Request,{params}:Context){const {id}=await params,actor=await access(req,id);if(actor instanceof Response)return actor;let b:Record<string,unknown>;try{b=await req.json()}catch{return error('بيانات غير صالحة.');}if(!b||typeof b!=='object')return error('بيانات غير صالحة.');const d=await findCompanyDocument(id,String(b.id||''));if(!d)return new Response(null,{status:404});const status=String(b.review_status||''),notes=String(b.notes||''),expiry=String(b.expires_on||'');if(!(documentStatuses as readonly string[]).includes(status)||notes.length>2000||(expiry&&!validDate(expiry)))return error('تحقق من حالة المراجعة والتاريخ.');await reviewCompanyDocument(d,status,notes,expiry,actor);return Response.json({documents:await listCompanyDocuments(id)});}
