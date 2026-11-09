require('dotenv').config();
const connectDB = require('./config/db');
const Promotion = require('./models/Promotion');

const promotions = [
    {
        title: 'Combo Pareja Especial',
        description: 'Comparte dos lattes y dos galletas recién horneadas.',
        originalPrice: 280,
        comboPrice: 250,
        badge: 'Ahorra $30 MXN',
        itemsIncluded: ['2 Latte Chico ($60 c/u)', '2 Galletas ($80 c/u)'],
        imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80'
    },
    {
        title: 'Desayuno Ejecutivo Gourmet',
        description: 'Un desayuno americano completo acompañado de jugo de naranja.',
        originalPrice: 300,
        comboPrice: 275,
        badge: 'Ahorra $25 MXN',
        itemsIncluded: ['1 Desayuno Americano ($220)', '1 Jugo de Naranja Chico ($80)'],
        imageUrl: '/images/producto-sin-foto.svg'
    },
    {
        title: 'Merienda de Café',
        description: 'Un café americano y un brownie para acompañar tu tarde.',
        originalPrice: 86,
        comboPrice: 75,
        badge: 'Ahorra $11 MXN',
        itemsIncluded: ['1 Café Americano Chico ($46)', '1 Brownie presentación $40'],
        imageUrl: '/images/producto-sin-foto.svg'
    },
    {
        title: 'Chai con Rol de Canela',
        description: 'La mezcla especiada de chai con un rol de canela.',
        originalPrice: 142,
        comboPrice: 125,
        badge: 'Ahorra $17 MXN',
        itemsIncluded: ['1 Chai Té de Especias Chico ($82)', '1 Rol de Canela ($60)'],
        imageUrl: '/images/producto-sin-foto.svg'
    },
    {
        title: 'Lunch Chipotle',
        description: 'Chicken Chipotle acompañado de una Euro Soda.',
        originalPrice: 226,
        comboPrice: 205,
        badge: 'Ahorra $21 MXN',
        itemsIncluded: ['1 Chicken Chipotle ($160)', '1 Euro Soda Chica ($66)'],
        imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=85'
    },
    {
        title: 'Chilaquiles y Naranja',
        description: 'Elige chilaquiles rojos o verdes con un jugo de naranja.',
        originalPrice: 200,
        comboPrice: 180,
        badge: 'Ahorra $20 MXN',
        itemsIncluded: ['1 Chilaquiles (rojos o verdes, $120)', '1 Jugo de Naranja Chico ($80)'],
        imageUrl: '/images/producto-sin-foto.svg'
    }
].map(promotion => ({ ...promotion, isActive: true }));

const seedPromotions = async () => {
    try {
        await connectDB();
        let inserted = 0;
        let updated = 0;
        for (const promotion of promotions) {
            const result = await Promotion.updateOne(
                { title: promotion.title },
                { $set: promotion },
                { upsert: true, runValidators: true }
            );
            if (result.upsertedCount) inserted += 1;
            else if (result.modifiedCount) updated += 1;
        }
        console.log(`Promociones sincronizadas: ${inserted} nuevas, ${updated} actualizadas.`);
        process.exit(0);
    } catch (error) {
        console.error(`Error al sincronizar promociones: ${error.message}`);
        process.exit(1);
    }
};

seedPromotions();
