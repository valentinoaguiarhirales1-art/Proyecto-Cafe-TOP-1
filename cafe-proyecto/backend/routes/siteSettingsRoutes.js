const express = require('express');
const router = express.Router();
const { getSettings, upsertSetting, upsertManySettings } = require('../controllers/siteSettingsController');
const { protect, admin } = require('../middleware/authMiddleware');
const uploadCloud = require('../config/cloudinary');

router.get('/', getSettings);                                                          // Public: anyone can read settings
router.post('/', protect, admin, upsertManySettings);                                   // Admin: batch update text settings
router.put('/:key', protect, admin, uploadCloud.single('image'), upsertSetting);       // Admin: update single setting (supports image upload)

module.exports = router;
