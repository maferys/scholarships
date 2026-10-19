import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { RETENTION_MONTHS, cleanupSql, cutoffIso } from '../scripts/retention.mjs';

test('retention defaults to 12 months', () => {
  assert.equal(RETENTION_MONTHS, 12);
  assert.equal(cutoffIso(new Date('2026-10-19T02:47:13.512Z')), '2025-10-19T02:47:13Z');
  assert.equal(cutoffIso(new Date('2026-10-19T00:00:00Z'), 3), '2026-07-19T00:00:00Z');
  assert.throws(() => cleanupSql(new Date(), 0));
});

test('cleanup deletes old events and reports and keeps signups', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));
  const old = '2025-09-01T10:00:00Z';
  const recent = '2026-10-01T10:00:00.123Z';
  for (const at of [old, recent]) {
    db.prepare('INSERT INTO events (program, query, label, created_at) VALUES (?, ?, ?, ?)').run('az-esa', 'laptop', 'depends', at);
    db.prepare('INSERT INTO reports (message, created_at) VALUES (?, ?)').run('wrong', at);
  }
  db.prepare('INSERT INTO subscribers (email, lang, created_at) VALUES (?, ?, ?)').run('a@example.com', 'en', old);

  db.exec(cleanupSql(new Date('2026-10-19T00:00:00Z')));

  assert.deepEqual(db.prepare('SELECT created_at FROM events').all().map((r) => r.created_at), [recent]);
  assert.deepEqual(db.prepare('SELECT created_at FROM reports').all().map((r) => r.created_at), [recent]);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM subscribers').get().n, 1);
});
