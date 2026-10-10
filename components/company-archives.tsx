'use client';
import {useEffect,useState} from 'react';
import {ArchiveList} from './archive-list';
import type {ArchiveRow} from '@/db/contract-archive';
export function CompanyArchives({id}:{id:string}){
 const [items,setItems]=useState<ArchiveRow[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;fetch('/api/organizations/'+id+'/archives').then(async r=>{if(!r.ok)throw Error();const d=await r.json() as {archives:ArchiveRow[]};if(active)setItems(d.archives)}).catch(()=>{if(active)setMessage('تعذر تحميل الأرشيف. أعد فتح القسم للمحاولة.')});return()=>{active=false}},[id]);
 async function save(){setBusy(true);setMessage('');try{const r=await fetch('/api/organizations/'+id+'/archives',{method:'POST'});if(!r.ok)throw Error();setItems((await r.json() as {archives:ArchiveRow[]}).archives);setMessage('حُفظت نسخة ثابتة من العقد. لا يعد الحفظ توقيعًا أو اعتمادًا.')}catch{setMessage('تعذر حفظ النسخة. تحقق من اكتمال ملف العقد وحاول مجددًا.')}finally{setBusy(false)}}
 return <section className="mt-6 border-t pt-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">أرشيف عقود الشركة</h3><button type="button" disabled={busy} onClick={save} className="rounded-lg border px-4 py-2 text-sm">{busy?'جارٍ الحفظ…':'حفظ نسخة حالية في الأرشيف'}</button></div><p className="mb-3 text-sm text-slate-500">النسخ المحفوظة ثابتة وتشمل نص العقد وبياناته وشعاره وقت الحفظ.</p>{message&&<p role="status" className="mb-3 text-sm">{message}</p>}<ArchiveList items={items}/></section>
}
