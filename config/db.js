const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Admin = require('../models/Admin');
const PaymentSettings = require('../models/PaymentSetting');

async function initializeSystem() {
  try {
    const existingAdmin = await Admin.findOne({ username: 'Aryan' });
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('5669', salt);
    if (!existingAdmin) {
      await Admin.create({ username: 'Aryan', password_hash: hash });
    } else {
      existingAdmin.password_hash = hash;
      await existingAdmin.save();
    }
    const ps = await PaymentSettings.findOne();
    if (!ps) await PaymentSettings.create({});
  } catch (e) {
    console.error('System init error:', e.message);
  }
}

async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus_vault';
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✓ Connected to MongoDB Atlas');
    await initializeSystem();
  } catch (err) {
    console.error('DB Connection Error:', err.message);
  }
}

module.exports = connectDB;
