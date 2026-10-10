import {headers} from 'next/headers';
import {templateOwner} from '@/db/contract-template';
import {findStaff} from '@/db/staff';
import {getSupplier} from '@/db/supplier-catalog';
import {listPresets,getPreset,savePreset} from '@/db/catalog-presets';
import {presetAvailable,type CatalogPreset} from '@/lib/catalog-presets';
import {isDate} from '@/lib/supplier-catalog';
export async function GET(){return Response.json({presets:await listPresets()},{headers:{'Cache-Control':'no-store'}})}
export async function PUT(req:Request){
 const h=await headers(),email=h.get('oai-authenticated-user-email'),owner=await templateOwner();
 if(!email||req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 if(!owner&&(await findStaff(email))?.role!=='عمليات')return new Response(null,{status:403});
 try{
  const text=await req.text();if(text.length>16000)throw Error('البيانات كبيرة');const b=JSON.parse(text),current=await getPreset(b.id);
  if(!current||current.revision!==b.revision)return Response.json({error:'تغيّر البند. حدّثه قبل الحفظ.'},{status:409});
  if(![b.net,b.tax].every(n=>Number.isFinite(n)&&n>=0&&n<=10000000&&Math.abs(n*100-Math.round(n*100))<0.00001))throw Error('السعر والضريبة موجبان أو صفر، بمنزلتين عشريتين');
  let next:CatalogPreset={...current,net:b.net,tax:b.tax,status:'مسودة',priceConfirmed:false};
  if(owner){
   for(const key of ['supplierId','reference','validUntil','terms','cancellation','nationality','visaType'] as const){if(typeof b[key]!=='string'||b[key].length>(['terms','cancellation'].includes(key)?4000:200))throw Error('راجع '+key);next[key]=b[key]}
   if(!['مسودة','متاح','موقوف'].includes(b.status)||typeof b.priceConfirmed!=='boolean')throw Error('حالة غير صالحة');
   next.status=b.status;next.priceConfirmed=b.priceConfirmed;
   if(next.validUntil&&!isDate(next.validUntil))throw Error('تاريخ غير صالح');
   if(next.status==='متاح'&&!presetAvailable(next,(await getSupplier(next.supplierId))||undefined))throw Error('للاعتماد: حدّد المورد والمرجع والصلاحية، وراجع السعر والضريبة والشروط والجنسية ونوع التأشيرة عند انطباقها');
  }
  const value=await savePreset(next,email);
  return value?Response.json({preset:value}):Response.json({error:'تغيّر البند أثناء الحفظ؛ حدّث الصفحة.'},{status:409});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'تعذر الحفظ'},{status:400})}
}
