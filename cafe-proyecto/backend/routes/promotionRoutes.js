const express = require('express');
const router = express.Router();
const { getPromotions, createPromotion, deletePromotion, updatePromotion } = require('../controllers/promotionController');
const { protect, admin } = require('../middleware/authMiddleware');
const uploadCloud = require('../config/cloudinary');

router.route('/')
    .get(getPromotions)                     // Público: clientes ven los combos
    .post(protect, admin, createPromotion);  // Protegido: Solo dueño crea combos

router.delete('/:id', protect, admin, deletePromotion);
router.put('/:id', protect, admin, uploadCloud.single('image'), updatePromotion);

module.exports = router;
