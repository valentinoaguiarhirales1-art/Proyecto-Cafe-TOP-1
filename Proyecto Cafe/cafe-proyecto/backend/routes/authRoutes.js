const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { body, validationResult } = require('express-validator'); // Validación de datos

router.post('/register', [
    body('email').isEmail().withMessage('Ingresa un correo electrónico válido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
}, registerUser);

router.post('/login', loginUser);

module.exports = router;
