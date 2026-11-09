const express = require('express');
const { body, validationResult } = require('express-validator');
const {
    createReservation,
    getReservations,
    updateReservationStatus
} = require('../controllers/reservationController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

const validateReservation = [
    body('name').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 100 }),
    body('email').isEmail().withMessage('Ingresa un correo válido').isLength({ max: 254 }),
    body('phone').trim().notEmpty().withMessage('El teléfono es obligatorio').isLength({ max: 30 }),
    body('date')
        .isISO8601({ strict: true, strictSeparator: true })
        .withMessage('Selecciona una fecha válida')
        .custom((value) => {
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            return value > today;
        })
        .withMessage('La fecha debe ser futura'),
    body('time').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Selecciona una hora válida'),
    body('partySize').isInt({ min: 1, max: 12 }).withMessage('El grupo debe ser de 1 a 12 personas'),
    body('notes').optional({ values: 'falsy' }).isLength({ max: 500 })
];

const checkValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

router.post('/', validateReservation, checkValidation, createReservation);
router.get('/', protect, admin, getReservations);
router.patch(
    '/:id/status',
    protect,
    admin,
    body('status').isIn(['Pendiente', 'Confirmada', 'Rechazada']),
    checkValidation,
    updateReservationStatus
);

module.exports = router;
