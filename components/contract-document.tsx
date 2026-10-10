'use client';
import {
  Download,
  Printer,
  Share2,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import {ContractBody} from '@/components/contract-body';
import Link from '@/components/safe-link';
import type {
  Organization,
  OrganizationContract,
  OrganizationProfile,
} from '@/db/organizations';
import type { ProviderProfile } from '@/db/provider';
import { providerFields } from '@/lib/provider-identity';
import { validSaudiIban } from '@/lib/iban';
import { normalizeServices } from '@/lib/organization-fields';
export function ContractDocument({
  organization: o,
  profile: p,
  contract: c,
  provider,
}: {
  organization: Organization;
  profile: OrganizationProfile;
  contract: OrganizationContract;
  provider: ProviderProfile;
}) {
  async function download() {
    const content = document.getElementById('contract-body')?.cloneNode(true) as HTMLElement | undefined;
    if (!content) return;
    try {
      for (const img of content.querySelectorAll('img')) {
        const response = await fetch(img.src);
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        const data = await new Promise<string>((resolve,reject) => {
          const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);
        });
        img.src=data;img.removeAttribute('srcset');img.removeAttribute('loading');
      }
    } catch { alert('تعذر تضمين الشعار. حاول تنزيل العقد مرة أخرى.'); return; }
    const html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>${c.contract_number}</title><style>body{font-family:Tahoma,Arial;max-width:850px;margin:40px auto;line-height:1.9;color:#18344c}h1,h2{color:#064a78}.box{border:1px solid #ccd8df;padding:16px;margin:12px 0}small{color:#666}</style><body>${content.innerHTML}</body></html>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
    );
    a.download = `${c.contract_number}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function share() {
    await navigator.clipboard.writeText(location.href);
    alert('تم نسخ رابط العقد. المشاركة لا تعني التوقيع أو الاعتماد.');
  }
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 p-4 text-[#18344c] print:bg-white"
    >
      <div className="mx-auto mb-4 flex max-w-4xl flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`/organizations/${o.id}`}
          className="flex items-center gap-2 text-sm"
        >
          <ArrowRight className="h-4 w-4" />
          ملف الشركة
        </Link>
        <div className="flex gap-2">
          <button
            onClick={download}
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"
          >
            <Download className="h-4 w-4" />
            تنزيل الملف
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"
          >
            <Printer className="h-4 w-4" />
            طباعة / حفظ PDF
          </button>
          <button
            onClick={share}
            className="flex items-center gap-2 rounded-lg bg-[#064a78] px-3 py-2 text-white"
          >
            <Share2 className="h-4 w-4" />
            نسخ رابط المشاركة
          </button>
        </div>
      </div>
      <ContractBody organization={o} profile={p} contract={c} provider={provider}/>
    </main>
  );
}
