import test from 'node:test';
import assert from 'node:assert/strict';
import { homeFallback, seasonalCards } from './homeContent.js';

test('no sustituye contenido Django con datos de ejemplo', () => {
  const examples = [{ id: 'example' }];
  assert.deepEqual(homeFallback(true, examples), []);
  assert.equal(homeFallback(false, examples), examples);
});

test('cada tarjeta de temporada sigue el backend de su sección', () => {
  assert.deepEqual(seasonalCards(false, false), {
    showEvent: true, showPromotion: true, showSection: true,
  });
  assert.deepEqual(seasonalCards(true, false), {
    showEvent: false, showPromotion: true, showSection: true,
  });
  assert.deepEqual(seasonalCards(false, true), {
    showEvent: true, showPromotion: false, showSection: true,
  });
  assert.deepEqual(seasonalCards(true, true), {
    showEvent: false, showPromotion: false, showSection: false,
  });
});
