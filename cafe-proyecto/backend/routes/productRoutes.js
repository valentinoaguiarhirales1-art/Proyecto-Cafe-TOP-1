const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    updateProductAvailability,
    deleteProduct
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const uploadCloud = require('../config/cloudinary');

// Rutas de catálogo general y creación protegida
router.route('/')
    .get(getProducts) // Público: los clientes ven el menú
    .post(protect, admin, uploadCloud.single('image'), createProduct); // Protegido: Solo admin puede subir producto con foto

// Rutas por producto individual
router.route('/:id')
    .get(getProductById) // Público: ver detalle y opciones del café
    .put(protect, admin, uploadCloud.single('image'), updateProduct) // Protegido: Solo admin
    .delete(protect, admin, deleteProduct); // Protegido: Solo admin

router.patch('/:id/availability', protect, admin, updateProductAvailability);

module.exports = router;
