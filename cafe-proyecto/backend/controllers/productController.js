const Product = require('../models/Product');
const incorrectImages = require('../../shared/incorrectProductImages.json');

const presentProduct = (product) => {
    if (Object.hasOwn(incorrectImages, product.name)) {
        const replacements = incorrectImages[product.name];
        if (Object.hasOwn(replacements, product.imageUrl)) {
            return { ...product.toObject(), imageUrl: replacements[product.imageUrl] };
        }
    }
    return product;
};

// @desc    Obtener productos (con filtro opcional por categoría o disponibilidad)
exports.getProducts = async (req, res) => {
    try {
        const { category, available } = req.query;
        let query = {};

        if (category) {
            query.category = category;
        }
        if (available === 'true' || available === 'false') {
            query.isAvailable = available === 'true';
        }

        const products = await Product.find(query).sort({ createdAt: -1 });
        res.status(200).json(products.map(presentProduct));
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos: ' + error.message });
    }
};

// @desc    Obtener un solo producto por ID (para ver opciones de personalización)
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.status(200).json(presentProduct(product));
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar el producto: ' + error.message });
    }
};

// @desc    Crear un nuevo producto con imagen en Cloudinary (Solo Admin)
exports.createProduct = async (req, res) => {
    try {
        const productData = { ...req.body };

        // Si se subió un archivo físico de imagen, Cloudinary devuelve la URL en req.file.path
        if (req.file) {
            productData.imageUrl = req.file.path;
        }

        // Si la personalización viene serializada en JSON (habitual al enviar FormData desde el frontend)
        if (typeof productData.customization === 'string') {
            productData.customization = JSON.parse(productData.customization);
        }

        const newProduct = await Product.create(productData);
        res.status(201).json(presentProduct(newProduct));
    } catch (error) {
        res.status(400).json({ error: 'Error al crear producto: ' + error.message });
    }
};

// @desc    Actualizar un producto existente o cambiar stock (Solo Admin)
exports.updateProduct = async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (req.file) {
            updateData.imageUrl = req.file.path;
        }

        if (typeof updateData.customization === 'string') {
            updateData.customization = JSON.parse(updateData.customization);
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.status(200).json(presentProduct(updatedProduct));
    } catch (error) {
        res.status(400).json({ error: 'Error al actualizar producto: ' + error.message });
    }
};

exports.updateProductAvailability = async (req, res) => {
    if (typeof req.body.isAvailable !== 'boolean') {
        return res.status(400).json({ error: 'isAvailable debe ser verdadero o falso' });
    }

    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: { isAvailable: req.body.isAvailable } },
            { new: true, runValidators: true }
        );
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        return res.json(presentProduct(product));
    } catch (error) {
        return res.status(400).json({ error: `No se pudo cambiar la disponibilidad: ${error.message}` });
    }
};

// @desc    Eliminar un producto (Solo Admin)
exports.deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.status(200).json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar producto: ' + error.message });
    }
};
