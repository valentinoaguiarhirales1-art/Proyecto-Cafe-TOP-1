const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Promotion = require('../models/Promotion');

async function main() {
    const destination = process.argv[2];
    if (!destination || process.argv.length !== 3) {
        throw new Error('Uso: node scripts/exportPromotionsForDjango.js RUTA_DEL_ARCHIVO.json');
    }
    dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
    if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI en el entorno o en backend/.env.');
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    } catch {
        throw new Error('No se pudo conectar a MongoDB. Revisa la conexión y la configuración local.');
    }
    try {
        const promotions = await Promotion.find().select('title description originalPrice comboPrice imageUrl badge itemsIncluded isActive createdAt').lean();
        const output = promotions.map(promotion => ({ ...promotion, _id: String(promotion._id) }));
        await fs.writeFile(destination, JSON.stringify(output, null, 2), { encoding: 'utf8', flag: 'wx' });
        console.log(`Se exportaron ${output.length} promociones sin modificar MongoDB.`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(error => {
    console.error(`No se pudieron exportar las promociones: ${error.message}`);
    process.exitCode = 1;
});
