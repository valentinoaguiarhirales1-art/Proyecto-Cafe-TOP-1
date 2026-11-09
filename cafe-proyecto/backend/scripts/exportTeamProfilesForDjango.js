const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

const roles = ['barista', 'atencion', 'encargado', 'subgerente', 'gerente', 'supervisor'];

function toExportItem(user) {
    const data = user.employeeData || {};
    return {
        _id: String(user._id), name: user.name, role: user.role,
        experienceYears: data.experienceYears,
        isRecentGraduate: data.isRecentGraduate,
        profileBio: data.profileBio,
        publicProfileConsent: data.publicProfileConsent,
        publicProfile: data.publicProfile
    };
}

async function main() {
    const destination = process.argv[2];
    if (!destination || process.argv.length !== 3) {
        throw new Error('Uso: node scripts/exportTeamProfilesForDjango.js RUTA_DEL_ARCHIVO.json');
    }
    dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
    if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI en el entorno o en backend/.env.');
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    } catch {
        throw new Error('No se pudo conectar a MongoDB. Revisa la conexión y la configuración local.');
    }
    try {
        const users = await User.find({ role: { $in: roles } })
            .select('name role employeeData.experienceYears employeeData.isRecentGraduate employeeData.profileBio employeeData.publicProfileConsent employeeData.publicProfile')
            .lean();
        await fs.writeFile(destination, JSON.stringify(users.map(toExportItem), null, 2), {
            encoding: 'utf8', flag: 'wx', mode: 0o600
        });
        console.log(`Se exportaron ${users.length} perfiles. El archivo contiene datos personales; guárdalo de forma privada.`);
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error(`No se pudieron exportar los perfiles: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = { toExportItem };
