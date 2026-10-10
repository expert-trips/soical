import {AppShell} from '@/components/app-shell';
import {ArchiveList} from '@/components/archive-list';
import {listArchives} from '@/db/contract-archive';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{q?:string}>}){const {q=''}=await searchParams;return <AppShell title="أرشيف العقود" subtitle="نسخ ثابتة محفوظة حسب الشركة ورقم العقد وتاريخ الحفظ"><form className="mb-5 flex gap-2"><input name="q" defaultValue={q} aria-label="البحث في الأرشيف" placeholder="اسم الشركة أو رقم العميل أو العقد" className="h-11 flex-1 rounded-lg border px-3"/><button className="rounded-lg bg-[#064a78] px-5 text-white">بحث</button></form><ArchiveList items={await listArchives(undefined,q)}/></AppShell>}
