import {AppShell} from '@/components/app-shell';
import {ContractTemplateEditor} from '@/components/contract-template-editor';
import {getContractTemplate,templateHistory,templateOwner} from '@/db/contract-template';
import {getProviderProfile} from '@/db/provider';
export const dynamic='force-dynamic';
export default async function Page(){if(!await templateOwner())return <p className="p-8">تحرير قالب العقد متاح لمالك النظام فقط.</p>;const [initial,provider,history]=await Promise.all([getContractTemplate(),getProviderProfile(),templateHistory()]);return <AppShell title="قالب العقد" subtitle="تحرير ومعاينة القالب المعتمد لإنشاء العقود الجديدة فقط"><ContractTemplateEditor initial={initial} provider={provider} initialHistory={history}/></AppShell>;}
