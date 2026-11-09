const express = require('express');
const router = express.Router();
const { 
    addOrderItems, 
    getMyOrders, 
    getOrderById, 
    getAllOrders, 
    updateOrderStatus,
    getOrderAnalytics 
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

// --- RUTAS DE CLIENTES ---
router.post('/', protect, addOrderItems);
router.get('/myorders', protect, getMyOrders);

// --- RUTAS ADMINISTRATIVAS Y DE COCINA (Importante: /analytics antes de /:id) ---
router.get('/analytics', protect, admin, getOrderAnalytics); // Métricas de negocio
router.get('/', protect, admin, getAllOrders);             // Tablero de comandas
router.put('/:id/status', protect, admin, updateOrderStatus); // Cambio de estado en cocina
router.get('/:id', protect, getOrderById);                 // Ticket por ID

module.exports = router;
