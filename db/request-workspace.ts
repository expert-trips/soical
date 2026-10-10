import {env} from 'cloudflare:workers';
import {findRequest} from './requests';
import {BookingError} from '@/lib/booking-workflow';
export type Assignee={id:string;name:string};
export type RequestNote={id:string;request_id:string;body:string;actor:string;created_at:string};
export type RequestEvent={id:number;request_id:string;action:string;actor:string;created_at:string};
export async function requestAssignees(){return (await env.DB.prepare("SELECT id,name FROM internal_staff WHERE status='نشط' AND role='عمليات' ORDER BY name,id").all<Assignee>()).results}
export async function requestWorkspace(id:string){
 const [notes,events,assignment]=await Promise.all([
  env.DB.prepare('SELECT * FROM request_notes WHERE request_id=? ORDER BY created_at DESC,id DESC LIMIT 100').bind(id).all<RequestNote>(),
  env.DB.prepare('SELECT * FROM audit_events WHERE request_id=? ORDER BY id DESC LIMIT 100').bind(id).all<RequestEvent>(),
  env.DB.prepare('SELECT staff_id FROM request_assignments WHERE request_id=?').bind(id).first<{staff_id:string|null}>(),
 ]);return {notes:notes.results,events:events.results,assigneeId:assignment?.staff_id||''};
}
export async function addRequestNote(id:string,noteId:string,body:string,actor:string){
 if(!await findRequest(id))throw new BookingError('الطلب غير موجود.',404);
 const old=await env.DB.prepare('SELECT * FROM request_notes WHERE id=?').bind(noteId).first<RequestNote>();
 if(old){if(old.request_id!==id||old.body!==body||old.actor!==actor)throw new BookingError('تعارض في الملاحظة. أعد فتح الملف.',409);return requestWorkspace(id)}
 const now=new Date().toISOString();
 await env.DB.batch([
  env.DB.prepare('INSERT INTO request_notes(id,request_id,body,actor,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(noteId,id,body,actor,now),
  env.DB.prepare('INSERT INTO audit_events(request_id,action,actor,created_at) SELECT ?,?,?,? WHERE changes()=1').bind(id,'إضافة ملاحظة داخلية',actor,now),
 ]);
 const saved=await env.DB.prepare('SELECT * FROM request_notes WHERE id=?').bind(noteId).first<RequestNote>();if(saved?.request_id!==id||saved.body!==body||saved.actor!==actor)throw new BookingError('تعارض في الملاحظة.',409);
 return requestWorkspace(id);
}
export async function changeRequest(id:string,input:{action:string;status?:string;assigneeId?:string;reason?:string;expectedUpdatedAt:string},actor:string){
 const r=await findRequest(id);if(!r)throw new BookingError('الطلب غير موجود.',404);
 if(r.updated_at!==input.expectedUpdatedAt)throw new BookingError('تغيّر الطلب. حدّث الملف قبل حفظ الإجراء.',409);
 let status=r.status,name=r.assignee,staffId:string|null=null;
 if(input.action==='assign'){
  if(input.assigneeId){const s=await env.DB.prepare("SELECT id,name FROM internal_staff WHERE id=? AND status='نشط' AND role='عمليات'").bind(input.assigneeId).first<Assignee>();if(!s)throw new BookingError('اختر موظف عمليات نشطًا.');name=s.name;staffId=s.id}else name='غير مسند';
 }else if(input.action==='status'){
  if(!['قيد المعالجة','قيد التسعير','نقص معلومات','إعداد عرض','تم التصعيد'].includes(input.status||''))throw new BookingError('اختر إجراء معالجة صالحًا. تأكيد التنفيذ يتم من ملف الحجز.');
  const booking=await env.DB.prepare('SELECT id FROM bookings WHERE request_id=?').bind(id).first();if(booking)throw new BookingError('يوجد حجز مرتبط؛ تابع التنفيذ من تبويب الحجز.',409);
  if(input.status===r.status)throw new BookingError('الطلب في هذه الحالة بالفعل.',409);
  if(['نقص معلومات','تم التصعيد'].includes(input.status!)&&!input.reason?.trim())throw new BookingError('اكتب المعلومات المطلوبة أو سبب التصعيد.');status=input.status!;
 }else throw new BookingError('إجراء غير صالح.');
 const now=new Date(Math.max(Date.now(),Date.parse(r.updated_at)+1)).toISOString();
 const result=await env.DB.batch([
  env.DB.prepare('UPDATE requests SET status=?,assignee=?,updated_at=? WHERE id=? AND updated_at=?').bind(status,name,now,id,input.expectedUpdatedAt),
  env.DB.prepare('INSERT INTO audit_events(request_id,action,actor,created_at) SELECT ?,?,?,? WHERE changes()=1').bind(id,input.action==='assign'?`إسناد الطلب إلى ${name}`:`${r.status} ← ${status}${input.reason?' — '+input.reason:''}`,actor,now),
  ...(input.action==='assign'?[env.DB.prepare('INSERT INTO request_assignments(request_id,staff_id,updated_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM requests WHERE id=? AND updated_at=?) ON CONFLICT(request_id) DO UPDATE SET staff_id=excluded.staff_id,updated_at=excluded.updated_at').bind(id,staffId,now,id,now)]:[]),
 ]);if(!result[0].meta.changes)throw new BookingError('تغيّر الطلب أثناء الحفظ. حدّث الملف.',409);
 return {request:await findRequest(id),workspace:await requestWorkspace(id)};
}
