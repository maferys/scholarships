import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, findRule, LABELS } from '../src/lib/eligibility.js';

const TODAY = '2026-10-19';
const source = (id, tier = 2) => ({ id, tier, title: id, publisher: 'x', url: 'https://example.gov', retrieved_at: TODAY });
const program = (over = {}) => ({
  id: 'zz-esa', program_status: 'active', requires_funded_account_gate: false,
  student_segments: ['all'], sources: [source('s1'), source('blog', 4)], ...over,
});
const rule = (over = {}) => ({
  program: 'zz-esa', segment: 'all', category: 'tech.computer', status: 'allowed', conditions: {},
  source: 's1', effective_from: '2026-07-01', effective_to: null, last_verified: '2026-10-01',
  review_status: 'reviewed', ...over,
});
const run = (p, rules, q = {}) => evaluate({ programs: [p], rules }, { programId: 'zz-esa', categoryId: 'tech.computer', ...q }, TODAY);

test('allowed rule with no conditions is likely eligible', () => {
  assert.equal(run(program(), [rule()]).label, LABELS.LIKELY_ELIGIBLE);
});

test('not_allowed and conditional map to their labels', () => {
  assert.equal(run(program(), [rule({ status: 'not_allowed' })]).label, LABELS.LIKELY_NOT_ELIGIBLE);
  assert.equal(run(program(), [rule({ status: 'conditional' })]).label, LABELS.DEPENDS);
});

test('missing rule or unknown program is not verified', () => {
  assert.equal(run(program(), []).label, LABELS.NOT_VERIFIED);
  assert.equal(evaluate({ programs: [], rules: [] }, { programId: 'nope', categoryId: 'x' }, TODAY).label, LABELS.NOT_VERIFIED);
});

test('stale, out-of-date-range and untrusted-source rules are not verified', () => {
  assert.equal(run(program(), [rule({ last_verified: '2026-01-01' })]).reason, 'stale');
  assert.equal(run(program(), [rule({ effective_to: '2026-06-30' })]).reason, 'outside_effective_dates');
  assert.equal(run(program(), [rule({ effective_from: '2027-07-01' })]).reason, 'outside_effective_dates');
  assert.equal(run(program(), [rule({ source: 'blog' })]).reason, 'untrusted_source');
});

test('settling programs never show likely eligible and always carry the banner', () => {
  const r = run(program({ program_status: 'settling' }), [rule()]);
  assert.equal(r.label, LABELS.DEPENDS);
  assert.ok(r.notices.includes('settling'));
  assert.equal(run(program({ program_status: 'litigated' }), [rule({ status: 'not_allowed' })]).label, LABELS.LIKELY_NOT_ELIGIBLE);
});

test('paused programs are not verified', () => {
  assert.equal(run(program({ program_status: 'paused' }), [rule()]).label, LABELS.NOT_VERIFIED);
});

test('vendor approval, caps and conflicts downgrade allowed to depends', () => {
  assert.equal(run(program(), [rule({ conditions: { requires_approved_vendor: true } })]).reason, 'needs_approved_vendor');
  assert.equal(run(program(), [rule({ conditions: { max_amount: 1200 } })]).reason, 'has_conditions');
  const conflict = run(program(), [rule({ conflict_note: 'differs' })]);
  assert.equal(conflict.label, LABELS.DEPENDS);
  assert.ok(conflict.notices.includes('conflict'));
});

test('funded-account gate and draft notices are attached', () => {
  const r = run(program({ requires_funded_account_gate: true }), [rule({ review_status: 'draft' })]);
  assert.ok(r.notices.includes('funded_account_gate'));
  assert.ok(r.notices.includes('draft'));
});

test('segment-specific rule wins over the all-students rule', () => {
  const rules = [rule({ status: 'allowed' }), rule({ segment: 'home_education', status: 'not_allowed' })];
  assert.equal(findRule(rules, 'zz-esa', 'home_education', 'tech.computer').status, 'not_allowed');
  assert.equal(findRule(rules, 'zz-esa', 'private_school', 'tech.computer').status, 'allowed');
});

test('extra catalog fields such as sponsored never change the label', () => {
  const plain = run(program(), [rule()]);
  const sponsored = run(program(), [rule({ sponsored: true, affiliate: true, owned_by_site_creator: true })]);
  assert.equal(sponsored.label, plain.label);
});
