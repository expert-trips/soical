'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Building2 } from 'lucide-react';

export function CompanyLogo({ id, name }: { id: string; name: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [version, setVersion] = useState(0);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    const form = e.currentTarget;
    setBusy(true); setMessage('');
    try {
      const r = await fetch(`/api/organizations/${id}/logo`, {
        method: 'PUT', headers: { 'content-type': file.type }, body: file,
      });
      if (!r.ok) throw new Error('تعذر حفظ الشعار. تحقق من الملف وحاول مجدداً.');
      setVersion(Date.now()); setMissing(false); setFile(null); form.reset();
      setMessage('تم حفظ شعار الشركة.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="mb-5 rounded-xl border p-4">
    <h3 className="mb-3 font-bold">شعار الشركة</h3>
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-lg border bg-slate-50 p-2">
        {preview || !missing ? <img key={preview || version} src={preview || `/api/organizations/${id}/logo?v=${version}`} alt={`شعار ${name}`} className="h-full w-full object-contain" onError={() => { if (!preview) setMissing(true); }} /> : <Building2 aria-label="لم يضف شعار" className="h-10 w-10 text-slate-400" />}
      </div>
      <div className="flex-1">
        <label htmlFor="company-logo" className="mb-2 block text-sm">رفع أو تغيير شعار الشركة</label>
        <input id="company-logo" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="max-w-full text-sm" onChange={e => {
          const selected = e.target.files?.[0]; setMessage('');
          if (selected && (!['image/png','image/jpeg','image/webp'].includes(selected.type) || selected.size > 2*1024*1024)) {
            setMessage('اختر صورة PNG أو JPG أو WebP بحجم لا يتجاوز ٢ ميجابايت.'); setFile(null); e.target.value = ''; return;
          }
          setFile(selected || null);
        }} />
        <p className="mt-2 text-sm text-slate-500">PNG أو JPG أو WebP، حتى ٢ ميجابايت.</p>
      </div>
      <button disabled={!file || busy} className="rounded-lg bg-[#064a78] px-4 py-2 text-white disabled:opacity-50">{busy ? 'جارٍ الحفظ…' : 'حفظ الشعار'}</button>
    </div>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </form>;
}
