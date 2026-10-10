import { AppShell } from '@/components/app-shell';
import { OperationsCenter } from '@/components/operations-center';
import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {templateOwner} from '@/db/contract-template';
import {findStaff} from '@/db/staff';
import Link from '@/components/safe-link';
import { listRequests } from '@/db/requests';
export const dynamic='force-dynamic';
export default async function OperationsPage(){const h=await headers();const owner=await templateOwner();const staff=owner?null:await findStaff(h.get('oai-authenticated-user-email')||'');if(!owner&&staff?.role==='محاسبة')return <AppShell title="مركز العمليات" subtitle="مساحة العمل حسب صلاحياتك"><section className="rounded-xl border bg-white p-6"><h2 className="text-lg font-bold">مساحة المحاسبة</h2><p className="mt-3 text-sm leading-7 text-slate-600">يمكنك الوصول إلى المالية والمحافظ من هنا. تفاصيل طلبات العمليات غير متاحة ضمن صلاحيتك الحالية.</p><Link href="/finance" className="mt-5 inline-block rounded-lg bg-[#0a527e] px-5 py-3 font-bold text-white">فتح المالية والمحافظ</Link></section></AppShell>;const requests=await listRequests();const assigned=await env.DB.prepare('SELECT a.request_id FROM request_assignments a JOIN internal_staff s ON s.id=a.staff_id WHERE s.email=?').bind((h.get('oai-authenticated-user-email')||'').toLowerCase()).all<{request_id:string}>();return <AppShell title="مركز العمليات" subtitle="إدارة الطلبات التي تحتاج متابعة أو إجراء"><OperationsCenter initial={requests} assignedIds={assigned.results.map(r=>r.request_id)}/></AppShell>}
