const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    branch: {
        type: String,
        default: 'Sucursal Matriz - Centro Histórico'
    },
    orderItems: [
        {
            name: { type: String, required: true },
            qty: { type: Number, required: true },
            price: { type: Number, required: true },
            product: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'Product', 
                required: true 
            },
            selectedSize: { type: String, default: '12 oz' },
            selectedMilk: { type: String, default: 'Leche Entera' },
            selectedExtras: [{ type: String }],
            notes: { type: String }
        }
    ],
    orderType: {
        type: String,
        enum: ['Para llevar', 'En mesa'],
        default: 'Para llevar'
    },
    tableNumber: {
        type: Number
    },
    totalPrice: { 
        type: Number, 
        required: true, 
        default: 0.0 
    },
    pointsEarned: {
        type: Number,
        default: 0
    },
    isPaid: { 
        type: Boolean, 
        required: true, 
        default: false 
    },
    paidAt: { 
        type: Date 
    },
    paymentResult: { 
        id: String, 
        status: String 
    },
    status: {
        type: String,
        enum: ['Pendiente', 'En preparación', 'Listo para entrega', 'Entregado', 'Cancelado'],
        default: 'Pendiente'
    },
    qrCode: {
        type: String // Código QR criptográfico para validación en barra
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Order', OrderSchema);
