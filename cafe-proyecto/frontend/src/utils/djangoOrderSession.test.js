import test from 'node:test';
import assert from 'node:assert/strict';
import { djangoOrderSessionHeaders } from './djangoOrderSession.js';

test('el pedido siempre conserva la identidad de la sesión consultada', () => {
  const session = { user: { id: 7 }, csrfToken: 'test-token' };
  assert.deepEqual(djangoOrderSessionHeaders(session), {
    'X-CSRFToken': 'test-token',
    'X-Expected-Django-User': '7',
  });
  assert.deepEqual(djangoOrderSessionHeaders(session, 7), djangoOrderSessionHeaders(session));
  assert.throws(() => djangoOrderSessionHeaders(session, 8), /sesión de Django cambió/);
  assert.throws(() => djangoOrderSessionHeaders({ user: null }), /Inicia sesión/);
});
