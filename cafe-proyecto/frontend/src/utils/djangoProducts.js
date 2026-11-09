export function adaptDjangoProducts(products) {
  if (!Array.isArray(products)) throw new Error('El catálogo de Django no tiene un formato válido.');
  return products.map((product) => {
    if (!product || typeof product !== 'object') throw new Error('Un producto de Django contiene datos inválidos.');
    const price = Number(product.price);
    if (!Number.isInteger(product.id) || product.id <= 0
      || (typeof product.price !== 'string' && typeof product.price !== 'number')
      || String(product.price).trim() === '' || !Number.isFinite(price) || price < 0
      || typeof product.name !== 'string' || typeof product.category !== 'string') {
      throw new Error('Un producto de Django contiene datos inválidos.');
    }
    return {
      ...product,
      _id: `django-${product.id}`,
      price,
      isAvailable: true,
      isDjangoPreview: true,
    };
  });
}
