const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'El título del combo es obligatorio'],
        trim: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    originalPrice: { 
        type: Number, 
        required: true 
    },
    comboPrice: { 
        type: Number, 
        required: true 
    },
    imageUrl: { 
        type: String, 
        default: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80' 
    },
    badge: { 
        type: String, 
        default: 'Ahorra 20%' // Ej: 'Más Vendido', 'Combo Pareja', 'Desayuno Ejecutivo'
    },
    itemsIncluded: [
        { type: String, required: true } // Ej: ["2 Lattes 16 oz", "2 Croissants de Mantequilla"]
    ],
    isActive: { 
        type: Boolean, 
        default: true 
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Promotion', PromotionSchema);
