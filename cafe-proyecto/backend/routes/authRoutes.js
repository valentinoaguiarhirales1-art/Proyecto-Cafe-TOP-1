const express = require('express');
const router = express.Router();
const { 
    registerUser, 
    loginUser, 
    getUserProfile, 
    updateUserProfile,
    getAllUsers 
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');
const uploadCloud = require('../config/cloudinary');
const { body, validationResult } = require('express-validator');

// Validador de registro seguro
const registerValidation = [
    body('name').notEmpty().withMessage('El nombre es obligatorio'),
    body('email').isEmail().withMessage('Ingresa un correo electrónico válido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
];

const checkValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Rutas Públicas
router.post('/register', registerValidation, checkValidation, registerUser);
router.post('/login', loginUser);

// Rutas Privadas del Cliente (permite subir avatar con multipart/form-data o json)
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, uploadCloud.single('avatar'), updateUserProfile);

// Ruta Privada del Dueño/Admin
router.get('/users', protect, admin, getAllUsers);

module.exports = router;
