// Validates data/ and writes src/generated/data.json for the site.
// Draft rules are left out unless INCLUDE_DRAFT_RULES=true (local dev and previews).
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadData } from './load-data.mjs';

const includeDrafts = process.env.INCLUDE_DRAFT_RULES === 'true';
const { categories, programs, rules, tips, errors } = loadData();

if (errors.length) {
  console.error(`Data validation failed (${errors.length}):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

const published = rules.filter((r) => includeDrafts || r.review_status === 'reviewed');
const out = new URL('../src/generated/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(
  new URL('data.json', out),
  JSON.stringify({ includeDrafts, categories, programs, rules: published, tips }, null, 2),
);
console.log(
  `Data OK: ${categories.length} categories, ${programs.length} programs, ` +
    `${published.length}/${rules.length} rules published${includeDrafts ? ' (drafts included)' : ''}.`,
);
