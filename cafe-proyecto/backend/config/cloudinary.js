const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'tu_cloud_name' &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_KEY !== 'tu_api_key';

let uploadCloud;

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'cafeteria_productos',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'svg']
    }
  });

  uploadCloud = multer({ storage });
} else {
  // Almacenamiento local automático si Cloudinary aún no tiene claves configuradas
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, uniqueName);
    }
  });

  const uploadLocal = multer({ storage: diskStorage });
  // Middleware wrapper para emular req.file.path con la URL accesible del backend
  uploadCloud = {
    single: (fieldName) => (req, res, next) => {
      uploadLocal.single(fieldName)(req, res, (err) => {
        if (err) return next(err);
        if (req.file) {
          req.file.path = `/uploads/${req.file.filename}`;
        }
        next();
      });
    }
  };
}

module.exports = uploadCloud;
