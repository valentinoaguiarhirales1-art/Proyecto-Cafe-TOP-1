const test = require('node:test');
const assert = require('node:assert/strict');
const Product = require('../models/Product');
const { recommendProduct } = require('../controllers/aiController');

test('la recomendación de respaldo usa párrafos y evita repetir tamaños', async (t) => {
    const previousKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    t.after(() => {
        if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = previousKey;
    });
    const products = [
        {
            _id: 'coffee', name: 'Café Americano', price: 46, category: 'Bebidas',
            description: 'Chico $46, mediano $52, grande $60.',
            customization: { sizes: [{ name: 'Chico', extraPrice: 0 }] },
        },
        { _id: 'brownie', name: 'Brownie', price: 40, category: 'Reposteria', description: 'Brownie.' },
    ];
    t.mock.method(Product, 'find', () => ({
        select: () => ({ sort: async () => products }),
    }));
    let response;
    await recommendProduct({ body: { prompt: 'café americano' } }, {
        json(data) { response = data; },
        status(code) { assert.fail(`Error HTTP ${code}`); },
    });
    assert.match(response.recommendation, /Café Americano/);
    assert.match(response.recommendation, /\n\nPara acompañarlo/);
    assert.doesNotMatch(response.recommendation, /\*\*|Tamaños:/);
});

test('el barista recuerda su recomendación y enlaza el producto mencionado', async (t) => {
    const previousKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    t.after(() => {
        if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = previousKey;
    });
    const products = [
        { _id: 'coffee', name: 'Café Americano', price: 46, category: 'Bebidas', description: 'Café.' },
        { _id: 'brownie', name: 'Brownie', price: 40, category: 'Reposteria', description: 'Brownie.' },
        { _id: 'tea', name: 'Té', price: 45, category: 'Bebidas', description: 'Té.' },
    ];
    t.mock.method(Product, 'find', () => ({
        select: () => ({ sort: async () => products }),
    }));
    let response;
    await recommendProduct({
        body: {
            prompt: '¿Dónde encuentro eso?',
            history: [{ role: 'bot', text: 'Te recomiendo Café Americano, también puedes probar Brownie.' }],
        },
    }, {
        json(data) { response = data; },
        status(code) { assert.fail(`Error HTTP ${code}`); },
    });
    assert.match(response.recommendation, /Café Americano está en la sección Bebidas/);
    assert.deepEqual(response.actions, [{ name: 'Café Americano', category: 'Bebidas' }]);
});
