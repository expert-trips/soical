import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {findOrganization,findOrganizationProfile,findOrganizationContract} from '@/db/organizations';
import {listArchives,prepareArchive} from '@/db/contract-archive';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const h=await headers();if(!h.get('oai-authenticated-user-id'))return new Response(null,{status:401});const {id}=await params;return Response.json({archives:await listArchives(id)})}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const h=await headers();if(!h.get('oai-authenticated-user-id'))return new Response(null,{status:401});if(req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 const {id}=await params,[o,p,c]=await Promise.all([findOrganization(id),findOrganizationProfile(id),findOrganizationContract(id)]);
 if(!o||!p||!c)return new Response(null,{status:404});
 const actor=h.get('oai-authenticated-user-email')||'مستخدم داخلي',archive=await prepareArchive(o,p,c,actor);
 await env.DB.batch([archive.statement,env.DB.prepare('INSERT INTO organization_audit(organization_id,action,details,actor,created_at) VALUES(?,?,?,?,?)').bind(id,'أرشفة عقد','حفظ نسخة ثابتة من العقد '+c.contract_number,actor,new Date().toISOString())]);
 return Response.json({archives:await listArchives(id)},{status:201});
}
