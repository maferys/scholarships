import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker/index.js';

// Minimal D1 stand-in backed by node:sqlite.
function sqliteD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));
  const d1 = {
    raw: db,
    prepare(sql) {
      const stmt = { run: async () => db.prepare(sql).run() };
      stmt.bind = (...args) => ({ sql, args, run: async () => db.prepare(sql).run(...args) });
      return stmt;
    },
    batch: async (stmts) => Promise.all(stmts.map((s) => s.run())),
  };
  return d1;
}

const assets = { fetch: async (req) => new Response(`asset ${new URL(req.url).pathname}`) };

test('API paths go to the handlers and everything else to static assets', async () => {
  const env = { DB: sqliteD1(), ASSETS: assets };
  const post = await worker.fetch(new Request('https://x.dev/api/event', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ program: 'az-esa', query: 'laptop 602-555-1234', label: 'likely_eligible' }),
  }), env, {});
  assert.equal(post.status, 200);
  assert.equal(env.DB.raw.prepare('SELECT query FROM events').get().query, 'laptop');

  assert.equal((await worker.fetch(new Request('https://x.dev/api/event'), env, {})).status, 405);
  assert.equal(await (await worker.fetch(new Request('https://x.dev/es/finder/'), env, {})).text(), 'asset /es/finder/');
});

test('the weekly cron deletes old events and reports and keeps signups', async () => {
  const env = { DB: sqliteD1(), ASSETS: assets };
  const db = env.DB.raw;
  for (const at of ['2025-09-01T10:00:00Z', '2026-10-01T10:00:00Z']) {
    db.prepare('INSERT INTO events (program, query, label, created_at) VALUES (?, ?, ?, ?)').run('az-esa', 'laptop', 'depends', at);
    db.prepare('INSERT INTO reports (message, created_at) VALUES (?, ?)').run('wrong', at);
  }
  db.prepare('INSERT INTO subscribers (email, lang, created_at) VALUES (?, ?, ?)').run('a@example.com', 'en', '2025-01-01T00:00:00Z');
  await worker.scheduled({ scheduledTime: Date.parse('2026-10-19T15:00:00Z') }, env, {});
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM events').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM reports').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM subscribers').get().n, 1);
});
