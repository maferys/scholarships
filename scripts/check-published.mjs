// CI gate: fails if the generated site data contains any rule that is not reviewed in both languages.
// Run after a production `npm run data` (without INCLUDE_DRAFT_RULES).
import { readFileSync } from 'node:fs';
import { isPublishable } from './load-data.mjs';

const data = JSON.parse(readFileSync(new URL('../src/generated/data.json', import.meta.url), 'utf8'));
if (data.includeDrafts) {
  console.error('Generated data includes draft rules; rebuild without INCLUDE_DRAFT_RULES before publishing.');
  process.exit(1);
}
const bad = data.rules.filter((r) => !isPublishable(r));
if (bad.length) {
  console.error(`Unpublishable rules in site data:\n  ${bad.map((r) => `${r.id} (review_status=${r.review_status}, es_reviewed=${r.es_reviewed})`).join('\n  ')}`);
  process.exit(1);
}
console.log(`Publish check OK: ${data.rules.length} rules, all reviewed in English and Spanish.`);
