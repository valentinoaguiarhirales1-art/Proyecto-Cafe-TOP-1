require('dotenv').config();
const User = require('../models/User');
const connectDB = require('../config/db');

async function updateAvatars() {
  await connectDB();
  const res = await User.updateMany(
    { $or: [{ avatar: { $regex: 'unsplash' } }, { avatar: { $exists: false } }, { avatar: '' }] },
    { $set: { avatar: '/images/default-avatar.svg' } }
  );
  console.log('Usuarios actualizados con avatar anónimo:', res.modifiedCount);

  // Asegurar Valentino
  const resVal = await User.updateMany(
    { email: { $regex: 'valentinoaguiarhirales' } },
    { $set: { avatar: '/images/default-avatar.svg' } }
  );
  console.log('Valentino con avatar anónimo actualizado:', resVal.modifiedCount);
  process.exit(0);
}

updateAvatars();
