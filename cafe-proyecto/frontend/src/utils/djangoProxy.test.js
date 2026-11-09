import test from 'node:test';
import assert from 'node:assert/strict';
import { forwardDjangoRequest } from '../../functions/django-api/[[path]].js';

test('reenvía la sesión y CSRF al origen configurado sin cabeceras proxy del cliente', async () => {
  const request = new Request('https://cafe.example/django-api/orders?test=1', {
    method: 'POST',
    headers: {
      cookie: 'sessionid=prueba', origin: 'https://cafe.example', 'x-csrftoken': 'token',
      'x-forwarded-proto': 'http', 'x-forwarded-host': 'falso.example', 'cf-connecting-ip': '127.0.0.1',
    },
    body: '{"qty":2}',
  });
  let forwarded;
  const response = await forwardDjangoRequest(request, 'https://django.example', async (incoming) => {
    forwarded = incoming;
    return new Response('{"ok":true}', {
      status: 201, headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'sessionid=nuevo; Path=/; Secure' },
    });
  });
  assert.equal(forwarded.url, 'https://django.example/django-api/orders?test=1');
  assert.equal(forwarded.method, 'POST');
  assert.equal(await forwarded.text(), '{"qty":2}');
  assert.equal(forwarded.headers.get('cookie'), 'sessionid=prueba');
  assert.equal(forwarded.headers.get('origin'), 'https://cafe.example');
  assert.equal(forwarded.headers.get('x-csrftoken'), 'token');
  assert.equal(forwarded.headers.has('x-forwarded-proto'), false);
  assert.equal(forwarded.headers.has('x-forwarded-host'), false);
  assert.equal(forwarded.headers.has('cf-connecting-ip'), false);
  assert.equal(forwarded.redirect, 'manual');
  assert.equal(response.status, 201);
  assert.match(response.headers.get('set-cookie'), /^sessionid=nuevo/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('rechaza configuración insegura y muestra errores sin respuestas falsas', async () => {
  const request = new Request('https://cafe.example/django-api/products');
  for (const origin of ['', 'http://django.example', 'https://usuario:clave@django.example', 'https://django.example/ruta', 'https://cafe.example']) {
    const response = await forwardDjangoRequest(request, origin, () => { throw new Error('No debe conectar'); });
    assert.equal(response.status, 503);
  }
  assert.equal((await forwardDjangoRequest(new Request('https://cafe.example/api/products'), 'https://django.example')).status, 404);
  const failed = await forwardDjangoRequest(request, 'https://django.example', async () => { throw new Error('fallo de prueba'); });
  assert.equal(failed.status, 502);
  assert.match((await failed.json()).error, /Inténtalo de nuevo/);
});
