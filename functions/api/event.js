import { clip, hourTimestamp, json, readBody, sanitizeQuery } from './_shared.js';

// Anonymous finder usage. Stores only: sanitized search text, program id, result label, hour.
// Never stores IP, user agent, email, segment, language or anything else from the request.
export async function onRequestPost({ request, env }) {
  const body = await readBody(request).catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'bad_request' }, 400);
  await env.DB.prepare('INSERT INTO events (program, query, label, created_at) VALUES (?, ?, ?, ?)')
    .bind(clip(body.program, 40), sanitizeQuery(body.query), clip(body.label, 30), hourTimestamp())
    .run();
  return json({ ok: true });
}
