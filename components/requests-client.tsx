'use client';
import { useMemo, useState } from 'react';
import Link from '@/components/safe-link';
import { ArrowLeft, Filter, Search } from 'lucide-react';
import type { TravelRequest } from '@/db/requests';
import { Badge } from '@/components/ui/badge';

export function RequestsClient({ initial, initialQuery='' }: { initial:TravelRequest[]; initialQuery?:string }) {
  const [query,setQuery]=useState(initialQuery);
  const [status,setStatus]=useState('الكل');
  const rows=useMemo(()=>initial.filter(r=>(status==='الكل'||r.status===status)&&(`${r.id} ${r.service} ${r.company}`.includes(query))),[initial,query,status]);
  return <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-[#dfe5e6]">
    <div className="flex flex-wrap gap-3 border-b border-[#e6ebec] p-4">
      <div className="relative min-w-[240px] flex-1"><Search className="absolute right-3 top-2.5 h-4 w-4 text-[#718187]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث في الطلبات..." className="h-10 w-full rounded-lg border border-[#dfe5e6] bg-white pr-10 pl-3 text-sm outline-none focus:border-[#DE921A]"/></div>
      <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-[#718187]"/><select value={status} onChange={e=>setStatus(e.target.value)} className="h-10 rounded-lg border border-[#dfe5e6] bg-white px-3 text-sm"><option>الكل</option><option>جديد</option><option>قيد التسعير</option><option>نقص معلومات</option><option>إعداد عرض</option><option>بانتظار الموافقة</option></select></div>
    </div>
    {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-right text-sm"><thead className="bg-[#f8fafa] text-xs text-[#718187]"><tr><th className="px-5 py-3">الطلب</th><th className="px-4 py-3">الشركة</th><th className="px-4 py-3">نموذج التنفيذ</th><th className="px-4 py-3">المكلّف</th><th className="px-4 py-3">الحالة</th><th className="px-4 py-3">SLA</th><th/></tr></thead><tbody className="divide-y divide-[#edf0f1]">{rows.map(r=><tr key={r.id} className="hover:bg-[#fffaf1]"><td className="px-5 py-4"><b>{r.service}</b><div dir="ltr" className="mt-1 w-fit text-xs text-[#829095]">{r.id}</div></td><td className="px-4 py-4">{r.company}</td><td className="px-4 py-4 text-[#607177]">{r.fulfillment_model}</td><td className="px-4 py-4">{r.assignee}</td><td className="px-4 py-4"><Badge variant="outline">{r.status}</Badge></td><td className="px-4 py-4"><b className={r.priority==='عاجل'?'text-red-600':'text-[#b8710b]'}>{r.priority}</b><div className="text-xs text-[#829095]">{r.sla_minutes} دقيقة</div></td><td className="px-4"><Link className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#dfe5e6] px-3 text-xs font-medium hover:bg-[#f5f7f7]" href={`/requests/${r.id}`}>فتح <ArrowLeft className="h-3.5 w-3.5"/></Link></td></tr>)}</tbody></table></div>:<div className="p-16 text-center"><p className="font-bold">لا توجد نتائج مطابقة</p><p className="mt-2 text-sm text-[#718187]">جرّب تغيير كلمات البحث أو مرشح الحالة.</p></div>}
  </div>;
}
