import {AppShell} from '@/components/app-shell';
import {ProjectsWorkspace} from '@/components/projects-workspace';
import {listProjects} from '@/db/projects';
import {listOrganizations} from '@/db/organizations';
import {headers} from 'next/headers';
export const dynamic='force-dynamic';
export default async function ProjectsPage(){const h=await headers();if(!h.get('oai-authenticated-user-id'))return <AppShell title="المشاريع والوفود" subtitle="يلزم تسجيل الدخول لعرض البيانات"><p className="rounded-xl bg-white p-6">سجّل الدخول للوصول إلى سجل المشاريع.</p></AppShell>;const [projects,organizations]=await Promise.all([listProjects(),listOrganizations()]);return <AppShell title="المشاريع والوفود" subtitle="تجميع احتياجات الوفود والرحلات الجماعية ومتابعة طلبات عروض الأسعار"><ProjectsWorkspace initialProjects={projects} organizations={organizations.map(o=>({id:o.id,name:o.legal_name}))}/></AppShell>}
