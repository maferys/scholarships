import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { strings } from '../src/i18n/strings.js';

const { window } = parseHTML('<!doctype html><html><body></body></html>');
globalThis.document = window.document;
globalThis.Node = window.Node;
const { renderAnswer } = await import('../src/scripts/finder-render.js');

const program = {
  id: 'zz-esa', state: 'ZZ', name: { en: 'Test ESA', es: 'ESA de prueba' },
  administrator: { name: 'Admin', url: 'https://example.gov' },
};
const rule = {
  id: 'zz-esa.all.tech.computer', status: 'conditional', conditions: {}, locator: 'p. 1', quote: null,
  last_verified: '2026-10-18', conditions_text: { en: 'Capped.', es: 'Con límite.' },
  conflict_note: { en: 'The cap scope is unclear.', es: 'El alcance del límite no está claro.' },
  review_flag: 'Ask the administrator.',
};
const answer = (over = {}) => ({
  label: 'depends', reason: 'sources_conflict', program, rule,
  source: { title: 'Handbook', url: 'https://example.gov/h.pdf' }, notices: ['conflict', 'draft'], ...over,
});
const category = { id: 'tech.computer', name: { en: 'Computer', es: 'Computadora' } };

for (const lang of ['en', 'es']) {
  test(`conflict note is shown inline and visible (${lang})`, () => {
    const card = renderAnswer({ answer: answer(), category, lang, s: strings[lang], tip: null, query: 'laptop' });
    const note = card.querySelector('.conflict');
    assert.ok(note, 'conflict note element exists');
    assert.ok(note.textContent.includes(rule.conflict_note[lang]));
    assert.ok(note.textContent.includes(strings[lang].conflictTitle));
    for (let n = note; n && n !== card; n = n.parentNode) {
      assert.ok(!n.hasAttribute?.('hidden'), 'no hidden ancestor');
      assert.notEqual(n.tagName, 'DETAILS', 'not inside a collapsed details element');
    }
  });
}

test('no conflict element without a conflict note', () => {
  const card = renderAnswer({
    answer: answer({ rule: { ...rule, conflict_note: undefined }, notices: [] }),
    category, lang: 'en', s: strings.en, tip: null, query: 'laptop',
  });
  assert.equal(card.querySelector('.conflict'), null);
});
