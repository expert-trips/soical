import {headers} from 'next/headers';
import {getProviderProfile,saveProviderProfile} from '@/db/provider';
import {providerFields} from '@/lib/provider-identity';
export async function GET(){return Response.json({profile:await getProviderProfile()})}
export async function PUT(req:Request){
 const h=await headers();if(!h.get('oai-authenticated-user-id'))return new Response(null,{status:401});
 if(req.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403});
 let b:Record<string,unknown>;try{b=await req.json()}catch{return new Response(null,{status:400})}
 if(!b||typeof b!=='object'||Array.isArray(b))return new Response(null,{status:400});
 const next=await getProviderProfile();
 for(const [key] of providerFields){
  if(key==='termination_notice_days')continue;
  if(b[key]!==undefined){if(typeof b[key]!=='string'||b[key].length>500)return new Response(null,{status:400});next[key]=b[key].trim()}
  if(!['dispute_city','work_hours','emergency_phone'].includes(key)&&!next[key])return Response.json({error:'missing_fields'},{status:400});
 }
 next.iban=next.iban.replace(/\s/g,'').toUpperCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)||!/^SA\d{22}$/.test(next.iban)||!/^\d{15}$/.test(next.vat_number)||!/^\d{10}$/.test(next.commercial_registration)||!/^\d{5}$/.test(next.postal_code)||!/^\d{4}$/.test(next.building_number)||!/^\d{4}$/.test(next.additional_number))return Response.json({error:'invalid_fields'},{status:400});
 try{if(!['http:','https:'].includes(new URL(next.website).protocol))throw new Error()}catch{return new Response(null,{status:400})}
 const days=Number(b.termination_notice_days??next.termination_notice_days);if(!Number.isInteger(days)||days<1||days>365)return new Response(null,{status:400});
 next.termination_notice_days=days;
 return Response.json({profile:await saveProviderProfile(next)});
}
