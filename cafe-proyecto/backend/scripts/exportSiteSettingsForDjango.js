const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SiteSettings = require('../models/SiteSettings');

async function main() {
    const destination = process.argv[2];
    if (!destination || process.argv.length !== 3) {
        throw new Error('Uso: node scripts/exportSiteSettingsForDjango.js RUTA_DEL_ARCHIVO.json');
    }
    dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
    if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI en el entorno o en backend/.env.');
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    } catch {
        throw new Error('No se pudo conectar a MongoDB. Revisa la conexión y la configuración local.');
    }
    try {
        const settings = await SiteSettings.find().select('key value').lean();
        const output = settings.map(({ key, value }) => ({ key, value }));
        await fs.writeFile(destination, JSON.stringify(output, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        console.log(`Se exportaron ${output.length} ajustes sin modificar MongoDB. Revisa su contenido antes de compartirlo.`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(error => {
    console.error(`No se pudieron exportar los ajustes: ${error.message}`);
    process.exitCode = 1;
});
