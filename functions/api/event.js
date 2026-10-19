import { clip, json, lang, now, readBody } from './_shared.js';

// Anonymous finder usage: what was asked and what we answered. No IP, no user agent.
export async function onRequestPost({ request, env }) {
  const body = await readBody(request).catch(() => null);
  if (!body) return json({ error: 'bad_request' }, 400);
  await env.DB.prepare('INSERT INTO events (program, segment, query, category, label, lang, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(clip(body.program, 40), clip(body.segment, 30), clip(body.query, 120), clip(body.category, 60),
      clip(body.label, 30), lang(body.lang), now())
    .run();
  return json({ ok: true });
}
