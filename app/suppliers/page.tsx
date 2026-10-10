import {AppShell} from '@/components/app-shell';
import {SupplierWorkspace} from '@/components/supplier-workspace';
import {templateOwner} from '@/db/contract-template';
export const dynamic='force-dynamic';
export default async function Page(){return <AppShell title="الموردون وكتالوج الخدمات" subtitle="سجل موحّد للموردين وخياراتهم وأسعارهم، مستقل عن أسماء أنظمة الربط."><SupplierWorkspace canEdit={!!await templateOwner()}/></AppShell>;}
