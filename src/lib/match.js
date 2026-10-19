// Deterministic matcher: maps what a parent typed to category ids using the
// synonym lists in data/categories.yaml. Returns ranked candidates, best first.

export function normalize(text) {
  return ` ${String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

// Plural-tolerant: "laptops" matches "laptop", "tabletas" matches "tableta".
const stem = (word) => {
  if (word.length <= 3 || word.endsWith('ss')) return word;
  if (/(ses|xes|ches|shes|zes)$/.test(word)) return word.slice(0, -2);
  return word.endsWith('s') ? word.slice(0, -1) : word;
};
const stemPhrase = (norm) => ` ${norm.trim().split(' ').map(stem).join(' ')} `;

export function match(categories, text) {
  const query = normalize(text);
  if (!query.trim()) return [];
  const stemmedQuery = stemPhrase(query);
  const scored = [];
  for (const category of categories) {
    let best = 0;
    const terms = [category.name.en, category.name.es, ...category.synonyms.en, ...category.synonyms.es];
    for (const term of terms) {
      const t = normalize(term);
      if (!t.trim()) continue;
      if (query.includes(t) || stemmedQuery.includes(stemPhrase(t))) {
        best = Math.max(best, t.trim().length);
      }
    }
    if (best > 0) scored.push({ categoryId: category.id, score: best });
  }
  return scored.sort((a, b) => b.score - a.score || a.categoryId.localeCompare(b.categoryId));
}
