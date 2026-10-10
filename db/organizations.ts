import {getContractTemplate} from './contract-template';
import {getProviderProfile} from './provider';
import type {ContractTemplate} from '@/lib/contract-template';
import type {ProviderProfile} from './provider';
import { env } from 'cloudflare:workers';
import { ensureDatabase } from './requests';
import {allocateNumber,prepareArchive,listArchives} from './contract-archive';

export type Organization = {
  id: string;
  legal_name: string;
  display_name: string;
  reference: string;
  sector: string;
  contact_name: string;
  contact_email: string;
  account_manager: string;
  status: string;
  contract_status: string;
  contract_version: string;
  contract_start: string;
  contract_end: string;
  payment_terms: string;
  currency: string;
  credit_limit: number;
  credit_used: number;
  sla_hours: number;
  direct_booking_allowed: number;
  approval_required: number;
  approval_role: string;
  price_boundary: number | null;
  permitted_services: string;
  created_at: string;
  updated_at: string;
  open_requests: number;
  billing_model?: string;
};
export type OrganizationAudit = {
  id: number;
  organization_id: string;
  action: string;
  details: string;
  actor: string;
  created_at: string;
};
export type OrganizationMember = {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  can_add_members: number;
  created_at: string;
  updated_at: string;
};
export type OrganizationProfile = {
  organization_id: string;
  contact_phone: string;
  address: string;
  vat_number: string;
  authorized_signatory: string;
  signatory_title: string;
  created_at: string;
  updated_at: string;
};
export type OrganizationContract = {
  id: string;
  organization_id: string;
  contract_number: string;
  status: string;
  snapshot: string;
  generated_at: string;
  updated_at: string;
};
export type OnboardingProfile = {
    contact_phone: string;
    address: string;
    vat_number: string;
    authorized_signatory: string;
    signatory_title: string;
    billing_model:string;prepaid_balance:number;promissory_note_number:string;promissory_note_amount:number;promissory_note_issue_date:string;promissory_note_due_date:string;promissory_note_platform_ref:string;
  };

export type OrganizationInput = Omit<
  Organization,
  'open_requests' | 'created_at' | 'updated_at' | 'id'
>;

