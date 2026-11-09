export function adaptDjangoOrders(orders) {
  if (!Array.isArray(orders)) throw new Error('La respuesta de pedidos de Django no es válida.');
  return orders.map(order => ({
    _id: String(order.id),
    createdAt: order.createdAt,
    status: order.status,
    orderType: order.orderType,
    totalPrice: order.total,
    legacyPayment: order.legacyPayment,
    orderItems: order.items.map(item => ({
      name: item.name,
      qty: item.quantity,
      price: item.unitPrice,
      selectedSize: item.selectedSize,
      selectedMilk: item.selectedMilk,
      selectedExtras: item.selectedExtras,
      notes: item.notes,
    })),
  }));
}
