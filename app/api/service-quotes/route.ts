import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
import {templateOwner} from '@/db/contract-template';
import {getProviderProfile} from '@/db/provider';
import {getPreset} from '@/db/catalog-presets';
import {presetAvailable} from '@/lib/catalog-presets';
import {getOffering,getSupplier} from '@/db/supplier-catalog';
import {findRequest} from '@/db/requests';
import {requestCompanyId} from '@/db/booking-workflow';
import {getServiceCatalog} from '@/db/service-catalog';
import {getQuote,quoteHistory,quotePage,listDrafts,getDraft,saveDraft} from '@/db/quote-workspace';
import {calculateServicePrice} from '@/lib/service-catalog';
import {offeringAvailable,offeringCosts,isDate} from '@/lib/supplier-catalog';
import {saudiToday} from '@/lib/booking-workflow';
import {cleanQuoteInput,quoteNumber} from '@/lib/quote-workspace';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
async function body(req:Request,max=18000){const text=await req.text();if(text.length>max)throw Error('بيانات العرض تتجاوز الحجم المسموح');return JSON.parse(text)}
export async function GET(req:Request){
 const h=await headers(),owner=h.get('oai-authenticated-user-id');if(!owner)return new Response(null,{status:401});
 const u=new URL(req.url);
 if(u.searchParams.get('mode')==='drafts')return json({drafts:await listDrafts(owner)});
 if(u.searchParams.get('mode')==='history'){const id=u.searchParams.get('id');if(!uuid(id))return json({error:'رقم غير صالح'},400);return json({history:await quoteHistory(id)})}
 return json(await quotePage((u.searchParams.get('q')||'').replace(/^QT-/i,'').slice(0,200),(u.searchParams.get('state')||'').slice(0,100),Math.max(1,Math.min(100000,Math.floor(Number(u.searchParams.get('page')))||1))));
}
async function context(requestId:string){
 const request=await findRequest(requestId);if(!request)throw Error('اختر طلبًا موجودًا قبل إعداد العرض');
 if(['ملغي','مكتمل'].includes(request.status))throw Error('لا يمكن تسعير طلب مغلق');
 if(await env.DB.prepare('SELECT id FROM bookings WHERE request_id=?').bind(requestId).first())throw Error('يوجد حجز مرتبط بالطلب؛ لا يمكن استبدال عرضه من هنا');
 const companyId=await requestCompanyId(request);
 const company=await env.DB.prepare('SELECT id,legal_name,status,permitted_services,contract_version FROM organizations WHERE id=?').bind(companyId).first<{id:string;legal_name:string;status:string;permitted_services:string;contract_version:string}>();
 if(!company||company.status!=='نشطة')throw Error('حساب الشركة غير نشط؛ راجع ملفها أولًا');
 const permitted=JSON.parse(company.permitted_services).map((s:string)=>s==='فندق'?'فنادق':s==='نقل'?'سيارات ونقل':s);
 if(!permitted.includes(request.category))throw Error('الخدمة غير متاحة في سياسة الشركة');
 const catalog=await getServiceCatalog(),service=catalog.services.find(s=>s.name===request.category);
 if(!service||service.status!=='مفعّلة')throw Error('الخدمة غير مفعّلة؛ لا يمكن إصدار أو اعتماد عرض جديد');
 return {request,company,catalog,service};
}
export async function POST(req:Request){
 const h=await headers(),actor=h.get('oai-authenticated-user-email'),owner=h.get('oai-authenticated-user-id');
 if(!actor||!owner||req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 try{
  const b=await body(req);if(!uuid(b.id))throw Error('رقم المسودة غير صالح');
  const input=cleanQuoteInput(b.input),sourceInput=JSON.stringify(input);
  const existing=await getQuote(b.id);
  if(existing){if(existing.payload.createdBy===owner&&existing.payload.sourceInput===sourceInput)return b.action==='draft'?json({id:b.id,revision:existing.revision,input,finalized:true}):json({quote:existing,repeated:true});return json({error:'هذا الرقم مستخدم لعرض محفوظ؛ افتح عرضًا جديدًا لأي تغيير'},409)}
  if(b.action==='draft'){
   if(!Number.isInteger(b.revision)||b.revision<0)throw Error('إصدار المسودة غير صالح');
   const result=await saveDraft(b.id,owner,b.revision,input);
   if(result)return json({id:b.id,revision:result.revision,input});
   const current=await getDraft(b.id);
   if(current?.owner===owner&&current.payload===sourceInput)return json({id:b.id,revision:current.revision,input});
   return json({error:'تغيّرت المسودة في جلسة أخرى. أعد فتحها؛ لم نكتب فوق تعديلاتك.'},409);
  }
  const draft=await getDraft(b.id);
  if(!draft||draft.owner!==owner||draft.revision!==b.draftRevision||draft.payload!==sourceInput)return json({error:'احفظ آخر تغييرات المسودة قبل إصدار العرض.'},409);
  const {request,company,catalog,service}=await context(input.requestId);
  if(b.catalogRevision!==catalog.revision)return json({error:'تغيّرت إعدادات التسعير. حدّث الصفحة وراجع المعاينة؛ مسودتك محفوظة.'},409);
  if(!isDate(input.validUntil)||input.validUntil<saudiToday())throw Error('أدخل تاريخ صلاحية غير منتهٍ بتوقيت السعودية');
  const supplier=await getSupplier(input.supplierId);
  if(!supplier||supplier.status!=='نشط'||!supplier.services.includes(service.name)||supplier.mode==='ربط مباشر')throw Error('اختر موردًا نشطًا متاحًا للتعامل اليدوي ويقدم الخدمة');
  if(supplier.revision!==b.supplierRevision)return json({error:'تغيّرت بيانات المورد؛ حدّثها قبل الإصدار.'},409);
  if(!input.supplierReference.trim())throw Error('أدخل مرجع عرض المورد');
  let supplierNet:number,supplierTax:number,offeringSnapshot:unknown=null,supplierTerms=input.supplierTerms;
  if(input.offeringId&&input.presetId)throw Error('اختر مصدر سعر واحدًا');
  if(input.presetId){
   const p=await getPreset(input.presetId);if(!p||p.supplierId!==supplier.id||p.service!==service.name||!presetAvailable(p,supplier))throw Error('بند الكتالوج تجريبي أو غير متاح؛ يلزم اعتماده قبل العرض الفعلي');
   if(p.revision!==b.presetRevision)return json({error:'تغيّر بند الكتالوج؛ حدّثه قبل إصدار العرض.'},409);
   if(input.validUntil>p.validUntil)throw Error('صلاحية العرض لا تتجاوز سعر الكتالوج');
   if(Number(input.fxRate)!==1)throw Error('الكتالوج المحلي بالريال؛ سعر التحويل يجب أن يكون واحدًا');
   const costs=offeringCosts({...p,currency:'SAR'},Number(input.supplierUnits),1);supplierNet=costs.net;supplierTax=costs.tax;
   offeringSnapshot={preset:p,supplier:{id:supplier.id,name:supplier.name,revision:supplier.revision},supplierUnits:Number(input.supplierUnits),fxRate:1};supplierTerms=[p.terms,p.cancellation].join('\n');
  }else if(input.offeringId){
   const o=await getOffering(input.offeringId);
   if(!o||o.supplierId!==supplier.id||o.service!==service.name||!offeringAvailable(o,supplier))throw Error('بند المورد غير متاح أو سعره منتهٍ');
   if(o.revision!==b.offeringRevision)return json({error:'تغيّر سعر المورد؛ حدّث الكتالوج قبل الإصدار.'},409);
   if(input.validUntil>o.validUntil)throw Error('صلاحية العرض لا تتجاوز صلاحية سعر المورد');
   if(o.currency!=='SAR'&&!input.fxReference.trim())throw Error('أدخل مرجع سعر التحويل');
   const costs=offeringCosts(o,Number(input.supplierUnits),Number(input.fxRate));supplierNet=costs.net;supplierTax=costs.tax;
   offeringSnapshot={offering:o,supplier:{id:supplier.id,name:supplier.name,revision:supplier.revision},supplierUnits:Number(input.supplierUnits),fxRate:Number(input.fxRate),fxReference:o.currency==='SAR'?'':input.fxReference};
   supplierTerms=[o.terms,o.cancellation].join('\n');
  }else{
   if(input.net.trim()===''||input.tax.trim()===''||!supplierTerms.trim())throw Error('أكمل تكلفة المورد وضريبته وشروطه؛ لا نعتبر الحقل الفارغ صفرًا');
   supplierNet=Number(input.net);supplierTax=Number(input.tax);
  }
  if(input.parentQuoteId){
   const parent=await getQuote(input.parentQuoteId);
   if(!parent||parent.payload.requestId!==request.id||!['ملغي','مرفوض'].includes(parent.payload.status)||!input.revisionReason.trim())throw Error('التعديل مرتبط بعرض مرفوض أو ملغي لنفس الطلب، مع سبب التعديل');
  }
  const amounts=calculateServicePrice(service,supplierNet,supplierTax,Number(input.quantity));
  const provider=await getProviderProfile();
  const payload={providerSnapshot:{name:provider.legal_name,email:provider.email,phone:provider.phone,cr:provider.commercial_registration,vat:provider.vat_number},requestId:request.id,requestSnapshot:{destination:request.destination,summary:request.summary,traveler:request.traveler},number:quoteNumber(b.id),sourceInput,createdBy:owner,
   service,catalogRevision:catalog.revision,company:{id:company.id,name:company.legal_name},contractVersion:company.contract_version,
   supplierSnapshot:{id:supplier.id,name:supplier.name,revision:supplier.revision},supplierTerms,offeringSnapshot,
   quantity:Number(input.quantity),amounts,validUntil:input.validUntil,supplierReference:input.supplierReference,
   parentQuoteId:input.parentQuoteId,revisionReason:input.revisionReason,status:'بانتظار الاعتماد الداخلي',approvalEvidence:'',commercialReview:'',
   note:'عرض سعر وليس فاتورة أو تأكيد حجز. يخضع التوفر لتأكيد المورد.'};
  const row=await env.DB.prepare('INSERT INTO service_quote_versions(quote_id,revision,payload,actor,created_at) SELECT ?,1,?,?,? WHERE NOT EXISTS(SELECT 1 FROM service_quote_versions WHERE quote_id=?) AND EXISTS(SELECT 1 FROM quote_drafts WHERE id=? AND owner=? AND revision=? AND payload=?) ON CONFLICT(quote_id,revision) DO NOTHING RETURNING revision').bind(b.id,JSON.stringify(payload),actor,new Date().toISOString(),b.id,b.id,owner,b.draftRevision,sourceInput).first();
  if(!row){const retry=await getQuote(b.id);if(retry?.payload.createdBy===owner&&retry.payload.sourceInput===sourceInput)return json({quote:retry,repeated:true});return json({error:'تغيّرت المسودة أثناء الإصدار. حدّث القائمة.'},409)}
  return json({quote:await getQuote(b.id)},201);
 }catch(e){return json({error:e instanceof Error?e.message:'تعذر حفظ العرض'},400)}
}
export async function PATCH(req:Request){
 const actor=await templateOwner();if(!actor||req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 try{
  const b=await body(req,6000);
  if(!uuid(b.id)||!Number.isInteger(b.revision)||!['internal','customer','cancel','reject'].includes(b.action)||typeof b.evidence!=='string'||b.evidence.length>1000)throw Error('راجع بيانات الإجراء');
  const row=await getQuote(b.id);if(!row||row.revision!==b.revision)return json({error:'تغيّر العرض؛ حدّث القائمة.'},409);
  const p=row.payload;
  if(['ملغي','مرفوض','موافقة العميل موثقة'].includes(p.status))throw Error('العرض مغلق. لا نغيّر النسخة المعتمدة أو المرفوضة');
  if(await env.DB.prepare('SELECT booking_id FROM booking_basis WHERE quote_id=?').bind(b.id).first())throw Error('العرض مرتبط بحجز ولا يمكن تغييره هنا');
  if(!b.evidence.trim())throw Error('أدخل مرجع الموافقة أو سبب الإجراء');
  if(['internal','customer'].includes(b.action)){
   if(!p.requestId)throw Error('عرض قديم غير مربوط بطلب؛ أنشئ عرضًا مرتبطًا قبل الاعتماد');
   if(p.validUntil<saudiToday())throw Error('انتهت صلاحية العرض بتوقيت السعودية');
   const ctx=await context(p.requestId);
   if(ctx.company.id!==p.company.id||ctx.service.name!==p.service.name)throw Error('بيانات الطلب لا تطابق العرض');
   const supplier=await getSupplier(p.supplierSnapshot?.id||p.offeringSnapshot?.supplier?.id||'');
   if(!supplier||supplier.status!=='نشط'||!supplier.services.includes(p.service.name))throw Error('المورد موقوف أو غير متاح للخدمة');
  }
  if(b.action==='internal'){
   if(p.status!=='بانتظار الاعتماد الداخلي')throw Error('العرض لا ينتظر اعتمادًا داخليًا');
   if(typeof b.commercialReview!=='string'||!b.commercialReview.trim()||b.commercialReview.length>1000)throw Error('وثّق مطابقة العمولة ووحدتها لاتفاقية الشركة قبل الاعتماد');
   p.commercialReview=b.commercialReview.trim();p.commercialReviewer=actor;p.commercialReviewedAt=new Date().toISOString();
  }
  if(b.action==='customer'&&(p.status!=='بانتظار موافقة العميل'||!p.commercialReview))throw Error('أكمل اعتماد السعر ومراجعة الاتفاقية أولًا');
  p.status=b.action==='internal'?'بانتظار موافقة العميل':b.action==='customer'?'موافقة العميل موثقة':b.action==='reject'?'مرفوض':'ملغي';
  p.approvalEvidence=b.evidence.trim();
  const result=await env.DB.prepare('INSERT INTO service_quote_versions(quote_id,revision,payload,actor,created_at) SELECT ?,?,?,?,? WHERE (SELECT MAX(revision) FROM service_quote_versions WHERE quote_id=?)=? ON CONFLICT(quote_id,revision) DO NOTHING RETURNING revision').bind(b.id,row.revision+1,JSON.stringify(p),actor,new Date().toISOString(),b.id,row.revision).first();
  return result?json({quote:await getQuote(b.id)}):json({error:'تغيّر العرض أثناء الحفظ؛ حدّث القائمة.'},409);
 }catch(e){return json({error:e instanceof Error?e.message:'تعذر الحفظ'},400)}
}
