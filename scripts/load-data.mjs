// Loads and validates everything under data/. Used by build-data.mjs and the tests.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ROOT = new URL('..', import.meta.url).pathname;

const readYaml = (path) => parse(readFileSync(path, 'utf8'));
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const yamlFiles = (dir) => readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort();

const REQUIRED_RULE_FIELDS = [
  'category', 'segment', 'status', 'conditions_text', 'source', 'locator',
  'effective_from', 'last_verified', 'verified_by', 'review_status', 'es_reviewed',
];

// A rule reaches the live site only after a person reviewed both the rule and its Spanish text.
export const isPublishable = (rule) => rule.review_status === 'reviewed' && rule.es_reviewed === true;

export function loadData(root = ROOT) {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validators = {
    category: ajv.compile(readJson(join(root, 'schema/category.schema.json'))),
    program: ajv.compile(readJson(join(root, 'schema/program.schema.json'))),
    rules: ajv.compile(readJson(join(root, 'schema/rules.schema.json'))),
  };
  const errors = [];
  const check = (kind, value, file) => {
    if (!validators[kind](value)) {
      for (const e of validators[kind].errors) errors.push(`${file}: ${e.instancePath || '/'} ${e.message}`);
      return false;
    }
    return true;
  };

  const categoriesFile = 'data/categories.yaml';
  const categories = readYaml(join(root, categoriesFile));
  check('category', categories, categoriesFile);
  const categoryIds = new Set();
  for (const c of categories ?? []) {
    if (categoryIds.has(c.id)) errors.push(`${categoriesFile}: duplicate category id ${c.id}`);
    categoryIds.add(c.id);
  }

  const programs = [];
  for (const f of yamlFiles(join(root, 'data/programs'))) {
    const file = `data/programs/${f}`;
    const p = readYaml(join(root, file));
    if (!check('program', p, file)) continue;
    if (`${p.id}.yaml` !== f) errors.push(`${file}: file name must match program id ${p.id}`);
    const sourceIds = new Set(p.sources.map((s) => s.id));
    const cited = [
      ...(p.reimbursement_source_ids ?? []),
      ...(p.funding_schedule ?? []).flatMap((f) => [f.source, ...(f.supporting_sources ?? [])]),
    ];
    for (const id of cited) if (!sourceIds.has(id)) errors.push(`${file}: unknown source ${id}`);
    programs.push(p);
  }
  const programById = new Map(programs.map((p) => [p.id, p]));

  const rules = [];
  const tips = {};
  for (const f of yamlFiles(join(root, 'data/rules'))) {
    const file = `data/rules/${f}`;
    const doc = readYaml(join(root, file));
    if (!check('rules', doc, file)) continue;
    const program = programById.get(doc.program);
    if (!program) {
      errors.push(`${file}: unknown program ${doc.program}`);
      continue;
    }
    tips[program.id] = doc.submit_tip;
    const seen = new Set();
    for (const [i, raw] of doc.rules.entries()) {
      const where = `${file}: rules[${i}] (${raw.category ?? '?'})`;
      const rule = {
        es_reviewed: false,
        ...doc.defaults,
        ...raw,
        conditions: { ...(doc.defaults.conditions ?? {}), ...(raw.conditions ?? {}) },
        program: program.id,
      };
      for (const field of REQUIRED_RULE_FIELDS) {
        if (rule[field] === undefined) errors.push(`${where}: missing ${field}`);
      }
      if (!categoryIds.has(rule.category)) errors.push(`${where}: unknown category ${rule.category}`);
      for (const id of [rule.source, ...(rule.supporting_sources ?? [])]) {
        if (!program.sources.some((s) => s.id === id)) errors.push(`${where}: unknown source ${id}`);
      }
      if (rule.segment !== 'all' && !program.student_segments.includes(rule.segment)) {
        errors.push(`${where}: segment ${rule.segment} is not a segment of ${program.id}`);
      }
      if (rule.effective_to && rule.effective_to < rule.effective_from) errors.push(`${where}: effective_to before effective_from`);
      const key = `${rule.segment}/${rule.category}`;
      if (seen.has(key)) errors.push(`${where}: duplicate rule for ${key}`);
      seen.add(key);
      rule.id = `${program.id}.${rule.segment}.${rule.category}`;
      rules.push(rule);
    }
  }

  return { categories, programs, rules, tips, errors };
}
