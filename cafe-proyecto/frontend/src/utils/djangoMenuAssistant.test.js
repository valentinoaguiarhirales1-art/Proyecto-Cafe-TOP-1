import test from 'node:test';
import assert from 'node:assert/strict';
import { djangoMenuRecommendation, getMentionedMenuItems } from './djangoMenuAssistant.js';

const products = [
  { name: 'Frappé de chocolate', category: 'Frappes', description: 'Bebida fría de chocolate', price: '80.00' },
  { name: 'Té de jazmín', category: 'Bebidas', description: 'Infusión de jazmín', price: '45.00' },
];

test('busca en el catálogo sin inventar productos ni precios', () => {
  const result = djangoMenuRecommendation('Me gusta el frappe', products);
  assert.match(result, /Frappé de chocolate: \$80\.00 MXN/);
  assert.doesNotMatch(result, /Té de jazmín/);
  assert.match(djangoMenuRecommendation('kiwi', products), /No encontré coincidencias/);
  assert.match(djangoMenuRecommendation('quiero algo', products), /Dime un sabor/);
  assert.match(djangoMenuRecommendation('frappe', []), /No encontré coincidencias/);
});

test('no recomienda productos ante restricciones alimentarias', () => {
  for (const prompt of ['sin chocolate', 'alergia a la leche', 'descafeinado', 'intolerancia', 'soy vegano']) {
    const result = djangoMenuRecommendation(prompt, products);
    assert.match(result, /consulta al personal/i);
    assert.doesNotMatch(result, /80\.00/);
  }
});

test('resuelve preguntas de seguimiento y crea accesos a productos del menú', () => {
  const history = [{ role: 'bot', text: 'Te recomiendo Frappé de chocolate desde $80 MXN.' }];
  const answer = djangoMenuRecommendation('¿Dónde encuentro eso?', products, history);
  assert.match(answer, /Frappé de chocolate está en la sección Frappes/);
  assert.deepEqual(getMentionedMenuItems(answer, products), [{ name: 'Frappé de chocolate', category: 'Frappes' }]);
  assert.match(
    djangoMenuRecommendation('¿Dónde encuentro eso? Tengo alergia a la leche', products, history),
    /consulta al personal/i,
  );
});
