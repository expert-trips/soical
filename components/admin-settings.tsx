'use client';
import {SupplierCatalogPanel} from './supplier-catalog-panel';
import {CommunicationSettingsPanel} from '@/components/communication-settings';
import {useState} from 'react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {ProviderSettings,type ProviderGroup} from '@/components/provider-settings';
import {ContractTemplateEditor} from '@/components/contract-template-editor';
import {StaffSettings} from '@/components/staff-settings';
import type {ProviderProfile} from '@/db/provider';
import type {ContractTemplate} from '@/lib/contract-template';
export function AdminSettings({initial,template,history,initialTab}:{initial:ProviderProfile;template:{revision:number;template:ContractTemplate};history:{revision:number;actor:string;created_at:string}[];initialTab:string}){const [provider,setProvider]=useState(initial),[tab,setTab]=useState(initialTab);const tabs=[['identity','بيانات المنشأة'],['bank','البيانات البنكية'],['commercial','الشروط التجارية'],['support','العمل والتواصل'],['contracts','بنود العقد'],['staff','الموظفون والصلاحيات'],['integrations','التكاملات وAPI'],['notifications','الرسائل والإشعارات']];return <Tabs value={tab} onValueChange={v=>setTab(String(v))}><TabsList className="mb-5 flex h-auto flex-wrap justify-start gap-2 rounded-xl border bg-white p-2">{tabs.map(([id,label])=><TabsTrigger key={id} value={id} className="px-4 py-3">{label}</TabsTrigger>)}</TabsList>{tabs.slice(0,4).map(([id])=><TabsContent key={id} value={id} keepMounted><ProviderSettings initial={provider} group={id as ProviderGroup} onSaved={setProvider}/></TabsContent>)}<TabsContent value="contracts" keepMounted><ContractTemplateEditor initial={template} provider={provider} initialHistory={history}/></TabsContent><TabsContent value="staff" keepMounted><StaffSettings/></TabsContent><TabsContent value="integrations">{tab==='integrations'&&<><CommunicationSettingsPanel section="integrations"/><SupplierCatalogPanel mode="connections" canEdit={true}/></>}</TabsContent><TabsContent value="notifications">{tab==='notifications'&&<CommunicationSettingsPanel section="notifications"/>}</TabsContent></Tabs>;}
