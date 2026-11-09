const express = require('express');
const router = express.Router();
const { recommendProduct, generateDescription } = require('../controllers/aiController');
const { protect, admin } = require('../middleware/authMiddleware');

// Ruta Pública: Cualquier cliente puede pedirle recomendación al Barista IA
router.post('/recommend', recommendProduct);

// Ruta Privada: Solo el dueño/admin puede pedirle a Gemini que redacte descripciones de nuevos productos
router.post('/describe', protect, admin, generateDescription);

module.exports = router;
