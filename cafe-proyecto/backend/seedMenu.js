require('dotenv').config();
const connectDB = require('./config/db');
const Product = require('./models/Product');
const menuItems = require('./data/menuItems');

const legacyMenuItems = [
    'Cold Brew Nitro con Vainilla',
    'Flat White Australiano',
    'Matcha Latte Ceremonial Orgánico',
    'Rollo de Canela Glaseado Gourmet',
    'Bagel de Salmón Ahumado & Queso Crema',
    'Tostada de Aguacate & Huevo Poché',
    'Bolsa de Café en Grano Chiapas de Altura (500g)',
    'Frappe Reese’s',
    'Croissant Francés de Mantequilla',
    'Latte Artesanal de Especialidad',
    'Capuchino Italiano Segafredo'
];

const seedMenu = async () => {
    try {
        await connectDB();

        let inserted = 0;
        let updated = 0;
        for (const item of menuItems) {
            const result = await Product.updateOne(
                { name: item.name },
                { $set: item },
                { upsert: true, runValidators: true }
            );
            if (result.upsertedCount) inserted += 1;
            else if (result.modifiedCount) updated += 1;
        }

        const retired = await Product.updateMany(
            { name: { $in: legacyMenuItems }, isAvailable: true },
            { $set: { isAvailable: false } }
        );

        console.log(`Catálogo sincronizado: ${inserted} productos nuevos, ${updated} actualizados; ${retired.modifiedCount} productos anteriores desactivados.`);
        process.exit(0);
    } catch (error) {
        console.error(`Error al agregar el menú: ${error.message}`);
        process.exit(1);
    }
};

seedMenu();
