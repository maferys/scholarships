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
  const tech = data.rules.filter((r) => r.program === 'tx-tefa' && r.status !== 'not_allowed' && (r.category.startsWith('tech.') || r.category === 'software.educational'));
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
    assert.match(r.conditions_text.en, /only if an approved education provider or vendor requires it, for example an online course, or a physician prescribes it\. Being a homeschool family does not qualify on its own\./);
    assert.match(r.conditions_text.es, /solo se permite si la exige un proveedor o vendedor educativo aprobado, por ejemplo un curso en línea, o si la receta un médico\. Ser una familia que educa en casa no basta por sí solo\./);
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

test('Arizona: review flags only on supplemental materials, curriculum and printer ink', () => {
  const { rules, programs } = loadData();
  const flagged = rules.filter((r) => r.program === 'az-esa' && r.review_flag);
  for (const r of flagged) {
    assert.ok(r.category === 'curriculum.packaged' || r.category === 'tech.printer' || r.supporting_sources?.includes('az-settlement-2026'), r.id);
  }
  assert.ok(!rules.find((r) => r.id === 'az-esa.all.tech.computer').review_flag);
  const handbook = programs.find((p) => p.id === 'az-esa').sources[0];
  assert.match(handbook.note, /ADE labels the 2025-26 handbook as current; no 2026-27 handbook has been published/);
});
test('Arizona settlement: general supplemental list stays eligible with an attestation; curriculum-required items depend', async () => {
  const { evaluate, LABELS } = await import('../src/lib/eligibility.js');
  const data = loadData();
  const az = data.programs.find((p) => p.id === 'az-esa');
  assert.equal(az.sources.find((s) => s.id === 'az-settlement-2026').tier, 2);
  const label = (c) => evaluate(data, { programId: 'az-esa', categoryId: c }, '2026-10-19').label;
  for (const c of ['books.textbooks', 'supplies.school', 'supplies.art', 'software.educational', 'sports.equipment', 'instruments.accessories']) {
    assert.equal(label(c), LABELS.LIKELY_ELIGIBLE, c);
    assert.match(data.rules.find((r) => r.id === `az-esa.all.${c}`).conditions_text.en, /attest that it supports a curriculum/);
  }
  for (const c of ['instruments.musical', 'edu.field_trip', 'edu.camp', 'watch.general']) {
    const r = data.rules.find((x) => x.id === `az-esa.all.${c}`);
    assert.deepEqual(r.conditions.requires_documentation, ['curriculum_documentation'], c);
    assert.equal(label(c), LABELS.DEPENDS, c);
  }
  assert.equal(label('edu.online_classes'), LABELS.DEPENDS);
  assert.equal(label('tech.smartwatch'), LABELS.LIKELY_NOT_ELIGIBLE);
  assert.equal(data.rules.find((r) => r.id === 'az-esa.all.tech.computer').conditions.max_amount, undefined, 'adopted handbook has no laptop cap');
});

test('Texas checklist: tuition, instructional materials and uniforms likely eligible; consoles not eligible', async () => {
  const { evaluate, LABELS } = await import('../src/lib/eligibility.js');
  const data = loadData();
  const label = (c, segment = 'private_school') => evaluate(data, { programId: 'tx-tefa', segment, categoryId: c }, '2026-10-19').label;
  for (const c of ['edu.private_school_tuition', 'books.textbooks', 'curriculum.packaged', 'clothing.uniform']) assert.equal(label(c), LABELS.LIKELY_ELIGIBLE, c);
  for (const c of ['books.textbooks', 'curriculum.packaged']) assert.equal(label(c, 'home_education'), LABELS.LIKELY_ELIGIBLE, c);
  for (const c of ['edu.tutoring', 'edu.online_classes', 'edu.therapy']) assert.equal(label(c, 'home_education'), LABELS.DEPENDS, c);
  assert.equal(label('tech.game_console', 'home_education'), LABELS.LIKELY_NOT_ELIGIBLE);
  const therapy = data.rules.find((r) => r.id === 'tx-tefa.all.edu.therapy');
  assert.match(therapy.conditions_text.en, /private insurance/);
  const tutoring = data.rules.find((r) => r.id === 'tx-tefa.all.edu.tutoring');
  assert.match(tutoring.conditions_text.en, /within 30 days/);
  for (const r of data.rules.filter((x) => x.program !== 'nh-efa')) assert.equal(r.review_status, 'draft', r.id);
});

