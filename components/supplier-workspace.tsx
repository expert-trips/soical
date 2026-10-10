'use client';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {SupplierCatalogPanel} from './supplier-catalog-panel';
export function SupplierWorkspace({canEdit}:{canEdit:boolean}){return <Tabs defaultValue="suppliers"><TabsList className="mb-4 h-auto flex-wrap gap-2 bg-transparent"><TabsTrigger value="suppliers" className="rounded-lg border bg-white px-4 py-3">الموردون</TabsTrigger><TabsTrigger value="offerings" className="rounded-lg border bg-white px-4 py-3">كتالوج الخدمات والأسعار</TabsTrigger></TabsList><TabsContent value="suppliers"><SupplierCatalogPanel mode="suppliers" canEdit={canEdit}/></TabsContent><TabsContent value="offerings"><SupplierCatalogPanel mode="offerings" canEdit={canEdit}/></TabsContent></Tabs>;}
