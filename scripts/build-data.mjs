// Validates data/ and writes src/generated/data.json for the site.
// Only rules reviewed in both languages are published, except in dev and preview builds (see shouldIncludeDrafts).
import { mkdirSync, writeFileSync } from 'node:fs';
import { isPublishable, loadData, shouldIncludeDrafts } from './load-data.mjs';

const includeDrafts = shouldIncludeDrafts();
const { categories, programs, rules, tips, errors } = loadData();

if (errors.length) {
  console.error(`Data validation failed (${errors.length}):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

const published = rules.filter((r) => includeDrafts || isPublishable(r));
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
