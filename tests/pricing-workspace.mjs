// Local-only integration fixtures; never connect this test to production.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const origin='http://localhost:3000',headers={cookie:'__sites_local_auth=1','content-type':'application/json'};
const tag='LOCAL-PRICING-'+crypto.randomUUID(),companyId='ORG-'+crypto.randomUUID(),supplierId=crypto.randomUUID(),requestIds=Array.from({length:3},()=> 'TR-'+crypto.randomUUID()),quoteIds=Array.from({length:6},()=>crypto.randomUUID()),now=new Date().toISOString();
const lit=v=>"'"+String(v).replaceAll("'","''")+"'";
function sql(commands){return execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','site-creator-d1','--local','--persist-to','.wrangler/state','--config','dist/server/wrangler.json','--command',commands.join(';')],{env:{...process.env,WRANGLER_WRITE_LOGS:'false'},stdio:'pipe'}).toString()}
async function call(path,method='GET',body){const r=await fetch(origin+path,{method,headers,body:body?JSON.stringify(body):undefined});let b;try{b=await r.json()}catch{b={}}return {status:r.status,b}}
const draftInput=(requestId=requestIds[0])=>({presetId:'',requestId,supplierId,offeringId:'',net:'500',tax:'0',quantity:'1',supplierUnits:'1',fxRate:'1',fxReference:'',validUntil:'2099-12-31',supplierReference:tag,supplierTerms:tag+' terms',parentQuoteId:'',revisionReason:''});
const revisions=new Map(),inputs=new Map();
let seeded=false,presetId='',presetRevisions=[];
try{
 assert.equal((await fetch(origin+'/api/service-quotes')).status,401);
 assert.equal((await fetch(origin+'/api/catalog-presets')).status,401);
 const catalog=(await call('/api/service-catalog')).b.catalog;
 for(const s of catalog.services)if(['طيران','تأشيرات','استقبال وتوديع'].includes(s.name))Object.assign(s,{status:'مفعّلة',description:tag,terms:tag,cancellation:tag,refund:tag,fee:10,vat:15});
 const cols=['id','legal_name','display_name','reference','sector','contact_name','contact_email','account_manager','status','contract_status','contract_version','contract_start','contract_end','payment_terms','currency','credit_limit','credit_used','sla_hours','direct_booking_allowed','approval_required','approval_role','price_boundary','permitted_services','created_at','updated_at'];
 const vals=[companyId,tag,tag,tag,'','test','test@example.test','','نشطة','ساري','TEST','2026-01-01','2099-12-31','30','SAR',100000,0,0,0,1,'',0,JSON.stringify(['طيران','تأشيرات']),now,now];
 const supplier={id:supplierId,revision:1,name:tag,email:'',phone:'',status:'نشط',mode:'يدوي',services:['طيران','تأشيرات'],notes:tag,documentationUrl:''};
 sql([
  'INSERT INTO organizations('+cols.join(',')+') VALUES('+vals.map(lit).join(',')+')',
  'INSERT INTO service_catalog_versions(payload,actor,reason,created_at) VALUES('+[JSON.stringify(catalog.services),tag,tag,now].map(lit).join(',')+')',
  'INSERT INTO supplier_records(id,revision,payload,updated_at) VALUES('+[supplierId,1,JSON.stringify(supplier),now].map(lit).join(',')+')',
  ...requestIds.map((id,i)=>'INSERT INTO requests(id,service,category,fulfillment_model,company,traveler,destination,status,priority,assignee,sla_minutes,summary,created_at,updated_at) VALUES('+[id,i===2?'تأشيرات':'طيران',i===2?'تأشيرات':'طيران','يدوي',tag,'Local','Local','جديد','عادي','غير مسند',0,tag,now,now].map(lit).join(',')+')'),
  ...requestIds.map(id=>'INSERT INTO provider_settings(id,payload,updated_at) VALUES('+['REQUEST-SERVICE-'+id,JSON.stringify({companyId}),now].map(lit).join(',')+')'),
 ]);seeded=true;
 let catalogRevision=(await call('/api/service-catalog')).b.catalog.revision;
 async function saveDraft(id,input,revision=revisions.get(id)||0){const r=await call('/api/service-quotes','POST',{action:'draft',id,revision,input});if(r.status===200){revisions.set(id,r.b.revision);inputs.set(id,input)}return r}
 async function finalize(id,extra={}){return call('/api/service-quotes','POST',{id,draftRevision:revisions.get(id),input:inputs.get(id),catalogRevision,supplierRevision:1,...extra})}
 let r=await saveDraft(quoteIds[0],draftInput());assert.equal(r.status,200,JSON.stringify(r));
 const same=await saveDraft(quoteIds[0],draftInput(),0);assert.equal(same.status,200);
 assert.equal((await saveDraft(quoteIds[0],{...draftInput(),net:'600'},0)).status,409);
 assert((await call('/api/service-quotes?mode=drafts')).b.drafts.some(d=>d.id===quoteIds[0]));
 r=await finalize(quoteIds[0],{catalogRevision:-1});assert.equal(r.status,409);
 sql(['UPDATE organizations SET status='+lit('موقوفة')+' WHERE id='+lit(companyId)]);
 assert.equal((await finalize(quoteIds[0])).status,400);
 sql(['UPDATE organizations SET status='+lit('نشطة')+' WHERE id='+lit(companyId)]);
 r=await finalize(quoteIds[0]);assert.equal(r.status,201,JSON.stringify(r));let q=r.b.quote;
 assert.equal(q.payload.amounts.total,511.5);assert.equal(q.payload.requestId,requestIds[0]);assert.equal(q.payload.supplierSnapshot.id,supplierId);assert(q.payload.providerSnapshot.name);
 assert.equal((await finalize(quoteIds[0])).status,200);
 assert.equal((await saveDraft(quoteIds[0],draftInput())).b.finalized,true);
 assert.equal((await saveDraft(quoteIds[0],{...draftInput(),net:'700'})).status,409);
 assert(!(await call('/api/service-quotes?mode=drafts')).b.drafts.some(d=>d.id===quoteIds[0]));
 const action=(quote,action,extra={})=>call('/api/service-quotes','PATCH',{id:quote.quote_id,revision:quote.revision,action,evidence:tag,...extra});
 assert.equal((await action(q,'internal')).status,400);
 r=await action(q,'internal',{commercialReview:tag});assert.equal(r.status,200,JSON.stringify(r));q=r.b.quote;
 assert.equal((await fetch(origin+'/services/quotes/'+q.quote_id,{headers})).status,200);
 r=await action(q,'customer');assert.equal(r.status,200);q=r.b.quote;
 const candidates=await call('/api/bookings','POST',{action:'candidates',requestId:requestIds[1]});assert.equal(candidates.status,200);assert(!candidates.b.quotes.some(x=>x.quote_id===q.quote_id));
 r=await call('/api/bookings','POST',{requestId:requestIds[1],quoteId:q.quote_id,quoteRevision:q.revision});assert.equal(r.status,400);
 r=await call('/api/bookings','POST',{requestId:requestIds[0],quoteId:q.quote_id,quoteRevision:q.revision});assert.equal(r.status,201,JSON.stringify(r));
 const found=(await call('/api/service-quotes?q='+encodeURIComponent('QT-'+quoteIds[0])+'&state='+encodeURIComponent('مرتبط بحجز'))).b;assert.equal(found.total,1);
 assert.equal((await call('/api/service-quotes?mode=history&id='+quoteIds[0])).b.history.length,3);
 // Empty amounts, past dates, and draft-only catalog cannot become real prices.
 await saveDraft(quoteIds[1],{...draftInput(requestIds[1]),tax:''});assert.equal((await finalize(quoteIds[1])).status,400);
 await saveDraft(quoteIds[1],{...draftInput(requestIds[1]),validUntil:'2000-01-01'});assert.equal((await finalize(quoteIds[1])).status,400);
 const allPresets=(await call('/api/catalog-presets')).b.presets;
 const preset=allPresets.find(p=>p.service==='تأشيرات'&&p.revision===0);assert(preset);presetId=preset.id;
 await saveDraft(quoteIds[2],{...draftInput(requestIds[2]),presetId});assert.equal((await finalize(quoteIds[2],{presetRevision:0})).status,400);
 const ready={...preset,supplierId,reference:tag,nationality:'اختبار محلي',visaType:'اختبار محلي',net:123,tax:0,validUntil:'2099-12-31',terms:tag,cancellation:tag,status:'متاح',priceConfirmed:true};
 r=await call('/api/catalog-presets','PUT',ready);assert.equal(r.status,200,JSON.stringify(r));presetRevisions.push(r.b.preset.revision);
 r=await finalize(quoteIds[2],{presetRevision:0});assert.equal(r.status,409);
 r=await finalize(quoteIds[2],{presetRevision:1});assert.equal(r.status,201,JSON.stringify(r));assert.equal(r.b.quote.payload.amounts.total,134.5);
 r=await call('/api/catalog-presets','PUT',{...ready,revision:1,net:234,status:'مسودة',priceConfirmed:false});assert.equal(r.status,200);presetRevisions.push(r.b.preset.revision);
 const saved=(await call('/api/service-quotes?q='+quoteIds[2])).b.quotes[0];assert.equal(saved.payload.amounts.total,134.5);assert.equal(saved.payload.offeringSnapshot.preset.net,123);
 // Rejection, replacement linkage, and paused services.
 await saveDraft(quoteIds[3],draftInput(requestIds[1]));r=await finalize(quoteIds[3]);assert.equal(r.status,201);q=r.b.quote;
 r=await action(q,'reject');assert.equal(r.status,200);q=r.b.quote;
 await saveDraft(quoteIds[4],{...draftInput(requestIds[1]),parentQuoteId:q.quote_id,revisionReason:tag});r=await finalize(quoteIds[4]);assert.equal(r.status,201);assert.equal(r.b.quote.payload.parentQuoteId,q.quote_id);
 await saveDraft(quoteIds[5],draftInput(requestIds[1]));
 const paused=structuredClone(catalog.services);paused.find(s=>s.name==='طيران').status='موقوفة';
 sql(['INSERT INTO service_catalog_versions(payload,actor,reason,created_at) VALUES('+[JSON.stringify(paused),tag,tag,now].map(lit).join(',')+')']);catalogRevision=(await call('/api/service-catalog')).b.catalog.revision;
 assert.equal((await finalize(quoteIds[5])).status,400);
 assert.equal((await fetch(origin+'/api/catalog-presets',{method:'PUT',headers:{...headers,'sec-fetch-site':'cross-site'},body:JSON.stringify(ready)})).status,403);
 console.log('PASS: durable drafts, conflict checks, replay without duplicates, strict request/supplier/company/service validation, Saudi expiry, blank tax rejection, contract review, immutable snapshots, approved catalog only, real preset pricing, history/search, replacement linkage and auth.');
}finally{
 if(seeded){
  const req=(await call('/api/requests')).b.requests;for(const id of requestIds)assert.equal(req.find(r=>r.id===id)?.summary,tag);
  sql([
   ...requestIds.flatMap(id=>['DELETE FROM booking_basis WHERE request_id='+lit(id),'DELETE FROM bookings WHERE request_id='+lit(id),'DELETE FROM audit_events WHERE request_id='+lit(id),'DELETE FROM provider_settings WHERE id='+lit('REQUEST-SERVICE-'+id),'DELETE FROM requests WHERE id='+lit(id)]),
   ...quoteIds.flatMap(id=>['DELETE FROM service_quote_versions WHERE quote_id='+lit(id)+' AND json_extract(payload,\'$.supplierReference\')='+lit(tag),'DELETE FROM quote_drafts WHERE id='+lit(id)+' AND json_extract(payload,\'$.supplierReference\')='+lit(tag)]),
   ...presetRevisions.map(rev=>'DELETE FROM catalog_preset_versions WHERE id='+lit(presetId)+' AND revision='+rev+' AND json_extract(payload,\'$.reference\')='+lit(tag)),
   'DELETE FROM service_catalog_versions WHERE actor='+lit(tag)+' AND reason='+lit(tag),
   'DELETE FROM supplier_records WHERE id='+lit(supplierId)+' AND json_extract(payload,\'$.notes\')='+lit(tag),
   'DELETE FROM organizations WHERE id='+lit(companyId)+' AND reference='+lit(tag),
  ]);console.log('Removed only this run’s verified local fixtures.');
 }
}
