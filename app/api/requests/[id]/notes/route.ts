import {headers} from 'next/headers';
import {addRequestNote} from '@/db/request-workspace';
import {BookingError} from '@/lib/booking-workflow';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const h=await headers(),actor=h.get('oai-authenticated-user-email');if(!actor||req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 let b;try{const t=await req.text();if(t.length>8000)return new Response(null,{status:413});b=JSON.parse(t)}catch{return Response.json({error:'بيانات غير صالحة.'},{status:400})}
 if(!b||typeof b.body!=='string'||!b.body.trim()||b.body.length>3000||typeof b.noteId!=='string'||!/^[0-9a-f-]{36}$/.test(b.noteId))return Response.json({error:'اكتب ملاحظة لا تتجاوز ٣٠٠٠ حرف.'},{status:400});
 try{const {id}=await params;return Response.json({workspace:await addRequestNote(id,b.noteId,b.body.trim(),actor)},{status:201})}catch(e){return Response.json({error:e instanceof BookingError?e.message:'تعذر حفظ الملاحظة.'},{status:e instanceof BookingError?e.status:500})}
}
