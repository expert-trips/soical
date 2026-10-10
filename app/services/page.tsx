import {AppShell} from '@/components/app-shell';
import {ServiceManagement} from '@/components/service-management';
import {getServiceCatalog,catalogHistory} from '@/db/service-catalog';
import {templateOwner} from '@/db/contract-template';
import {headers} from 'next/headers';
import {findStaff} from '@/db/staff';
export const dynamic='force-dynamic';
export default async function ServicesPage({searchParams}:{searchParams:Promise<{requestId?:string;tab?:string}>}){const {requestId,tab}=await searchParams;const [initial,history,owner,h]=await Promise.all([getServiceCatalog(),catalogHistory(),templateOwner(),headers()]);const staff=owner?null:await findStaff(h.get('oai-authenticated-user-email')||'');return <AppShell title="الخدمات والتسعير" subtitle="إدارة الخدمات وشروطها، وتسعير العروض بإصدارات محفوظة."><ServiceManagement initialTab={['services','inventory','presets','lab','quotes','history'].includes(tab||'')?tab:'services'} initialRequestId={typeof requestId==='string'?requestId:''} initial={initial} initialHistory={history} canEdit={!!owner} canQuote={!!owner||staff?.role==='عمليات'}/></AppShell>;}
