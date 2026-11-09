const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

async function main() {
    const destination = process.argv[2];
    if (!destination || process.argv.length !== 3) {
        throw new Error('Uso: node scripts/exportUsersForDjango.js RUTA_DEL_ARCHIVO.json');
    }
    dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
    if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI en el entorno o en backend/.env.');
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    } catch {
        throw new Error('No se pudo conectar a MongoDB. Revisa la conexión y la configuración local.');
    }
    try {
        const users = await User.find().select('name email password phone role').lean();
        const output = users.map(user => ({
            _id: String(user._id), name: user.name, email: user.email,
            password: user.password, phone: user.phone || '', role: user.role,
        }));
        await fs.writeFile(destination, JSON.stringify(output, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        console.log(`Se exportaron ${output.length} cuentas. El archivo contiene datos personales y hashes de contraseñas: protégelo.`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(error => {
    console.error(`No se pudieron exportar las cuentas: ${error.message}`);
    process.exitCode = 1;
});
