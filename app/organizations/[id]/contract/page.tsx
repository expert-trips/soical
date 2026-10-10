import { notFound } from 'next/navigation';
import {
  findOrganization,
  findOrganizationContract,
  findOrganizationProfile,
} from '@/db/organizations';
import { ContractDocument } from '@/components/contract-document';
import { getProviderProfile } from '@/db/provider';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [organization, profile, contract, provider] = await Promise.all([
    findOrganization(id),
    findOrganizationProfile(id),
    findOrganizationContract(id),
    getProviderProfile(),
  ]);
  if (!organization || !profile || !contract) notFound();
  return (
    <ContractDocument
      organization={organization}
      profile={profile}
      contract={contract}
      provider={provider}
    />
  );
}
