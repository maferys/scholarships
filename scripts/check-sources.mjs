// Fetches every source URL in data/programs and compares its sha256 with the stored one.
// Prints a Markdown list of sources that changed, have no stored hash, or failed to load.
// To accept a change: re-verify the affected rules, then update the source's sha256.
import { createHash } from 'node:crypto';
import { loadData } from './load-data.mjs';

const { programs } = loadData();
const lines = [];
for (const program of programs) {
  for (const source of program.sources) {
    const label = `**${program.id}** · [${source.title}](${source.url})`;
    try {
      const res = await fetch(source.url, { redirect: 'follow', headers: { 'user-agent': 'scholarships-source-check' } });
      if (!res.ok) {
        lines.push(`- ${label}: HTTP ${res.status}`);
        continue;
      }
      const hash = createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex');
      if (!source.sha256) lines.push(`- ${label}: no stored hash yet, current is \`${hash}\``);
      else if (source.sha256 !== hash) lines.push(`- ${label}: CHANGED, new hash \`${hash}\``);
    } catch (err) {
      lines.push(`- ${label}: failed to load (${err.message})`);
    }
  }
}
if (lines.length) console.log(`Sources needing attention:\n\n${lines.join('\n')}`);
