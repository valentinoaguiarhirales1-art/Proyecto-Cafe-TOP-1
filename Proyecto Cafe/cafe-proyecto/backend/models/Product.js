const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre del producto es obligatorio'],
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'El precio es obligatorio']
    },
    description: {
        type: String,
        required: [true, 'La descripcion es obligatoria']
    },
    category: {
        type: String,
        required: [true, 'La categoria es obligatoria'],
        enum: ['Bebidas', 'Reposteria', 'Alimentos']
    },
    imageUrl: {
        type: String,
        default: 'https://unsplash.com'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
