import test from 'node:test';
import assert from 'node:assert/strict';
import { cartBackend, djangoOrderItems } from './cartBackend.js';

test('distingue catálogos y bloquea mezclas o productos offline', () => {
  const django = { id: 2, _id: 'django-2', isDjangoPreview: true, qty: 1 };
  const express = { _id: 'mongodb-id' };
  assert.equal(cartBackend([django]), 'django');
  assert.equal(cartBackend([express]), 'express');
  assert.equal(cartBackend([django, express]), 'mixed');
  assert.equal(cartBackend([django, { isOfflineProduct: true }]), 'offline');
  assert.throws(() => djangoOrderItems([django, express]));
  assert.throws(() => djangoOrderItems([{ ...django, _id: 'django-3' }]));
  assert.equal(djangoOrderItems([django])[0].product, 2);
});
