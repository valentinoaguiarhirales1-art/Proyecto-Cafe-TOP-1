const Promotion = require('../models/Promotion');
const incorrectImages = require('../../shared/incorrectPromotionImages.json');

const presentPromotion = (promotion) => {
    if (Object.hasOwn(incorrectImages, promotion.title)) {
        const replacements = incorrectImages[promotion.title];
        if (Object.hasOwn(replacements, promotion.imageUrl)) {
            return { ...promotion.toObject(), imageUrl: replacements[promotion.imageUrl] };
        }
    }
    return promotion;
};

// @desc    Obtener todos los combos y promociones activos (Inspiración Dulcería Cinépolis)
// @route   GET /api/promotions
exports.getPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find({ isActive: true }).sort({ createdAt: -1 });
        res.json(promotions.map(presentPromotion));
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener combos: ' + error.message });
    }
};

// @desc    Crear un nuevo combo promocional (Solo Admin/Dueño)
// @route   POST /api/promotions
exports.createPromotion = async (req, res) => {
    try {
        const promotion = await Promotion.create(req.body);
        res.status(201).json(presentPromotion(promotion));
    } catch (error) {
        res.status(400).json({ error: 'Error al crear la promoción: ' + error.message });
    }
};

// @desc    Desactivar o eliminar combo (Solo Admin/Dueño)
// @route   DELETE /api/promotions/:id
exports.deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndDelete(req.params.id);
        if (!promotion) {
            return res.status(404).json({ error: 'Combo no encontrado' });
        }
        res.json({ message: 'Combo eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar promoción: ' + error.message });
    }
};

// @desc    Actualizar un combo promocional (Solo Admin/Dueño)
// @route   PUT /api/promotions/:id
exports.updatePromotion = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.imageUrl = req.file.path;
        if (typeof updateData.itemsIncluded === 'string') {
            updateData.itemsIncluded = updateData.itemsIncluded.split(',').map(s => s.trim()).filter(Boolean);
        }
        const promotion = await Promotion.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!promotion) return res.status(404).json({ error: 'Combo no encontrado' });
        res.json(presentPromotion(promotion));
    } catch (error) {
        res.status(400).json({ error: 'Error al actualizar combo: ' + error.message });
    }
};
