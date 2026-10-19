import { clip, isEmail, json, lang, now, readBody, sanitizeQuery } from './_shared.js';

// The search text is cleaned like events (no emails or phone numbers). The optional contact email is kept as given.
export async function onRequestPost({ request, env }) {
  const body = await readBody(request).catch(() => ({}));
  const message = clip(body.message, 2000);
  if (!message) return json({ error: 'missing_message' }, 400);
  await env.DB.prepare(
    'INSERT INTO reports (program, category, rule, label, query, message, email, lang, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(clip(body.program, 40), clip(body.category, 60), clip(body.rule, 120), clip(body.label, 30),
      sanitizeQuery(body.query), message, isEmail(body.email) ? body.email : null, lang(body.lang), now())
    .run();
  return json({ ok: true });
}
