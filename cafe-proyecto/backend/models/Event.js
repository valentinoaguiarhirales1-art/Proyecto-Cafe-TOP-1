const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'El título del evento es obligatorio'],
        trim: true 
    },
    description: { 
        type: String, 
        required: [true, 'La descripción es obligatoria'] 
    },
    date: { 
        type: Date, 
        required: [true, 'La fecha del evento es obligatoria'] 
    },
    time: { 
        type: String, 
        required: [true, 'La hora es obligatoria'] // Ej: "19:00 hrs"
    },
    location: {
        type: String,
        default: 'Terraza Principal de la Cafetería'
    },
    capacity: { 
        type: Number, 
        required: true, 
        default: 20 // Cupo máximo de personas
    },
    attendees: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            seats: { type: Number, default: 1 },
            registeredAt: { type: Date, default: Date.now }
        }
    ],
    price: { 
        type: Number, 
        default: 0 // Si es gratis (0) o con costo de entrada
    },
    imageUrl: { 
        type: String, 
        default: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80' 
    },
    category: {
        type: String,
        enum: ['Cata de Café', 'Música Acústica / Jazz', 'Taller de Barismo', 'Especial'],
        default: 'Cata de Café'
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Event', EventSchema);
