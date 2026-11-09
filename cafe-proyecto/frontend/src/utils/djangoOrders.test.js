import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptDjangoOrders } from './djangoOrders.js';

test('adapta pedidos Django sin perder opciones ni mezclar identificadores', () => {
  const [order] = adaptDjangoOrders([{
    id: 12, createdAt: '2026-01-01T12:00:00Z', status: 'Pendiente',
    orderType: 'En mesa', total: '126.00', legacyPayment: { isPaid: true, branch: 'Matriz' },
    items: [{ name: 'Café', quantity: 2, unitPrice: '53.00', selectedSize: 'Grande',
      selectedMilk: 'Avena', selectedExtras: ['Jarabe'], notes: 'Sin azúcar' }],
  }]);
  assert.equal(order._id, '12');
  assert.equal(order.totalPrice, '126.00');
  assert.deepEqual(order.legacyPayment, { isPaid: true, branch: 'Matriz' });
  assert.deepEqual(order.orderItems[0], {
    name: 'Café', qty: 2, price: '53.00', selectedSize: 'Grande',
    selectedMilk: 'Avena', selectedExtras: ['Jarabe'], notes: 'Sin azúcar',
  });
  assert.throws(() => adaptDjangoOrders({}), /no es válida/);
});
