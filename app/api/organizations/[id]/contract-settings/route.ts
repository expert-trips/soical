import {hasCompleteNote} from '@/lib/credit-readiness';
import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {findOrganization,findOrganizationProfile,findOrganizationContract} from '@/db/organizations';
import {prepareArchive} from '@/db/contract-archive';
import {validDate} from '@/lib/organization-fields';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const h=await headers();if(!h.get('oai-authenticated-user-id'))return new Response(null,{status:401});
 const {id}=await params,[organization,profile,contract]=await Promise.all([findOrganization(id),findOrganizationProfile(id),findOrganizationContract(id)]);
 if(!organization||!profile||!contract)return new Response(null,{status:404});
 return Response.json({organization,profile,contract});
}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const h=await headers();if(!h.get('oai-authenticated-user-id'))return new Response(null,{status:401});if(req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 const {id}=await params,[o,p,c]=await Promise.all([findOrganization(id),findOrganizationProfile(id),findOrganizationContract(id)]);
 if(!o||!p||!c)return new Response(null,{status:404});
 if(!c.status.startsWith('مسودة'))return Response.json({error:'contract_locked'},{status:409});
 let b:Record<string,unknown>;try{b=await req.json()}catch{return new Response(null,{status:400})}
 if(!b||typeof b!=='object'||Array.isArray(b))return new Response(null,{status:400});
 const required=['legal_name','contact_name','contact_email','contact_phone','address','authorized_signatory','signatory_title'];
 if(required.some(k=>typeof b[k]!=='string'||!String(b[k]).trim()||String(b[k]).length>500))return Response.json({error:'missing_fields'},{status:400});
 const phone=String(b.contact_phone).replace(/[\s-]/g,'');
 if(!/^(?:0[15]\d{8}|\+[1-9]\d{7,14})$/.test(phone)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(String(b.contact_email)))return Response.json({error:'invalid_contact'},{status:400});
 const mode=String(b.billing_model),prepaid=Number(b.prepaid_balance??0),limit=mode==='مسبق الدفع'?prepaid:Number(b.credit_limit),amount=Number(b.promissory_note_amount??0);
 if(!['مسبق الدفع','ائتمان شهري بضمان سند لأمر'].includes(mode)||!Number.isFinite(limit)||limit<o.credit_used||limit<0)return Response.json({error:'invalid_balance'},{status:400});
 const noteEntered=['promissory_note_number','promissory_note_platform_ref','promissory_note_issue_date','promissory_note_due_date'].some(k=>String(b[k]||'').trim())||amount>0;
 if(mode!=='مسبق الدفع'&&(!Number.isFinite(amount)||amount<0||!['15 يوماً','30 يوماً','45 يوماً','60 يوماً'].includes(String(b.payment_terms))))return Response.json({error:'invalid_terms'},{status:400});
 if(mode!=='مسبق الدفع'&&noteEntered&&(!Number.isFinite(amount)||amount<=0||!validDate(b.promissory_note_issue_date)||!validDate(b.promissory_note_due_date)||String(b.promissory_note_due_date||'')<String(b.promissory_note_issue_date||'')||!String(b.promissory_note_number||'').trim()||!String(b.promissory_note_platform_ref||'').trim()||!['15 يوماً','30 يوماً','45 يوماً','60 يوماً'].includes(String(b.payment_terms))))return Response.json({error:'invalid_note'},{status:400});
 const vat=String(b.vat_number||'');if(vat&&!/^\d{15}$/.test(vat))return new Response(null,{status:400});
 const now=new Date().toISOString(),actor=h.get('oai-authenticated-user-email')||'مستخدم داخلي';
 const nextO={...o,status:mode!=='مسبق الدفع'&&!hasCompleteNote(JSON.stringify(b))?'معلقة':o.status,legal_name:String(b.legal_name).trim(),contact_name:String(b.contact_name).trim(),contact_email:String(b.contact_email).trim(),credit_limit:limit,payment_terms:mode==='مسبق الدفع'?'دفع مسبق':String(b.payment_terms),updated_at:now};
 const nextP={...p,contact_phone:phone,address:String(b.address).trim(),vat_number:vat,authorized_signatory:String(b.authorized_signatory).trim(),signatory_title:String(b.signatory_title).trim(),updated_at:now};
 const financial={billing_model:mode,prepaid_balance:mode==='مسبق الدفع'?prepaid:0,promissory_note_number:mode==='مسبق الدفع'?'':String(b.promissory_note_number||''),promissory_note_amount:mode==='مسبق الدفع'?0:amount,promissory_note_issue_date:mode==='مسبق الدفع'?'':String(b.promissory_note_issue_date||''),promissory_note_due_date:mode==='مسبق الدفع'?'':String(b.promissory_note_due_date||''),promissory_note_platform_ref:mode==='مسبق الدفع'?'':String(b.promissory_note_platform_ref||'')};
 const nextC={...c,snapshot:JSON.stringify({...JSON.parse(c.snapshot),...financial}),updated_at:now};
 const before=await prepareArchive(o,p,c,actor),after=await prepareArchive(nextO,nextP,nextC,actor);
 await env.DB.batch([
 before.statement,
 env.DB.prepare('UPDATE organizations SET status=?,legal_name=?,contact_name=?,contact_email=?,credit_limit=?,payment_terms=?,updated_at=? WHERE id=?').bind(nextO.status,nextO.legal_name,nextO.contact_name,nextO.contact_email,nextO.credit_limit,nextO.payment_terms,now,id),
 env.DB.prepare('UPDATE organization_profiles SET contact_phone=?,address=?,vat_number=?,authorized_signatory=?,signatory_title=?,updated_at=? WHERE organization_id=?').bind(phone,nextP.address,vat,nextP.authorized_signatory,nextP.signatory_title,now,id),
 env.DB.prepare('UPDATE organization_contracts SET snapshot=?,updated_at=? WHERE organization_id=?').bind(nextC.snapshot,now,id),
 after.statement,
 env.DB.prepare('INSERT INTO organization_audit(organization_id,action,details,actor,created_at) VALUES(?,?,?,?,?)').bind(id,'تصحيح بيانات العقد','تحديث بيانات العميل ونظام الدفع مع حفظ نسختين قبل التعديل وبعده',actor,now)
 ]);
 return Response.json({organization:await findOrganization(id)});
}
