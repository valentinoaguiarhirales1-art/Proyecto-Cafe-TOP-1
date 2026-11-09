const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const controller = require('../controllers/productController');
const promotionController = require('../controllers/promotionController');
const menu = require('../../shared/menuItems.json');
const replacements = require('../../shared/incorrectProductImages.json');
const promotionReplacements = require('../../shared/incorrectPromotionImages.json');

const publicDir = path.join(__dirname, '../../frontend/public');
const doc = (name, imageUrl) => ({
    name,
    imageUrl,
    toObject() { return { name: this.name, imageUrl: this.imageUrl }; },
});

test('el catálogo y los reemplazos apuntan a imágenes existentes', () => {
    assert.equal(menu.length, 76);
    for (const product of menu) {
        assert.ok(fs.existsSync(path.join(publicDir, product.imageUrl)), product.name);
    }
    for (const [name, images] of Object.entries(replacements)) {
        assert.ok(menu.some((product) => product.name === name), name);
        for (const image of Object.values(images)) {
            assert.ok(fs.existsSync(path.join(publicDir, image)), `${name}: ${image}`);
        }
    }
});

test('las fotografías recuperadas reemplazan también el marcador antiguo', () => {
    const updated = Object.entries(replacements).filter(([, images]) => images['/images/producto-sin-foto.svg']);
    assert.ok(updated.length >= 21);
    for (const [name, images] of updated) {
        const product = menu.find((item) => item.name === name);
        assert.ok(product, name);
        assert.notEqual(product.imageUrl, '/images/producto-sin-foto.svg', name);
        assert.equal(images['/images/producto-sin-foto.svg'], product.imageUrl);
        assert.ok(fs.existsSync(path.join(publicDir, product.imageUrl)), name);
    }
});

test('la API sustituye solo las fotos antiguas identificadas y respeta fotos personalizadas', async (t) => {
    const records = [];
    for (const [name, images] of Object.entries(replacements)) {
        for (const [original, expected] of Object.entries(images)) {
            records.push({ original: doc(name, original), expected });
        }
    }
    const custom = doc('Croissant', 'https://example.com/foto-propia.jpg');
    const other = doc('Otro producto', Object.keys(replacements.Croissant)[0]);
    t.mock.method(Product, 'find', () => ({ sort: async () => [...records.map((r) => r.original), custom, other] }));
    let result;
    await controller.getProducts({ query: {} }, {
        status(code) { assert.equal(code, 200); return this; },
        json(data) { result = data; },
    });
    records.forEach((record, index) => {
        assert.equal(result[index].imageUrl, record.expected, record.original.name);
        assert.notEqual(record.original.imageUrl, record.expected);
    });
    assert.equal(result.at(-2), custom);
    assert.equal(result.at(-1), other);
});

test('la API también corrige la imagen al consultar un producto', async (t) => {
    const original = Object.keys(replacements.Croissant)[0];
    t.mock.method(Product, 'findById', async () => doc('Croissant', original));
    let result;
    await controller.getProductById({ params: { id: 'test' } }, {
        status(code) { assert.equal(code, 200); return this; },
        json(data) { result = data; },
    });
    assert.equal(result.imageUrl, replacements.Croissant[original]);
});

test('las promociones conservan las fotos personalizadas y sustituyen las imágenes incorrectas', async (t) => {
    const records = Object.entries(promotionReplacements).flatMap(([title, images]) =>
        Object.entries(images).map(([imageUrl, expected]) => ({
            original: { title, imageUrl, toObject() { return { title: this.title, imageUrl: this.imageUrl }; } },
            expected,
        })));
    const custom = { title: records[0].original.title, imageUrl: 'https://example.com/foto-propia.jpg' };
    t.mock.method(Promotion, 'find', () => ({ sort: async () => [...records.map((r) => r.original), custom] }));
    let result;
    await promotionController.getPromotions({}, { json(data) { result = data; } });
    records.forEach((record, index) => {
        assert.equal(result[index].imageUrl, record.expected);
        assert.ok(fs.existsSync(path.join(publicDir, record.expected)));
    });
    assert.equal(result.at(-1), custom);
});
