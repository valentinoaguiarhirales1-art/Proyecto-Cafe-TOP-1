// Genera fotos realistas para cada producto a partir de su nombre, descripción y categoría.
//
// Uso (desde la carpeta backend):
//   node scripts/generateProductImages.js --dry-run          Muestra qué haría, sin generar nada
//   node scripts/generateProductImages.js                    Solo productos sin foto local
//   node scripts/generateProductImages.js --only="Mocha"     Solo los productos cuyo nombre contenga ese texto
//   node scripts/generateProductImages.js --all              Regenera todas las fotos
//   node scripts/generateProductImages.js --provider=local   Usa Stable Diffusion local (AUTOMATIC1111 en :7860)
//
// El proveedor por defecto (Pollinations) es gratuito, sin clave, pero necesita internet al generar.
// Una vez guardadas, las imágenes funcionan sin conexión.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const IMAGES_DIR = path.join(__dirname, '../../frontend/public/images/menu');
const PHOTOS_FILE = path.join(__dirname, '../data/menuPhotos.js');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => (args.find((arg) => arg.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');

const provider = option('provider') || 'pollinations';
const onlyText = option('only').toLowerCase();

// Traducción de términos del menú para que el generador entienda exactamente qué plato es
const TERMS = [
    ['chilaquiles rojos', 'red chilaquiles with salsa roja, crema and cheese'],
    ['chilaquiles verdes', 'green chilaquiles with salsa verde, crema and cheese'],
    ['hotcakes', 'stack of three pancakes with butter and syrup'],
    ['omelette', 'cheese omelette'],
    ['desayuno americano', 'american breakfast with eggs, bacon and toast'],
    ['sándwich', 'sandwich'], ['sandwich', 'sandwich'],
    ['mañanero', 'breakfast'],
    ['enchiladas', 'chicken enchiladas'],
    ['papas fritas', 'french fries'],
    ['sopa de lentejas', 'lentil soup'], ['sopa de brócoli', 'broccoli soup'], ['sopa de tomate', 'tomato soup'],
    ['ensalada de pollo', 'chicken salad'],
    ['galletas', 'chocolate chip cookies'], ['rol de canela', 'cinnamon roll'],
    ['pay de queso y cereza', 'cherry cheesecake slice'], ['pay de guayaba', 'guava pie slice'],
    ['pay de manzana', 'apple pie slice'], ['pastel cheesecake', 'cheesecake slice'],
    ['pan stevia', 'sugar-free whole grain bread'], ['panes', 'assorted bread'],
    ['cappuccino', 'cappuccino'], ['cappulatte', 'cappuccino latte'], ['latte', 'latte'],
    ['espresso doble', 'double espresso'], ['espresso', 'espresso'],
    ['café americano', 'americano coffee'], ['mocha', 'mocha coffee with chocolate'],
    ['caramelo', 'caramel'], ['macchiato', 'macchiato'], ['vainilla', 'vanilla'], ['cajeta', 'cajeta goat milk caramel'],
    ['chocolate blanco', 'white chocolate'], ['chocolate', 'hot chocolate'],
    ['chai té', 'chai tea latte'], ['tisana', 'herbal tisane tea'], ['té', 'tea'],
    ['frappe', 'blended iced frappe with whipped cream'],
    ['euro soda', 'italian soda with ice'], ['jugo de naranja', 'fresh orange juice'], ['jugo', 'fresh juice'],
    ['taro', 'taro purple'], ['horchata', 'horchata'], ['matcha', 'matcha green tea'], ['avellana', 'hazelnut'],
    ['coco', 'coconut'], ['oreo', 'oreo cookies'], ['reeses', 'peanut butter cups'], ['java chip', 'chocolate chip'],
    ['grano', 'roasted coffee beans in a bag']
];

const CATEGORY_STYLE = {
    Bebidas: 'served in a ceramic cup or glass on a rustic wooden table',
    Frappes: 'served in a tall clear plastic cup with a straw',
    Reposteria: 'plated on a small white plate',
    Desayunos: 'plated on a ceramic plate',
    Lunch: 'plated on a ceramic plate',
    Alimentos: 'plated on a ceramic plate'
};

const slugify = (text) => text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const toEnglish = (name) => {
    const lower = name.toLowerCase();
    const matches = TERMS.filter(([es]) => lower.includes(es)).map(([, en]) => en);
    return matches.length ? [...new Set(matches)].join(', ') : name;
};

const buildPrompt = (item) => {
    const dish = toEnglish(item.name);
    const style = CATEGORY_STYLE[item.category] || 'on a rustic wooden table';
    return `Professional realistic food photography of ${dish} (${item.name}), ${style}, `
        + 'cozy specialty coffee shop, soft natural window light, shallow depth of field, '
        + 'appetizing, high detail, 4k, no text, no watermark, no logo, no people';
};

const hasLocalPhoto = (item) => item.imageUrl
    && item.imageUrl.startsWith('/images/')
    && fs.existsSync(path.join(__dirname, '../../frontend/public', item.imageUrl));

async function download(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
}

async function generate(prompt, seed) {
    if (provider === 'local') {
        const response = await download('http://127.0.0.1:7860/sdapi/v1/txt2img', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                negative_prompt: 'text, watermark, logo, people, cartoon, illustration, blurry',
                width: 768, height: 576, steps: 25, seed
            })
        });
        const data = await response.json();
        return Buffer.from(data.images[0], 'base64');
    }
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
        + `?width=800&height=660&model=flux&nologo=true&seed=${seed}`;
    const response = await download(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 10000) throw new Error('Respuesta de imagen inválida');
    // La versión gratuita añade una marca en el borde inferior: se recorta a 800x600
    return sharp(buffer).extract({ left: 0, top: 0, width: 800, height: 600 }).jpeg({ quality: 88 }).toBuffer();
}

