import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const origin='http://localhost:3000',headers={cookie:'__sites_local_auth=1','content-type':'application/json'};
const id='TR-'+crypto.randomUUID(),tag='LOCAL-WORKSPACE-'+crypto.randomUUID(),staffIds=Array.from({length:3},()=>crypto.randomUUID()),now=new Date().toISOString();
const lit=v=>"'"+String(v).replaceAll("'","''")+"'";
function sql(commands){execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','site-creator-d1','--local','--persist-to','.wrangler/state','--config','dist/server/wrangler.json','--command',commands.join(';')],{env:{...process.env,WRANGLER_WRITE_LOGS:'false'},stdio:'pipe'})}
async function call(path,method='GET',body){const r=await fetch(origin+path,{method,headers,body:body?JSON.stringify(body):undefined});return {status:r.status,b:await r.json()}}
let seeded=false;
try{
 sql([`INSERT INTO requests(id,service,category,fulfillment_model,company,traveler,destination,status,priority,assignee,sla_minutes,summary,created_at,updated_at) VALUES(${[id,'طيران','طيران','يدوي',tag,'test','test','جديد','عادي','غير مسند',0,tag,now,now].map(lit).join(',')})`,...staffIds.map((staffId,i)=>`INSERT INTO internal_staff(id,name,email,phone,department,job_title,role,status,created_at,updated_at) VALUES(${[staffId,tag+'-'+i,staffId+'@example.test','','','',i===2?'قراءة فقط':'عمليات',i===1?'موقوف':'نشط',now,now].map(lit).join(',')})`)]);seeded=true;
 const url='/api/requests/'+id;let r=await call(url);assert.equal(r.status,200);let request=r.b.request;
 assert(r.b.assignees.some(s=>s.id===staffIds[0]));assert(!r.b.assignees.some(s=>staffIds.slice(1).includes(s.id)));assert.equal(r.b.workspace.notes.length,0);assert.equal(r.b.workspace.events.length,0);
 assert.equal((await call(url,'PATCH',{status:'قيد التنفيذ',assignee:'fake'})).status,400);
 assert.equal((await call(url,'PATCH',{action:'assign',assigneeId:staffIds[1],expectedUpdatedAt:request.updated_at})).status,400);
 assert.equal((await call(url,'PATCH',{action:'assign',assigneeId:staffIds[2],expectedUpdatedAt:request.updated_at})).status,400);
 const old=request;r=await call(url,'PATCH',{action:'assign',assigneeId:staffIds[0],expectedUpdatedAt:request.updated_at});assert.equal(r.status,200,JSON.stringify(r));request=r.b.request;assert.equal(r.b.workspace.assigneeId,staffIds[0]);assert.equal(request.assignee,tag+'-0');
 assert.equal((await call(url,'PATCH',{action:'status',status:'قيد المعالجة',expectedUpdatedAt:old.updated_at})).status,409);
 assert.equal((await call(url,'PATCH',{action:'status',status:'نقص معلومات',expectedUpdatedAt:request.updated_at})).status,400);
 r=await call(url,'PATCH',{action:'status',status:'نقص معلومات',reason:'local missing fields',expectedUpdatedAt:request.updated_at});assert.equal(r.status,200);request=r.b.request;assert(r.b.workspace.events[0].action.includes('local missing fields'));
 assert.equal((await call(url,'PATCH',{action:'status',status:'قيد التنفيذ',expectedUpdatedAt:request.updated_at})).status,400);
 const race=await Promise.all([call(url,'PATCH',{action:'status',status:'قيد المعالجة',expectedUpdatedAt:request.updated_at}),call(url,'PATCH',{action:'status',status:'قيد المعالجة',expectedUpdatedAt:request.updated_at})]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
 const note={noteId:crypto.randomUUID(),body:'اختبار حفظ ملاحظة <script> لا يُنفّذ كنص برمجي'};
 const notes=await Promise.all([call(url+'/notes','POST',note),call(url+'/notes','POST',note)]);assert(notes.every(r=>r.status===201));
 r=await call(url);assert.equal(r.b.workspace.notes.length,1);assert.equal(r.b.workspace.notes[0].body,note.body);assert.equal(r.b.workspace.notes[0].actor,'seedy@sites.test');assert.equal(r.b.workspace.events.filter(e=>e.action==='إضافة ملاحظة داخلية').length,1);
 assert.equal((await call(url+'/notes','POST',{...note,body:'changed'})).status,409);
 assert.equal((await call(url+'/notes','POST',{noteId:crypto.randomUUID(),body:'  '})).status,400);
 assert.equal((await call(url+'/notes','POST',{noteId:crypto.randomUUID(),body:'x'.repeat(3001)})).status,400);
 assert.equal((await fetch(origin+url+'/notes',{method:'POST',headers:{...headers,'sec-fetch-site':'cross-site'},body:JSON.stringify(note)})).status,403);
 assert.equal((await fetch(origin+url)).status,401);
 const detail=await fetch(origin+'/requests/'+id,{headers});assert.equal(detail.status,200);
 for(const route of ['/requests','/operations','/organizations','/services','/suppliers','/admin'])assert.equal((await fetch(origin+route,{headers})).status,200,route);
 console.log('PASS: active operations staff only, stable assignment ID, stale/concurrent edit guard, required escalation/info reason, no direct execution bypass, persisted notes, idempotent note retries, actual audit, auth/cross-site guards, request detail and other section responses.');
}finally{if(seeded){const r=await call('/api/requests/'+id);assert.equal(r.b.request.summary,tag);sql([`DELETE FROM request_notes WHERE request_id=${lit(id)}`,`DELETE FROM request_assignments WHERE request_id=${lit(id)}`,`DELETE FROM audit_events WHERE request_id=${lit(id)}`,`DELETE FROM requests WHERE id=${lit(id)}`,...staffIds.map((s,i)=>`DELETE FROM internal_staff WHERE id=${lit(s)} AND name=${lit(tag+'-'+i)}`)]);console.log('Only verified local fixtures removed; existing data preserved.')}}
