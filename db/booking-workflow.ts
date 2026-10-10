import {env} from 'cloudflare:workers';
import {findRequest,type TravelRequest,type BookingRecord} from './requests';
import {getServiceCatalog} from './service-catalog';
import {getSupplier} from './supplier-catalog';
import {hasCompleteNote} from '@/lib/credit-readiness';
import {BookingError,assertApprovedQuote,assertBookingTransition,type BookingQuote} from '@/lib/booking-workflow';

export async function requestCompanyId(r:TravelRequest){
 const saved=await env.DB.prepare('SELECT payload FROM provider_settings WHERE id=?').bind('REQUEST-SERVICE-'+r.id).first<{payload:string}>();
 const id=saved?JSON.parse(saved.payload).companyId:undefined;
 if(typeof id==='string'&&id)return id;
 const matches=await env.DB.prepare('SELECT id FROM organizations WHERE legal_name=? OR display_name=?').bind(r.company,r.company).all<{id:string}>();
 if(matches.results.length!==1)throw new BookingError('تعذر تحديد شركة هذا الطلب القديم بشكل آمن. أنشئ طلبًا جديدًا من ملف الشركة.');
 return matches.results[0].id;
}
async function checkCompany(id:string){
 const company=await env.DB.prepare('SELECT o.status,c.snapshot FROM organizations o LEFT JOIN organization_contracts c ON c.organization_id=o.id WHERE o.id=?').bind(id).first<{status:string;snapshot:string|null}>();
 if(!company||company.status!=='نشطة')throw new BookingError('شركة الطلب غير موجودة أو حسابها غير نشط.');
 const snapshot=JSON.parse(company.snapshot||'{}');
 if(snapshot.billing_model==='ائتمان شهري بضمان سند لأمر'&&!hasCompleteNote(company.snapshot||'{}'))throw new BookingError('يجب استكمال سند لأمر قبل إنشاء حجز آجل.');
}
export async function bookingCandidates(requestId:string){
 const r=await findRequest(requestId);if(!r)throw new BookingError('الطلب غير موجود.',404);
 const companyId=await requestCompanyId(r);
 const rows=await env.DB.prepare('SELECT q.quote_id,q.revision,q.payload FROM service_quote_versions q WHERE q.revision=(SELECT MAX(v.revision) FROM service_quote_versions v WHERE v.quote_id=q.quote_id) AND json_extract(q.payload,\'$.company.id\')=? AND json_extract(q.payload,\'$.service.name\')=? AND NOT EXISTS(SELECT 1 FROM booking_basis b WHERE b.quote_id=q.quote_id) ORDER BY q.id DESC').bind(companyId,r.category).all<{quote_id:string;revision:number;payload:string}>();
 return rows.results.map(q=>({...q,payload:JSON.parse(q.payload)} as BookingQuote)).filter(q=>{try{assertApprovedQuote(q,companyId,r.category,r.id);return true}catch{return false}});
}
export async function createApprovedBooking(requestId:string,quoteId:string,revision:number,actor:string){
 const r=await findRequest(requestId);if(!r)throw new BookingError('الطلب غير موجود.',404);
 const existing=await env.DB.prepare('SELECT * FROM bookings WHERE request_id=?').bind(requestId).first<BookingRecord>();
 if(existing){const basis=await getBookingBasis(existing.id);if(basis?.quote_id===quoteId&&basis.quote_revision===revision)return existing;throw new BookingError('يوجد حجز مرتبط بهذا الطلب بالفعل. افتح سجله.',409)}
 const companyId=await requestCompanyId(r);await checkCompany(companyId);
 const row=await env.DB.prepare('SELECT quote_id,revision,payload FROM service_quote_versions WHERE quote_id=? ORDER BY revision DESC LIMIT 1').bind(quoteId).first<{quote_id:string;revision:number;payload:string}>();
 if(!row||row.revision!==revision)throw new BookingError('العرض غير موجود أو تغيّر. حدّث القائمة.',409);
 assertApprovedQuote({...row,payload:JSON.parse(row.payload)},companyId,r.category,r.id);
 const service=(await getServiceCatalog()).services.find(s=>s.name===r.category);
 if(!service||service.status!=='مفعّلة')throw new BookingError('الخدمة موقوفة أو غير مفعّلة للحجوزات الجديدة.');
 const quoteSupplier=JSON.parse(row.payload).supplierSnapshot?.id||JSON.parse(row.payload).offeringSnapshot?.supplier?.id;
 if(quoteSupplier){const supplier=await getSupplier(quoteSupplier);if(!supplier||supplier.status!=='نشط'||!supplier.services.includes(r.category))throw new BookingError('مورد العرض غير متاح؛ راجع العرض.');}
 const id='BK-'+crypto.randomUUID(),now=new Date().toISOString();
 try{await env.DB.batch([
  env.DB.prepare('INSERT INTO bookings(id,request_id,service,company,status,supplier_reference,connector_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,requestId,r.service,r.company,'مسودة',null,'غير مرتبط',now,now),
  env.DB.prepare('INSERT INTO booking_basis(booking_id,request_id,company_id,quote_id,quote_revision,quote_snapshot,actor,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,requestId,companyId,quoteId,revision,row.payload,actor,now),
  env.DB.prepare('INSERT INTO audit_events(request_id,action,actor,created_at) VALUES(?,?,?,?)').bind(requestId,`إنشاء حجز مسودة ${id} من العرض المعتمد ${quoteId} — الإصدار ${revision}`,actor,now),
 ])}catch(e){const duplicate=await env.DB.prepare('SELECT * FROM bookings WHERE request_id=?').bind(requestId).first<BookingRecord>();const basis=duplicate?await getBookingBasis(duplicate.id):null;if(duplicate&&basis?.quote_id===quoteId&&basis.quote_revision===revision)return duplicate;const used=await env.DB.prepare('SELECT booking_id FROM booking_basis WHERE quote_id=?').bind(quoteId).first();if(duplicate||used)throw new BookingError('سبق ربط الطلب أو العرض بحجز آخر. حدّث القائمة.',409);throw e}
 return env.DB.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first<BookingRecord>();
}
export type BookingBasis={booking_id:string;request_id:string;company_id:string;quote_id:string;quote_revision:number;quote_snapshot:string;supplier_proof:string|null;actor:string;created_at:string};
export async function getBookingBasis(id:string){return env.DB.prepare('SELECT * FROM booking_basis WHERE booking_id=?').bind(id).first<BookingBasis>()}
export type BookingChange={status:string;expectedUpdatedAt:string;supplierId?:string;reference?:string;evidence?:string;reason?:string};
export async function changeBooking(id:string,input:BookingChange,actor:string){
 const b=await env.DB.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first<BookingRecord>();if(!b)throw new BookingError('الحجز غير موجود.',404);
 if(b.updated_at!==input.expectedUpdatedAt)throw new BookingError('عدّل موظف آخر هذا الحجز. حدّث الصفحة قبل المتابعة.',409);
 const basis=await getBookingBasis(id);
 if(!basis&&input.status!=='ملغي')throw new BookingError('هذا حجز سابق دون نسخة عرض معتمدة مرتبطة؛ لا يمكن تأكيده من المسار الجديد.');
 let proof:string|null=null;
 if(input.status==='مؤكد'){
  const supplier=input.supplierId?await getSupplier(input.supplierId):null;
  const quote=JSON.parse(basis!.quote_snapshot);
  if(!supplier||supplier.status!=='نشط'||!supplier.services.includes(quote.service.name))throw new BookingError('اختر موردًا نشطًا يقدم هذه الخدمة.');
  if((quote.supplierSnapshot?.id||quote.offeringSnapshot?.supplier?.id)&&(quote.supplierSnapshot?.id||quote.offeringSnapshot?.supplier?.id)!==supplier.id)throw new BookingError('المورد مختلف عن مورد العرض المعتمد؛ يلزم عرض جديد.');
  if(!input.reference?.trim()||!input.evidence?.trim())throw new BookingError('أدخل مرجع حجز المورد ومرجع إثبات التأكيد.');
  proof=JSON.stringify({supplierId:supplier.id,supplierName:supplier.name,supplierRevision:supplier.revision,reference:input.reference.trim(),evidence:input.evidence.trim(),actor,recordedAt:new Date().toISOString(),method:'توثيق يدوي'});
 }
 assertBookingTransition(b.status,input.status,!!proof);
 if(input.status==='ملغي'&&!input.reason?.trim())throw new BookingError('أدخل سبب إلغاء المسودة.');
 if(['قيد التنفيذ','مكتمل'].includes(input.status)&&!basis?.supplier_proof)throw new BookingError('لا يوجد توثيق تأكيد مورد محفوظ لهذا الحجز.');
 if(input.status!=='ملغي')await checkCompany(basis!.company_id);
 const now=new Date(Math.max(Date.now(),Date.parse(b.updated_at)+1)).toISOString();
 const result=await env.DB.batch([
  env.DB.prepare('UPDATE bookings SET status=?,supplier_reference=?,connector_status=?,updated_at=? WHERE id=? AND updated_at=? AND status=?').bind(input.status,proof?input.reference!.trim():b.supplier_reference,proof?'تأكيد موثق يدويًا — دون ربط':b.connector_status,now,id,input.expectedUpdatedAt,b.status),
  env.DB.prepare('INSERT INTO audit_events(request_id,action,actor,created_at) SELECT ?,?,?,? WHERE changes()=1').bind(b.request_id,`الحجز ${id}: ${b.status} ← ${input.status}${input.reason?' — '+input.reason:''}`,actor,now),
  ...(proof?[env.DB.prepare('UPDATE booking_basis SET supplier_proof=? WHERE booking_id=? AND EXISTS(SELECT 1 FROM bookings WHERE id=? AND updated_at=?)').bind(proof,id,id,now)]:[]),
 ]);
 if(!result[0].meta.changes)throw new BookingError('تغيّر الحجز أثناء الحفظ. حدّث الصفحة.',409);
 return env.DB.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first<BookingRecord>();
}
