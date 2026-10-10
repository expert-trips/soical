// Local-only integration tests. Fixtures use unique IDs and never touch production.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';
const origin='http://localhost:3000';
const headers={cookie:'__sites_local_auth=1','content-type':'application/json'};
const tag='LOCAL-BOOKING-TEST-'+crypto.randomUUID(),companyId='ORG-'+crypto.randomUUID(),supplierId=crypto.randomUUID();
const requests=Array.from({length:5},()=> 'TR-'+crypto.randomUUID()),quotes=Array.from({length:5},()=>crypto.randomUUID());
const now=new Date().toISOString();
const lit=v=>"'"+String(v).replaceAll("'","''")+"'";
function sql(commands){return execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','site-creator-d1','--local','--persist-to','.wrangler/state','--config','dist/server/wrangler.json','--command',commands.join(';')],{cwd:process.cwd(),env:{...process.env,WRANGLER_WRITE_LOGS:'false'},stdio:'pipe'}).toString()}
async function call(path,method='GET',body){const r=await fetch(origin+path,{method,headers,body:body?JSON.stringify(body):undefined});return {status:r.status,b:await r.json()}}
function localModule(file){const m=new Module(process.cwd()+'/'+file);m.paths=Module._nodeModulePaths(process.cwd());m._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,process.cwd()+'/'+file);return m.exports}
const policy=localModule('lib/booking-workflow.ts');
assert.equal(policy.nextBookingStatus('ملغي'),null);assert.equal(policy.nextBookingStatus('مكتمل'),null);
assert.throws(()=>policy.assertBookingTransition('مسودة','مكتمل',true));
assert.throws(()=>policy.assertBookingTransition('بانتظار التأكيد','مؤكد',false));
assert.equal(policy.csvCell('=1+1'),'"\'=1+1"');assert.equal(policy.csvCell(' normal'),'" normal"');
const access=localModule('lib/staff-access.ts');assert.equal(access.allowedStaffRoute('قراءة فقط','/api/bookings','POST'),false);assert.equal(access.allowedStaffRoute('عمليات','/api/bookings','POST'),true);
const supplier={id:supplierId,revision:1,name:tag,email:'',phone:'',status:'نشط',mode:'يدوي',services:['طيران'],notes:'',documentationUrl:''};
const base={company:{id:companyId,name:tag},service:{name:'طيران',terms:'test terms',cancellation:'test cancellation',refund:'test refund'},amounts:{total:111.5,supplierNet:100,supplierTax:0,fee:10,feeTax:1.5},validUntil:'2099-12-31',status:'موافقة العميل موثقة',approvalEvidence:tag};
const payloads=quotes.map((_,i)=>({...structuredClone(base),requestId:i===4?requests[2]:requests[0]}));payloads[1].status='بانتظار موافقة العميل';payloads[2].validUntil='2000-01-01';payloads[3].company.id='different-company';
let seeded=false;
try{
 assert.equal((await fetch(origin+'/api/bookings')).status,401);
 const catalog=(await call('/api/service-catalog')).b.catalog;const testServices=catalog.services.map(s=>s.name==='طيران'?{...s,status:'مفعّلة',description:tag,terms:tag,cancellation:tag,refund:tag}:s);
 const orgColumns=['id','legal_name','display_name','reference','sector','contact_name','contact_email','account_manager','status','contract_status','contract_version','contract_start','contract_end','payment_terms','currency','credit_limit','credit_used','sla_hours','direct_booking_allowed','approval_required','approval_role','price_boundary','permitted_services','created_at','updated_at'];
 const orgValues=[companyId,tag,tag,tag,'','test','test@example.test','','نشطة','ساري','TEST','2026-01-01','2099-12-31','30','SAR',100000,0,0,0,1,'',0,'["طيران"]',now,now];
 sql([
  `INSERT INTO service_catalog_versions(payload,actor,reason,created_at) VALUES(${[JSON.stringify(testServices),tag,tag,now].map(lit).join(',')})`,
  `INSERT INTO organizations(${orgColumns.join(',')}) VALUES(${orgValues.map(lit).join(',')})`,
  `INSERT INTO supplier_records(id,revision,payload,updated_at) VALUES(${lit(supplierId)},1,${lit(JSON.stringify(supplier))},${lit(now)})`,
  ...requests.map(id=>`INSERT INTO requests(id,service,category,fulfillment_model,company,traveler,destination,status,priority,assignee,sla_minutes,summary,created_at,updated_at) VALUES(${[id,'طيران','طيران','يدوي',tag,'local','local','جديد','عادي','غير مسند',0,tag,now,now].map(lit).join(',')})`),
  ...requests.map(id=>`INSERT INTO provider_settings(id,payload,updated_at) VALUES(${lit('REQUEST-SERVICE-'+id)},${lit(JSON.stringify({companyId}))},${lit(now)})`),
  ...quotes.map((id,i)=>`INSERT INTO service_quote_versions(quote_id,revision,payload,actor,created_at) VALUES(${lit(id)},1,${lit(JSON.stringify(payloads[i]))},${lit(tag)},${lit(now)})`),
 ]);seeded=true;
 const post=(requestId,quoteId=quotes[0])=>call('/api/bookings','POST',{requestId,quoteId,quoteRevision:1});
 assert.equal((await call('/api/bookings','POST',{requestId:requests[0]})).status,400);
 assert.equal((await post(requests[0],quotes[1])).status,400);
 assert.equal((await post(requests[0],quotes[2])).status,400);
 assert.equal((await post(requests[0],quotes[3])).status,400);
 const candidates=await call('/api/bookings','POST',{action:'candidates',requestId:requests[0]});assert.equal(candidates.status,200);assert.deepEqual(candidates.b.quotes.map(q=>q.quote_id).sort(),[quotes[0]].sort());
 sql([`UPDATE organizations SET legal_name=${lit(tag+'-renamed')},display_name=${lit(tag+'-renamed')} WHERE id=${lit(companyId)}`]);
 let r=await post(requests[0]);assert.equal(r.status,201,JSON.stringify(r));let booking=r.b.booking;assert.match(booking.id,/^BK-[0-9a-f-]{36}$/);assert.equal(booking.status,'مسودة');
 assert.equal((await post(requests[0])).b.booking.id,booking.id);
 assert.equal((await post(requests[1])).status,400);
 let detail=await call('/api/bookings/'+booking.id);assert.equal(detail.b.basis.quote_snapshot.amounts.total,111.5);assert.equal(detail.b.basis.company_id,companyId);
 const patch=(b,status,extra={})=>call('/api/bookings/'+b.id,'PATCH',{status,expectedUpdatedAt:b.updated_at,...extra});
 assert.equal((await patch(booking,'مكتمل')).status,409);
 r=await patch(booking,'بانتظار التأكيد');assert.equal(r.status,200,JSON.stringify(r));const stale=booking;booking=r.b.booking;
 assert.equal((await patch(stale,'بانتظار التأكيد')).status,409);
 assert.equal((await patch(booking,'مؤكد')).status,400);
 assert.equal((await patch(booking,'مؤكد',{supplierId,reference:'TEST'})).status,400);
 r=await patch(booking,'مؤكد',{supplierId,reference:'TEST-REF',evidence:tag});assert.equal(r.status,200,JSON.stringify(r));booking=r.b.booking;assert.match(booking.connector_status,/يدوي/);
 detail=await call('/api/bookings/'+booking.id);assert.equal(detail.b.basis.supplier_proof.supplierId,supplierId);assert.equal(detail.b.basis.supplier_proof.evidence,tag);
 assert.equal((await patch(booking,'ملغي',{reason:'test'})).status,409);
 const concurrent=await Promise.all([patch(booking,'قيد التنفيذ'),patch(booking,'قيد التنفيذ')]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);booking=concurrent.find(r=>r.status===200).b.booking;
 r=await patch(booking,'مكتمل');assert.equal(r.status,200);booking=r.b.booking;assert.equal((await patch(booking,'مسودة')).status,409);assert.equal((await patch(booking,'مكتمل')).status,409);
 const createRace=await Promise.all([post(requests[2],quotes[4]),post(requests[3],quotes[4])]);assert.deepEqual(createRace.map(r=>r.status).sort(),[201,400]);let cancelBooking=createRace.find(r=>r.status===201).b.booking;
 assert.equal((await patch(cancelBooking,'ملغي')).status,400);r=await patch(cancelBooking,'ملغي',{reason:'local cancellation test'});assert.equal(r.status,200);cancelBooking=r.b.booking;assert.equal((await patch(cancelBooking,'مسودة')).status,409);
 assert.equal((await fetch(origin+'/api/bookings',{method:'POST',headers:{...headers,'sec-fetch-site':'cross-site'},body:JSON.stringify({requestId:requests[4],quoteId:quotes[0],quoteRevision:1})})).status,403);
 assert.equal((await call('/api/bookings/BK-not-found','PATCH',{status:'مكتمل',expectedUpdatedAt:now})).status,404);
 console.log('PASS: approvals, expiry, company/service matching, stable company identity after rename, quote snapshot, idempotent creation, unique quote use, concurrent creation/update, transitions, supplier evidence, cancellation reason, closed records, UUID IDs, auth/cross-site protection, read-only policy, CSV sanitation.');
}finally{
 if(seeded){const all=(await call('/api/requests')).b.requests;for(const id of requests)assert.equal(all.find(r=>r.id===id)?.summary,tag);const org=(await call('/api/organizations')).b.organizations.find(o=>o.id===companyId);assert(org?.legal_name.startsWith(tag));
  sql([...requests.flatMap(id=>[`DELETE FROM booking_basis WHERE request_id=${lit(id)}`,`DELETE FROM bookings WHERE request_id=${lit(id)}`,`DELETE FROM audit_events WHERE request_id=${lit(id)}`,`DELETE FROM provider_settings WHERE id=${lit('REQUEST-SERVICE-'+id)}`,`DELETE FROM requests WHERE id=${lit(id)}`]),...quotes.map(id=>`DELETE FROM service_quote_versions WHERE quote_id=${lit(id)} AND actor=${lit(tag)}`),`DELETE FROM service_catalog_versions WHERE actor=${lit(tag)} AND reason=${lit(tag)}`,`DELETE FROM supplier_records WHERE id=${lit(supplierId)}`,`DELETE FROM organizations WHERE id=${lit(companyId)}`]);console.log('Removed only this run’s verified local fixtures. Existing records untouched.');
 }
}
