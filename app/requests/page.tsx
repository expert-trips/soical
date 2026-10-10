import {AppShell} from '@/components/app-shell';
import {RequestsBookingsCenter} from '@/components/requests-bookings-center';
import {ServiceRequestForm} from '@/components/service-request-form';
import {listBookings,listRequests} from '@/db/requests';
import {getServiceCatalog} from '@/db/service-catalog';
import {listOrganizations} from '@/db/organizations';
import {templateOwner} from '@/db/contract-template';
import {headers} from 'next/headers';
import {findStaff} from '@/db/staff';
import {parseOperationQueue} from '@/lib/operation-queues';
export const dynamic='force-dynamic';
export default async function RequestsPage({searchParams}:{searchParams:Promise<{q?:string;queue?:string|string[]}>}){const [requests,bookings,{q='',queue:rawQueue},catalog,companies,owner,h]=await Promise.all([listRequests(),listBookings(),searchParams,getServiceCatalog(),listOrganizations(),templateOwner(),headers()]);const queue=parseOperationQueue(rawQueue);const staff=owner?null:await findStaff(h.get('oai-authenticated-user-email')||'');return <AppShell title="الطلبات والحجوزات" subtitle="السجل الشامل لدورة الطلب والتنفيذ والحجز">{(owner||staff?.role==='عمليات')&&<ServiceRequestForm catalog={catalog} companies={companies}/>}<RequestsBookingsCenter key={queue||'all'} queue={queue} initialRequests={requests} initialBookings={bookings} initialQuery={q} canEdit={!!owner||staff?.role==='عمليات'}/></AppShell>}
