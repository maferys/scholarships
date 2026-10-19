// Data retention: search events and wrong-answer reports are deleted once they are older
// than RETENTION_MONTHS. Signups are kept until the person unsubscribes.
// The Worker's weekly cron (worker/index.js) runs this; `node scripts/retention.mjs` prints the SQL.

export const RETENTION_MONTHS = 12;
export const RETAINED_TABLES = ['events', 'reports'];

// Cutoff as an ISO timestamp, RETENTION_MONTHS before `now` (UTC).
export function cutoffIso(now = new Date(), months = RETENTION_MONTHS) {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function checkMonths(months) {
  if (!Number.isInteger(months) || months < 1) throw new Error(`RETENTION_MONTHS must be a positive integer, got ${months}`);
}

export function cleanupSql(now = new Date(), months = RETENTION_MONTHS) {
  checkMonths(months);
  const cutoff = cutoffIso(now, months);
  return RETAINED_TABLES.map((t) => `DELETE FROM ${t} WHERE created_at < '${cutoff}';`).join(' ');
}

// Runs the cleanup against a D1 binding, one bound statement per table.
export async function runCleanup(db, now = new Date(), months = RETENTION_MONTHS) {
  checkMonths(months);
  const cutoff = cutoffIso(now, months);
  return db.batch(RETAINED_TABLES.map((t) => db.prepare(`DELETE FROM ${t} WHERE created_at < ?`).bind(cutoff)));
}
