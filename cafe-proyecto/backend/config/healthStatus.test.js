const test = require('node:test');
const assert = require('node:assert/strict');
const getHealthStatus = require('./healthStatus');

test('reports healthy only when the database is ready', () => {
  assert.deepEqual(getHealthStatus(true), { status: 'ok' });
  assert.deepEqual(getHealthStatus(false), { status: 'database_unavailable' });
});