async function generateWithRetry(prompt, seed) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            return await generate(prompt, seed);
        } catch (error) {
            if (attempt === 3) throw error;
            await new Promise((resolve) => setTimeout(resolve, attempt * 15000));
        }
    }
}

function saveMapping(photos) {
    const header = '// Fotos locales por nombre de producto. Créditos de fotos externas en frontend/src/data/photoCredits.json\n';
    fs.writeFileSync(PHOTOS_FILE, `${header}module.exports = ${JSON.stringify(photos, null, 4)};\n`, 'utf8');
}

async function main() {
    delete require.cache[require.resolve(PHOTOS_FILE)];
    const photos = { ...require(PHOTOS_FILE) };
    const items = require('../data/menuItems');

    const targets = items.filter((item) => {
        if (onlyText && !item.name.toLowerCase().includes(onlyText)) return false;
        return flag('all') || Boolean(onlyText) || !hasLocalPhoto(item);
    });

    console.log(`Productos a procesar: ${targets.length} de ${items.length} (proveedor: ${provider})`);
    if (flag('dry-run')) {
        targets.forEach((item) => console.log(`- ${item.name} -> ${buildPrompt(item)}`));
        return;
    }

    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    let ok = 0;
    for (const item of targets) {
        const fileName = `${slugify(item.name)}.jpg`;
        try {
            const seed = Math.floor(Math.random() * 1e6);
            const image = await generateWithRetry(buildPrompt(item), seed);
            fs.writeFileSync(path.join(IMAGES_DIR, fileName), image);
            photos[item.name] = `/images/menu/${fileName}`;
            saveMapping(photos);
            ok += 1;
            console.log(`OK    ${item.name} -> ${fileName}`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        } catch (error) {
            console.log(`ERROR ${item.name}: ${error.message}`);
        }
    }
    console.log(`Listo: ${ok}/${targets.length} imágenes generadas. Ejecuta el seeder (node seedMenu.js) para actualizar la base de datos.`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
