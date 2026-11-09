require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

async function createAdminUser() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  const missing = ['ADMIN_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']
    .filter((key) => !process.env[key] || !process.env[key].trim());

  if (missing.length) {
    throw new Error(`Missing required settings: ${missing.join(', ')}`);
  }

  if (ADMIN_PASSWORD.trim().length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters long.');
  }

  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }

  await connectDB();

  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ email });
  }

  user.name = ADMIN_NAME.trim();
  user.password = ADMIN_PASSWORD;
  user.role = 'admin';
  await user.save();

  console.log('Admin test account created or updated.');
}

createAdminUser()
  .catch((error) => {
    console.error('Could not prepare the admin test account:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
