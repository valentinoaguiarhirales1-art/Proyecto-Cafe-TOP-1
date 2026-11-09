import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import axios from 'axios';
import { checkCatalogConnection } from './catalogConnection.js';

test('comprueba el catálogo configurado y propaga los errores', async () => {
  const calls = [];
  const django = { get: async (url, options) => { calls.push({ method: 'get', url, options }); return 'django'; } };
  const express = { head: async (url, options) => { calls.push({ method: 'head', url, options }); return 'express'; } };

  assert.equal(await checkCatalogConnection(true, django, express), 'django');
  assert.equal(await checkCatalogConnection(false, django, express), 'express');
  assert.deepEqual(calls.map(({ method, url }) => [method, url]), [
    ['get', '/django-api/products'], ['head', '/products'],
  ]);
  for (const { options } of calls) {
    assert.equal(options.timeout, 8000);
    assert.equal(typeof options.params.connectionCheck, 'number');
  }
  const failure = new Error('servidor no disponible');
  await assert.rejects(checkCatalogConnection(true, { get: async () => { throw failure; } }, express), failure);
  await assert.rejects(checkCatalogConnection(false, django, { head: async () => { throw failure; } }), failure);
});

test('comprueba por red el catálogo elegido y rechaza respuestas de error', async (t) => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ method: request.method, path: new URL(request.url, 'http://localhost').pathname });
    response.writeHead(request.url.startsWith('/django-api/') ? 200 : 503);
    response.end();
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

  const client = axios.create({ baseURL: `http://127.0.0.1:${server.address().port}`, proxy: false });
  await checkCatalogConnection(true, client, client);
  await assert.rejects(checkCatalogConnection(false, client, client), (error) => error.response?.status === 503);
  assert.deepEqual(requests, [
    { method: 'GET', path: '/django-api/products' },
    { method: 'HEAD', path: '/products' },
  ]);
});
