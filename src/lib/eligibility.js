// Turns a (program, segment, category) lookup into the label a parent sees.
// This is the only place eligibility labels are decided. It never reads catalog,
// sponsorship or affiliate data, and the LLM never calls it with anything but a category id.

export const LABELS = {
  LIKELY_ELIGIBLE: 'likely_eligible',
  LIKELY_NOT_ELIGIBLE: 'likely_not_eligible',
  DEPENDS: 'depends',
  NOT_VERIFIED: 'not_verified',
};

export const MAX_RULE_AGE_DAYS = 120;
const MAX_TRUSTED_TIER = 3;
const SETTLING = new Set(['settling', 'litigated']);

const daysBetween = (from, to) => Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);

export function findRule(rules, programId, segment, categoryId) {
  const forCategory = rules.filter((r) => r.program === programId && r.category === categoryId);
  return forCategory.find((r) => r.segment === segment) ?? forCategory.find((r) => r.segment === 'all') ?? null;
}

function hasConditions(c = {}) {
  return Boolean(
    c.max_amount || c.frequency || c.pct_of_award_cap || c.requires_preapproval ||
      c.student_requirement || c.requires_documentation?.length,
  );
}

/**
 * @param {object} data      { programs, rules } as produced by scripts/build-data.mjs
 * @param {object} query     { programId, segment, categoryId }
 * @param {string} today     ISO date, e.g. "2026-10-19"
 * @returns {{label: string, reason: string, rule: object|null, program: object|null, source: object|null, notices: string[]}}
 */
export function evaluate(data, { programId, segment = 'all', categoryId }, today) {
  const program = data.programs.find((p) => p.id === programId) ?? null;
  const notices = [];
  const result = (label, reason, rule = null, source = null) => ({ label, reason, rule, program, source, notices });

  if (!program) return result(LABELS.NOT_VERIFIED, 'unknown_program');
  if (SETTLING.has(program.program_status)) notices.push('settling');
  if (program.requires_funded_account_gate) notices.push('funded_account_gate');
  if (program.program_status === 'paused') return result(LABELS.NOT_VERIFIED, 'program_paused');

  const rule = findRule(data.rules, programId, segment, categoryId);
  if (!rule) return result(LABELS.NOT_VERIFIED, 'no_rule');
  const source = program.sources.find((s) => s.id === rule.source) ?? null;

  if (!source || source.tier > MAX_TRUSTED_TIER) return result(LABELS.NOT_VERIFIED, 'untrusted_source', rule, source);
  if (today < rule.effective_from || (rule.effective_to && today > rule.effective_to)) {
    return result(LABELS.NOT_VERIFIED, 'outside_effective_dates', rule, source);
  }
  if (daysBetween(rule.last_verified, today) > MAX_RULE_AGE_DAYS) return result(LABELS.NOT_VERIFIED, 'stale', rule, source);
  if (rule.review_status !== 'reviewed' || rule.es_reviewed !== true) notices.push('draft');
  if (rule.conflict_note) notices.push('conflict');

  let label;
  let reason;
  if (rule.status === 'not_allowed') {
    [label, reason] = [LABELS.LIKELY_NOT_ELIGIBLE, 'rule_not_allowed'];
  } else if (rule.status === 'conditional') {
    [label, reason] = [LABELS.DEPENDS, 'rule_conditional'];
  } else if (rule.conditions?.requires_approved_vendor) {
    [label, reason] = [LABELS.DEPENDS, 'needs_approved_vendor'];
  } else if (hasConditions(rule.conditions)) {
    [label, reason] = [LABELS.DEPENDS, 'has_conditions'];
  } else {
    [label, reason] = [LABELS.LIKELY_ELIGIBLE, 'rule_allowed'];
  }

  // Caps: nothing above "depends" when official sources disagree, or when a settling
  // or litigated program's rule rests on anything weaker than a statute or final regulation.
  if (label !== LABELS.DEPENDS) {
    if (rule.conflict_note) [label, reason] = [LABELS.DEPENDS, 'sources_conflict'];
    else if (SETTLING.has(program.program_status) && source.tier !== 1) [label, reason] = [LABELS.DEPENDS, 'program_settling'];
  }
  return result(label, reason, rule, source);
}
