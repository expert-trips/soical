'use client';
import { FormEvent, useMemo, useState } from 'react';
import {DocumentPicker,uploadDocumentBatch,type PendingDocument} from '@/components/company-documents';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import Link from '@/components/safe-link';
import {
  Building2,
  CircleAlert,
  CircleDollarSign,
  FileClock,
  Plus,
  Search,
} from 'lucide-react';
import {organizationServices,contractState} from '@/lib/organization-fields';
import type { Organization } from '@/db/organizations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
const services = organizationServices;

export function OrganizationsCenter({ initial }: { initial: Organization[] }) {
  const [items, setItems] = useState(initial),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState('الكل'),
    [manager, setManager] = useState('الكل'),
    [contract, setContract] = useState('الكل'),
    [credit, setCredit] = useState('الكل'),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [selectedServices, setSelectedServices] = useState<string[]>(services),
    [billingMode,setBillingMode]=useState('مسبق الدفع');
  const [registrationTab,setRegistrationTab]=useState('data'),[pendingDocuments,setPendingDocuments]=useState<PendingDocument[]>([]),[createdOrganization,setCreatedOrganization]=useState<Organization|null>(null);
  const managers = [...new Set(items.map((x) => x.account_manager))];
  const filtered = useMemo(
    () =>
      items.filter(
        (x) =>
          (!query ||
            `${x.id} ${x.display_name} ${x.reference} ${x.contact_name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) &&
          (status === 'الكل' || x.status === status) &&
          (manager === 'الكل' || x.account_manager === manager) &&
          (contract === 'الكل' || contractState(x) === contract) &&
          (credit === 'الكل' ||
            (credit === 'متاح'
              ? x.credit_used < x.credit_limit
              : (x.credit_limit > 0 && x.credit_used >= x.credit_limit * 0.85))),
      ),
    [items, query, status, manager, contract, credit],
  );
  const active = items.filter((x) => x.status === 'نشطة').length,
    attention = items.filter(
      (x) =>
        x.status !== 'نشطة' ||
        x.credit_used >= x.credit_limit * 0.85 ||
        contractState(x) !== 'ساري',
    ).length,
    total = items.filter(x=>x.billing_model!=='مسبق الدفع').reduce((s, x) => s + x.credit_limit, 0),
    used = items.filter(x=>x.billing_model!=='مسبق الدفع').reduce((s, x) => s + x.credit_used, 0),
    near = items.filter((x) => {
      const d = new Date(x.contract_end).getTime() - Date.now();
      return d >= 0 && d <= 60 * 864e5;
    }).length;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const f = new FormData(e.currentTarget),
      body:Record<string,unknown> = Object.fromEntries(f);
    body.permitted_services = f.getAll('permitted_services');
    body.direct_booking_allowed = f.has('direct_booking_allowed') ? '1' : '';
    body.approval_required = f.has('approval_required') ? '1' : '';
    try {
      let organization=createdOrganization;
      if(!organization){
      const r = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      const data = await r.json() as {organization:Organization;member:unknown};
      setItems((x) => [data.organization, ...x]);
      organization=data.organization;setCreatedOrganization(organization);
      }
      const filesSaved=await uploadDocumentBatch(organization.id,pendingDocuments,setPendingDocuments);
      if(!filesSaved){setRegistrationTab('documents');setMessage('تم إنشاء الشركة والعقد. بعض الملفات لم تُحفظ؛ أعد محاولة رفعها دون إنشاء شركة جديدة، أو افتح ملف الشركة واستكملها لاحقًا.');return;}
      setMessage('تم حفظ الشركة ومسودة العقد والمرفقات المختارة. جارٍ فتح العقد…');
      setTimeout(() => window.location.assign(`/organizations/${organization.id}/contract`), 700);
    } catch {
      setMessage('تعذر الحفظ. راجع الحقول والتواريخ.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5"><Link href="/contracts" className="inline-block rounded-lg border bg-white px-4 py-3 text-[#064a78]">أرشيف جميع العقود</Link>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        بيئة تشغيل تجريبية: الأسماء والأرصدة والشروط المعروضة أمثلة وليست بيانات
        عملاء فعلية.
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Kpi icon={Building2} label="شركات نشطة" value={active} />
          <Kpi icon={FileClock} label="عقود تنتهي خلال ٦٠ يوماً" value={near} />
          <Kpi
            icon={CircleDollarSign}
            label="استخدام الائتمان"
            value={`${total ? Math.round((used / total) * 100) : 0}٪`}
          />
          <Kpi icon={CircleAlert} label="تحتاج متابعة" value={attention} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="flex items-center gap-2 rounded-lg bg-[#ff620f] px-4 py-3 font-bold text-white">
            <Plus className="h-4 w-4" />
            إضافة شركة
          </DialogTrigger>
          <DialogContent
            dir="rtl"
            className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
          >
            <DialogHeader>
              <DialogTitle>إضافة شركة وعقد</DialogTitle>
              <DialogDescription>
                أنشئ الملف والسياسة الأساسية. الحدود المالية هنا حقول تجريبية
                قابلة للضبط.
              </DialogDescription>
            </DialogHeader>
            <Tabs value={registrationTab} onValueChange={v=>setRegistrationTab(String(v))}><TabsList className="mb-4"><TabsTrigger value="data">بيانات الشركة والعقد</TabsTrigger><TabsTrigger value="documents">مستندات الشركة (اختياري)</TabsTrigger></TabsList><form onSubmit={submit} onInvalidCapture={()=>setRegistrationTab('data')} className="grid gap-4 sm:grid-cols-2"><TabsContent value="data" keepMounted className="sm:col-span-2"><fieldset disabled={busy||!!createdOrganization} className="grid gap-4 sm:grid-cols-2">
              <SectionTitle title="بيانات الشركة" note="يصدر رقم العميل ورقم العقد تلقائيًا عند الحفظ." />
              <TextField name="legal_name" label="الاسم القانوني" placeholder="كما يظهر في السجل التجاري" />
              <TextField name="reference" label="رقم السجل التجاري أو الرقم المرجعي" placeholder="مثال: 1010XXXXXX" />
              <SectionTitle title="مسؤول التواصل" note="الشخص الذي نتواصل معه بشأن الحساب" />
              <TextField name="contact_name" label="اسم مسؤول التواصل" placeholder="الاسم الكامل" />
              <TextField name="contact_email" label="البريد الإلكتروني" type="email" placeholder="name@company.com" />
              <TextField name="contact_phone" label="رقم الجوال" type="tel" placeholder="مثال: +9665XXXXXXXX" help="يستخدم للتواصل التشغيلي والتحقق من بيانات المسؤول." />
              <TextField name="address" label="العنوان الوطني / عنوان المراسلات" placeholder="المدينة، الحي، الشارع، الرمز البريدي" />
              <TextField name="vat_number" label="الرقم الضريبي" placeholder="اختياري إذا لم تكن المنشأة مسجلة" required={false} />
              <SelectField name="account_manager" label="مدير الحساب من خبراء الرحلات" options={['سارة الحربي','محمد الغامدي','نورة القحطاني','خالد العتيبي']} />
              <SelectField name="approval_role" label="من يعتمد طلبات السفر؟" options={['مدير الموظف','مدير الإدارة','مدير السفر','الموارد البشرية','المدير المالي','لا يوجد معتمد']} />
              <TextField name="authorized_signatory" label="اسم المفوض بالتوقيع" placeholder="كما يظهر في التفويض" />
              <SelectField name="signatory_title" label="صفة المفوض" options={['المالك','المدير العام','الرئيس التنفيذي','المدير المالي','مدير الموارد البشرية','مفوض بالتوقيع']} />
              <SectionTitle title="العقد والحد الائتماني" note="جميع المبالغ بالريال السعودي" />
              <TextField name="contract_start" label="بداية العقد" type="date" />
              <TextField name="contract_end" label="نهاية العقد" type="date" />
              {billingMode==='مسبق الدفع'?<input type="hidden" name="payment_terms" value="دفع مسبق"/>:<SelectField name="payment_terms" label="مدة السداد" options={['15 يوماً','30 يوماً','45 يوماً','60 يوماً']} />}
              <label className="text-sm">نظام التعامل المالي<select name="billing_model" value={billingMode} onChange={e=>setBillingMode(e.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3"><option value="مسبق الدفع">مقدم — دون سند لأمر</option><option value="ائتمان شهري بضمان سند لأمر">آجل — بسند لأمر</option></select><small className="mt-1 block text-slate-500">يتكيف العقد تلقائياً مع الخيار المحدد.</small></label>
              {billingMode==='مسبق الدفع'?<label className="text-sm">الرصيد الافتتاحي بالريال<input name="prepaid_balance" type="number" min="0" required className="mt-1 h-10 w-full rounded-lg border px-3"/></label>:<p className="sm:col-span-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">يُنشأ الحساب معلقًا بانتظار استكمال السند. أضف رقم السند ومرجع توثيقه وتواريخه لاحقًا من قسم العقد والائتمان؛ ولا يتاح التعامل الآجل قبل استكمالها واعتماد التفعيل.</p>}
              {billingMode!=='مسبق الدفع'&&<label className="text-sm">الحد الائتماني بالريال السعودي <input name="credit_limit" type="number" min="0" required className="mt-1 h-10 w-full rounded-lg border px-3" placeholder="مثال: 100000"/><small className="mt-1 block text-slate-500">أقصى رصيد متاح للحجوزات قبل طلب تغطية أو موافقة مالية.</small></label>}
              <input type="hidden" name="currency" value="SAR" />
              <label className="text-sm">
                الحالة
                <select
                  name="status"
                  className="mt-1 h-10 w-full rounded-lg border px-3"
                >
                  <option>نشطة</option>
                  <option>معلقة</option>
                  <option>مؤرشفة</option>
                </select>
              </label>
              <fieldset className="sm:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-3"><div><legend className="text-sm font-bold">الخدمات المتاحة للشركة</legend><p className="mt-1 text-xs text-slate-500">تحدد ما يمكن لموظفي الشركة طلبه. ويمكن تعديلها لاحقاً من ملف الشركة.</p></div><button type="button" onClick={()=>setSelectedServices(selectedServices.length===services.length?[]:services)} className="rounded-lg border px-3 py-2 text-sm font-bold text-[#064a78]">{selectedServices.length===services.length?'إلغاء تحديد الكل':'تحديد جميع الخدمات'}</button></div>
                <div className="flex flex-wrap gap-3">
                  {services.map((s) => (
                    <label
                      key={s}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="permitted_services"
                        value={s}
                        checked={selectedServices.includes(s)}
                        onChange={(e)=>setSelectedServices(e.target.checked?[...selectedServices,s]:selectedServices.filter(x=>x!==s))}
                        className="ml-2"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="text-sm">
                <input
                  name="direct_booking_allowed"
                  type="checkbox"
                  className="ml-2"
                />
                السماح بالحجز المباشر إذا كانت الخدمة مسموحة والرصيد متاح
              </label>
              <label className="text-sm">
                <input
                  name="approval_required"
                  type="checkbox"
                  defaultChecked
                  className="ml-2"
                />
                تحويل الطلب إلى المعتمد عندما لا ينطبق الحجز المباشر
              </label>
              <label className="sm:col-span-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"><input name="create_portal_user" type="checkbox" defaultChecked className="ml-2"/>إنشاء مستخدم بوابة لمسؤول التواصل بصلاحية إدارة موظفي الشركة <small className="mt-1 block text-blue-700">سيُنشأ بحالة بانتظار تفعيل الدخول؛ لا تُنشأ أو تُرسل كلمة مرور غير آمنة.</small></label>
              </fieldset></TabsContent><TabsContent value="documents" keepMounted className="sm:col-span-2"><DocumentPicker items={pendingDocuments} onChange={setPendingDocuments} disabled={busy}/><p className="mt-3 text-sm text-slate-600">تُرفع الملفات بعد إنشاء الشركة، وتبقى خاصة بمالك النظام. يمكنك تخطي هذه الخطوة دون إرفاق أي ملف.</p></TabsContent>
              {createdOrganization&&<a className="sm:col-span-2 text-blue-700 underline" href={'/organizations/'+createdOrganization.id}>فتح ملف الشركة المحفوظة واستكمال المرفقات لاحقًا</a>}
              {message && (
                <p
                  className={`sm:col-span-2 rounded-lg p-3 ${message.startsWith('تم') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                >
                  {message}
                </p>
              )}
              <button
                disabled={busy}
                className="sm:col-span-2 rounded-lg bg-[#064a78] px-4 py-3 font-bold text-white disabled:opacity-50"
              >
                {busy ? 'جارٍ الحفظ…' : createdOrganization?'إعادة محاولة الملفات المتبقية':'إنشاء الشركة ومسودة العقد'}
              </button>
            </form></Tabs>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-xl border bg-white">
        <div className="grid gap-3 border-b p-4 md:grid-cols-5">
          <label className="relative md:col-span-2">
            <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم الشركة أو المرجع أو جهة الاتصال"
              className="h-10 w-full rounded-lg border pr-9 pl-3 text-sm"
            />
          </label>
          <Filter
            value={status}
            set={setStatus}
            options={['الكل', 'نشطة', 'معلقة', 'مؤرشفة']}
          />
          <Filter
            value={manager}
            set={setManager}
            options={['الكل', ...managers]}
          />
          <div className="flex gap-2">
            <Filter
              value={contract}
              set={setContract}
              options={['الكل', 'ساري', 'قيد المراجعة', 'منتهي']}
            />
            <Filter
              value={credit}
              set={setCredit}
              options={['الكل', 'متاح', 'قريب الحد']}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {[
                  'الشركة',
                  'العقد',
                  'مدير الحساب',
                  'الرصيد والائتمان',
                  'طلبات مفتوحة',
                  'الحالة',
                  '',
                ].map((x) => (
                  <th key={x} className="p-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={x.id} className="border-t hover:bg-slate-50">
                  <td className="p-3">
                    <b>{x.display_name}</b><small className="block text-slate-500">رقم العميل: {x.id}</small>
                    <small className="block text-slate-500">
                      {x.reference}
                    </small>
                  </td>
                  <td className="p-3">
                    {contractState(x)}
                    <small className="block text-slate-500">
                      حتى {x.contract_end}
                    </small>
                  </td>
                  <td className="p-3">{x.account_manager}</td>
                  <td className="p-3">
                    <span>
                      <small className="block text-slate-500">{x.billing_model || 'غير محدد'}</small>
                      {x.credit_used.toLocaleString('ar-SA')} /{' '}
                      {x.credit_limit.toLocaleString('ar-SA')} {x.currency}
                    </span>
                    <div className="mt-1 h-1.5 w-28 rounded bg-slate-100">
                      <div
                        className="h-full rounded bg-[#0a8f86]"
                        style={{
                          width: `${Math.min(100, x.credit_limit ? (x.credit_used / x.credit_limit) * 100 : 0)}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="p-3">{x.open_requests}</td>
                  <td className="p-3">
                    <Badge value={x.status} />
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/organizations/${x.id}`}
                      className="rounded-lg border px-3 py-2 text-[#064a78]"
                    >
                      فتح الملف
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="p-10 text-center text-slate-500">
              لا توجد نتائج مطابقة.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-40 rounded-xl border bg-white p-4">
      <Icon className="mb-3 h-5 w-5 text-[#0a8f86]" />
      <b className="text-2xl">{value}</b>
      <small className="block text-slate-500">{label}</small>
    </div>
  );
}
function Filter({
  value,
  set,
  options,
}: {
  value: string;
  set: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => set(e.target.value)}
      className="h-10 min-w-28 rounded-lg border px-2 text-sm"
    >
      {options.map((x) => (
        <option key={x}>{x}</option>
      ))}
    </select>
  );
}
function Badge({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs ${value === 'نشطة' ? 'bg-emerald-50 text-emerald-700' : value === 'معلقة' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}
    >
      {value}
    </span>
  );
}

function SectionTitle({title,note}:{title:string;note:string}){return <div className="sm:col-span-2 border-b pb-2 pt-2"><h3 className="font-bold text-[#064a78]">{title}</h3><p className="text-xs text-slate-500">{note}</p></div>}
function TextField({name,label,type='text',placeholder,required=true,help}:{name:string;label:string;type?:string;placeholder?:string;required?:boolean;help?:string}){return <label className="text-sm">{label}<input name={name} type={type} placeholder={placeholder} required={required} className="mt-1 h-10 w-full rounded-lg border px-3"/>{help&&<small className="mt-1 block text-slate-500">{help}</small>}</label>}
function SelectField({name,label,options,suffix,help}:{name:string;label:string;options:string[];suffix?:string;help?:string}){return <label className="text-sm">{label}<select name={name} required className="mt-1 h-10 w-full rounded-lg border px-3"><option value="">اختر…</option>{options.map(x=><option key={x} value={x}>{x}{suffix?` ${suffix}`:''}</option>)}</select>{help&&<small className="mt-1 block text-slate-500">{help}</small>}</label>}
