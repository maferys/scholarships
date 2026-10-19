// Data retention: search events and wrong-answer reports are deleted once they are older
// than RETENTION_MONTHS. Signups are kept until the person unsubscribes.
// Run by .github/workflows/retention.yml; `node scripts/retention.mjs` prints the SQL.
import { fileURLToPath } from 'node:url';

export const RETENTION_MONTHS = 12;
export const RETAINED_TABLES = ['events', 'reports'];

// Cutoff as an ISO timestamp, RETENTION_MONTHS before `now` (UTC).
export function cutoffIso(now = new Date(), months = RETENTION_MONTHS) {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function cleanupSql(now = new Date(), months = RETENTION_MONTHS) {
  if (!Number.isInteger(months) || months < 1) throw new Error(`RETENTION_MONTHS must be a positive integer, got ${months}`);
  const cutoff = cutoffIso(now, months);
  return RETAINED_TABLES.map((t) => `DELETE FROM ${t} WHERE created_at < '${cutoff}';`).join(' ');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(cleanupSql());
