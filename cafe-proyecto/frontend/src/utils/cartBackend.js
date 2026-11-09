export function cartBackend(items) {
  if (!items.length) return 'empty';
  if (items.some((item) => item.isOfflineProduct)) return 'offline';
  const django = items.filter((item) => item.isDjangoPreview).length;
  if (django === items.length) return 'django';
  return django ? 'mixed' : 'express';
}

export function djangoOrderItems(items) {
  if (cartBackend(items) !== 'django') throw new Error('El carrito mezcla productos de diferentes catálogos.');
  return items.map((item) => {
    if (!Number.isSafeInteger(item.id) || item.id < 1 || item._id !== `django-${item.id}`) {
      throw new Error('El identificador de un producto de Django no es válido.');
    }
    return {
      product: item.id,
      qty: item.qty,
      selectedSize: item.selectedSize || '',
      selectedMilk: item.selectedMilk || '',
      selectedExtras: item.selectedExtras || [],
      notes: item.notes || '',
    };
  });
}
