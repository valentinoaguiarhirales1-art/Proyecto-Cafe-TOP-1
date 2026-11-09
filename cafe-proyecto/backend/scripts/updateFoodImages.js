const fs = require('fs');
const path = require('path');

// Mapeo de nombres de alimentos a rutas de imágenes locales
const foodImageMap = {
    'Chilaquiles Rojos': '/images/menu/alimento-chilaquiles-rojos.jpg',
    'Chilaquiles Verdes': '/images/menu/alimento-chilaquiles-verdes.jpg',
    'Desayuno Americano': '/images/menu/alimento-desayuno-americano.jpg',
    'Omelette con Queso': '/images/menu/alimento-omelette-con-queso.jpg',
    'Hotcakes (3 piezas)': '/images/menu/alimento-hotcakes-3-piezas.jpg',
    'Sándwich Mañanero': '/images/menu/alimento-sandwich-maanero.jpg',
    'BLT Grilled Cheese': '/images/menu/alimento-blt-grilled-cheese.jpg',
    'Club Sandwich': '/images/menu/alimento-club-sandwich.jpg',
    'Chicken Chipotle': '/images/menu/alimento-chicken-chipotle.jpg',
    'Sándwich': '/images/menu/alimento-sandwich.jpg',
    'Croissant': '/images/menu/alimento-croissant.jpg',
    'Calzone': '/images/menu/alimento-calzone.jpg',
    'Ensalada de Pollo': '/images/menu/alimento-ensalada-de-pollo.jpg',
    'Enchiladas de Pollo': '/images/menu/alimento-enchiladas-de-pollo.jpg',
    'Papas Fritas': '/images/menu/alimento-papas-fritas.jpg',
    'Baguette': '/images/menu/alimento-baguette.jpg',
    'Sopa de Lentejas': '/images/menu/alimento-sopa-de-lentejas.jpg',
    'Sopa de Brócoli': '/images/menu/alimento-sopa-de-brocoli.jpg',
    'Sopa de Tomate': '/images/menu/alimento-sopa-de-tomate.jpg',
    'Galletas': '/images/menu/alimento-galletas.jpg',
    'Brownie': '/images/menu/alimento-brownie.jpg',
    'Rol de Canela': '/images/menu/alimento-rol-de-canela.jpg',
    'Muffin': '/images/menu/alimento-muffin.jpg',
    'Scone': '/images/menu/alimento-scone.jpg',
    'Cupcake': '/images/menu/alimento-cupcake.jpg',
    'Éclair': '/images/menu/alimento-eclair.jpg',
    'Panes': '/images/menu/alimento-panes.jpg',
    'Pan Stevia': '/images/menu/alimento-pan-stevia.jpg',
    'Pastel Cheesecake': '/images/menu/alimento-pastel-cheesecake.jpg',
    'Pay de Queso y Cereza': '/images/menu/alimento-pay-de-queso-y-cereza.jpg',
    'Pay de Guayaba': '/images/menu/alimento-pay-de-guayaba.jpg',
    'Pay de Manzana': '/images/menu/alimento-pay-de-manzana.jpg'
};

const menuItemsPath = path.join(__dirname, '../data/menuItems.js');
let menuItemsContent = fs.readFileSync(menuItemsPath, 'utf8');

// Actualizar referencias de alimentos
let updatedContent = menuItemsContent;

// Reemplazar imágenes de desayunos
updatedContent = updatedContent.replace(
    /const redChilaquilesImage = .+/,
    `const redChilaquilesImage = '${foodImageMap['Chilaquiles Rojos']}';`
);
updatedContent = updatedContent.replace(
    /const greenChilaquilesImage = .+/,
    `const greenChilaquilesImage = '${foodImageMap['Chilaquiles Verdes']}';`
);
updatedContent = updatedContent.replace(
    /const breakfastImage = .+/,
    `const breakfastImage = '${foodImageMap['Desayuno Americano']}';`
);
updatedContent = updatedContent.replace(
    /const omeletteImage = .+/,
    `const omeletteImage = '${foodImageMap['Omelette con Queso']}';`
);
updatedContent = updatedContent.replace(
    /const pancakesImage = .+/,
    `const pancakesImage = '${foodImageMap['Hotcakes (3 piezas)']}';`
);

