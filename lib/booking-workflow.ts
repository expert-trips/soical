export type BookingQuote={quote_id:string;revision:number;payload:{company:{id:string;name:string};service:{name:string};status:string;approvalEvidence:string;validUntil:string;amounts:{total:number};[key:string]:unknown}};
export class BookingError extends Error {constructor(message:string,public status=400){super(message)}}
export const bookingTransitions:Record<string,string[]>={
 'مسودة':['بانتظار التأكيد','ملغي'],
 'بانتظار التأكيد':['مؤكد','ملغي'],
 'مؤكد':['قيد التنفيذ'],
 'قيد التنفيذ':['مكتمل'],
 'مكتمل':[], 'ملغي':[],
};
export function nextBookingStatus(status:string){return bookingTransitions[status]?.find(s=>s!=='ملغي')||null;}
export function saudiToday(){return new Date(Date.now()+3*3600000).toISOString().slice(0,10)}
export function assertApprovedQuote(q:BookingQuote,companyId:string,service:string,requestId?:string){
 const p=q.payload;
 if(requestId&&p.requestId!==requestId)throw new BookingError('العرض غير مرتبط بهذا الطلب تحديدًا. أنشئ عرضًا مرتبطًا؛ تبقى النسخ القديمة محفوظة.');
 if(p.company?.id!==companyId||p.service?.name!==service)throw new BookingError('العرض لا يخص شركة الطلب وخدمته.');
 if(p.status!=='موافقة العميل موثقة'||!p.approvalEvidence?.trim())throw new BookingError('أكمل اعتماد العرض وتوثيق موافقة العميل أولًا.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(p.validUntil)||!Number.isFinite(Date.parse(p.validUntil))||new Date(p.validUntil).toISOString().slice(0,10)!==p.validUntil||p.validUntil<saudiToday())throw new BookingError('انتهت صلاحية العرض أو أن تاريخه غير صالح.');
 if(!Number.isFinite(p.amounts?.total)||p.amounts.total<0)throw new BookingError('إجمالي العرض غير صالح.');
}
export function assertBookingTransition(from:string,to:string,hasProof:boolean){
 if(!bookingTransitions[from]?.includes(to))throw new BookingError('هذا الانتقال غير مسموح. الحجز المكتمل أو الملغي لا يُعاد فتحه من هنا.',409);
 if(to==='مؤكد'&&!hasProof)throw new BookingError('حدد المورد ومرجع الحجز ومرجع إثبات تأكيده أولًا.');
}
export function csvCell(value:unknown){const s=String(value);return '"'+(/^[\s]*[=+@-]/.test(s)?"'"+s:s).replaceAll('"','""')+'"'}
