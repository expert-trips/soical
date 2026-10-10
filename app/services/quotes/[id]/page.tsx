import {notFound} from 'next/navigation';
import {getQuote} from '@/db/quote-workspace';
import {customerQuote} from '@/lib/customer-quote';
import {CustomerQuote} from '@/components/customer-quote';
export const dynamic='force-dynamic';
export default async function QuotePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,q=await getQuote(id);if(!q)notFound();
 if(!['بانتظار موافقة العميل','موافقة العميل موثقة'].includes(q.payload.status))return <main dir="rtl" className="p-10">لا تتوفر نسخة العميل قبل اعتماد السعر، أو بعد رفض العرض وإلغائه. <a href="/services">العودة</a></main>;
 return <CustomerQuote quote={customerQuote(q)}/>;
}
