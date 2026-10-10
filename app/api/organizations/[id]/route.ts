import {hasCompleteNote} from '@/lib/credit-readiness';
import {headers} from 'next/headers';
import {findOrganization,findOrganizationContract,listOrganizationAudit,updateOrganization} from '@/db/organizations';
import {parseOrganization} from '@/lib/organization-fields';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const organization=await findOrganization(id);if(!organization)return new Response(null,{status:404});return Response.json({organization,audit:await listOrganizationAudit(id)})}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const h=await headers();if(!h.get('oai-authenticated-user-id'))return new Response(null,{status:401});
 if(req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 const {id}=await params,current=await findOrganization(id);if(!current)return new Response(null,{status:404});
 let b:Record<string,unknown>;try{b=await req.json()}catch{return new Response(null,{status:400})}
 if(!b||typeof b!=='object'||Array.isArray(b))return new Response(null,{status:400});
 const fields:Record<string,string[]>={'حالة الشركة':['status'],'العقد والائتمان':['contract_start','contract_end','payment_terms','credit_limit','credit_used','sla_hours','contract_status'],'سياسة السفر':['permitted_services','direct_booking_allowed','approval_required','approval_role','price_boundary']};
 const section=String(b.section||'');if(!fields[section])return new Response(null,{status:400});
 const contract=await findOrganizationContract(id);
 if(section==='العقد والائتمان'&&contract&&!contract.status.startsWith('مسودة'))return Response.json({error:'contract_locked'},{status:409});
 const merged:Record<string,unknown>={...current,permitted_services:JSON.parse(current.permitted_services)};
 for(const key of fields[section])if(b[key]!==undefined)merged[key]=b[key];
 if(current.billing_model==='مسبق الدفع')merged.payment_terms='دفع مسبق';
 if(current.billing_model==='ائتمان شهري بضمان سند لأمر'&&!hasCompleteNote(contract?.snapshot||'{}')&&(merged.status==='نشطة'||merged.direct_booking_allowed||Number(merged.credit_used)>current.credit_used))return Response.json({error:'promissory_note_pending'},{status:409});
 const input=parseOrganization(merged);if(!input)return Response.json({error:'invalid_fields'},{status:400});
 const organization=await updateOrganization(id,input,h.get('oai-authenticated-user-email')||'مستخدم داخلي',section);
 return Response.json({organization,audit:await listOrganizationAudit(id)});
}
