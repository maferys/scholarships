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

test('Texas technology rules: statute source, approved-vendor condition, 10% cap, no conflict note; still depends', async () => {
  const { evaluate, LABELS } = await import('../src/lib/eligibility.js');
  const data = loadData();
  const tx = data.programs.find((p) => p.id === 'tx-tefa');
  const tier = (id) => tx.sources.find((s) => s.id === id).tier;
  const tech = data.rules.filter((r) => r.program === 'tx-tefa' && (r.category.startsWith('tech.') || r.category === 'software.educational'));
  assert.ok(tech.length >= 9);
  assert.ok(tech.find((r) => r.category === 'tech.keyboard'));
  for (const r of tech) {
    assert.equal(r.status, 'conditional');
    assert.equal(r.source, 'tx-sb2');
    assert.equal(tier(r.source), 1);
    assert.match(r.locator, /§29\.359\(a\)\(8\)/);
    assert.match(r.locator, /16\.406\(9\)/);
    assert.deepEqual(r.supporting_sources, ['tx-tac-16', 'odyssey-purchase-restrictions']);
    assert.equal(tier('odyssey-purchase-restrictions'), 3);
    assert.equal(r.conditions.pct_of_award_cap, 0.1);
    assert.equal(r.conditions.requires_approved_vendor, true);
    assert.equal(r.conflict_note, undefined, `${r.id} has no conflict note`);
    assert.match(r.review_flag, /codified text of 34 TAC §16\.406\(9\)/);
    assert.match(r.conditions_text.en, /only if an approved education provider or vendor requires it, for example an online course\. Being a homeschool family does not qualify on its own\./);
    assert.match(r.conditions_text.es, /solo se permite si la exige un proveedor o vendedor educativo aprobado, por ejemplo un curso en línea\. Ser una familia que educa en casa no basta por sí solo\./);
    for (const segment of ['home_education', 'private_school']) {
      const a = evaluate(data, { programId: 'tx-tefa', segment, categoryId: r.category }, '2026-10-19');
      assert.equal(a.label, LABELS.DEPENDS, `${r.id} ${segment}`);
      assert.ok(!a.notices.includes('conflict'), `${r.id} no conflict notice`);
    }
  }
  const printer3d = tech.find((r) => r.category === 'tech.printer_3d');
  assert.deepEqual(printer3d.conditions.frequency, { count: 1, per_years: 1 });
  const instruments = data.rules.find((r) => r.id === 'tx-tefa.all.instruments.musical');
  assert.equal(instruments.conditions.max_amount, 1200);
});

test('Alabama $500 note is a scope question, not two different amounts', () => {
  const { rules, programs } = loadData();
  const al = rules.filter((r) => r.program === 'al-choose' && r.conflict_note);
  assert.deepEqual(al.map((r) => r.category).sort(), ['tech.computer', 'tech.headphones', 'tech.keyboard', 'tech.printer', 'tech.tablet']);
  for (const r of al) {
    assert.match(r.conflict_note.en, /ask ALDOR/i);
    assert.match(r.conflict_note.en, /unclear whether/);
  }
  for (const c of ['tech.computer', 'tech.tablet', 'tech.printer']) {
    assert.equal(al.find((r) => r.category === c).conditions.max_amount, 500, `${c}: stricter reading applied`);
  }
  const guide = programs.find((p) => p.id === 'al-choose').sources.find((s) => s.id === 'al-parent-guide');
  assert.ok(guide.review_flag, 'guide year must be confirmed');
});

test('Alabama: tablets share the computer limit; headphones and keyboards quote the guide', () => {
  const { rules } = loadData();
  const get = (c) => rules.find((r) => r.id === `al-choose.all.${c}`);
  for (const c of ['tech.computer', 'tech.tablet']) assert.deepEqual(get(c).conditions.frequency, { count: 1, per_years: 2 });
  for (const [c, quote] of [
    ['tech.headphones', 'Headphones / Headsets (limited to $100 each, two per participating student annually)'],
    ['tech.keyboard', 'Keyboards (limited to $100 each, two per participating student annually)'],
  ]) {
    const r = get(c);
    assert.equal(r.source, 'al-parent-guide');
    assert.equal(r.quote, quote);
    assert.match(r.locator, /p\. 10/);
    assert.equal(r.conditions.max_amount, 100);
    assert.deepEqual(r.conditions.frequency, { count: 2, per_years: 1 });
    assert.equal(r.review_status, 'draft');
    assert.equal(r.es_reviewed, false);
  }
});

test('Arizona: only supplemental-material and curriculum rules carry a review flag', () => {
  const { rules, programs } = loadData();
  const flagged = rules.filter((r) => r.program === 'az-esa' && r.review_flag);
  for (const r of flagged) assert.ok(r.category === 'curriculum.packaged' || /Supplementary materials/.test(r.locator), r.id);
  assert.ok(!rules.find((r) => r.id === 'az-esa.all.tech.computer').review_flag);
  const handbook = programs.find((p) => p.id === 'az-esa').sources[0];
  assert.match(handbook.note, /ADE labels the 2025-26 handbook as current; no 2026-27 handbook has been published/);
});
