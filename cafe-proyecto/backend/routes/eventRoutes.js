const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getEvents, createEvent, bookEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { protect, admin } = require('../middleware/authMiddleware');
const uploadCloud = require('../config/cloudinary');

router.route('/')
    .get(getEvents)                             // Público: cualquiera ve la cartelera
    .post(protect, admin, createEvent);          // Protegido: Solo admin publica eventos

router.post(
    '/:id/book',
    protect,
    body('seats').isInt({ min: 1, max: 4 }).withMessage('Puedes reservar de 1 a 4 lugares por solicitud'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    bookEvent
);

router.route('/:id')
    .put(protect, admin, uploadCloud.single('image'), updateEvent)
    .delete(protect, admin, deleteEvent);

module.exports = router;
