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

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
// 7+ digits, optionally separated by spaces, dots, dashes or parentheses, with an optional leading +.
const PHONE = /\+?\(?\d[\d\s().-]{5,}\d/g;

// Search text as stored in events: lowercased, emails and phone numbers removed, whitespace collapsed.
export function sanitizeQuery(text) {
  if (typeof text !== 'string') return null;
  const cleaned = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(EMAIL, ' ')
    .replace(PHONE, (m) => (m.replace(/\D/g, '').length >= 7 ? ' ' : m))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return cleaned || null;
}

// Event time rounded down to the hour, so an event can't be matched to a request log by exact time.
export const hourTimestamp = (date = new Date()) => `${date.toISOString().slice(0, 13)}:00:00Z`;
