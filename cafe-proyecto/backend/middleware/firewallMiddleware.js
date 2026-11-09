const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Inicializar Helmet para proteger cabeceras HTTP contra inyecciones maliciosas
const helmetSecurity = helmet();

// Firewall Anti-DDoS: Limita a un máximo de 100 peticiones cada 15 minutos por dirección IP
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, 
    message: { error: 'Demasiadas peticiones desde esta IP. Firewall ha bloqueado el acceso temporalmente.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { helmetSecurity, apiLimiter };
