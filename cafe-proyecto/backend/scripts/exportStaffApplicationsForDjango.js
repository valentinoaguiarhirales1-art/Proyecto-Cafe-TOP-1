const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const StaffApplication = require('../models/StaffApplication');

function toExportItem(application) {
    const {
        _id, name, email, phone, requestedPosition, experienceYears,
        isRecentGraduate, publicProfileConsent, profileBio, status, createdAt
    } = application;
    return {
        _id, name, email, phone, requestedPosition, experienceYears,
        isRecentGraduate, publicProfileConsent, profileBio, status, createdAt
    };
}

async function main() {
    const destination = process.argv[2];
    if (!destination || process.argv.length !== 3) {
        throw new Error('Uso: node scripts/exportStaffApplicationsForDjango.js RUTA_DEL_ARCHIVO.json');
    }
    dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
    if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI en el entorno o en backend/.env.');
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    } catch {
        throw new Error('No se pudo conectar a MongoDB. Revisa la conexión y la configuración local.');
    }
    try {
        const applications = await StaffApplication.find()
            .select('_id name email phone requestedPosition experienceYears isRecentGraduate publicProfileConsent profileBio status createdAt')
            .lean();
        await fs.writeFile(destination, JSON.stringify(applications.map(toExportItem), null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        console.log(`Se exportaron ${applications.length} solicitudes sin modificar MongoDB. El archivo contiene datos personales; guárdalo de forma privada.`);
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error(`No se pudieron exportar las solicitudes: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = { toExportItem };
