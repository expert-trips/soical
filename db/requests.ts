import { env } from 'cloudflare:workers';

export type TravelRequest = {
  id: string; service: string; category: string; fulfillment_model: string;
  company: string; traveler: string; destination: string; status: string;
  priority: string; assignee: string; sla_minutes: number; summary: string;
  created_at: string; updated_at: string;
};
export type BookingRecord={id:string;request_id:string;service:string;company:string;status:string;supplier_reference:string|null;connector_status:string;created_at:string;updated_at:string};

const seed: TravelRequest[] = [
  { id:'TR-1842', service:'رحلة طيران دولية', category:'طيران', fulfillment_model:'ربط مباشر', company:'شركة أفق التقنية', traveler:'موظف تجريبي ١', destination:'الرياض ← لندن', status:'قيد التسعير', priority:'عاجل', assignee:'سارة الحربي', sla_minutes:42, summary:'رحلة عمل مرنة مع حقيبة وإمكانية تعديل وفق سياسة الشركة.', created_at:'2026-09-03T06:35:00Z', updated_at:'2026-09-03T07:12:00Z' },
  { id:'TR-1841', service:'تأشيرة أعمال — ألمانيا', category:'تأشيرات', fulfillment_model:'كتالوج داخلي', company:'مجموعة روافد', traveler:'موظف تجريبي ٢', destination:'ألمانيا', status:'نقص معلومات', priority:'مرتفع', assignee:'محمد الغامدي', sla_minutes:80, summary:'تأشيرة أعمال قصيرة مع موعد سفارة مستهدف خلال أسبوعين.', created_at:'2026-09-03T05:50:00Z', updated_at:'2026-09-03T06:50:00Z' },
  { id:'TR-1839', service:'وفد تنفيذي — دبي', category:'وفود ومشروعات', fulfillment_model:'مشروع مخصص', company:'مصانع المدار', traveler:'وفد تجريبي من ١٢ شخصاً', destination:'دبي', status:'إعداد عرض', priority:'مرتفع', assignee:'نورة القحطاني', sla_minutes:190, summary:'برنامج تنفيذي لثلاثة أيام يشمل النقل والإقامة والاجتماعات والاستقبال.', created_at:'2026-09-02T14:20:00Z', updated_at:'2026-09-03T06:20:00Z' },
  { id:'TR-1837', service:'استقبال VIP — مطار الرياض', category:'استقبال وتوديع', fulfillment_model:'كتالوج داخلي', company:'شركة نبراس', traveler:'ضيف تجريبي', destination:'مطار الملك خالد', status:'تأكيد المورد', priority:'عادي', assignee:'خالد العتيبي', sla_minutes:360, summary:'استقبال عند بوابة الوصول ومرافقة حتى المركبة.', created_at:'2026-09-02T11:00:00Z', updated_at:'2026-09-03T05:40:00Z' },
  { id:'TR-1835', service:'قطار الرياض — الهفوف', category:'قطارات', fulfillment_model:'ربط مباشر', company:'شركة نواة', traveler:'موظف تجريبي ٣', destination:'الهفوف', status:'جديد', priority:'عادي', assignee:'غير مسند', sla_minutes:510, summary:'رحلة يوم واحد لحضور اجتماع عمل.', created_at:'2026-09-03T07:30:00Z', updated_at:'2026-09-03T07:30:00Z' },
  { id:'TR-1832', service:'رحلة جماعية ترفيهية — العلا', category:'رحلات جماعية', fulfillment_model:'مشروع مخصص', company:'مجموعة إبداع', traveler:'مجموعة تجريبية من ٢٤ شخصاً', destination:'العلا', status:'بانتظار الموافقة', priority:'عادي', assignee:'نورة القحطاني', sla_minutes:720, summary:'برنامج تحفيزي شامل الطيران والإقامة والفعاليات والنقل.', created_at:'2026-09-01T09:15:00Z', updated_at:'2026-09-02T15:10:00Z' },
];

