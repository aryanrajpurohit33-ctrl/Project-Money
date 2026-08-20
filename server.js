require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const bcrypt = require('bcryptjs');

const Admin = require('./models/Admin');
const PaymentSettings = require('./models/PaymentSetting');

const app = express();

app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  next();
});

// --- Register Modular Routes under /api ---
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/products'));
app.use('/api', require('./routes/transactions'));
app.use('/api', require('./routes/subscriptions'));
app.use('/api', require('./routes/slots'));
app.use('/api', require('./routes/customers'));
app.use('/api', require('./routes/paymentSettings'));
app.use('/api', require('./routes/system'));
app.use('/api', require('./routes/store'));

// Safe API Catch-All
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Single Page Application Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- System Auto-Init ---
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
  } catch (e) {}
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ NEXUS Digital Modular Server running on port ${PORT}`);
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus_vault';
mongoose.connect(MONGODB_URI).then(async () => {
  console.log('✓ Connected to MongoDB Atlas');
  await initializeSystem();
}).catch(err => console.error('DB error:', err.message));
