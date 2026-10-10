import {RequestServiceSnapshot} from '@/components/request-service-snapshot';
import {RequestWorkspace} from '@/components/request-workspace';
import {AppShell} from '@/components/app-shell';
import {notFound} from 'next/navigation';
import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {findRequest,type BookingRecord} from '@/db/requests';
import {requestWorkspace,requestAssignees} from '@/db/request-workspace';
import {templateOwner} from '@/db/contract-template';
import {findStaff} from '@/db/staff';
export const dynamic='force-dynamic';
export default async function RequestDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params,r=await findRequest(id);if(!r)notFound();
 const [workspace,assignees,booking,owner,h]=await Promise.all([requestWorkspace(id),requestAssignees(),env.DB.prepare('SELECT * FROM bookings WHERE request_id=?').bind(id).first<BookingRecord>(),templateOwner(),headers()]);
 const staff=owner?null:await findStaff(h.get('oai-authenticated-user-email')||'');
 return <AppShell title="ملف الطلب والحجز" subtitle={r.company+' · '+r.service}><RequestWorkspace initial={r} initialWorkspace={workspace} assignees={assignees} initialBooking={booking} canEdit={!!owner||staff?.status==='نشط'&&staff.role==='عمليات'} requirements={<RequestServiceSnapshot id={id}/>}/></AppShell>;
}
