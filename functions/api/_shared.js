// Helpers for the Cloudflare Pages Functions. env.DB is the D1 binding.
export const clip = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : null) || null;
export const now = () => new Date().toISOString();
export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
export const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
export const lang = (v) => (v === 'es' ? 'es' : 'en');

export async function readBody(request) {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return request.json();
  if (type.includes('form')) return Object.fromEntries(await request.formData());
  return JSON.parse(await request.text()); // sendBeacon sends text/plain
}
