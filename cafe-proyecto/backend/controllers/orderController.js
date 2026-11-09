const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

// Función auxiliar para disparar Webhook hacia N8N (Notificaciones automáticas a WhatsApp/Telegram)
const triggerN8nWebhook = async (payload) => {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log('📡 [N8N Webhook Simulado]:', payload.event, payload.orderId || '');
        return;
    }
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log('✅ [N8N Webhook]: Alerta enviada con éxito');
    } catch (err) {
        console.warn('⚠️ [N8N Webhook]: No se pudo conectar a N8N:', err.message);
    }
};

// @desc    Crear un nuevo pedido con blindaje Anti-Fraude, puntos Cinépolis y aviso a N8N
// @route   POST /api/orders
exports.addOrderItems = async (req, res) => {
    const { 
        orderItems, 
        branch,
        orderType, 
        tableNumber, 
        stripeTokenId 
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
        return res.status(400).json({ error: 'No hay productos en el carrito de compras' });
    }
    if (!Array.isArray(orderItems) || orderItems.length > 30) {
        return res.status(400).json({ error: 'El pedido debe incluir entre 1 y 30 productos distintos' });
    }

    try {
        // --- BLINDAJE ANTI-FRAUDE: Recalcular precios reales desde la base de datos ---
        let calculatedTotal = 0;
        const validatedItems = [];

        for (const item of orderItems) {
            const quantity = Number(item.qty);
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
                return res.status(400).json({ error: 'La cantidad de cada producto debe ser de 1 a 50 unidades' });
            }

            const dbProduct = await Product.findById(item.product);
            if (!dbProduct) {
                return res.status(404).json({ error: `Producto no encontrado en inventario: ${item.name}` });
            }
            if (!dbProduct.isAvailable) {
                return res.status(400).json({ error: `${dbProduct.name} no está disponible en este momento` });
            }

            let unitPrice = dbProduct.price;

            // Validar recargo por tamaño
            if (item.selectedSize) {
                if (!dbProduct.customization?.sizes) {
                    return res.status(400).json({ error: `${dbProduct.name} no admite tamaños` });
                }
                const sizeOpt = dbProduct.customization.sizes.find(s => s.name === item.selectedSize);
                if (!sizeOpt) {
                    return res.status(400).json({ error: `Tamaño inválido para ${dbProduct.name}` });
                }
                unitPrice += sizeOpt.extraPrice;
            }

            // Validar recargo por leche vegetal
            if (item.selectedMilk) {
                if (!dbProduct.customization?.milkOptions) {
                    return res.status(400).json({ error: `${dbProduct.name} no admite tipos de leche` });
                }
                const milkOpt = dbProduct.customization.milkOptions.find(m => m.name === item.selectedMilk);
                if (!milkOpt) {
                    return res.status(400).json({ error: `Tipo de leche inválido para ${dbProduct.name}` });
                }
                unitPrice += milkOpt.extraPrice;
            }

            // Validar recargo por extras
            if (item.selectedExtras !== undefined && !Array.isArray(item.selectedExtras)) {
                return res.status(400).json({ error: `El formato de extras de ${dbProduct.name} es inválido` });
            }
            if (item.selectedExtras?.length) {
                if (!dbProduct.customization?.extras) {
                    return res.status(400).json({ error: `Este producto no admite extras: ${dbProduct.name}` });
                }
                if (new Set(item.selectedExtras).size !== item.selectedExtras.length) {
                    return res.status(400).json({ error: `No se permiten extras duplicados para ${dbProduct.name}` });
                }
                for (const extName of item.selectedExtras) {
                    const extOpt = dbProduct.customization.extras.find(e => e.name === extName);
                    if (!extOpt) {
                        return res.status(400).json({ error: `Extra inválido para ${dbProduct.name}: ${extName}` });
                    }
                    unitPrice += extOpt.extraPrice;
                }
            }

            calculatedTotal += unitPrice * quantity;
            validatedItems.push({
                name: dbProduct.name,
                qty: quantity,
                price: unitPrice,
                product: dbProduct._id,
                selectedSize: item.selectedSize || '',
                selectedMilk: item.selectedMilk || '',
                selectedExtras: item.selectedExtras || [],
                notes: item.notes || ''
            });
        }

        const finalPrice = Math.round(calculatedTotal);
        const pointsEarned = Math.floor(finalPrice / 10); // 1 punto por cada $10 MXN

        let isPaid = false;
        let paymentResult = {};

        // Procesar pago con Stripe si viene el token de tarjeta
        if (stripeTokenId && !stripe) {
            return res.status(503).json({ error: 'Los pagos con tarjeta no están configurados' });
        }

        if (stripeTokenId) {
            const charge = await stripe.charges.create({
                amount: finalPrice * 100, // Stripe maneja centavos
                currency: 'mxn',
                source: stripeTokenId,
                description: `Café Especialidad - Cliente: ${req.user.name || req.user.email}`
            });
            isPaid = charge.paid;
            paymentResult = { id: charge.id, status: charge.status };
        } else {
            paymentResult = { id: 'pago_mostrador', status: 'pendiente' };
        }

        const order = new Order({
            user: req.user._id,
            branch: branch || 'Sucursal Matriz - Centro Histórico',
            orderItems: validatedItems,
            orderType: orderType || 'Para llevar',
            tableNumber: tableNumber || null,
            totalPrice: finalPrice,
            pointsEarned,
            isPaid,
            paidAt: isPaid ? Date.now() : null,
            paymentResult,
            status: 'Pendiente',
            qrCode: `QR-ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        });

        const createdOrder = await order.save();

        // Acumular puntos en el perfil del cliente
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 
                'loyalty.points': pointsEarned, 
                'loyalty.totalOrders': 1 
            }
        });

        // Notificar a N8N en tiempo real
        triggerN8nWebhook({
            event: 'NUEVO_PEDIDO',
            orderId: createdOrder._id,
            branch: createdOrder.branch,
            customer: req.user.name,
            total: createdOrder.totalPrice,
            pointsEarned,
            items: createdOrder.orderItems.map(i => `${i.qty}x ${i.name} (${i.selectedSize})`)
        });

        res.status(201).json(createdOrder);
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar el pedido seguro: ' + error.message });
    }
};

// @desc    Obtener pedidos del cliente autenticado (Historial)
// @route   GET /api/orders/myorders
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tus pedidos: ' + error.message });
    }
};

// @desc    Obtener detalle de un pedido específico por ID
// @route   GET /api/orders/:id
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        const canViewAllOrders = ['admin', 'codueno', 'gerente'].includes(req.user.role);
        if (!order.user.equals(req.user._id) && !canViewAllOrders) {
            return res.status(403).json({ error: 'No tienes permiso para consultar este pedido' });
        }
        await order.populate('user', 'name email phone');
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar el pedido: ' + error.message });
    }
};

// @desc    Obtener TODOS los pedidos para la cocina/barista (Staff / Admin)
// @route   GET /api/orders
exports.getAllOrders = async (req, res) => {
    try {
        const { status, branch } = req.query;
        let filter = {};
        if (status) filter.status = status;
        if (branch) filter.branch = branch;

        const orders = await Order.find(filter)
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 });

        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener pedidos de cocina: ' + error.message });
    }
};

// @desc    Actualizar estado en Cocina y avisar al cliente por N8N
// @route   PUT /api/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['Pendiente', 'En preparación', 'Listo para entrega', 'Entregado', 'Cancelado'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Estado inválido. Debe ser: ${validStatuses.join(', ')}` });
    }

    try {
        const order = await Order.findById(req.params.id).populate('user', 'name phone');
        if (!order) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        order.status = status;
        if (status === 'Entregado' && order.paymentResult?.id === 'pago_mostrador' && !order.isPaid) {
            order.isPaid = true;
            order.paidAt = new Date();
            order.paymentResult.status = 'pagado_en_mostrador';
        }
        const updatedOrder = await order.save();

        if (status === 'Listo para entrega') {
            triggerN8nWebhook({
                event: 'PEDIDO_LISTO',
                orderId: order._id,
                customer: order.user?.name,
                message: '¡Tu café está listo en barra! Pasa a recogerlo cuando gustes ☕'
            });
        }

        res.status(200).json({
            message: `Estado actualizado a "${status}"`,
            order: updatedOrder
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar pedido: ' + error.message });
    }
};

// @desc    Dashboard del Dueño: Métricas de ganancias, ticket promedio y ventas por sucursal
// @route   GET /api/orders/analytics
exports.getOrderAnalytics = async (req, res) => {
    try {
        const orders = await Order.find({ isPaid: true, status: { $ne: 'Cancelado' } });

        const totalRevenue = orders.reduce((acc, order) => acc + (order.totalPrice || 0), 0);
        const totalOrders = orders.length;
        const averageTicket = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

        // Ventas por sucursal
        const salesByBranch = {};
        orders.forEach(order => {
            const branch = order.branch || 'Matriz';
            salesByBranch[branch] = (salesByBranch[branch] || 0) + (order.totalPrice || 0);
        });

        res.json({
            totalRevenue: Math.round(totalRevenue),
            totalOrders,
            averageTicket: Number(averageTicket),
            salesByBranch
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al calcular analíticas: ' + error.message });
    }
};
