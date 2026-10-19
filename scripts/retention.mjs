// Prints the retention cleanup SQL, for running by hand with `wrangler d1 execute`.
// The rules live in src/lib/retention.js.
import { fileURLToPath } from 'node:url';
import { cleanupSql } from '../src/lib/retention.js';

export { RETENTION_MONTHS, RETAINED_TABLES, cutoffIso, cleanupSql } from '../src/lib/retention.js';

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(cleanupSql());
