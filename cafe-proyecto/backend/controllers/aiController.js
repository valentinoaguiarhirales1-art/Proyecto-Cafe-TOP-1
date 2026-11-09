const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');

// Inicializar Gemini con la API Key del archivo .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const formatMenuProduct = (product) => {
    const sizePrices = product.customization?.sizes?.map(size => `${size.name}: $${product.price + size.extraPrice}`).join(', ');
    const sizeLabel = sizePrices ? ` | Tamaños: ${sizePrices}` : '';
    return `${product.name} ($${product.price} MXN, ${product.category}${sizeLabel}): ${product.description}`;
};

const createFallbackRecommendation = (prompt, products) => {
    const normalizedPrompt = prompt.toLowerCase();
    const wantsBreakfast = /desayun|mañana|hambre|comer|salad|ensalada/.test(normalizedPrompt);
    const wantsColdOrSweet = /fr[ií]o|helad|frappe|frapp|dulce|antojo|chocolate/.test(normalizedPrompt);
    const wantsNoCaffeine = /sin cafe[ií]na|descafeinad|no quiero cafe[ií]na/.test(normalizedPrompt);
    const normalizedSearchText = normalizedPrompt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const keywords = normalizedSearchText
        .split(/\W+/)
        .filter(word => word.length > 3 && !['quiero', 'algo', 'para', 'con', 'como', 'tengo', 'antojo', 'antoja', 'busco'].includes(word));
    const keywordPhrase = keywords.join(' ');

    let preferredCategories = ['Bebidas', 'Frappes', 'Reposteria', 'Desayunos', 'Lunch'];
    if (wantsBreakfast) preferredCategories = ['Desayunos', 'Bebidas', 'Lunch', 'Reposteria'];
    else if (wantsColdOrSweet) preferredCategories = ['Frappes', 'Reposteria', 'Bebidas', 'Desayunos', 'Lunch'];

    const matches = products
        .filter(product => preferredCategories.includes(product.category))
        .filter(product => !wantsNoCaffeine || /sin cafeína|chai|té|tisana|matcha/i.test(`${product.name} ${product.description}`))
        .sort((first, second) => {
            const relevance = product => keywords.reduce((score, word) => (
                score + (`${product.name} ${product.description}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(word) ? 1 : 0)
            ), 0) + (product.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(keywordPhrase) ? 10 : 0);
            const relevanceDifference = relevance(second) - relevance(first);
            return relevanceDifference || preferredCategories.indexOf(first.category) - preferredCategories.indexOf(second.category);
        });

    const primary = matches[0];
    if (!primary) {
        return 'Por el momento no encuentro productos disponibles para recomendarte. Intenta de nuevo en un momento o consulta nuestro menú actualizado.';
    }

    const pairingCategories = ['Bebidas', 'Frappes'].includes(primary.category)
        ? ['Reposteria', 'Desayunos', 'Lunch']
        : ['Bebidas', 'Frappes'];
    const pairing = products
        .filter(product => product._id.toString() !== primary._id.toString()
            && pairingCategories.includes(product.category))
        .sort((first, second) => pairingCategories.indexOf(first.category) - pairingCategories.indexOf(second.category))[0];
    const description = `Te recomiendo ${primary.name} desde $${primary.price} MXN.\n${primary.description}`;
    const pairingText = pairing
        ? `\n\nPara acompañarlo, puedes elegir ${pairing.name} desde $${pairing.price} MXN.`
        : '';
    const sizes = primary.customization?.sizes?.map(size => `${size.name} $${primary.price + size.extraPrice}`).join(', ');
    const sizeText = sizes && !/chico.*mediano.*grande/i.test(primary.description) ? `\nTamaños: ${sizes}.` : '';

    return `${description}${sizeText}${pairingText}\n\n¿Te gustaría probar esta combinación?`;
};

// @desc    Barista Virtual IA: Recomienda bebidas y maridaje según el gusto del cliente
// @route   POST /api/ai/recommend
exports.recommendProduct = async (req, res) => {
    const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';

    if (!prompt || prompt.length > 500) {
        return res.status(400).json({ error: 'Por favor dinos qué se te antoja o cómo te sientes.' });
    }

    try {
        const products = await Product.find({ isAvailable: true })
            .select('name price description category customization')
            .sort({ category: 1, name: 1 });
        if (products.length === 0) {
            return res.status(503).json({ error: 'El menú no está disponible en este momento.' });
        }
        const menuString = products.map(product => `- ${formatMenuProduct(product)}`).join('\n');

        // Si hay API Key de Gemini configurada, usamos la IA de Google
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'tu_api_key_de_gemini') {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const systemPrompt = `
Eres el Barista Maestro de una cafetería de especialidad gourmet. Tu trato es cálido, sofisticado y persuasivo.
Tu objetivo es recomendar al cliente la mejor opción de nuestro menú y sugerir un acompañamiento de repostería o alimento (maridaje) para mejorar su experiencia y aumentar la venta.

Menú actual disponible en la cafetería:
${menuString}

Petición del cliente: "${prompt}"

Instrucciones:
1. Recomienda 1 o 2 productos del menú que encajen perfectamente con lo que busca.
2. Sugiere un maridaje (postre o alimento) del menú que combine bien.
3. Sé breve, amigable y entusiasta (máximo 3 párrafos cortos).
4. Menciona el precio inicial y, cuando corresponda, los tamaños/precios indicados en el menú.
5. No inventes productos, ingredientes ni precios; usa solo el menú disponible.
6. Escribe texto sencillo, sin asteriscos ni encabezados. Separa las ideas en párrafos cortos y no repitas precios ya mencionados.
`;

            const result = await model.generateContent(systemPrompt);
            const response = await result.response;
            const text = response.text();

            return res.json({
                recommendation: text,
                source: 'Gemini AI'
            });
        } else {
            return res.json({
                recommendation: createFallbackRecommendation(prompt, products),
                source: 'Barista Inteligente (Modo Simulación - Agrega tu GEMINI_API_KEY para respuestas en tiempo real)'
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error del Barista Virtual: ' + error.message });
    }
};

// @desc    Generador Gourmet IA: Redacta descripciones persuasivas para nuevos cafés (Solo Dueño)
// @route   POST /api/ai/describe
exports.generateDescription = async (req, res) => {
    const { productName, category, ingredients } = req.body;

    if (!productName) {
        return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });
    }

    try {
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'tu_api_key_de_gemini') {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const prompt = `Redacta una descripción comercial gourmet, irresistible y sensorial para la carta de una cafetería de especialidad.
Producto: ${productName}
Categoría: ${category || 'Bebidas'}
Ingredientes o notas: ${ingredients || 'Café arábica de alta calidad'}

Escribe un texto de máximo 2 oraciones, enfocado en despertar el antojo del cliente.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return res.json({ description: response.text().trim() });
        } else {
            return res.json({
                description: `Una creación artesanal equilibrada con notas aromáticas intensas, textura sedosa y el tostado perfecto para los paladares más exigentes.`
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al generar la descripción con IA: ' + error.message });
    }
};
