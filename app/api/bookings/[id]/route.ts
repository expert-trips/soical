import { headers } from 'next/headers';
import {getBookingBasis,changeBooking} from '@/db/booking-workflow';
import {BookingError} from '@/lib/booking-workflow';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const b=await getBookingBasis(id);return Response.json({basis:b?{...b,quote_snapshot:JSON.parse(b.quote_snapshot),supplier_proof:b.supplier_proof?JSON.parse(b.supplier_proof):null}:null},{headers:{'cache-control':'no-store'}})}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(request.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 const h=await headers(),actor=h.get('oai-authenticated-user-email');if(!actor)return new Response(null,{status:401});
 let b;try{const text=await request.text();if(text.length>5000)return new Response(null,{status:413});b=JSON.parse(text)}catch{return Response.json({error:'بيانات غير صالحة.'},{status:400})}
 if(!b||typeof b.status!=='string'||typeof b.expectedUpdatedAt!=='string'||b.expectedUpdatedAt.length>50||!['supplierId','reference','evidence','reason'].every(k=>b[k]===undefined||typeof b[k]==='string'&&b[k].length<=(k==='evidence'||k==='reason'?1000:200)))return Response.json({error:'راجع بيانات الإجراء.'},{status:400});
 try{const {id}=await params;return Response.json({booking:await changeBooking(id,b,actor)})}catch(e){return Response.json({error:e instanceof BookingError?e.message:'تعذر حفظ الإجراء. حاول مجددًا.'},{status:e instanceof BookingError?e.status:500})}
}
