import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { OrganizationDetail } from '@/components/organization-detail';
import {
  findOrganization,
  findOrganizationContract,
  listOrganizationAudit,
  listOrganizationMembers,
} from '@/db/organizations';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await findOrganization(id);
  if (!organization) notFound();
  return (
    <AppShell
      title={organization.display_name}
      subtitle="ملف الشركة والعقد وسياسة السفر"
    >
      <OrganizationDetail
        initial={organization}
        hasContract={!!(await findOrganizationContract(id))}
        initialAudit={await listOrganizationAudit(id)}
        initialMembers={await listOrganizationMembers(id)}
      />
    </AppShell>
  );
}