test('Texas funds explainer matches the Comptroller pages', () => {
  const tx = loadData().programs.find((p) => p.id === 'tx-tefa');
  const award = tx.award_amounts.find((a) => a.segment === 'private_school').amount;
  assert.equal(award, 10474);
  for (const lang of ['en', 'es']) {
    const note = tx.who_gets_funds_note[lang];
    assert.ok(note.includes('$10,474') && note.includes('$2,000') && note.includes('$30,000'), lang);
    assert.ok(/25%.*25%.*50%/.test(note), `${lang} installments in order`);
  }
});

test('New Hampshire: tier 1 sources, CSF caps, drafts only', async () => {
  const { evaluate, LABELS } = await import('../src/lib/eligibility.js');
  const data = loadData();
  const nh = data.programs.find((p) => p.id === 'nh-efa');
  assert.equal(nh.sources.find((s) => s.id === 'csf-parent-handbook').tier, 4);
  const rules = data.rules.filter((r) => r.program === 'nh-efa');
  for (const r of rules) {
    assert.ok(nh.sources.find((s) => s.id === r.source).tier <= 3, r.id);
    assert.equal(r.review_status, 'draft');
    assert.equal(r.es_reviewed, false);
  }
  const get = (c) => rules.find((r) => r.category === c);
  assert.deepEqual(get('tech.computer').conditions, { max_amount: 3600, frequency: { count: 1, per_years: 3 } });
  assert.equal(get('tech.tablet').conditions.max_amount, 1600);
  const label = (c) => evaluate(data, { programId: 'nh-efa', categoryId: c }, '2026-10-19').label;
  assert.equal(label('tech.computer'), LABELS.DEPENDS);
  assert.equal(label('edu.private_school_tuition'), LABELS.LIKELY_ELIGIBLE);
  assert.equal(label('tech.game_console'), LABELS.NOT_VERIFIED, 'CSF-only items are held');
  assert.ok(evaluate(data, { programId: 'nh-efa', categoryId: 'books.textbooks' }, '2026-10-19').notices.includes('funded_account_gate'));
});

test('drafts are never published by a Pages production build', async () => {
  const { shouldIncludeDrafts } = await import('../scripts/load-data.mjs');
  assert.equal(shouldIncludeDrafts({ CF_PAGES: '1', CF_PAGES_BRANCH: 'main' }), false);
  assert.equal(shouldIncludeDrafts({ CF_PAGES: '1', CF_PAGES_BRANCH: 'main', INCLUDE_DRAFT_RULES: 'true' }), false);
  assert.equal(shouldIncludeDrafts({ CF_PAGES: '1', CF_PAGES_BRANCH: 'phase1-finder' }), true);
  assert.equal(shouldIncludeDrafts({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main' }), false);
  assert.equal(shouldIncludeDrafts({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main', INCLUDE_DRAFT_RULES: 'true' }), false);
  assert.equal(shouldIncludeDrafts({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'phase1-finder' }), true);
  assert.equal(shouldIncludeDrafts({ INCLUDE_DRAFT_RULES: 'true' }), true);
  assert.equal(shouldIncludeDrafts({}), false);
});

test('gap rules added 2026-10-19 get the expected labels', async () => {
  const { evaluate } = await import('../src/lib/eligibility.js');
  const data = loadData();
  const label = (programId, categoryId, segment = 'home_education') =>
    evaluate(data, { programId, segment, categoryId }, new Date('2026-10-19')).label;
  assert.equal(label('al-choose', 'tech.printer_3d'), 'likely_not_eligible');
  assert.equal(label('al-choose', 'toys.general'), 'likely_not_eligible');
  assert.equal(label('al-choose', 'edu.lessons.language'), 'depends');
  assert.equal(label('az-esa', 'tech.calculator'), 'likely_eligible');
  assert.equal(label('tx-tefa', 'tech.phone'), 'likely_not_eligible');
  assert.equal(label('tx-tefa', 'supplies.art'), 'depends');
  assert.equal(label('tx-tefa', 'edu.lessons.music'), 'depends');
});

test('Missouri and Wyoming are settling: only tier 1 rules keep a firm label', async () => {
  const { evaluate } = await import('../src/lib/eligibility.js');
  const data = loadData();
  const label = (programId, categoryId) => evaluate(data, { programId, segment: 'all', categoryId }, new Date('2026-10-19')).label;
  assert.equal(label('mo-moscholars', 'tech.phone'), 'likely_not_eligible');
  assert.equal(label('mo-moscholars', 'supplies.school'), 'likely_not_eligible');
  assert.equal(label('mo-moscholars', 'instruments.musical'), 'depends');
  assert.equal(label('mo-moscholars', 'tech.headphones'), 'depends');
  assert.equal(label('wy-esa', 'tech.computer'), 'likely_eligible');
  assert.equal(label('wy-esa', 'tech.phone'), 'depends');
  assert.equal(label('wy-esa', 'edu.lessons.music'), 'depends');
});
