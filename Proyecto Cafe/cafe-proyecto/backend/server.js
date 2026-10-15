require('dotenv').config(); // 1. Primero cargamos las variables de entorno obligatoriamente

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); // 2. Ahora sí importamos la base de datos de forma segura

// Conectar a la base de datos
connectDB(); 

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas de la API (Cafeteria)
app.use('/api/products', require('./routes/productRoutes'));

// Ruta de prueba inicial
app.get('/', (req, res) => {
    res.send('El servidor de la Cafetería está corriendo perfectamente.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

