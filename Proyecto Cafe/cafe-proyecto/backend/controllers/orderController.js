const Order = require('../models/Order');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.addOrderItems = async (req, res) => {
    const { orderItems, totalPrice, stripeTokenId } = req.body;

    if (orderItems && orderItems.length === 0) {
        return res.status(400).json({ error: 'No hay productos en el carrito de compras' });
    }

    try {
        // Procesar cargo real/prueba en la pasarela de pagos Stripe
        const charge = await stripe.charges.create({
            amount: Math.round(totalPrice * 100), // Stripe procesa centavos
            currency: 'mxn',
            source: stripeTokenId,
            description: 'Compra en el menú de la Cafetería Full Stack'
        });

        const order = new Order({
            user: req.user._id,
            orderItems,
            totalPrice,
            isPaid: charge.paid,
            paidAt: Date.now(),
            paymentResult: { id: charge.id, status: charge.status }
        });

        const createdOrder = await order.save();
        res.status(201).json(createdOrder);
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar el pago o generar la orden: ' + error.message });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el historial de pedidos' });
    }
};
