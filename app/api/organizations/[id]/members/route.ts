import {headers} from 'next/headers';
import {createOrganizationMember,findOrganization,listOrganizationMembers} from '@/db/organizations';
import {flag} from '@/lib/organization-fields';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!await findOrganization(id))return new Response(null,{status:404});return Response.json({members:await listOrganizationMembers(id)})}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const h=await headers();if(!h.get('oai-authenticated-user-id'))return new Response(null,{status:401});
 if(req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 const {id}=await params;if(!await findOrganization(id))return new Response(null,{status:404});
 let b:Record<string,unknown>;try{b=await req.json()}catch{return new Response(null,{status:400})}
 if(!b||typeof b!=='object'||Array.isArray(b)||typeof b.name!=='string'||!b.name.trim()||b.name.length>200||typeof b.email!=='string'||!/^\S+@[^\s@]+\.[^\s@]+$/.test(b.email.trim())||!['مدير حساب الشركة','معتمد طلبات','موظف'].includes(String(b.role)))return new Response(null,{status:400});
 try{const member=await createOrganizationMember(id,{name:b.name.trim(),email:b.email.trim(),role:String(b.role),can_add_members:flag(b.can_add_members)},h.get('oai-authenticated-user-email')||'مستخدم داخلي');return Response.json({member,members:await listOrganizationMembers(id)},{status:201})}
 catch(error){if(String(error).includes('UNIQUE constraint'))return Response.json({error:'duplicate_email'},{status:409});throw error}
}
