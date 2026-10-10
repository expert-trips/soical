import {headers} from 'next/headers';
import {supplierConnectionStatus} from '@/lib/supplier-connectors';
import {templateOwner} from '@/db/contract-template';
import {listSuppliers,listOfferings,getSupplier,saveSupplier,saveOffering,inventoryHistory} from '@/db/supplier-catalog';
import {validSupplier,validOffering} from '@/lib/supplier-catalog';
export async function GET(){if(!(await headers()).get('oai-authenticated-user-id'))return new Response(null,{status:401});return Response.json({suppliers:await listSuppliers(),offerings:await listOfferings(),history:await inventoryHistory(),connection:supplierConnectionStatus()},{headers:{'Cache-Control':'no-store'}});}
export async function PUT(req:Request){const actor=await templateOwner();if(!actor||req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});let b;try{const text=await req.text();if(text.length>20000)return new Response(null,{status:413});b=JSON.parse(text)}catch{return new Response(null,{status:400})}
 if(!b||!['supplier','offering'].includes(b.kind))return new Response(null,{status:400});let value;
 if(b.kind==='supplier'){if(!validSupplier(b.value)||(!b.value.id&&b.value.revision!==0))return Response.json({error:'راجع بيانات المورد وحدد خدماته وطريقة التعامل.'},{status:400});value=await saveSupplier(b.value,actor);}
 else{if(!validOffering(b.value)||(!b.value.id&&b.value.revision!==0))return Response.json({error:'راجع بند الكتالوج. الإتاحة تتطلب فترة سعر وشروطًا وسياسة إلغاء.'},{status:400});const s=await getSupplier(b.value.supplierId);if(!s||!s.services.includes(b.value.service))return Response.json({error:'المورد غير موجود أو لا يدعم الخدمة المحددة.'},{status:400});if(b.value.status==='متاح'&&(s.status!=='نشط'||s.mode==='ربط مباشر'))return Response.json({error:'المورد موقوف أو مخصص للربط المباشر. فعّل التعامل اليدوي لاستخدام كتالوجه.'},{status:400});value=await saveOffering(b.value,actor);}
 return value?Response.json({value}):Response.json({error:'تغيّر السجل في جلسة أخرى. أعد التحميل قبل الحفظ.'},{status:409});}
