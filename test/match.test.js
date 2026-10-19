import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { match, normalize } from '../src/lib/match.js';

const categories = parse(readFileSync(new URL('../data/categories.yaml', import.meta.url), 'utf8'));
const top = (q) => match(categories, q)[0]?.categoryId;

// Real-style questions parents ask, in both languages.
const CASES = [
  ['are laptops ESA eligible in Arizona?', 'tech.computer'],
  ['wireless keyboard', 'tech.keyboard'],
  ['teclado para la computadora', 'tech.keyboard'],
  ['keyboard piano', 'instruments.musical'],
  ['iPad', 'tech.tablet'],
  ['Saxon Math workbook', 'curriculum.packaged'],
  ['piano lessons', 'edu.lessons.music'],
  ['online Spanish classes', 'edu.lessons.language'],
  ['clases de piano', 'edu.lessons.music'],
  ['¿Puedo comprar una computadora?', 'tech.computer'],
  ['tabletas', 'tech.tablet'],
  ['útiles escolares', 'supplies.school'],
  ['speech therapy', 'edu.therapy'],
  ['Xbox', 'tech.game_console'],
  ['iPhone', 'tech.phone'],
  ['phones', 'tech.phone'],
  ['museum tickets', 'edu.field_trip'],
  ['uniforme escolar', 'clothing.uniform'],
  ['math tutor', 'edu.tutoring'],
  ['SAT test fee', 'edu.testing'],
  ['clases en línea', 'edu.online_classes'],
];

for (const [query, expected] of CASES) {
  test(`"${query}" → ${expected}`, () => assert.equal(top(query), expected));
}

test('nonsense and empty input match nothing', () => {
  assert.deepEqual(match(categories, ''), []);
  assert.deepEqual(match(categories, 'qwertyuiop'), []);
});

test('normalize strips accents and punctuation', () => {
  assert.equal(normalize('¿Útiles, ESCOLARES?'), ' utiles escolares ');
});
