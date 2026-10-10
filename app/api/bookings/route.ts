import { headers } from 'next/headers';
import { listBookings } from '@/db/requests';
import {createApprovedBooking,bookingCandidates} from '@/db/booking-workflow';
import {BookingError} from '@/lib/booking-workflow';
export async function GET(){return Response.json({bookings:await listBookings()})}
export async function POST(request:Request){
 if(request.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 const h=await headers(),actor=h.get('oai-authenticated-user-email');if(!actor)return new Response(null,{status:401});
 let b;try{const text=await request.text();if(text.length>2000)return new Response(null,{status:413});b=JSON.parse(text)}catch{return Response.json({error:'بيانات غير صالحة.'},{status:400})}
 if(!b||typeof b.requestId!=='string'||b.requestId.length>100)return Response.json({error:'حدد الطلب.'},{status:400});
 try{
  if(b.action==='candidates')return Response.json({quotes:await bookingCandidates(b.requestId)},{headers:{'cache-control':'no-store'}});
  if(typeof b.quoteId!=='string'||b.quoteId.length>100||!Number.isInteger(b.quoteRevision)||b.quoteRevision<1)throw new BookingError('اختر عرضًا معتمدًا قبل إنشاء الحجز.');
  return Response.json({booking:await createApprovedBooking(b.requestId,b.quoteId,b.quoteRevision,actor)},{status:201});
 }catch(e){return Response.json({error:e instanceof BookingError?e.message:'تعذر إنشاء الحجز. حاول مجددًا.'},{status:e instanceof BookingError?e.status:500})}
}
