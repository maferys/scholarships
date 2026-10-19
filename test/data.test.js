import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from '../scripts/load-data.mjs';

test('data files are valid and cross-referenced', () => {
  const { errors, rules, programs } = loadData();
  assert.deepEqual(errors, []);
  assert.ok(programs.length >= 3);
  assert.ok(rules.length > 0);
});

test('every program has a submit tip and every rule cites a trusted source', () => {
  const { rules, programs, tips } = loadData();
  for (const p of programs) assert.ok(tips[p.id], `missing submit tip for ${p.id}`);
  for (const r of rules) {
    const src = programs.find((p) => p.id === r.program).sources.find((s) => s.id === r.source);
    assert.ok(src.tier <= 3, `${r.id} relies on a tier ${src.tier} source`);
  }
});
