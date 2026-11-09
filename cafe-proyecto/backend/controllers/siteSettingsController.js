const SiteSettings = require('../models/SiteSettings');

// @desc    Obtener todos los ajustes como objeto { key: value, ... }
// @route   GET /api/site-settings
exports.getSettings = async (req, res) => {
    try {
        const settings = await SiteSettings.find();
        const obj = {};
        settings.forEach(s => { obj[s.key] = s.value; });
        res.json(obj);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Upsert un ajuste individual (soporta imagen Cloudinary)
// @route   PUT /api/site-settings/:key
exports.upsertSetting = async (req, res) => {
    try {
        const { key } = req.params;
        let value = req.body.value;
        // If an image was uploaded, the value is the Cloudinary URL
        if (req.file) value = req.file.path;
        const setting = await SiteSettings.findOneAndUpdate(
            { key },
            { value },
            { new: true, upsert: true, runValidators: true }
        );
        res.json(setting);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// @desc    Upsert múltiples ajustes a la vez (JSON body { key: value, ... })
// @route   POST /api/site-settings
exports.upsertManySettings = async (req, res) => {
    try {
        const updates = req.body; // { key1: val1, key2: val2, ... }
        const ops = Object.entries(updates).map(([key, value]) => ({
            updateOne: {
                filter: { key },
                update: { $set: { key, value } },
                upsert: true
            }
        }));
        await SiteSettings.bulkWrite(ops);
        // Return updated settings
        const settings = await SiteSettings.find();
        const obj = {};
        settings.forEach(s => { obj[s.key] = s.value; });
        res.json(obj);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
