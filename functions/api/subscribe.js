import { clip, isEmail, json, lang, now, readBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const body = await readBody(request).catch(() => ({}));
  if (!isEmail(body.email)) return json({ error: 'invalid_email' }, 400);
  await env.DB.prepare('INSERT OR IGNORE INTO subscribers (email, lang, state, created_at) VALUES (?, ?, ?, ?)')
    .bind(body.email.toLowerCase(), lang(body.lang), clip(body.state, 40), now())
    .run();
  return json({ ok: true });
}
