require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Event = require('./models/Event');
const Promotion = require('./models/Promotion');
const connectDB = require('./config/db');

// Opciones estándar de personalización para bebidas de especialidad
const standardCustomization = {
    sizes: [
        { name: 'Chico (12 oz)', extraPrice: 0 },
        { name: 'Mediano (16 oz)', extraPrice: 15 },
        { name: 'Grande (20 oz)', extraPrice: 25 }
    ],
    milkOptions: [
        { name: 'Leche Entera', extraPrice: 0 },
        { name: 'Leche Deslactosada', extraPrice: 0 },
        { name: 'Leche de Avena Barista', extraPrice: 15 },
        { name: 'Leche de Almendra', extraPrice: 15 }
    ],
    extras: [
        { name: 'Grano Segafredo Italiano (Tueste Intenso)', extraPrice: 10 },
        { name: 'Grano Especialidad Etiopía (Cítrico y Floral)', extraPrice: 15 },
        { name: 'Shot Extra de Espresso', extraPrice: 15 },
        { name: 'Jarabe de Vainilla Francesa', extraPrice: 12 },
        { name: 'Jarabe de Caramelo Salado', extraPrice: 12 },
        { name: 'Crema Batida Artesanal', extraPrice: 10 }
    ]
};

// Catálogo Gourmet de la Cafetería
const productsData = [
    {
        name: 'Latte Artesanal de Especialidad',
        price: 65,
        description: 'Espresso suave con leche emulsionada a temperatura perfecta y arte latte.',
        category: 'Bebidas',
        imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        customization: standardCustomization
    },
    {
        name: 'Capuchino Italiano Segafredo',
        price: 68,
        description: 'Receta tradicional italiana elaborada con granos Segafredo Zanetti y espuma aterciopelada.',
        category: 'Bebidas',
        imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        customization: standardCustomization
    },
    {
        name: 'Cold Brew Nitro con Vainilla',
        price: 75,
        description: 'Café infusionado en frío durante 20 horas con infusión de nitrógeno para una textura cremosa.',
        category: 'Bebidas',
        imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        customization: standardCustomization
    },
    {
        name: 'Flat White Australiano',
        price: 70,
        description: 'Doble ristretto de espresso de Chiapas con una fina capa de microespuma.',
        category: 'Bebidas',
        imageUrl: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        customization: standardCustomization
    },
    {
        name: 'Matcha Latte Ceremonial Orgánico',
        price: 80,
        description: 'Té verde matcha grado ceremonial traído de Uji, Japón, con leche cremosa.',
        category: 'Bebidas',
        imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        customization: standardCustomization
    },
    {
        name: 'Croissant Francés de Mantequilla',
        price: 52,
        description: 'Hojaldre artesanal horneado todas las mañanas con mantequilla europea 100% natural.',
        category: 'Reposteria',
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        customization: { sizes: [], milkOptions: [], extras: [{ name: 'Calentado al horno', extraPrice: 0 }, { name: 'Porción de Mermelada y Mantequilla', extraPrice: 15 }] }
    },
    {
        name: 'Rollo de Canela Glaseado Gourmet',
        price: 58,
        description: 'Masa brioche suave con canela de Ceilán y glaseado cremoso de queso mascarpone.',
        category: 'Reposteria',
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        customization: { sizes: [], milkOptions: [], extras: [{ name: 'Nuez pecan tostada extra', extraPrice: 15 }] }
    },
    {
        name: 'Bagel de Salmón Ahumado & Queso Crema',
        price: 135,
        description: 'Bagel de masa madre artesanal con salmón ahumado noruego, alcaparras, eneldo y queso crema.',
        category: 'Alimentos',
        imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        customization: { sizes: [], milkOptions: [], extras: [{ name: 'Extra aguacate Hass', extraPrice: 20 }] }
    },
    {
        name: 'Tostada de Aguacate & Huevo Poché',
        price: 110,
        description: 'Pan de masa madre tostado, aguacate fresco machacado, huevo poché de granja y semillas de chía.',
        category: 'Alimentos',
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        customization: { sizes: [], milkOptions: [], extras: [{ name: 'Tiras de tocino crujiente', extraPrice: 25 }] }
    },
    {
        name: 'Bolsa de Café en Grano Chiapas de Altura (500g)',
        price: 240,
        description: 'Grano arábica estricta altura (1,400 msnm), proceso lavado con notas a chocolate amargo y almendra.',
        category: 'Café en Grano',
        imageUrl: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=800&q=80',
        isAvailable: true,
        customization: { sizes: [], milkOptions: [], extras: [{ name: 'Molido para cafetera de filtro', extraPrice: 0 }, { name: 'Molido fino para espresso', extraPrice: 0 }, { name: 'En grano entero', extraPrice: 0 }] }
    }
];

// Usuarios Demo con Jerarquías