export async function listOrganizations() {
  await ensureDatabase();
  const r = await env.DB.prepare(
    "SELECT o.*, (SELECT json_extract(c.snapshot, '$.billing_model') FROM organization_contracts c WHERE c.organization_id=o.id) AS billing_model, (SELECT COUNT(*) FROM requests r WHERE r.company=o.display_name AND r.status NOT IN ('مكتمل','مرفوض')) AS open_requests FROM organizations o ORDER BY o.updated_at DESC",
  ).all<Organization>();
  return r.results;
}
export async function findOrganization(id: string) {
  await ensureDatabase();
  return env.DB.prepare(
    "SELECT o.*, (SELECT json_extract(c.snapshot, '$.billing_model') FROM organization_contracts c WHERE c.organization_id=o.id) AS billing_model, (SELECT COUNT(*) FROM requests r WHERE r.company=o.display_name AND r.status NOT IN ('مكتمل','مرفوض')) AS open_requests FROM organizations o WHERE o.id=?",
  )
    .bind(id)
    .first<Organization>();
}
export async function listOrganizationAudit(id: string) {
  await ensureDatabase();
  const r = await env.DB.prepare(
    'SELECT * FROM organization_audit WHERE organization_id=? ORDER BY created_at DESC, id DESC',
  )
    .bind(id)
    .all<OrganizationAudit>();
  return r.results;
}
export async function createOrganization(
  input: OrganizationInput,
  actor: string,
  profile?: OnboardingProfile,
  createPortalUser=false,
) {
  await ensureDatabase();
  const id = await allocateNumber('client'), now = new Date().toISOString();
  input={...input,contract_version:await allocateNumber('contract')};
  const statements = [
    env.DB.prepare(
      'INSERT INTO organizations (id,legal_name,display_name,reference,sector,contact_name,contact_email,account_manager,status,contract_status,contract_version,contract_start,contract_end,payment_terms,currency,credit_limit,credit_used,sla_hours,direct_booking_allowed,approval_required,approval_role,price_boundary,permitted_services,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    ).bind(
      id,
      input.legal_name,
      input.display_name,
      input.reference,
      input.sector,
      input.contact_name,
      input.contact_email,
      input.account_manager,
      input.status,
      input.contract_status,
      input.contract_version,
      input.contract_start,
      input.contract_end,
      input.payment_terms,
      input.currency,
      input.credit_limit,
      input.credit_used,
      input.sla_hours,
      input.direct_booking_allowed,
      input.approval_required,
      input.approval_role,
      input.price_boundary,
      input.permitted_services,
      now,
      now,
    ),
    env.DB.prepare(
      'INSERT INTO organization_audit (organization_id,action,details,actor,created_at) VALUES (?,?,?,?,?)',
    ).bind(
      id,
      'إنشاء شركة',
      'إنشاء ملف الشركة والعقد وسياسة السفر',
      actor,
      now,
    ),
  ];
  if(profile){
    const org={...input,id,created_at:now,updated_at:now,open_requests:0};
    const activeTemplate=await getContractTemplate();
    const settings={contract_template:activeTemplate.template,template_revision:activeTemplate.revision,provider_snapshot:await getProviderProfile()};
    statements.push(...onboardingStatements(org,profile,actor,settings));
    const p={...profile,organization_id:id,created_at:now,updated_at:now};
    const c={id:'CON-'+id,organization_id:id,contract_number:input.contract_version,status:'مسودة تحتاج مراجعة واعتماد',snapshot:JSON.stringify({...profile,...settings}),generated_at:now,updated_at:now};
    statements.push((await prepareArchive(org,p,c,actor)).statement);
    if(createPortalUser)statements.push(env.DB.prepare('INSERT INTO organization_members (id,organization_id,name,email,role,status,can_add_members,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind('MEM-'+crypto.randomUUID(),id,input.contact_name,input.contact_email.toLowerCase(),'مدير حساب الشركة','بانتظار تفعيل الدخول',1,now,now));
  }
  await env.DB.batch(statements);
  return findOrganization(id);
}
export async function updateOrganization(
  id: string,
  input: OrganizationInput,
  actor: string,
  section: string,
) {
  await ensureDatabase();
  const now = new Date().toISOString();
  const existing = await findOrganization(id);
  if (!existing) return null;
  const archiveStatements:D1PreparedStatement[]=[];
  const p=await findOrganizationProfile(id),c=await findOrganizationContract(id);
  if(p&&c){
    if(!(await listArchives(id)).length)archiveStatements.push((await prepareArchive(existing,p,c,actor)).statement);
    archiveStatements.push((await prepareArchive({...existing,...input},p,c,actor)).statement);
  }
  await env.DB.batch([
    ...archiveStatements,
    env.DB.prepare("UPDATE organization_contracts SET contract_number=?,updated_at=? WHERE organization_id=? AND status='مسودة تحتاج مراجعة واعتماد' AND ? != ?").bind(input.contract_version,now,id,input.contract_version,existing.contract_version),
    env.DB.prepare(
      'UPDATE organizations SET legal_name=?,display_name=?,reference=?,sector=?,contact_name=?,contact_email=?,account_manager=?,status=?,contract_status=?,contract_version=?,contract_start=?,contract_end=?,payment_terms=?,currency=?,credit_limit=?,credit_used=?,sla_hours=?,direct_booking_allowed=?,approval_required=?,approval_role=?,price_boundary=?,permitted_services=?,updated_at=? WHERE id=?',
    ).bind(
      input.legal_name,
      input.display_name,
      input.reference,
      input.sector,
      input.contact_name,
      input.contact_email,
      input.account_manager,
      input.status,
      input.contract_status,
      input.contract_version,
      input.contract_start,
      input.contract_end,
      input.payment_terms,
      input.currency,
      input.credit_limit,
      input.credit_used,
      input.sla_hours,
      input.direct_booking_allowed,
      input.approval_required,
      input.approval_role,
      input.price_boundary,
      input.permitted_services,
      now,
      id,
    ),
    env.DB.prepare(
      'INSERT INTO organization_audit (organization_id,action,details,actor,created_at) VALUES (?,?,?,?,?)',
    ).bind(id, 'تحديث ' + section, `تم حفظ تغييرات ${section}`, actor, now),
  ]);
  return findOrganization(id);
}
export async function listOrganizationMembers(organizationId: string) {
  await ensureDatabase();
  const r = await env.DB.prepare(
    'SELECT * FROM organization_members WHERE organization_id=? ORDER BY created_at DESC',
  )
    .bind(organizationId)
    .all<OrganizationMember>();
  return r.results;
}
export async function createOrganizationMember(
  organizationId: string,
  input: {
    name: string;
    email: string;
    role: string;
    can_add_members: boolean;
  },
  actor: string,
) {
  await ensureDatabase();
  const id = `MEM-${crypto.randomUUID()}`,
    now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO organization_members (id,organization_id,name,email,role,status,can_add_members,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
    ).bind(
      id,
      organizationId,
      input.name,
      input.email.toLowerCase(),
      input.role,
      'بانتظار تفعيل الدخول',
      input.can_add_members ? 1 : 0,
      now,
      now,
    ),
    env.DB.prepare(
      'INSERT INTO organization_audit (organization_id,action,details,actor,created_at) VALUES (?,?,?,?,?)',
    ).bind(
      organizationId,
      'إضافة مستخدم شركة',
      `إضافة ${input.name} بدور ${input.role} — بانتظار تفعيل الدخول`,
      actor,
      now,
    ),
  ]);
  return env.DB.prepare('SELECT * FROM organization_members WHERE id=?')
    .bind(id)
    .first<OrganizationMember>();
}
function onboardingStatements(
  organization: Organization,
  profile: OnboardingProfile,
  actor: string,
  settings:{contract_template:ContractTemplate;template_revision:number;provider_snapshot:ProviderProfile},
) {
  const now = new Date().toISOString(),
    contractNumber = organization.contract_version;
  const snapshot = JSON.stringify({
    ...settings,
    legalName: organization.legal_name,
    reference: organization.reference,
    sector: organization.sector,
    contactName: organization.contact_name,
    contactEmail: organization.contact_email,
    ...profile,
    accountManager: organization.account_manager,
    contractStart: organization.contract_start,
    contractEnd: organization.contract_end,
    paymentTerms: organization.payment_terms,
    creditLimit: organization.credit_limit,
    currency: 'SAR',
    slaHours: organization.sla_hours,
    approvalRole: organization.approval_role,
    services: JSON.parse(organization.permitted_services),
    directBookingAllowed: !!organization.direct_booking_allowed,
    approvalRequired: !!organization.approval_required,
  });
  return [
    env.DB.prepare(
      'INSERT OR REPLACE INTO organization_profiles (organization_id,contact_phone,address,vat_number,authorized_signatory,signatory_title,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
    ).bind(
      organization.id,
      profile.contact_phone,
      profile.address,
      profile.vat_number,
      profile.authorized_signatory,
      profile.signatory_title,
      now,
      now,
    ),
    env.DB.prepare(
      'INSERT OR REPLACE INTO organization_contracts (id,organization_id,contract_number,status,snapshot,generated_at,updated_at) VALUES (?,?,?,?,?,?,?)',
    ).bind(
      `CON-${organization.id}`,
      organization.id,
      contractNumber,
      'مسودة تحتاج مراجعة واعتماد',
      snapshot,
      now,
      now,
    ),
    env.DB.prepare(
      'INSERT INTO organization_audit (organization_id,action,details,actor,created_at) VALUES (?,?,?,?,?)',
    ).bind(
      organization.id,
      'إنشاء مسودة العقد',
      `توليد المسودة ${contractNumber} من بيانات التسجيل`,
      actor,
      now,
    ),
  ];
}
export async function findOrganizationProfile(id: string) {
  await ensureDatabase();
  return env.DB.prepare(
    'SELECT * FROM organization_profiles WHERE organization_id=?',
  )
    .bind(id)
    .first<OrganizationProfile>();
}
export async function findOrganizationContract(id: string) {
  await ensureDatabase();
  return env.DB.prepare(
    'SELECT * FROM organization_contracts WHERE organization_id=?',
  )
    .bind(id)
    .first<OrganizationContract>();
}
