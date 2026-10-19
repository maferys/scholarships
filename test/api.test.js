import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hourTimestamp, sanitizeQuery } from '../functions/api/_shared.js';
import { onRequestPost as postEvent } from '../functions/api/event.js';
import { onRequestPost as postReport } from '../functions/api/report.js';

function fakeDb() {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return { bind: (...args) => ({ run: async () => calls.push({ sql, args }) }) };
    },
  };
}

const beacon = (body, headers = {}) =>
  new Request('https://example.com/api/event', {
    method: 'POST',
    headers: { 'content-type': 'text/plain', 'user-agent': 'Test/1.0', 'cf-connecting-ip': '203.0.113.9', ...headers },
    body: JSON.stringify(body),
  });

test('sanitizeQuery strips emails and phone numbers and normalizes', () => {
  assert.equal(sanitizeQuery('  Laptop for MARIA@example.com  please '), 'laptop for please');
  assert.equal(sanitizeQuery('call me 602-364-1969 about tutoring'), 'call me about tutoring');
  assert.equal(sanitizeQuery('(602) 364 1969'), null);
  assert.equal(sanitizeQuery('+1 602.364.1969 piano'), 'piano');
  assert.equal(sanitizeQuery('TI-84 calculator'), 'ti-84 calculator', 'short numbers stay');
  assert.equal(sanitizeQuery('grade 3 math 2026'), 'grade 3 math 2026');
  assert.equal(sanitizeQuery(42), null);
  assert.equal(sanitizeQuery('x'.repeat(500)).length, 120);
});

test('hourTimestamp rounds down to the hour', () => {
  assert.equal(hourTimestamp(new Date('2026-10-19T02:47:13.512Z')), '2026-10-19T02:00:00Z');
});

test('event endpoint stores only program, sanitized query, label and hour', async () => {
  const DB = fakeDb();
  const res = await postEvent({
    request: beacon({
      program: 'az-esa', query: 'iPad for jo@mail.com 555-123-4567', label: 'likely_eligible',
      segment: 'home_education', category: 'tech.tablet', lang: 'es', email: 'jo@mail.com', name: 'Jo',
    }),
    env: { DB },
  });
  assert.equal(res.status, 200);
  assert.equal(DB.calls.length, 1);
  const { sql, args } = DB.calls[0];
  assert.match(sql, /INSERT INTO events \(program, query, label, created_at\)/);
  assert.equal(args.length, 4);
  const [program, query, label, createdAt] = args;
  assert.equal(program, 'az-esa');
  assert.equal(query, 'ipad for');
  assert.equal(label, 'likely_eligible');
  assert.match(createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/);
  const stored = JSON.stringify(args);
  for (const leaked of ['203.0.113.9', 'Test/1.0', 'jo@mail.com', 'home_education', 'Jo', '555']) {
    assert.ok(!stored.includes(leaked), `must not store ${leaked}`);
  }
});

test('event endpoint rejects a malformed body without writing', async () => {
  const DB = fakeDb();
  const request = new Request('https://example.com/api/event', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'not json' });
  const res = await postEvent({ request, env: { DB } });
  assert.equal(res.status, 400);
  assert.equal(DB.calls.length, 0);
});

test('report endpoint cleans the search text and keeps the contact email as given', async () => {
  const DB = fakeDb();
  const request = new Request('https://example.com/api/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      program: 'tx-tefa', category: 'tech.computer', rule: 'tx-tefa.all.tech.computer', label: 'depends',
      query: 'Laptop for Ana ana@mail.com 512 555 0199 grades 2026-2027',
      message: 'This looks wrong', email: 'Parent.Name+tefa@Example.com', lang: 'es',
    }),
  });
  const res = await postReport({ request, env: { DB } });
  assert.equal(res.status, 200);
  const { sql, args } = DB.calls[0];
  const cols = sql.match(/\(([^)]+)\) VALUES/)[1].split(',').map((c) => c.trim());
  const row = Object.fromEntries(cols.map((c, i) => [c, args[i]]));
  assert.equal(row.query, 'laptop for ana grades');
  assert.equal(row.email, 'Parent.Name+tefa@Example.com');
  assert.equal(row.message, 'This looks wrong');
});
