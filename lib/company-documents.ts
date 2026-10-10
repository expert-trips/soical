export const documentTypes=['السجل التجاري','الشهادة الضريبية','شهادة آيبان الشركة','عقد التأسيس','كشف حساب','هوية المفوض بالتوقيع','هوية الملاك','مستند آخر'] as const;
export const documentStatuses=['لم يُراجع','مقبول','يحتاج تحديث'] as const;
export const documentLimit=10*1024*1024;
export type CompanyDocument={id:string;organization_id:string;kind:string;title:string;filename:string;mime_type:string;size:number;expires_on:string;notes:string;review_status:string;uploaded_by:string;created_at:string;reviewed_by:string;reviewed_at:string};
export function expiryNotice(date:string){if(!date)return '';const days=Math.ceil((Date.parse(date+'T23:59:59Z')-Date.now())/86400000);return days<0?'منتهي الصلاحية':days<=30?'ينتهي خلال '+days+' يومًا':'';}
