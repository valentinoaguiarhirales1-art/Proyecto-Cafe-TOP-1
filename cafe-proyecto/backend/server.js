require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const connectDB = require('./config/db');
const getHealthStatus = require('./config/healthStatus');
const getAllowedOrigins = require('./config/corsOrigins');
const { helmetSecurity, apiLimiter } = require('./middleware/firewallMiddleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Conectar a la base de datos en la nube MongoDB Atlas
connectDB();

const app = express();

app.set('trust proxy', 1);

// --- FIREWALL Y SEGURIDAD HTTP ---
app.use(helmetSecurity); // Protege cabeceras HTTP contra vulnerabilidades comunes
app.use('/api', apiLimiter); // Protección anti-DDoS / Rate Limiter

// Middlewares estándar de datos
app.use(cors({ origin: getAllowedOrigins() }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- DECLARACIÓN DE TODAS LAS RUTAS DE LA API ---
app.use('/api/auth', require('./routes/authRoutes'));          // Usuarios, Login, Perfil y Empleados
app.use('/api/products', require('./routes/productRoutes'));    // Menú, Precios, Categorías y Fotos Cloudinary
app.use('/api/orders', require('./routes/orderRoutes'));        // Pedidos, Anti-Fraude, QR, Stripe, N8N y Analíticas
app.use('/api/ai', require('./routes/aiRoutes'));              // 🤖 Barista Virtual con Google Gemini AI
app.use('/api/events', require('./routes/eventRoutes'));        // 🎷 Cartelera de Catas, Jazz y Talleres
app.use('/api/promotions', require('./routes/promotionRoutes')); // 🍿 Combos y Promociones (Estilo Cinépolis)
app.use('/api/reservations', require('./routes/reservationRoutes')); // Reservas de mesa
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/site-settings', require('./routes/siteSettingsRoutes')); // 🎨 Configuración visual del sitio

// Diagnóstico / Health Check en formato JSON profesional
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'API Cafetería Gourmet & Especialidad',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    const healthy = mongoose.connection.readyState === 1;
    res.status(healthy ? 200 : 503).json(getHealthStatus(healthy));
});

// --- MANEJO PROFESIONAL DE ERRORES (Arquitectura Senior) ---
app.use(notFound);      // Captura rutas no existentes con 404
app.use(errorHandler);  // Captura excepciones internas con respuesta JSON limpia

// Puerto dinámico para desarrollo y producción
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`☕ Servidor de Cafetería corriendo exitosamente en el puerto ${PORT}`);
});
