require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { helmetSecurity, apiLimiter } = require('./middleware/firewallMiddleware');

// Conectar a la base de datos en la nube Atlas
connectDB();

const app = express();

// --- FIREWALL Y SEGURIDAD ACTIVADA ---
app.use(helmetSecurity); // Protege cabeceras HTTP contra ataques maliciosas
app.use('/api', apiLimiter); // Aplica límite de peticiones anti-DDoS a las rutas de la API

// Middlewares estándar
app.use(cors());
app.use(express.json());

// --- DECLARACIÓN DE RUTAS DE LA APLICACIÓN ---
app.use('/api/auth', require('./routes/authRoutes'));       // Usuarios y Login
app.use('/api/products', require('./routes/productRoutes')); // Inventario de la Cafetería
app.use('/api/orders', require('./routes/orderRoutes'));     // Carrito de compras e-commerce

// Ruta de diagnóstico inicial
app.get('/', (req, res) => {
    res.send('El Servidor Seguro de la Cafetería con Firewall y E-commerce está corriendo perfectamente.');
});

// Controlar puertos dinámicos de producción
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor robusto Full Stack corriendo en el puerto ${PORT}`);
});