let ready = false;
export async function ensureDatabase() {
  if (ready) return;
  const db = env.DB;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, service TEXT NOT NULL, category TEXT NOT NULL, fulfillment_model TEXT NOT NULL, company TEXT NOT NULL, traveler TEXT NOT NULL, destination TEXT NOT NULL, status TEXT NOT NULL, priority TEXT NOT NULL, assignee TEXT NOT NULL, sla_minutes INTEGER NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL)'),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_requests_status_priority ON requests(status, priority)"),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_audit_request_id ON audit_events(request_id)'),
    db.prepare('CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, service TEXT NOT NULL, company TEXT NOT NULL, status TEXT NOT NULL, supplier_reference TEXT, connector_status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)'),
    db.prepare('CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, legal_name TEXT NOT NULL, display_name TEXT NOT NULL, reference TEXT NOT NULL, sector TEXT NOT NULL, contact_name TEXT NOT NULL, contact_email TEXT NOT NULL, account_manager TEXT NOT NULL, status TEXT NOT NULL, contract_status TEXT NOT NULL, contract_version TEXT NOT NULL, contract_start TEXT NOT NULL, contract_end TEXT NOT NULL, payment_terms TEXT NOT NULL, currency TEXT NOT NULL, credit_limit INTEGER NOT NULL, credit_used INTEGER NOT NULL, sla_hours INTEGER NOT NULL, direct_booking_allowed INTEGER NOT NULL, approval_required INTEGER NOT NULL, approval_role TEXT NOT NULL, price_boundary INTEGER, permitted_services TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS organization_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id TEXT NOT NULL, action TEXT NOT NULL, details TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_organizations_status_manager ON organizations(status, account_manager)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_organizations_contract_end ON organizations(contract_end)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_organization_audit_org ON organization_audit(organization_id)'),
    db.prepare('CREATE TABLE IF NOT EXISTS organization_members (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, can_add_members INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)'),
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_org_email ON organization_members(organization_id, email)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_org_members_org_status ON organization_members(organization_id, status)'),
    db.prepare('CREATE TABLE IF NOT EXISTS organization_profiles (organization_id TEXT PRIMARY KEY, contact_phone TEXT NOT NULL, address TEXT NOT NULL, vat_number TEXT NOT NULL, authorized_signatory TEXT NOT NULL, signatory_title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS organization_contracts (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL UNIQUE, contract_number TEXT NOT NULL, status TEXT NOT NULL, snapshot TEXT NOT NULL, generated_at TEXT NOT NULL, updated_at TEXT NOT NULL)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_org_contracts_status ON organization_contracts(status)'),
    db.prepare('CREATE TABLE IF NOT EXISTS provider_profile (id TEXT PRIMARY KEY, legal_name TEXT NOT NULL, commercial_registration TEXT NOT NULL, national_address TEXT NOT NULL, vat_number TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, authorized_signatory TEXT NOT NULL, signatory_title TEXT NOT NULL, iban TEXT NOT NULL, termination_notice_days INTEGER NOT NULL DEFAULT 30, dispute_city TEXT NOT NULL, updated_at TEXT NOT NULL)'),
  ]);
  const count = await db.prepare('SELECT COUNT(*) AS count FROM requests').first<{count:number}>();
  if (!count?.count) {
    await db.batch(seed.map((r) => db.prepare('INSERT INTO requests (id, service, category, fulfillment_model, company, traveler, destination, status, priority, assignee, sla_minutes, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(r.id,r.service,r.category,r.fulfillment_model,r.company,r.traveler,r.destination,r.status,r.priority,r.assignee,r.sla_minutes,r.summary,r.created_at,r.updated_at)));
    await db.prepare('PRAGMA optimize').run();
  }
  const orgCount = await db.prepare('SELECT COUNT(*) AS count FROM organizations').first<{count:number}>();
  if (!orgCount?.count) {
    const now='2026-09-05T09:00:00Z';
    const rows=[
      ['ORG-1001','شركة أفق التقنية المحدودة','شركة أفق التقنية','CR-DEMO-1001','تقنية','ليان السالم','demo-contact-1@example.test','سارة الحربي','نشطة','ساري','V1.2','2026-01-01','2027-01-01','30 يوماً','SAR',300000,118000,4,1,1,'مدير الإدارة',25000,JSON.stringify(['طيران','فندق','نقل'])],
      ['ORG-1002','مجموعة روافد القابضة','مجموعة روافد','CR-DEMO-1002','استثمار','تركي العتيبي','demo-contact-2@example.test','محمد الغامدي','نشطة','قيد المراجعة','V2.0','2025-10-01','2026-10-10','45 يوماً','SAR',450000,386000,2,0,1,'المدير المالي',null,JSON.stringify(['طيران','فندق','تأشيرات','وفود ومشروعات'])],
      ['ORG-1003','مصانع المدار للصناعة','مصانع المدار','CR-DEMO-1003','صناعة','نجلاء الشهراني','demo-contact-3@example.test','نورة القحطاني','معلقة','ساري','V1.0','2026-03-01','2027-03-01','30 يوماً','SAR',180000,167000,6,0,1,'مدير السفر',15000,JSON.stringify(['طيران','فندق','نقل','وفود ومشروعات'])],
      ['ORG-1004','شركة نبراس للخدمات','شركة نبراس','CR-DEMO-1004','خدمات','مازن الدوسري','demo-contact-4@example.test','خالد العتيبي','نشطة','ساري','V1.1','2026-02-01','2027-02-01','15 يوماً','SAR',120000,34000,4,1,0,'مدير الإدارة',20000,JSON.stringify(['طيران','فندق','استقبال وتوديع'])]
    ];
    await db.batch(rows.map(r=>db.prepare('INSERT INTO organizations (id,legal_name,display_name,reference,sector,contact_name,contact_email,account_manager,status,contract_status,contract_version,contract_start,contract_end,payment_terms,currency,credit_limit,credit_used,sla_hours,direct_booking_allowed,approval_required,approval_role,price_boundary,permitted_services,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...r,now,now)));
  }
  ready = true;
}

export async function listRequests() { await ensureDatabase(); const result = await env.DB.prepare('SELECT * FROM requests ORDER BY CASE priority WHEN \'عاجل\' THEN 1 WHEN \'مرتفع\' THEN 2 ELSE 3 END, sla_minutes ASC').all<TravelRequest>(); return result.results; }
export async function findRequest(id:string) { await ensureDatabase(); return env.DB.prepare('SELECT * FROM requests WHERE id = ?').bind(id).first<TravelRequest>(); }

export async function createRequest(input:{service:string;fulfillment:string;company:string;destination:string;summary:string;catalogSnapshot?:unknown},actor:string){
  await ensureDatabase();
  const id=`TR-${crypto.randomUUID()}`;
  const now=new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO requests (id, service, category, fulfillment_model, company, traveler, destination, status, priority, assignee, sla_minutes, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id,input.service,input.service,input.fulfillment,input.company,'يحدد لاحقاً',input.destination,'جديد','عادي','غير مسند',240,input.summary,now,now),
    env.DB.prepare('INSERT INTO audit_events (request_id, action, actor, created_at) VALUES (?, ?, ?, ?)').bind(id,'إنشاء الطلب',actor,now),
    ...(input.catalogSnapshot?[env.DB.prepare('INSERT INTO provider_settings(id,payload,updated_at) VALUES(?,?,?)').bind('REQUEST-SERVICE-'+id,JSON.stringify(input.catalogSnapshot),now)]:[]),
  ]);
  return findRequest(id);
}

export async function listBookings(){await ensureDatabase();const result=await env.DB.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all<BookingRecord>();return result.results}
