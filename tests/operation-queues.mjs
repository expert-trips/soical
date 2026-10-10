import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
function load(file,mocks={}){const path=process.cwd()+'/'+file,m=new Module(path);m.paths=Module._nodeModulePaths(process.cwd());const original=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:original(id);m._compile(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,path);return m.exports}
const queues=load('lib/operation-queues.ts');
const mocks={'@/lib/operation-queues':queues,'@/components/safe-link':{default:({children,...p})=>React.createElement('a',p,children)},'./request-status':{StatusPill:()=>null},'@/lib/booking-workflow':{csvCell:x=>x}};
const {OperationsCenter}=load('components/operations-center.tsx',mocks);
const {RequestsBookingsCenter}=load('components/requests-bookings-center.tsx',mocks);
const statuses=['جديد','قيد التسعير','نقص معلومات','قيد التنفيذ','تأكيد المورد','إعداد عرض','تم التصعيد','مكتمل'];
const rows=statuses.map((status,i)=>({id:'TEST-'+i,status,priority:i===0?'عاجل':'عادي',company:'Test',category:'طيران',service:'طيران',assignee:'غير مسند',traveler:'Test',updated_at:'2026-09-07T12:00:00Z',created_at:'2026-09-07T12:00:00Z'}));
const expected={new:[0],pricing:[1,2],ready:[3,4],review:[5],escalated:[6],urgent:[0]};
const home=render(React.createElement(OperationsCenter,{initial:rows}));
for(const q of queues.operationQueues){
 assert.equal(queues.parseOperationQueue(q.id),q.id);
 assert.deepEqual(rows.flatMap((r,i)=>queues.matchesOperationQueue(r,q.id)?[i]:[]),expected[q.id]);
 assert(home.includes('href="/requests?queue='+q.id+'"'));
 assert(home.includes(q.label+' — عرض '+expected[q.id].length+' طلب'));
 const html=render(React.createElement(RequestsBookingsCenter,{initialRequests:rows,initialBookings:[],queue:q.id}));
 for(let i=0;i<rows.length;i++)assert.equal(html.includes('href="/requests/TEST-'+i+'"'),expected[q.id].includes(i),q.id+' row '+i);
 assert(html.includes('إلغاء التصفية وعرض جميع الطلبات'));
 const empty=render(React.createElement(RequestsBookingsCenter,{initialRequests:[],initialBookings:[],queue:q.id}));
 assert(empty.includes('لا توجد سجلات مطابقة.'));
}
for(const input of ['bad','__proto__','',undefined,['new']])assert.equal(queues.parseOperationQueue(input),undefined);
const all=render(React.createElement(RequestsBookingsCenter,{initialRequests:rows,initialBookings:[]}));
for(const r of rows)assert(all.includes('href="/requests/'+r.id+'"'));
const src=readFileSync('app/requests/page.tsx','utf8');
assert(src.includes('parseOperationQueue(rawQueue)'));
assert(src.includes('queue={queue}'));
console.log('PASS: six navigation targets, exact matching counts and filtered records, urgent/escalated separation, empty results, clear link, invalid parameters and unfiltered view.');
