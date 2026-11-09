const assert = require('node:assert/strict');
const test = require('node:test');
const getAllowedOrigins = require('../config/corsOrigins');

test('allows only the local frontend origins by default', () => {
  assert.deepEqual(getAllowedOrigins(''), [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);
});

test('trims configured origins and skips empty entries', () => {
  assert.deepEqual(getAllowedOrigins(' https://cafe.example, ,https://admin.example '), [
    'https://cafe.example',
    'https://admin.example',
  ]);
});

test('does not open access when the configured list contains no origins', () => {
  assert.deepEqual(getAllowedOrigins(' , '), []);
});
