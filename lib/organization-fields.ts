import type {Organization,OrganizationInput} from '@/db/organizations';
export const organizationServices=['طيران','فنادق','قطارات','سيارات ونقل','تأشيرات','تأمين سفر','استقبال وتوديع','صالات مطارات','شرائح اتصال eSIM','فعاليات','رحلات جماعية','وفود ومشروعات'];
export function normalizeServices(values:unknown):string[]{
 if(!Array.isArray(values))return [];
 return [...new Set(values.map(v=>v==='فندق'?'فنادق':v==='نقل'?'سيارات ونقل':String(v)))];
}
export function validDate(value:unknown){const v=String(value);return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v}
export function flag(v:unknown){return v===true||v===1||v==='1'||v==='on'}
export function contractState(o:Pick<Organization,'contract_end'|'contract_status'>){return validDate(o.contract_end)&&o.contract_end<new Date().toISOString().slice(0,10)?'منتهي':o.contract_status}
export function parseOrganization(b:Record<string,unknown>):OrganizationInput|null{
 const keys=['legal_name','display_name','reference','sector','contact_name','contact_email','account_manager','contract_start','contract_end','payment_terms','approval_role'] as const;
 if(keys.some(k=>typeof b[k]!=='string'||!String(b[k]).trim()||String(b[k]).length>500))return null;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.contact_email))||!validDate(b.contract_start)||!validDate(b.contract_end)||String(b.contract_end)<String(b.contract_start))return null;
 const services=normalizeServices(b.permitted_services);if(!services.length||services.some(s=>!organizationServices.includes(s)))return null;
 const status=String(b.status||'نشطة'),contract_status=String(b.contract_status||'قيد المراجعة');
 if(!['نشطة','معلقة','مؤرشفة'].includes(status)||!['ساري','قيد المراجعة','منتهي'].includes(contract_status)||b.currency!=='SAR')return null;
 const credit_limit=Number(b.credit_limit??0),credit_used=Number(b.credit_used??0),sla_hours=Number(b.sla_hours??4);
 const price_boundary=b.price_boundary===null||b.price_boundary===''||b.price_boundary===undefined?null:Number(b.price_boundary);
 if([credit_limit,credit_used,sla_hours,...(price_boundary===null?[]:[price_boundary])].some(n=>!Number.isFinite(n)||n<0)||sla_hours<1||sla_hours>720||credit_used>credit_limit)return null;
 const text=Object.fromEntries(keys.map(k=>[k,String(b[k]).trim()]));
 return {...text,status,contract_status,contract_version:String(b.contract_version||'V1.0').trim().slice(0,100),currency:'SAR',credit_limit,credit_used,sla_hours,price_boundary,direct_booking_allowed:flag(b.direct_booking_allowed)?1:0,approval_required:flag(b.approval_required)?1:0,permitted_services:JSON.stringify(services)} as OrganizationInput;
}
