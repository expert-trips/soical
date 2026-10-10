import {headers} from 'next/headers';
import {createOrganization,listOrganizations,listOrganizationMembers,findOrganizationContract,type OnboardingProfile} from '@/db/organizations';
import {parseOrganization,validDate,flag} from '@/lib/organization-fields';
export async function GET(){return Response.json({organizations:await listOrganizations()})}
export async function POST(req:Request){
 const h=await headers();if(!h.get('oai-authenticated-user-id'))return new Response(null,{status:401});
 if(req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 let body:Record<string,unknown>;try{body=await req.json()}catch{return new Response(null,{status:400})}
 if(!body||typeof body!=='object'||Array.isArray(body))return new Response(null,{status:400});
 if(body.billing_model==='آجل')body.billing_model='ائتمان شهري بضمان سند لأمر';if(body.billing_model==='مقدم')body.billing_model='مسبق الدفع';
 const mode=String(body.billing_model||'');if(!['مسبق الدفع','ائتمان شهري بضمان سند لأمر'].includes(mode))return Response.json({error:'invalid_billing_model'},{status:400});
 const prepaid=Number(body.prepaid_balance??0);
 if(mode==='مسبق الدفع'){if(!Number.isFinite(prepaid)||prepaid<0)return new Response(null,{status:400});body.credit_limit=prepaid;body.payment_terms='دفع مسبق'}
 if(mode!=='مسبق الدفع'){body.status='معلقة';body.direct_booking_allowed=false;for(const key of ['promissory_note_number','promissory_note_issue_date','promissory_note_due_date','promissory_note_platform_ref'])body[key]='';body.promissory_note_amount=0;}
 body.credit_used=0;body.contract_status='قيد المراجعة';
 body.contract_version='AUTO';
 body.display_name=body.legal_name;
 body.sector='غير محدد';
 const input=parseOrganization(body);if(!input)return Response.json({error:'invalid_fields'},{status:400});
 if(!(/^(?:0[15]\d{8}|\+[1-9]\d{7,14})$/.test(String(body.contact_phone||'').replace(/[\s-]/g,'')))||['address','authorized_signatory','signatory_title'].some(k=>typeof body[k]!=='string'||!String(body[k]).trim()||String(body[k]).length>500))return Response.json({error:'missing_contract_fields'},{status:400});
 const amount=Number(body.promissory_note_amount??0);
 const profile:OnboardingProfile={contact_phone:String(body.contact_phone),address:String(body.address),vat_number:String(body.vat_number||''),authorized_signatory:String(body.authorized_signatory),signatory_title:String(body.signatory_title),billing_model:mode,prepaid_balance:mode==='مسبق الدفع'?prepaid:0,promissory_note_number:mode==='مسبق الدفع'?'':String(body.promissory_note_number),promissory_note_amount:mode==='مسبق الدفع'?0:amount,promissory_note_issue_date:mode==='مسبق الدفع'?'':String(body.promissory_note_issue_date),promissory_note_due_date:mode==='مسبق الدفع'?'':String(body.promissory_note_due_date),promissory_note_platform_ref:mode==='مسبق الدفع'?'':String(body.promissory_note_platform_ref)};
 if(profile.vat_number&&!/^\d{15}$/.test(profile.vat_number))return new Response(null,{status:400});
 const organization=await createOrganization(input,h.get('oai-authenticated-user-email')||'مستخدم داخلي',profile,flag(body.create_portal_user));
 return Response.json({organization,contract:await findOrganizationContract(organization!.id),member:(await listOrganizationMembers(organization!.id))[0]||null},{status:201});
}
