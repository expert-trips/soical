import {headers} from 'next/headers';
import {templateOwner} from '@/db/contract-template';
import {findStaff} from '@/db/staff';
export async function GET(){const h=await headers();if(await templateOwner())return Response.json({role:'مالك',name:'خالد',email:h.get('oai-authenticated-user-email')},{headers:{'cache-control':'no-store'}});const s=await findStaff(h.get('oai-authenticated-user-email')||'');if(!s||s.status!=='نشط')return new Response(null,{status:403});return Response.json({role:s.role,name:s.name,email:s.email},{headers:{'cache-control':'no-store'}});}
