import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';
function load(file,mocks={}){const path=process.cwd()+'/'+file,m=new Module(path);m.paths=Module._nodeModulePaths(process.cwd());const original=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:original(id);m._compile(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,path);return m.exports}
const {allowedStaffRoute:allowed,staffRoles}=load('lib/staff-access.ts');
for(const role of staffRoles)assert.equal(allowed(role,'/operations','GET'),true);
assert.equal(allowed('محاسبة','/api/requests','GET'),false);
assert.equal(allowed('محاسبة','/requests','GET'),false);
assert.equal(allowed('محاسبة','/operations','POST'),false);
assert.equal(allowed('قراءة فقط','/api/requests/x','PATCH'),false);
assert.equal(allowed('عمليات','/api/requests/x','PATCH'),true);
assert.equal(allowed('invalid','/operations','GET'),false);
let role='محاسبة',owner=false,reads=0;
const page=load('app/operations/page.tsx',{
 '@/components/app-shell':{AppShell:()=>null},'@/components/operations-center':{OperationsCenter:()=>null},'@/components/safe-link':{default:()=>null},
 'next/headers':{headers:async()=>new Headers({'oai-authenticated-user-email':'test@example.test'})},
 '@/db/contract-template':{templateOwner:async()=>owner?'owner@example.test':null},'@/db/staff':{findStaff:async()=>({role,status:'نشط'})},
 '@/db/requests':{listRequests:async()=>{reads++;return []}},'cloudflare:workers':{env:{DB:{prepare:()=>{reads++;return {bind:()=>({all:async()=>({results:[]})})}}}}},
});
const accountant=await page.default();assert.equal(accountant.props.title,'مركز العمليات');assert.equal(reads,0,'Accountant must not fetch operations records');
role='عمليات';await page.default();assert.equal(reads,2);
owner=true;reads=0;await page.default();assert.equal(reads,2);
const home=load('app/page.tsx',{'next/headers':{headers:async()=>new Headers()},'next/navigation':{redirect:target=>{throw Error(target)}}});await assert.rejects(home.default(),{message:'/operations'});
const nav=readFileSync('components/app-shell.tsx','utf8');assert(!nav.includes("label:'الرئيسية'"));assert(nav.includes('href="/operations" aria-label="خبراء الرحلات — مركز العمليات"'));
console.log('PASS: operations landing, removed duplicate navigation, logo target, all supported roles entry, accountant data isolation, unchanged request/API write restrictions.');
