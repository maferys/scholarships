import { clip, isEmail, json, lang, now, readBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  const body = await readBody(request).catch(() => ({}));
  const message = clip(body.message, 2000);
  if (!message) return json({ error: 'missing_message' }, 400);
  await env.DB.prepare(
    'INSERT INTO reports (program, category, rule, label, query, message, email, lang, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(clip(body.program, 40), clip(body.category, 60), clip(body.rule, 120), clip(body.label, 30),
      clip(body.query, 120), message, isEmail(body.email) ? body.email : null, lang(body.lang), now())
    .run();
  return json({ ok: true });
}
