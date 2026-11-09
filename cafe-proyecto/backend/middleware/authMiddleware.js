const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ error: 'La cuenta asociada a este token ya no existe' });
            }
            return next();
        } catch (error) {
            return res.status(401).json({ error: 'Acceso denegado, token inválido o expirado' });
        }
    }
    if (!token) return res.status(401).json({ error: 'No autorizado, no se proporcionó un token' });
};

// Middleware para Dueño, Co-dueño y Gerentes
const admin = (req, res, next) => {
    const adminRoles = ['admin', 'codueno', 'gerente'];
    if (req.user && adminRoles.includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Acceso restringido: Solo para administración de la cafetería' });
    }
};

// Middleware para cualquier colaborador del Staff (Barista, Encargado, Supervisor, etc.)
const staff = (req, res, next) => {
    const staffRoles = ['barista', 'atencion', 'encargado', 'subgerente', 'gerente', 'supervisor', 'codueno', 'admin'];
    if (req.user && staffRoles.includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Acceso restringido: Solo para colaboradores de la cafetería' });
    }
};

module.exports = { protect, admin, staff };
