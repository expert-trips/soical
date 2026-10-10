import { AppShell } from '@/components/app-shell';import { OrganizationsCenter } from '@/components/organizations-center';import { listOrganizations } from '@/db/organizations';
export const dynamic='force-dynamic';
export default async function Page(){return <AppShell title="الشركات والعقود" subtitle="إدارة العلاقة التعاقدية والائتمانية وسياسات السفر للشركات"><OrganizationsCenter initial={await listOrganizations()}/></AppShell>}
