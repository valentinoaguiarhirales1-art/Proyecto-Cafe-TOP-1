const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre del producto es obligatorio'],
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'El precio base es obligatorio'],
        min: [0, 'El precio no puede ser negativo']
    },
    description: {
        type: String,
        required: [true, 'La descripción es obligatoria']
    },
    category: {
        type: String,
        required: [true, 'La categoría es obligatoria'],
        enum: ['Bebidas', 'Frappes', 'Reposteria', 'Alimentos', 'Desayunos', 'Lunch', 'Café en Grano']
    },
    imageUrl: {
        type: String,
        default: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80'
    },
    isAvailable: {
        type: Boolean,
        default: true // Permite al barista desactivar productos agotados
    },
    // --- PERSONALIZACIÓN Y UPSELLING (Aumenta el ticket promedio) ---
    customization: {
        sizes: [
            {
                name: { type: String }, // Ej: 'Chico (8oz)', 'Mediano (12oz)', 'Grande (16oz)'
                extraPrice: { type: Number, default: 0 }
            }
        ],
        milkOptions: [
            {
                name: { type: String }, // Ej: 'Entera', 'Deslactosada', 'Avena (+$15)', 'Almendra (+$15)'
                extraPrice: { type: Number, default: 0 }
            }
        ],
        extras: [
            {
                name: { type: String }, // Ej: 'Shot extra espresso', 'Jarabe de vainilla', 'Crema batida'
                extraPrice: { type: Number, default: 0 }
            }
        ]
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
