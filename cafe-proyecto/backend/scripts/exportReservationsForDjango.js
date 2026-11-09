const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Reservation = require('../models/Reservation');

async function main() {
    const destination = process.argv[2];
    if (!destination || process.argv.length !== 3) {
        throw new Error('Uso: node scripts/exportReservationsForDjango.js RUTA_DEL_ARCHIVO.json');
    }
    dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
    if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI en el entorno o en backend/.env.');
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    } catch {
        throw new Error('No se pudo conectar a MongoDB. Revisa la conexión y la configuración local.');
    }
    try {
        const reservations = await Reservation.find()
            .select('name email phone date time partySize notes status createdAt')
            .lean();
        const output = reservations.map((reservation) => ({
            ...reservation,
            _id: String(reservation._id),
        }));
        await fs.writeFile(destination, JSON.stringify(output, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        console.log(`Se exportaron ${output.length} reservas. El archivo contiene datos personales; protégelo.`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error(`No se pudieron exportar las reservas: ${error.message}`);
    process.exitCode = 1;
});
