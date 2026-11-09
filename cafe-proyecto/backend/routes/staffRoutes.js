const express = require('express');
const { body, validationResult } = require('express-validator');
const {
    employerLogin,
    createApplication,
    getPublicTeam,
    getApplications,
    setApplicationStatus,
    activateEmployeeAccount,
    getEmployees,
    updateEmployeeProfile
} = require('../controllers/staffController');
const { protect } = require('../middleware/authMiddleware');
const { employerOnly } = require('../middleware/employerMiddleware');

const router = express.Router();

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    return next();
};

const applicationValidation = [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('email').trim().isEmail().withMessage('Ingresa un correo válido'),
    body('phone').optional({ values: 'falsy' }).isLength({ max: 30 }).withMessage('El teléfono es demasiado largo'),
    body('requestedPosition').isIn(['barista', 'atencion', 'encargado']).withMessage('Selecciona un puesto válido'),
    body('experienceYears').isInt({ min: 0, max: 60 }).withMessage('La experiencia debe ser de 0 a 60 años'),
    body('isRecentGraduate').isBoolean().withMessage('Indica si eres recién egresado'),
    body('publicProfileConsent').isBoolean().withMessage('Indica si autorizas publicar tu perfil'),
    body('profileBio').optional({ values: 'falsy' }).isLength({ max: 240 }).withMessage('La descripción no puede superar 240 caracteres')
];

router.post('/employer/login', body('key').isString().notEmpty(), validateRequest, employerLogin);
router.get('/team', getPublicTeam);
router.post('/applications', applicationValidation, validateRequest, createApplication);
router.post('/activate', [
    body('invitation').isString().notEmpty(),
    body('email').trim().isEmail(),
    body('password').isLength({ min: 6, max: 72 }).withMessage('La contraseña debe tener entre 6 y 72 caracteres')
], validateRequest, activateEmployeeAccount);

router.get('/employer/applications', employerOnly, getApplications);
router.patch('/employer/applications/:id', employerOnly, [
    body('status').isIn(['approved', 'rejected']).withMessage('El estado no es válido')
], validateRequest, setApplicationStatus);
router.get('/employer/employees', employerOnly, getEmployees);
router.put('/employer/employees/:id', employerOnly, [
    body('experienceYears').isInt({ min: 0, max: 60 }).withMessage('La experiencia debe ser de 0 a 60 años'),
    body('isRecentGraduate').isBoolean(),
    body('publicProfile').isBoolean(),
    body('profileBio').optional({ values: 'falsy' }).isLength({ max: 240 }),
    body('consentConfirmed').optional().isBoolean()
], validateRequest, updateEmployeeProfile);

module.exports = router;
