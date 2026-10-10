'use client';
import { FormEvent, useState } from 'react';
import Link from '@/components/safe-link';
import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  Clock3,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import type { Organization, OrganizationAudit, OrganizationMember } from '@/db/organizations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {organizationServices,normalizeServices,contractState} from '@/lib/organization-fields';
import {CompanyDocuments} from '@/components/company-documents';
import {CompanyArchives} from '@/components/company-archives';
import {CustomerContractSettings} from '@/components/customer-contract-settings';
import { CompanyLogo } from '@/components/company-logo';
const allServices = organizationServices;
export function OrganizationDetail({
  initial,
  initialAudit,
  initialMembers,
  hasContract,
}: {
  initial: Organization;
  initialAudit: OrganizationAudit[];
  initialMembers: OrganizationMember[];
  hasContract: boolean;
}) {
  const [org, setOrg] = useState(initial),
    [audit, setAudit] = useState(initialAudit),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [members, setMembers] = useState(initialMembers);
  async function save(e: FormEvent<HTMLFormElement>, section: string) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const f = new FormData(e.currentTarget),
      body: Record<string,unknown> = Object.fromEntries(f);
    body.section = section;
    if (section === 'سياسة السفر') {
      body.permitted_services = f.getAll('permitted_services');
      body.direct_booking_allowed = f.has('direct_booking_allowed') ? '1' : '';
      body.approval_required = f.has('approval_required') ? '1' : '';
    }
    try {
      const r = await fetch(`/api/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      const d = await r.json() as {organization:Organization;audit:OrganizationAudit[]};
      setOrg(d.organization);
      setAudit(d.audit);
      setMessage(`تم حفظ ${section} بنجاح.`);
    } catch {
      setMessage('تعذر الحفظ. راجع القيم وحاول مجدداً.');
    } finally {
      setBusy(false);
    }
  }
  async function addMember(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const form=e.currentTarget;setBusy(true);setMessage('');
    const f=new FormData(form),body=Object.fromEntries(f);body.can_add_members=f.has('can_add_members')?'1':'';
    try{const r=await fetch(`/api/organizations/${org.id}/members`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
      if(!r.ok)throw new Error();const d=await r.json() as {members:OrganizationMember[]};
      setMembers(d.members);form.reset();setMessage('تمت إضافة المستخدم إلى سجل الشركة، وهو بانتظار تفعيل الدخول.');
    }catch{setMessage('تعذر إضافة المستخدم. تحقق من البريد وعدم تسجيله مسبقًا.')}finally{setBusy(false)}
  }
  const allowed = normalizeServices(JSON.parse(org.permitted_services)),
    remaining = Math.max(0, org.credit_limit - org.credit_used),
    usage = org.credit_limit
      ? Math.round((org.credit_used / org.credit_limit) * 100)
      : 0;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/organizations"
          className="flex items-center gap-2 text-sm text-[#064a78]"
        >
          <ArrowRight className="h-4 w-4" />
          كل الشركات
        </Link>
        <form onSubmit={(e) => save(e, 'حالة الشركة')} className="flex gap-2">
          <select
            name="status"
            defaultValue={org.status}
            className="h-10 rounded-lg border px-3"
          >
            <option>نشطة</option>
            <option>معلقة</option>
            <option>مؤرشفة</option>
          </select>
          <button
            disabled={busy}
            className="rounded-lg bg-[#064a78] px-4 text-sm text-white"
          >
            حفظ الحالة
          </button>
        </form>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        بيانات تجريبية توضيحية؛ لا تمثل عقداً أو رصيداً قانونياً أو مالياً حقيقياً.
      </div>
      {message && (
        <div
          aria-live="polite"
          className={`rounded-lg p-3 text-sm ${message.startsWith('تم') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
        >
          {message}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-4">
        <Card
          icon={Building2}
          label="مدير الحساب"
          value={org.account_manager}
        />
        <Card
          icon={Mail}
          label="جهة الاتصال"
          value={org.contact_name}
          sub={org.contact_email}
        />
        <Card
          icon={ShieldCheck}
          label="صحة العقد"
          value={contractState(org)}
          sub={`ينتهي ${org.contract_end}`}
        />
        <Card
          icon={CircleDollarSign}
          label={org.billing_model==='مسبق الدفع'?'المتاح من الرصيد المسبق':'الائتمان المتاح'}
          value={`${remaining.toLocaleString('ar-SA')} ${org.currency}`}
          sub={`استخدام ${usage}٪ · تجريبي`}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Card icon={Building2} label="طلبات مفتوحة" value={org.open_requests} />
        <Card
          icon={ShieldCheck}
          label="رقم العقد"
          value={org.contract_version}
        />
      </div>
      <Tabs
        defaultValue="overview"
        dir="rtl"
        className="rounded-xl border bg-white p-4"
      >
        <TabsList className="mb-5 flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="contract">العقد والائتمان</TabsTrigger>
          <TabsTrigger value="policy">سياسة السفر والموافقة</TabsTrigger>
          <TabsTrigger value="services">الخدمات والتسعير</TabsTrigger>
          <TabsTrigger value="members">المستخدمون والموظفون</TabsTrigger>
          <TabsTrigger value="documents">مستندات الشركة</TabsTrigger>
          <TabsTrigger value="archive">أرشيف العقود</TabsTrigger>
          <TabsTrigger value="activity">سجل النشاط</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <CompanyLogo id={org.id} name={org.display_name} />
          <div className="grid gap-4 md:grid-cols-2">
            <Info
              title="الملف القانوني"
              lines={[`رقم العميل: ${org.id}`,org.legal_name, `السجل التجاري: ${org.reference}`, org.sector]}
            />
            <Info
              title="التشغيل"
              lines={[
                `مدير الحساب: ${org.account_manager}`,
                `الحالة: ${org.status}`,
              ]}
            />
          </div>
        </TabsContent>
        <TabsContent value="contract">
          <CustomerContractSettings id={org.id} onSaved={setOrg}/>
          <p className="mb-3 text-sm text-slate-600">نظام التعامل: {org.billing_model || 'غير محدد في السجل القديم'}</p>
          {hasContract ? <Link href={`/organizations/${org.id}/contract`} className="mb-5 inline-block rounded-lg bg-[#064a78] px-4 py-3 text-white">عرض عقد الشركة وطباعته أو تنزيله</Link> : <p className="mb-5 rounded-lg bg-slate-50 p-3 text-sm">لم يتم إنشاء عقد لهذه الشركة بعد.</p>}
          <form
            onSubmit={(e) => save(e, 'العقد والائتمان')}
            className="grid gap-4 md:grid-cols-3"
          >
            {[
              ['contract_start', 'بداية العقد', org.contract_start, 'date'],
              ['contract_end', 'نهاية العقد', org.contract_end, 'date'],
              ['payment_terms', 'شروط السداد', org.payment_terms, 'text'],
              [
                'credit_limit',
                org.billing_model==='مسبق الدفع'?'الرصيد المسبق المسجل — تجريبي':'الحد الائتماني — تجريبي',
                org.credit_limit,
                'number',
              ],
              ['credit_used', 'المستخدم — تجريبي', org.credit_used, 'number'],
            ].map(([n, l, v, t]) => (
              <label key={String(n)} className="text-sm">
                {l}
                <input
                  name={String(n)}
                  type={String(t)}
                  defaultValue={String(v)}
                  required
                  className="mt-1 h-10 w-full rounded-lg border px-3"
                />
              </label>
            ))}
            <label className="text-sm">
              حالة العقد
              <select
                name="contract_status"
                defaultValue={org.contract_status}
                className="mt-1 h-10 w-full rounded-lg border px-3"
              >
                <option>ساري</option>
                <option>قيد المراجعة</option>
                <option>منتهي</option>
              </select>
            </label>
            <button
              disabled={busy}
              className="self-end rounded-lg bg-[#064a78] px-4 py-3 font-bold text-white"
            >
              حفظ العقد والائتمان
            </button>
          </form>
        </TabsContent>
        <TabsContent value="documents"><CompanyDocuments id={org.id}/></TabsContent>
        <TabsContent value="archive"><CompanyArchives id={org.id}/></TabsContent>
        <TabsContent value="policy">
          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <Flow n="١" text="تحقق من الخدمة والسياسة" />
            <Flow n="٢" text="تحقق من الرصيد المتاح" />
            <Flow n="٣" text="اعتماد مباشر أو إحالة للمعتمد" />
            <Flow
              n="٤"
              text="الموافقة تؤكد الحجز عند اكتمال بقية الشروط؛ الرفض يغلق الطلب"
            />
          </div>
          <form
            onSubmit={(e) => save(e, 'سياسة السفر')}
            className="grid gap-4 md:grid-cols-2"
          >
            <label className="rounded-lg border p-3">
              <input
                type="checkbox"
                name="direct_booking_allowed"
                defaultChecked={!!org.direct_booking_allowed}
                className="ml-2"
              />
              السماح للموظف بالحجز المباشر فقط داخل السياسة والرصيد المتاح
            </label>
            <label className="rounded-lg border p-3">
              <input
                type="checkbox"
                name="approval_required"
                defaultChecked={!!org.approval_required}
                className="ml-2"
              />
              إرسال الحالات غير المؤهلة إلى مسار الموافقة
            </label>
            <label className="text-sm">
              دور المعتمد
              <input
                name="approval_role"
                defaultValue={org.approval_role}
                required
                className="mt-1 h-10 w-full rounded-lg border px-3"
              />
            </label>
            <label className="text-sm">
              حد السعر — حقل تجريبي اختياري
              <input
                name="price_boundary"
                type="number"
                defaultValue={org.price_boundary ?? ''}
                className="mt-1 h-10 w-full rounded-lg border px-3"
              />
            </label>
            <fieldset className="md:col-span-2">
              <legend className="mb-2 text-sm">عائلات الخدمات المسموحة</legend>
              <div className="flex flex-wrap gap-2">
                {allServices.map((s) => (
                  <label
                    key={s}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="permitted_services"
                      value={s}
                      defaultChecked={allowed.includes(s)}
                      className="ml-2"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              disabled={busy}
              className="md:col-span-2 rounded-lg bg-[#064a78] px-4 py-3 font-bold text-white"
            >
              حفظ سياسة السفر
            </button>
          </form>
        </TabsContent>
        <TabsContent value="services">
          <div className="grid gap-3 md:grid-cols-3">
            {allowed.map((s) => (
              <div key={s} className="rounded-xl border p-4">
                <b>{s}</b>
                <p className="mt-2 text-sm text-slate-500">
                  مفعلة ضمن العقد. التسعير التفصيلي يدار من وحدة الخدمات
                  والتسعير.
                </p>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="members"><div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]"><form onSubmit={addMember} className="grid gap-3 rounded-xl border p-4"><div><h3 className="font-bold">إضافة مستخدم للشركة</h3><p className="mt-1 text-sm text-slate-500">يسجل المستخدم هنا أولاً. تفعيل الدخول يتم لاحقاً عبر دعوة آمنة مرتبطة ببريده، وليس بكلمة مرور يحددها الموظف الداخلي.</p></div><label className="text-sm">الاسم الكامل<input name="name" required className="mt-1 h-10 w-full rounded-lg border px-3"/></label><label className="text-sm">بريد العمل<input name="email" type="email" required className="mt-1 h-10 w-full rounded-lg border px-3"/></label><label className="text-sm">الصلاحية<select name="role" required className="mt-1 h-10 w-full rounded-lg border px-3"><option value="">اختر…</option><option>مدير حساب الشركة</option><option>معتمد طلبات</option><option>موظف</option></select></label><label className="rounded-lg border p-3 text-sm"><input name="can_add_members" type="checkbox" className="ml-2"/>السماح له بإضافة موظفين من بوابة الشركة</label><button disabled={busy} className="rounded-lg bg-[#064a78] px-4 py-3 font-bold text-white">إضافة إلى الشركة</button></form><div><div className="mb-3"><h3 className="font-bold">فريق الشركة</h3><p className="text-sm text-slate-500">يمكن لفريق خبراء الرحلات الإضافة من هنا، ويمكن لمدير حساب الشركة الإضافة من بوابته عند تفعيل دخوله.</p></div><div className="space-y-2">{members.length?members.map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div><b>{m.name}</b><p className="text-sm text-slate-500">{m.email} · {m.role}</p></div><div className="text-left"><span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">{m.status}</span>{!!m.can_add_members&&<small className="mt-1 block text-slate-500">يمكنه إضافة موظفين</small>}</div></div>):<div className="rounded-xl border border-dashed p-8 text-center text-slate-500">لا يوجد مستخدمون مسجلون بعد.</div>}</div></div></div><div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><b>الدخول المباشر:</b> الموقع الحالي خاص ويتطلب هوية مستخدم موثقة. حفظ المستخدم هنا لا يرسل دعوة ولا ينشئ كلمة مرور تلقائياً؛ ربط الدعوات وتفعيل الوصول الخارجي سيكون خطوة مستقلة وآمنة.</div></TabsContent>
        <TabsContent value="activity">
          <div className="space-y-3">
            {audit.length ? (
              audit.map((a) => (
                <div key={a.id} className="rounded-lg border p-3">
                  <div className="flex justify-between gap-3">
                    <b>{a.action}</b>
                    <time className="text-xs text-slate-500">
                      {new Date(a.created_at).toLocaleString('ar-SA')}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {a.details} · بواسطة {a.actor}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-500">لا يوجد نشاط مسجل بعد.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
function Card({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <Icon className="mb-3 h-5 w-5 text-[#0a8f86]" />
      <small className="text-slate-500">{label}</small>
      <b className="block text-lg">{value}</b>
      {sub && <small className="text-slate-500">{sub}</small>}
    </div>
  );
}
function Info({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border p-5">
      <h3 className="mb-3 font-bold">{title}</h3>
      {lines.map((x) => (
        <p key={x} className="border-b py-2 text-sm last:border-0">
          {x}
        </p>
      ))}
    </div>
  );
}
function Flow({ n, text }: { n: string; text: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3 text-sm">
      <b className="ml-2 text-[#ff620f]">{n}</b>
      {text}
    </div>
  );
}
