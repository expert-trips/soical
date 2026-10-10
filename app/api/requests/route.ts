import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {createRequest,listRequests} from '@/db/requests';
import {getServiceCatalog} from '@/db/service-catalog';
export async function GET(){return Response.json({requests:await listRequests()})}
export async function POST(req:Request){
 if(req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 const h=await headers(),actor=h.get('oai-authenticated-user-email');if(!actor)return new Response(null,{status:401});
 let b;try{const t=await req.text();if(t.length>40000)return new Response(null,{status:413});b=JSON.parse(t)}catch{return new Response(null,{status:400})}
 const fail=(error:string)=>Response.json({error},{status:400});
 if(!b||!['service','fulfillment','companyId','destination','summary'].every(k=>typeof b[k]==='string'&&b[k].trim()&&b[k].length<=2000))return fail('أكمل بيانات الطلب');
 const c=await getServiceCatalog();if(b.catalogRevision!==c.revision)return Response.json({error:'تغيّرت إعدادات الخدمة؛ حدّث الصفحة قبل إنشاء الطلب.'},{status:409});
 const s=c.services.find(x=>x.name===b.service);if(!s||s.status!=='مفعّلة'||b.fulfillment==='ربط مورد'||!s.methods.includes(b.fulfillment))return fail('الخدمة أو طريقة التنفيذ غير متاحة');
 const company=await env.DB.prepare('SELECT legal_name,permitted_services FROM organizations WHERE id=?').bind(b.companyId).first<{legal_name:string;permitted_services:string}>();if(!company)return fail('الشركة غير موجودة');
 if(!JSON.parse(company.permitted_services).map((v:string)=>v==='فندق'?'فنادق':v==='نقل'?'سيارات ونقل':v).includes(s.name))return fail('الخدمة غير مفعّلة في سياسة الشركة');
 if(!b.fields||typeof b.fields!=='object'||Array.isArray(b.fields))return fail('راجع متطلبات الخدمة');
 const fields:Record<string,string>={};for(const r of s.requirements){const value=b.fields[r.label]??'';if(typeof value!=='string'||value.length>1000||r.required&&!value.trim())return fail('أكمل المتطلب: '+r.label);if(value&&r.type==='عدد'&&(!Number.isInteger(Number(value))||Number(value)<0))return fail('عدد غير صالح: '+r.label);if(value&&r.type==='تاريخ'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))))return fail('تاريخ غير صالح: '+r.label);fields[r.label]=value.trim();}
 const result=await createRequest({service:s.name,fulfillment:b.fulfillment,company:company.legal_name,destination:b.destination,summary:b.summary,catalogSnapshot:{companyId:b.companyId,revision:c.revision,service:s,fields}},actor);
 return Response.json({request:result},{status:201});
}
