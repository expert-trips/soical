import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {findRequest} from '@/db/requests';
import {requestWorkspace,requestAssignees,changeRequest} from '@/db/request-workspace';
import {BookingError} from '@/lib/booking-workflow';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params,r=await findRequest(id);if(!r)return Response.json({error:'الطلب غير موجود.'},{status:404});const [workspace,assignees,booking]=await Promise.all([requestWorkspace(id),requestAssignees(),env.DB.prepare('SELECT * FROM bookings WHERE request_id=?').bind(id).first()]);return Response.json({request:r,workspace,assignees,booking},{headers:{'cache-control':'no-store'}})}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const h=await headers(),actor=h.get('oai-authenticated-user-email');if(!actor||req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 let b;try{const t=await req.text();if(t.length>5000)return new Response(null,{status:413});b=JSON.parse(t)}catch{return Response.json({error:'بيانات غير صالحة.'},{status:400})}
 if(!b||!['assign','status'].includes(b.action)||typeof b.expectedUpdatedAt!=='string'||b.expectedUpdatedAt.length>50||!['status','assigneeId','reason'].every(k=>b[k]===undefined||typeof b[k]==='string'&&b[k].length<=(k==='reason'?1000:100)))return Response.json({error:'راجع بيانات الإجراء وحدّث الصفحة إن كانت قديمة.'},{status:400});
 try{const {id}=await params;return Response.json(await changeRequest(id,b,actor))}catch(e){return Response.json({error:e instanceof BookingError?e.message:'تعذر حفظ الإجراء.'},{status:e instanceof BookingError?e.status:500})}
}
