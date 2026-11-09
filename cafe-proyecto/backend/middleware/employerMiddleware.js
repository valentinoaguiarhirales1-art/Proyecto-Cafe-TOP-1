const jwt = require('jsonwebtoken');

const employerOnly = (req, res, next) => {
    const token = req.headers['x-employer-session'];
    if (!token) {
        return res.status(401).json({ error: 'Inicia sesión en el acceso patronal para continuar' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            audience: 'cafe-employer',
            issuer: 'cafe-exquisito'
        });
        if (decoded.scope !== 'employer') {
            return res.status(403).json({ error: 'La sesión no tiene permisos patronales' });
        }
        return next();
    } catch {
        return res.status(401).json({ error: 'La sesión patronal venció o no es válida; vuelve a iniciar sesión' });
    }
};

module.exports = { employerOnly };