// Combos y Promociones Dulcería Cinépolis & Temporada Especial
const promotionsData = [
    {
        title: 'Combo Pareja Especial',
        description: '2 Lattes Artesanales de 16 oz + 2 Croissants Franceses recién horneados.',
        originalPrice: 234,
        comboPrice: 185,
        imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
        badge: 'Ahorra $49 MXN',
        itemsIncluded: ['2 Lattes Artesanales (16 oz)', '2 Croissants de Mantequilla'],
        isActive: true
    },
    {
        title: 'Combo Spooky Vampire & Red Velvet 🎃🦇',
        description: 'Latte Pumpkin Spice con canela + Rebanada Red Velvet especial decorada + Malvavisco murciélago artesanal.',
        originalPrice: 210,
        comboPrice: 165,
        imageUrl: '/images/vampire-sonic.jpg',
        badge: '🔥 Edición Especial',
        itemsIncluded: ['1 Latte Pumpkin Spice Especial (16 oz)', '1 Rebanada Red Velvet Sangrienta', '1 Galleta / Dulce de Murciélago'],
        isActive: true
    },
    {
        title: 'Combo Trío de Amigos: Barra & Dulces ☕🍨',
        description: '1 Espresso Doble Intenso + 1 Copa Helada Sundae de Vainilla con Cereza + 1 Gran Malteada de Espuma.',
        originalPrice: 285,
        comboPrice: 220,
        imageUrl: '/images/cafe-moments-trio.jpg',
        badge: '👑 Favorito del Club',
        itemsIncluded: ['1 Espresso Doble Velocidad', '1 Copa Sundae Secreto de Shadow', '1 Malteada Levitante de Silver'],
        isActive: true
    },
    {
        title: 'Desayuno Ejecutivo Gourmet',
        description: '1 Capuchino Italiano Segafredo + 1 Tostada de Aguacate y Huevo Poché.',
        originalPrice: 178,
        comboPrice: 145,
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
        badge: 'Top Mañanas',
        itemsIncluded: ['1 Capuchino Segafredo', '1 Tostada con Huevo Poché'],
        isActive: true
    }
];

// Eventos y Catas (Inspiración Artistas / Experiencias en Vivo)
const eventsData = [
    {
        title: 'Gran Festival de Otoño & Concurso de Disfraces 🎃🎷',
        description: 'Noche temática con toda la pandilla: música en vivo, cata de café de olla con canela, calabazas decoradas y concurso con premios para el mejor disfraz.',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // En 5 días
        time: '19:30 hrs',
        location: 'Patio Central - Sucursal Centro Histórico',
        capacity: 50,
        price: 195,
        imageUrl: '/images/halloween-party.jpg',
        category: 'Festival Temático / Música'
    },
    {
        title: 'Cata de Cafés de Origen: Chiapas vs Etiopía',
        description: 'Una experiencia sensorial guiada por nuestro barista maestro para aprender a distinguir perfiles de tostado, acidez y notas aromáticas.',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // En 7 días
        time: '18:30 hrs',
        location: 'Terraza Principal - Sucursal Roma',
        capacity: 15,
        price: 250,
        imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
        category: 'Cata de Café'
    },
    {
        title: 'Noche de Jazz Acústico & Cold Brew Bar',
        description: 'Música en vivo con cuarteto de jazz acústico en nuestra terraza bajo las estrellas, maridaje de repostería y cócteles con café.',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // En 14 días
        time: '20:00 hrs',
        location: 'Patio Central - Sucursal Centro Histórico',
        capacity: 35,
        price: 180,
        imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
        category: 'Música Acústica / Jazz'
    }
];

// Sembrar datos
const importData = async () => {
    try {
        await connectDB();

        // Limpiar colecciones
        await Order.deleteMany();
        await Product.deleteMany();
        await User.deleteMany();
        await Event.deleteMany();
        await Promotion.deleteMany();

        console.log('🧹 Base de datos limpiada con éxito.');

        console.log('👤 Usuarios con Jerarquía creados (Admin, Barista Maestro y Cliente).');

        await Product.insertMany(productsData);
        console.log(`☕ ${productsData.length} Productos Gourmet con personalización (12, 16, 20 oz) insertados.`);

        await Promotion.insertMany(promotionsData);
        console.log(`🍿 ${promotionsData.length} Combos Promocionales (Estilo Cinépolis) insertados.`);

        await Event.insertMany(eventsData);
        console.log(`🎷 ${eventsData.length} Eventos y Catas en Vivo insertados.`);

        console.log('\n🎉 ¡BACKEND 100% POBLADO Y SINCRONIZADO EN MONGODB ATLAS!');
        process.exit();
    } catch (error) {
        console.error(`❌ Error al sembrar datos: ${error.message}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    // Vaciar
    connectDB().then(async () => {
        await Order.deleteMany();
        await Product.deleteMany();
        await User.deleteMany();
        await Event.deleteMany();
        await Promotion.deleteMany();
        console.log('🗑️ Datos eliminados.');
        process.exit();
    });
} else {
    importData();
}
