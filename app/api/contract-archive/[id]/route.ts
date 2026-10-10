import {headers} from 'next/headers';
import {findArchive,readArchiveFile} from '@/db/contract-archive';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const h=await headers();if(!h.get('oai-authenticated-user-id'))return new Response(null,{status:401});
 const {id}=await params,row=await findArchive(id);if(!row)return new Response(null,{status:404});
 const object=await readArchiveFile(row);if(!object)return new Response(null,{status:404});
 const bytes=await object.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);const hash=Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==row.sha256)return Response.json({error:'archive_integrity_error'},{status:409});
 const disposition=new URL(req.url).searchParams.get('download')==='1'?'attachment':'inline';
 return new Response(bytes,{headers:{'content-type':'text/html; charset=utf-8','content-disposition':disposition+'; filename="contract-'+id+'.html"','cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"}});
}