// Reemplazar imágenes de sandwiches y lunch
updatedContent = updatedContent.replace(
    /const sandwichImage = .+/,
    `const sandwichImage = '${foodImageMap['Sándwich']}';`
);
updatedContent = updatedContent.replace(
    /const baguetteImage = .+/,
    `const baguetteImage = '${foodImageMap['Baguette']}';`
);
updatedContent = updatedContent.replace(
    /const croissantImage = .+/,
    `const croissantImage = '${foodImageMap['Croissant']}';`
);
updatedContent = updatedContent.replace(
    /const calzoneImage = .+/,
    `const calzoneImage = '${foodImageMap['Calzone']}';`
);
updatedContent = updatedContent.replace(
    /const saladImage = .+/,
    `const saladImage = '${foodImageMap['Ensalada de Pollo']}';`
);

// Reemplazar imágenes de sopas
updatedContent = updatedContent.replace(
    /const soupImage = .+/,
    `const soupImage = '${foodImageMap['Sopa de Tomate']}';`
);
updatedContent = updatedContent.replace(
    /const lentilSoupImage = .+/,
    `const lentilSoupImage = '${foodImageMap['Sopa de Lentejas']}';`
);
updatedContent = updatedContent.replace(
    /const tomatoSoupImage = .+/,
    `const tomatoSoupImage = '${foodImageMap['Sopa de Tomate']}';`
);

// Reemplazar imágenes de postres y repostería
updatedContent = updatedContent.replace(
    /const friesImage = .+/,
    `const friesImage = '${foodImageMap['Papas Fritas']}';`
);
updatedContent = updatedContent.replace(
    /const breadImage = .+/,
    `const breadImage = '${foodImageMap['Panes']}';`
);
updatedContent = updatedContent.replace(
    /const cookieImage = .+/,
    `const cookieImage = '${foodImageMap['Galletas']}';`
);
updatedContent = updatedContent.replace(
    /const brownieImage = .+/,
    `const brownieImage = '${foodImageMap['Brownie']}';`
);
updatedContent = updatedContent.replace(
    /const cinnamonRollImage = .+/,
    `const cinnamonRollImage = '${foodImageMap['Rol de Canela']}';`
);
updatedContent = updatedContent.replace(
    /const muffinImage = .+/,
    `const muffinImage = '${foodImageMap['Muffin']}';`
);
updatedContent = updatedContent.replace(
    /const cupcakeImage = .+/,
    `const cupcakeImage = '${foodImageMap['Cupcake']}';`
);
updatedContent = updatedContent.replace(
    /const sconeImage = .+/,
    `const sconeImage = '${foodImageMap['Scone']}';`
);
updatedContent = updatedContent.replace(
    /const eclairImage = .+/,
    `const eclairImage = '${foodImageMap['Éclair']}';`
);
updatedContent = updatedContent.replace(
    /const cheesePieImage = .+/,
    `const cheesePieImage = '${foodImageMap['Pastel Cheesecake']}';`
);
updatedContent = updatedContent.replace(
    /const cherryCheesecakeImage = .+/,
    `const cherryCheesecakeImage = '${foodImageMap['Pay de Queso y Cereza']}';`
);
updatedContent = updatedContent.replace(
    /const guavaPieImage = .+/,
    `const guavaPieImage = '${foodImageMap['Pay de Guayaba']}';`
);
updatedContent = updatedContent.replace(
    /const applePieImage = .+/,
    `const applePieImage = '${foodImageMap['Pay de Manzana']}';`
);

fs.writeFileSync(menuItemsPath, updatedContent, 'utf8');
console.log('✓ Imágenes de alimentos actualizadas correctamente');
