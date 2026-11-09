const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const ignoredWords = new Set([
  'algo', 'quiero', 'busco', 'para', 'como', 'tengo', 'antojo', 'gusta', 'puedes',
  'recomendar', 'recomienda', 'recomiendas', 'tienen', 'tiene', 'bebida', 'bebidas',
]);

export function getMentionedMenuItems(text, products) {
  const normalizedText = normalize(text);
  return products
    .map((product) => {
      if (typeof product.name !== 'string') return { product, index: -1 };
      const name = normalize(product.name);
      if (name.length < 3) return { product, index: -1 };
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = normalizedText.match(new RegExp(`(^|[^a-z0-9])${escapedName}(?=$|[^a-z0-9])`));
      return { product, index: match ? match.index + match[1].length : -1 };
    })
    .filter(({ index }) => index >= 0)
    .sort((first, second) => first.index - second.index)
    .slice(0, 3)
    .map(({ product }) => ({ name: product.name, category: product.category }));
}

export function djangoMenuRecommendation(prompt, products, history = []) {
  const text = normalize(prompt);
  if (/\b(sin|alerg\w*|intoleran\w*|evitar|evito|prohibid\w*|diabet\w*|descafeinad\w*|embaraz\w*|vegano\w*|vegetarian\w*)\b/.test(text)) {
    return 'No puedo verificar ingredientes, alérgenos ni restricciones alimentarias. Consulta al personal antes de pedir.';
  }
  if (/\b(donde|dónde|encuentro|encuentra|ubica|seccion|sección)\b/.test(text)) {
    const previousReply = [...history].reverse().find((message) => message.role === 'bot')?.text || '';
    const previousItems = getMentionedMenuItems(previousReply, products);
    if (previousItems.length) {
      const item = previousItems[0];
      return `¡Claro! ${item.name} está en la sección ${item.category} del menú. Toca “Ver ${item.name}” aquí abajo y te llevo directo a encontrarlo.`;
    }
  }
  const words = text.match(/[a-z0-9]+/g) || [];
  const terms = words.filter((word) => word.length > 3 && !ignoredWords.has(word));
  if (!terms.length) {
    return 'Dime un sabor o el nombre de un producto para buscarlo en el menú.';
  }
  const matches = products.map((product) => {
    if (typeof product.description !== 'string') throw new Error('El catálogo contiene una descripción inválida.');
    const name = normalize(product.name);
    const category = normalize(product.category);
    const description = normalize(product.description);
    const score = terms.reduce((sum, term) => sum + (name.includes(term) ? 3 : 0)
      + (category.includes(term) ? 2 : 0) + (description.includes(term) ? 1 : 0), 0);
    return { product, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  if (!matches.length) {
    return 'No encontré coincidencias en el menú disponible. Prueba con otro sabor o nombre de producto.';
  }
  return `Encontré estas opciones en el menú:\n\n${matches.map(({ product }) =>
    `${product.name}: $${product.price} MXN. ${product.description}`).join('\n\n')}`;
}
