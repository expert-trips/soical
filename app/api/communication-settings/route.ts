import {env} from 'cloudflare:workers';
import {templateOwner} from '@/db/contract-template';
import {communicationDefaults,validCommunicationSettings} from '@/lib/communication-settings';
const id='TRIPS-COMMUNICATIONS';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 if(!await templateOwner())return json({error:'غير مصرح'},403);
 const row=await env.DB.prepare('SELECT payload,updated_at FROM provider_settings WHERE id=?').bind(id).first<{payload:string;updated_at:string}>();
 return json({settings:row?JSON.parse(row.payload):communicationDefaults(),revision:row?.updated_at||'',smsStatus:'not_connected',emailStatus:'not_connected'});
}
export async function PUT(req:Request){
 if(!await templateOwner()||req.headers.get('sec-fetch-site')==='cross-site')return json({error:'غير مصرح'},403);
 const reader=req.body?.getReader();if(!reader)return json({error:'طلب غير صالح'},400);
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>20000){await reader.cancel();return json({error:'حجم البيانات أكبر من المسموح'},413)}chunks.push(value);}
 let b;try{const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length}b=JSON.parse(new TextDecoder().decode(data))}catch{return json({error:'طلب غير صالح'},400)}
 if(!b||Object.keys(b).some(k=>!['settings','revision'].includes(k))||typeof b.revision!=='string'||b.revision.length>50||!validCommunicationSettings(b.settings))return json({error:'تحقق من الحقول والمتغيرات. لا تضع مفاتيح الربط في هذه الإعدادات.'},400);
 const now=new Date().toISOString();
 const row= b.revision
 ? await env.DB.prepare('UPDATE provider_settings SET payload=?,updated_at=? WHERE id=? AND updated_at=? RETURNING updated_at').bind(JSON.stringify(b.settings),now,id,b.revision).first()
 : await env.DB.prepare('INSERT INTO provider_settings(id,payload,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING RETURNING updated_at').bind(id,JSON.stringify(b.settings),now).first();
 if(!row)return json({error:'تغيّرت الإعدادات في جلسة أخرى. أعد تحميلها قبل الحفظ.'},409);
 return json({revision:now,settings:b.settings});
}
