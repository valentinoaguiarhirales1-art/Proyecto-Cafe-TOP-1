const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            return next();
        } catch (error) {
            return res.status(401).json({ error: 'Acceso denegado, token inválido o expirado' });
        }
    }
    if (!token) return res.status(401).json({ error: 'No autorizado, no se proporcionó un token' });
};

// Middleware para verificar si el usuario tiene rol de Administrador
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Acceso restringido: Solo para administradores de la cafetería' });
    }
};

module.exports = { protect, admin };
