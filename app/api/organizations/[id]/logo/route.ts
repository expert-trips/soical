import { env } from 'cloudflare:workers';
import { findOrganization } from '@/db/organizations';

type Context = { params: Promise<{ id: string }> };
const limit = 2 * 1024 * 1024;
const bucket = () => (env as unknown as { COMPANY_LOGOS: R2Bucket }).COMPANY_LOGOS;

export async function GET(req: Request, { params }: Context) {
  if (!req.headers.get('oai-authenticated-user-id')) return new Response(null, { status: 401 });
  const { id } = await params;
  if (!await findOrganization(id)) return new Response(null, { status: 404 });
  const logo = await bucket().get(`organizations/${id}/logo`);
  if (!logo) return new Response(null, { status: 404 });
  return new Response(logo.body, { headers: {
    'content-type': logo.httpMetadata?.contentType || 'application/octet-stream',
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
  } });
}

export async function PUT(req: Request, { params }: Context) {
  if (!req.headers.get('oai-authenticated-user-id')) return new Response(null, { status: 401 });
  if (req.headers.get('sec-fetch-site') === 'cross-site') return new Response(null, { status: 403 });
  const { id } = await params;
  if (!await findOrganization(id)) return new Response(null, { status: 404 });
  const type = req.headers.get('content-type');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(type || ''))
    return Response.json({ error: 'اختر صورة PNG أو JPG أو WebP.' }, { status: 415 });
  const reader = req.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return Response.json({ error: 'حجم الشعار يجب ألا يتجاوز ٢ ميجابايت.' }, { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const valid = type === 'image/png'
    ? [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)
    : type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP';
  if (!valid) return Response.json({ error: 'ملف الصورة غير صالح.' }, { status: 400 });
  await bucket().put(`organizations/${id}/logo`, bytes, { httpMetadata: { contentType: type! } });
  return Response.json({ saved: true });
}
