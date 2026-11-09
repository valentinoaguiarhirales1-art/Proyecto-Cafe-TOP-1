const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Event = require('../models/Event');

async function main() {
    const destination = process.argv[2];
    if (!destination || process.argv.length !== 3) {
        throw new Error('Uso: node scripts/exportEventsForDjango.js RUTA_DEL_ARCHIVO.json');
    }
    dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
    if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI en el entorno o en backend/.env.');
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    } catch {
        throw new Error('No se pudo conectar a MongoDB. Revisa la conexión y la configuración local.');
    }
    try {
        const events = await Event.find().select('title description date time location capacity attendees price imageUrl category').lean();
        const output = events.map(event => ({
            ...event,
            _id: String(event._id),
            attendees: event.attendees.map(attendee => ({
                _id: attendee._id == null ? null : String(attendee._id),
                user: attendee.user == null ? null : String(attendee.user),
                seats: attendee.seats,
                registeredAt: attendee.registeredAt,
            })),
        }));
        await fs.writeFile(destination, JSON.stringify(output, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        console.log(`Se exportaron ${output.length} eventos. El archivo contiene datos privados de asistentes; protégelo.`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(error => {
    console.error(`No se pudieron exportar los eventos: ${error.message}`);
    process.exitCode = 1;
});
