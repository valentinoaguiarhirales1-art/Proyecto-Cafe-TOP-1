import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptDjangoProducts } from './djangoProducts.js';

test('adapta productos de Django sin confundir sus identificadores con Express', () => {
  const [product] = adaptDjangoProducts([{ id: 8, name: 'Café', category: 'Bebidas', price: '46.00' }]);
  assert.equal(product._id, 'django-8');
  assert.equal(product.price, 46);
  assert.equal(product.isDjangoPreview, true);
  assert.equal(product.isAvailable, true);
});

test('rechaza respuestas inválidas y conserva un catálogo vacío', () => {
  assert.deepEqual(adaptDjangoProducts([]), []);
  assert.throws(() => adaptDjangoProducts({}));
  assert.throws(() => adaptDjangoProducts([null]));
  assert.throws(() => adaptDjangoProducts([{ id: 1, name: 'Café', category: 'Bebidas', price: null }]));
  assert.throws(() => adaptDjangoProducts([{ id: 1, name: 'Café', category: 'Bebidas', price: 'no válido' }]));
  assert.throws(() => adaptDjangoProducts([{ id: '1', name: 'Café', category: 'Bebidas', price: 4 }]));
});
