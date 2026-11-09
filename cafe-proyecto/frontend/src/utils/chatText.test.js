import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatChatText } from './chatText.js';

test('formats assistant emphasis without showing markdown markers', () => {
  assert.deepEqual(formatChatText('Prueba **Café Americano** con *Brownie*.'), [[
    { text: 'Prueba ', bold: false },
    { text: 'Café Americano', bold: true },
    { text: ' con ', bold: false },
    { text: 'Brownie', bold: true },
    { text: '.', bold: false },
  ]]);
});

test('preserves paragraphs and converts headings and bullet lists', () => {
  assert.deepEqual(formatChatText('# Opciones\r\n\r\n* Café\r\n- Té'), [
    [{ text: 'Opciones', bold: false }],
    [],
    [{ text: '• Café', bold: false }],
    [{ text: '• Té', bold: false }],
  ]);
});

test('preserves ordinary symbols and plain text without interpreting HTML', () => {
  assert.deepEqual(formatChatText('<script>alert(1)</script> 2 * 3'), [[
    { text: '<script>alert(1)</script> 2 * 3', bold: false },
  ]]);
});
