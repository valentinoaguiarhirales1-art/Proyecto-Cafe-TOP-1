const express = require('express');
const router = express.Router();
const { addOrderItems, getMyOrders } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware'); // Obliga a estar logeado para comprar

router.post('/', protect, addOrderItems);
router.get('/myorders', protect, getMyOrders);

module.exports = router;
