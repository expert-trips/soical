import {AppShell} from '@/components/app-shell';
import {AdminSettings} from '@/components/admin-settings';
import {getProviderProfile} from '@/db/provider';
import {getContractTemplate,templateHistory,templateOwner} from '@/db/contract-template';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{tab?:string}>}){if(!await templateOwner())return <p className="p-8">الإعدادات متاحة لمالك النظام فقط.</p>;const [{tab},initial,template,history]=await Promise.all([searchParams,getProviderProfile(),getContractTemplate(),templateHistory()]);return <AppShell title="الإدارة والإعدادات" subtitle="بيانات المنشأة والعقود والموظفون والتكاملات والإشعارات"><AdminSettings initial={initial} template={template} history={history} initialTab={['identity','bank','commercial','support','contracts','staff','integrations','notifications'].includes(tab||'')?tab!:'identity'}/></AppShell>;}
