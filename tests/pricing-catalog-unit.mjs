import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';
function load(file,mocks={}){const path=process.cwd()+'/'+file,m=new Module(path);m.paths=Module._nodeModulePaths(process.cwd());const req=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:req(id);m._compile(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,path);return m.exports}
const booking=load('lib/booking-workflow.ts'),fields=load('lib/organization-fields.ts'),services=load('lib/service-catalog.ts',{'./organization-fields':fields}),supplier=load('lib/supplier-catalog.ts',{'./organization-fields':fields});
const presets=load('lib/catalog-presets.ts',{'./supplier-catalog':supplier,'./service-catalog':services});
const quotes=load('lib/quote-workspace.ts',{'./booking-workflow':booking}),customer=load('lib/customer-quote.ts');
const all=presets.defaultPresets();assert.equal(all.length,100);assert.equal(new Set(all.map(p=>p.id)).size,100);assert(all.every(p=>p.net===500&&p.status==='مسودة'&&!p.priceConfirmed));
assert.equal(all.filter(p=>p.service==='تأشيرات').length,68);assert.equal(all.filter(p=>p.service==='استقبال وتوديع').length,32);
assert.equal(presets.catalogSearch(all,[],[],{service:'',query:'',includeDrafts:false}).length,0);
assert.equal(presets.catalogSearch(all,[],[],{service:'تأشيرات',query:'فرنسا',includeDrafts:true}).length,1);
assert.equal(presets.catalogSearch(all,[],[],{service:'استقبال وتوديع',query:'الرياض',includeDrafts:true}).length,2);
const svc=services.defaultServices()[0],item={net:500,tax:0,currency:'SAR'};
assert.equal(presets.catalogPreview(item,svc,1,1,1).total,511.5);
for(const units of [1,2,7])for(const qty of [1,2,5])for(const currency of ['SAR','KWD','USD']){
 const x={net:12.345,tax:0.125,currency},fx=currency==='SAR'?1:3.754321,cost=supplier.offeringCosts(x,units,fx);
 assert.deepEqual(presets.catalogPreview(x,svc,units,qty,fx),services.calculateServicePrice(svc,cost.net,cost.tax,qty));
}
assert.throws(()=>presets.catalogPreview(item,svc,0,1,1));
const old={...quotes.emptyQuoteInput('old'),net:'999',supplierId:'x',quantity:'8',supplierReference:'ref'};
assert.deepEqual(quotes.resetQuoteContext(old,'new'),quotes.emptyQuoteInput('new'));
assert.throws(()=>quotes.cleanQuoteInput({...old,secret:'bad'}));
const p={company:{id:'c',name:'Company'},service:{name:'طيران'},requestId:'r1',status:'موافقة العميل موثقة',approvalEvidence:'ok',validUntil:'2099-01-01',amounts:{total:111.5,supplierNet:100,supplierTax:0,fee:10,feeTax:1.5},createdBy:'private-owner',sourceInput:'private-input',commercialReview:'private-review',supplierSnapshot:{name:'private-supplier'}};
assert.throws(()=>booking.assertApprovedQuote({payload:p},'c','طيران','r2'));
booking.assertApprovedQuote({payload:p},'c','طيران','r1');
assert.throws(()=>booking.assertApprovedQuote({payload:{...p,requestId:undefined}},'c','طيران','r1'));
const safe=customer.customerQuote({quote_id:'test',payload:p});assert.equal(safe.total,111.5);for(const secret of ['private-owner','private-input','private-review','private-supplier','supplierNet','feeTax'])assert(!JSON.stringify(safe).includes(secret));
const access=load('lib/staff-access.ts');assert(access.allowedStaffRoute('عمليات','/api/catalog-presets','PUT'));assert(!access.allowedStaffRoute('قراءة فقط','/api/catalog-presets','PUT'));assert(!access.allowedStaffRoute('محاسبة','/api/catalog-presets','PUT'));
console.log('PASS: 100 draft presets; 68 visa destinations/32 meet services; draft exclusion; Arabic search; same pricing engine incl FX precision; context reset; strict request matching; customer projection; catalog price permissions.');

const now=Date.now;
try{Date.now=()=>Date.parse('2026-09-07T21:30:00Z');assert.equal(booking.saudiToday(),'2026-09-08');assert.throws(()=>booking.assertApprovedQuote({payload:{...p,validUntil:'2026-09-07'}},'c','طيران','r1'));}finally{Date.now=now}
let savedPrice;
const active={...all[0],revision:5,status:'متاح',net:100,priceConfirmed:true,supplierId:'original',terms:'original terms'};
const route=load('app/api/catalog-presets/route.ts',{
 'next/headers':{headers:async()=>new Headers({'oai-authenticated-user-email':'ops@example.test'})},
 '@/db/contract-template':{templateOwner:async()=>null},
 '@/db/staff':{findStaff:async()=>({role:'عمليات',status:'نشط'})},
 '@/db/supplier-catalog':{getSupplier:async()=>{throw Error('Operations may not approve suppliers')}},
 '@/db/catalog-presets':{getPreset:async()=>active,savePreset:async v=>{savedPrice=v;return v},listPresets:async()=>[]},
 '@/lib/catalog-presets':presets,'@/lib/supplier-catalog':supplier,
});
const response=await route.PUT(new Request('http://localhost/api/catalog-presets',{method:'PUT',body:JSON.stringify({...active,net:222,tax:3,terms:'tampered',supplierId:'tampered',status:'متاح',priceConfirmed:true})}));
assert.equal(response.status,200);assert.equal(savedPrice.net,222);assert.equal(savedPrice.tax,3);assert.equal(savedPrice.terms,'original terms');assert.equal(savedPrice.supplierId,'original');assert.equal(savedPrice.status,'مسودة');assert.equal(savedPrice.priceConfirmed,false);
console.log('PASS: Saudi midnight expiry and server-enforced price-only operations edits without publication or supplier/terms changes.');
