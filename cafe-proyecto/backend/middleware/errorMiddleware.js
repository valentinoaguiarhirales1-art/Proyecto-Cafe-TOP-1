// Middleware para capturar cualquier ruta inexistente (Error 404)
const notFound = (req, res, next) => {
    const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Middleware central para atrapar cualquier error del servidor (Error 500)
// Devuelve un JSON limpio y oculta el stacktrace en producción por seguridad
const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        error: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};

module.exports = { notFound, errorHandler };
