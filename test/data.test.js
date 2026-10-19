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

test('only rules reviewed in both languages are publishable', async () => {
  const { isPublishable } = await import('../scripts/load-data.mjs');
  assert.equal(isPublishable({ review_status: 'reviewed', es_reviewed: true }), true);
  assert.equal(isPublishable({ review_status: 'reviewed', es_reviewed: false }), false);
  assert.equal(isPublishable({ review_status: 'reviewed' }), false);
  assert.equal(isPublishable({ review_status: 'draft', es_reviewed: true }), false);
});

test('es_reviewed defaults to false and every rule is still a draft', () => {
  const { rules } = loadData();
  for (const r of rules) {
    assert.equal(r.es_reviewed, false, `${r.id} es_reviewed`);
    assert.equal(r.review_status, 'draft', `${r.id} review_status`);
  }
});

test('Texas: no reimbursement, cited by statute, rule and bulletin; funding schedule as published', () => {
  const tx = loadData().programs.find((p) => p.id === 'tx-tefa');
  assert.equal(tx.reimbursement_available, false);
  assert.deepEqual(tx.reimbursement_source_ids, ['tx-sb2', 'tx-tac-16', 'tx-bulletin-2026-06-30']);
  const sched = tx.funding_schedule.map((f) => [f.segment, f.date, f.share ?? f.amount]);
  assert.deepEqual(sched, [
    ['private_school', '2026-07-01', 0.25],
    ['private_school', '2026-10-01', 0.25],
    ['private_school', '2027-02-01', 0.5],
    ['home_education', '2026-07-01', 2000],
  ]);
});

test('Texas technology rules: tier 1 source, 10% cap, conflict note and review flag; capped at depends', async () => {
  const { evaluate, LABELS } = await import('../src/lib/eligibility.js');
  const data = loadData();
  const tech = data.rules.filter((r) => r.program === 'tx-tefa' && (r.category.startsWith('tech.') || r.category === 'software.educational'));
  assert.ok(tech.length >= 8);
  for (const r of tech) {
    assert.equal(r.source, 'tx-tac-16');
    assert.equal(r.conditions.pct_of_award_cap, 0.1);
    assert.ok(r.conflict_note?.en && r.conflict_note?.es, `${r.id} conflict note`);
    assert.ok(r.review_flag, `${r.id} review flag`);
    const a = evaluate(data, { programId: 'tx-tefa', segment: 'home_education', categoryId: r.category }, '2026-10-19');
    assert.equal(a.label, LABELS.DEPENDS);
  }
  const printer3d = tech.find((r) => r.category === 'tech.printer_3d');
  assert.deepEqual(printer3d.conditions.frequency, { count: 1, per_years: 1 });
  const instruments = data.rules.find((r) => r.id === 'tx-tefa.all.instruments.musical');
  assert.equal(instruments.conditions.max_amount, 1200);
});

test('Alabama $500 note is a scope question, not two different amounts', () => {
  const { rules, programs } = loadData();
  const al = rules.filter((r) => r.program === 'al-choose' && r.conflict_note);
  assert.deepEqual(al.map((r) => r.category).sort(), ['tech.computer', 'tech.headphones', 'tech.printer', 'tech.tablet']);
  for (const r of al) {
    assert.match(r.conflict_note.en, /ask ALDOR/i);
    assert.match(r.conflict_note.en, /unclear whether/);
    assert.equal(r.conditions.max_amount, 500, 'stricter reading applied');
  }
  const guide = programs.find((p) => p.id === 'al-choose').sources.find((s) => s.id === 'al-parent-guide');
  assert.ok(guide.review_flag, 'guide year must be confirmed');
});

test('Arizona: only supplemental-material and curriculum rules carry a review flag', () => {
  const { rules, programs } = loadData();
  const flagged = rules.filter((r) => r.program === 'az-esa' && r.review_flag);
  for (const r of flagged) assert.ok(r.category === 'curriculum.packaged' || /Supplementary materials/.test(r.locator), r.id);
  assert.ok(!rules.find((r) => r.id === 'az-esa.all.tech.computer').review_flag);
  const handbook = programs.find((p) => p.id === 'az-esa').sources[0];
  assert.match(handbook.note, /ADE labels the 2025-26 handbook as current; no 2026-27 handbook has been published/);
});
