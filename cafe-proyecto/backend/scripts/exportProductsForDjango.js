const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');

async function main() {
    const destination = process.argv[2];
    if (!destination || process.argv.length !== 3) {
        throw new Error('Uso: node scripts/exportProductsForDjango.js RUTA_DEL_ARCHIVO.json');
    }
    dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
    if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI en el entorno o en backend/.env.');
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    } catch {
        throw new Error('No se pudo conectar a MongoDB. Revisa la conexión y la configuración local.');
    }
    try {
        const products = await Product.find().select('name description price category imageUrl isAvailable customization').lean();
        const output = products.map((product) => ({
            ...product,
            _id: String(product._id),
        }));
        await fs.writeFile(destination, JSON.stringify(output, null, 2), { encoding: 'utf8', flag: 'wx' });
        console.log(`Se exportaron ${output.length} productos. El archivo no incluye usuarios ni pedidos.`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error(`No se pudo exportar el catálogo: ${error.message}`);
    process.exitCode = 1;
});
