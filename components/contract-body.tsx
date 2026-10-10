import type {Organization,OrganizationProfile,OrganizationContract} from '@/db/organizations';
import type {ProviderProfile} from '@/db/provider';
import {defaultContractTemplate,renderTemplateText,type ContractTemplate} from '@/lib/contract-template';
import {providerFields} from '@/lib/provider-identity';
import {validSaudiIban} from '@/lib/iban';
import {normalizeServices} from '@/lib/organization-fields';
import {AlertTriangle} from 'lucide-react';
import providerLogo from '@/public/trips-experts-logo.png?inline';
export function ContractBody({
  organization: o,
  profile: p,
  contract: c,
  provider: liveProvider,
}: {
  organization: Organization;
  profile: OrganizationProfile;
  contract: OrganizationContract;
  provider: ProviderProfile;
}) {
  const services = normalizeServices(JSON.parse(o.permitted_services)), snapshot=JSON.parse(c.snapshot) as Record<string,any>, provider=(snapshot.provider_snapshot||liveProvider) as ProviderProfile, providerComplete=!!(provider.legal_name&&provider.commercial_registration&&provider.national_address&&provider.vat_number&&provider.authorized_signatory);
  const incomplete = [!snapshot.billing_model&&'نظام التعامل المالي',!/^0[15]\d{8}$/.test(p.contact_phone.replace(/[\s-]/g,''))&&!/^\+[1-9]\d{7,14}$/.test(p.contact_phone.replace(/[\s-]/g,''))&&'رقم تواصل العميل',!provider.service_fee_policy&&'جدول رسوم الخدمة',!provider.work_hours&&'أوقات العمل',!provider.emergency_phone&&'قناة دعم الطوارئ'].filter(Boolean);
  const rendered=renderTemplateText((snapshot.contract_template||defaultContractTemplate()) as ContractTemplate,o,snapshot,provider,services);
  const {clauses,serviceTerms}=rendered;
 return (      <article
        id="contract-body"
        className="mx-auto max-w-4xl bg-white p-7 shadow-sm md:p-12 print:max-w-none print:p-0 print:shadow-none"
      >
        <div className="mb-6 border-b pb-5 text-center">
          <img src={providerLogo} alt="شعار خبراء الرحلات" width={180} height={180} className="mx-auto mb-3 h-auto w-36" />
          <p className="text-sm text-slate-500">
            مسودة منشأة آلياً من بيانات التسجيل
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            {rendered.title}
          </h1>
          <p className="mt-2">رقم العقد: {c.contract_number}</p>
        </div>
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            <b>{providerComplete?'مسودة للمراجعة قبل التوقيع.':'ليست جاهزة للتوقيع بعد.'}</b>{' '}{providerComplete?'اكتملت بيانات الطرف الأول من إعدادات المنشأة، وتبقى مراجعة النسخة النهائية والملاحق التجارية وتفويض الموقّعين.':'أكمل بيانات خبراء الرحلات من «إعدادات المنشأة»، ثم راجع النسخة مع مختص نظامي مخول.'}
          </p>
        </div>
        {incomplete.length>0&&<div className="mb-5 border border-amber-300 p-3 text-sm">بيانات تحتاج استكمالًا قبل اعتماد النسخة: {incomplete.join('، ')}. تحقق كذلك من مطابقة اسم المفوض للتفويض.</div>}
        <p className="mb-3 text-sm">رقم العميل: {o.id}</p>
        <h2 className="mb-3 text-lg font-bold">أطراف الاتفاقية</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Party
            title="الطرف الأول — مقدم الخدمة"
            lines={[
              ...providerFields.filter(([key]) => !['termination_notice_days','dispute_city','iban','bank_name','service_fee_policy','work_hours','emergency_phone'].includes(key)).map(([key,label]) => `${label}: ${provider[key] || '[لم يحدد]'}`),
            ]}
          />
          <Party
            title="الطرف الثاني — العميل"
            lines={[
              o.legal_name,
              `السجل/المرجع: ${o.reference}`,
              `العنوان: ${p.address}`,
              p.vat_number
                ? `الرقم الضريبي: ${p.vat_number}`
                : 'غير مسجل كرقم ضريبي',
              `المفوض: ${p.authorized_signatory} — ${p.signatory_title}`,
              `التواصل: ${o.contact_name}، ${p.contact_phone}، ${o.contact_email}`,
            ]}
          />
        </div>
        <section className="mt-6 rounded-lg border p-4">
          <h2 className="mb-2 font-bold">بيانات التحويل البنكي للطرف الأول</h2>
          <p className="text-sm">اسم المستفيد: {provider.legal_name}</p>
          <p className="mt-1 text-sm">المصرف: {provider.bank_name}</p>
          <p className="mt-1 text-sm">{validSaudiIban(provider.iban)?<>الآيبان: <bdi>{provider.iban}</bdi></>:'بيانات التحويل بانتظار تصحيح الآيبان من إعدادات المنشأة.'}</p>
        </section>
        <div className="mt-6 space-y-5">
          {clauses.map(([title, text], i) => (
            <section key={title}>
              <h2 className="font-bold">
                المادة {i + 1}: {title}
              </h2>
              <p className="mt-1 whitespace-pre-line text-sm leading-8 text-slate-700">{text}</p>
            </section>
          ))}
        </div>
        <section className="mt-8 border-t pt-6"><h2 className="text-lg font-bold">ملحق شروط الخدمات</h2><p className="mt-2 text-sm text-slate-600">{rendered.annexIntro}</p><div className="mt-4 space-y-3">{serviceTerms.filter(([service])=>services.some(s=>s.includes(service)||service.includes(s))).map(([service,term])=><div key={service} className="rounded-lg border p-3"><b>{service}</b><p className="mt-1 text-sm leading-7 text-slate-700">{term}</p></div>)}</div></section>
        <div className="mt-10 grid gap-8 border-t pt-6 md:grid-cols-2">
          <Signature title="الطرف الأول" name={`${provider.authorized_signatory||'________________'} — ${provider.signatory_title||'________________'}`} />
          <Signature
            title="الطرف الثاني"
            name={`${p.authorized_signatory} — ${p.signatory_title}`}
          />
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">
          حالة الوثيقة: {c.status} · تاريخ التوليد{' '}
          {new Date(c.generated_at).toLocaleString('ar-SA')}
        </p>
      </article>);
}
function Party({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="box rounded-xl border p-4">
      <h3 className="mb-2 font-bold text-[#064a78]">{title}</h3>
      {lines.map((x) => (
        <p key={x} className="text-sm leading-7">
          {x}
        </p>
      ))}
    </div>
  );
}
function Signature({ title, name }: { title: string; name?: string }) {
  return (
    <div>
      <b>{title}</b>
      <p className="mt-2 text-sm">الاسم: {name || '________________'}</p>
      <p className="mt-2 text-sm">التوقيع: ________________</p>
      <p className="mt-2 text-sm">التاريخ: ________________</p>
    </div>
  );
}
