const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    partySize: { type: Number, required: true, min: 1, max: 12 },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    status: {
        type: String,
        enum: ['Pendiente', 'Confirmada', 'Rechazada'],
        default: 'Pendiente'
    }
}, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);
