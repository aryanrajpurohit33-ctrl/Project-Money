require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const os = require('os');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_digital_super_secret_jwt_2026_key';

// ----------------------------------------------------
// PERFORMANCE & PRESENCE LOGGERS
// ----------------------------------------------------
const requestLogs = [];
const appErrorLogs = [];
const activeSessions = new Map();
const activityFeed = [];

const funnelStats = {
  visitors: 0,
  product_views: 0,
  checkouts_started: 0,
  payments_initiated: 0,
  proofs_uploaded: 0,
  confirmed_purchases: 0
};

app.use((req, res, next) => {
  const startHrTime = process.hrtime();
  res.on('finish', () => {
    try {
      const elapsedHrTime = process.hrtime(startHrTime);
      const elapsedMs = Math.round((elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6) * 10) / 10;
      if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
        requestLogs.unshift({
          endpoint: req.originalUrl.split('?')[0],
          method: req.method,
          statusCode: res.statusCode,
          responseTime: elapsedMs,
          timestamp: new Date()
        });
        if (requestLogs.length > 200) requestLogs.pop();
        if (res.statusCode >= 400) {
          appErrorLogs.unshift({
            type: res.statusCode >= 500 ? 'SERVER_ERROR' : 'CLIENT_REQUEST_ERROR',
            endpoint: req.originalUrl,
            statusCode: res.statusCode,
            timestamp: new Date()
          });
          if (appErrorLogs.length > 50) appErrorLogs.pop();
        }
      }
    } catch (e) {}
  });
  next();
});

function recordActivity(type, text, meta = {}) {
  try {
    const item = { id: Date.now() + '-' + Math.random(), type, text, meta, created_at: new Date() };
    activityFeed.unshift(item);
    if (activityFeed.length > 50) activityFeed.pop();
  } catch (e) {}
}

setInterval(() => {
  try {
    const now = Date.now();
    for (const [sessionId, data] of activeSessions.entries()) {
      if (now - data.timestamp > 35000) activeSessions.delete(sessionId);
    }
  } catch (e) {}
}, 10000);

// ----------------------------------------------------
// DATABASE SCHEMAS & MODELS
// ----------------------------------------------------
const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  last_login: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, default: '' },
  password_hash: { type: String, required: true },
  status: { type: String, default: 'active' },
  last_login: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  sku: { type: String, required: true, unique: true },
  brand: { type: String, default: 'Nexus Digital' },
  category: { type: String, default: 'Software & Digital Goods' },
  tags: [String],
  short_description: { type: String, default: '' },
  description: { type: String, default: '' },
  customer_instructions: { type: String, default: '' },
  internal_notes: { type: String, default: '' },
  product_type: { 
    type: String, 
    enum: ['ONE_TIME', 'SUBSCRIPTION', 'DIGITAL_PRODUCT', 'DIGITAL_ACCOUNT', 'DIGITAL_ACCESS', 'OTHER'], 
    default: 'ONE_TIME' 
  },
  original_price: { type: Number, required: true, default: 999 },
  sale_price: { type: Number, required: true, default: 499 },
  discount_percentage: { type: Number, default: 0 },
  subscription_pricing: {
    one_month: { type: Number, default: 199 },
    six_months: { type: Number, default: 899 },
    one_year: { type: Number, default: 1499 },
    custom_days: { type: Number, default: 30 },
    custom_price: { type: Number, default: 199 }
  },
  images: [{ type: String }],
  features: [{ type: String }],
  whats_included: [{ type: String }],
  specifications: [{ label: String, value: String }],
  delivery_type: { 
    type: String, 
    enum: ['EMAIL_PASSWORD', 'MOBILE_PASSWORD', 'STANDARD_LINK', 'DOWNLOADABLE_FILE', 'LICENSE_KEY', 'CUSTOM_TEXT', 'ACCOUNT_ACCESS'], 
    default: 'EMAIL_PASSWORD' 
  },
  is_featured: { type: Boolean, default: false },
  unlimited_stock: { type: Boolean, default: true },
  stock_quantity: { type: Number, default: 100 },
  low_stock_threshold: { type: Number, default: 5 },
  allow_backorder: { type: Boolean, default: false },
  seo_title: { type: String, default: '' },
  seo_description: { type: String, default: '' },
  status: { type: String, enum: ['active', 'out_of_stock', 'draft', 'archived', 'disabled'], default: 'active' },
  sales_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const InventorySlotSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  account_label: { type: String, required: true, default: 'Account Slot 1' },
  email: { type: String, required: true, trim: true },
  password: { type: String, default: '' },
  custom_text: { type: String, default: '' },
  notes: { type: String, default: '' },
  max_active_users: { type: Number, default: 1, min: 1 },
  status: { type: String, enum: ['AVAILABLE', 'ASSIGNED', 'FULL', 'EXPIRED', 'DISABLED'], default: 'AVAILABLE' },
  assignment_history: [{
    customer_name: String,
    customer_email: String,
    order_id: String,
    duration: String,
    start_at: Date,
    expires_at: Date,
    assigned_at: { type: Date, default: Date.now }
  }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const SubscriptionSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  assigned_slot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySlot', default: null },
  product_name: String,
  duration: { type: String, default: '1_MONTH' },
  start_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
  status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'REVOKED', 'CANCELLED'], default: 'ACTIVE' },
  history: [{
    action: String,
    performed_by: String,
    details: String,
    timestamp: { type: Date, default: Date.now }
  }],
  cancelled_at: { type: Date, default: null },
  cancellation_reason: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
  txn_id: { type: String, required: true, unique: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer_name: String,
  customer_email: String,
  product_name: String,
  product_type: String,
  duration: { type: String, default: '1_MONTH' },
  amount: { type: Number, required: true },
  payment_method: { type: String, enum: ['UPI', 'CRYPTO'], required: true },
  proof_screenshot: { type: String, default: '' },
  assigned_slot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySlot', default: null },
  status: { 
    type: String, 
    enum: ['PENDING_PAYMENT', 'PROCESSING', 'CONFIRMED', 'REJECTED', 'REFUNDED'], 
    default: 'PENDING_PAYMENT' 
  },
  rejection_reason: { type: String, default: '' },
  verified_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  order_number: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer_name: String,
  customer_email: String,
  items: [{
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    product_type: String,
    duration: String,
    delivery_type: String,
    subscription_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null }
  }],
  subtotal: { type: Number, required: true },
  discount_amount: { type: Number, default: 0 },
  total_amount: { type: Number, required: true },
  payment_method: { type: String, enum: ['UPI', 'CRYPTO'], default: 'UPI' },
  payment_status: { type: String, enum: ['Pending', 'Processing', 'Paid', 'Failed', 'Refunded'], default: 'Pending' },
  delivery_status: { type: String, enum: ['Pending', 'Processing', 'Delivered', 'Failed'], default: 'Pending' },
  transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  created_at: { type: Date, default: Date.now }
});

const PaymentSettingsSchema = new mongoose.Schema({
  upi_enabled: { type: Boolean, default: true },
  upi_id: { type: String, default: 'merchant@okaxis' },
  upi_name: { type: String, default: 'Nexus Digital Pay' },
  upi_qr_url: { type: String, default: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=merchant@okaxis&pn=NexusDigital' },
  upi_instructions: { type: String, default: '1. Scan QR code or copy UPI ID.\n2. Pay the exact order amount.\n3. Take a screenshot of the completed payment.\n4. Upload the screenshot below to submit proof.' },

  crypto_enabled: { type: Boolean, default: true },
  crypto_currency: { type: String, default: 'USDT' },
  crypto_network: { type: String, default: 'TRC20' },
  crypto_wallet_address: { type: String, default: 'TXYz9876543210AbCdEfGhIjKlMnOpQrStU' },
  crypto_qr_url: { type: String, default: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=TXYz9876543210AbCdEfGhIjKlMnOpQrStU' },
  crypto_instructions: { type: String, default: '1. Send exact amount in USDT (TRC20 network).\n2. Note transaction hash & take transfer screenshot.\n3. Upload payment proof for instant admin verification.' }
});

const Admin = mongoose.model('Admin', AdminSchema);
const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const InventorySlot = mongoose.model('InventorySlot', InventorySlotSchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Order = mongoose.model('Order', OrderSchema);
const PaymentSettings = mongoose.model('PaymentSettings', PaymentSettingsSchema);

async function initializeSystem() {
  try {
    const existingAdmin = await Admin.findOne({ username: 'Aryan' });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('5669', salt);
      await Admin.create({ username: 'Aryan', password_hash: hash });
      console.log('✓ Initialized SuperAdmin: Aryan / 5669');
    }
    const existingPaymentSettings = await PaymentSettings.findOne();
    if (!existingPaymentSettings) await PaymentSettings.create({});
  } catch (err) {
    console.error('Init error:', err.message);
  }
}

// ----------------------------------------------------
// AUTH MIDDLEWARES
// ----------------------------------------------------
function authCustomer(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'customer') throw new Error('Unauthorized');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid customer session' });
  }
}

function authAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Admin access required' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') throw new Error('Unauthorized');
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Forbidden: Admin session invalid' });
  }
}

// ----------------------------------------------------
// SYSTEM MONITOR INFRASTRUCTURE ENDPOINT (ADVANCED)
// ----------------------------------------------------
app.get('/api/admin/system/infrastructure', authAdmin, async (req, res) => {
  try {
    const startPing = Date.now();
    let dbPing = 0;
    let dbStatus = 'Disconnected';
    let dbName = 'Unknown';

    if (mongoose.connection.readyState === 1) {
      dbStatus = 'Connected (MongoDB Atlas)';
      dbName = mongoose.connection.name || 'nexus_db';
      await mongoose.connection.db.admin().ping();
      dbPing = Date.now() - startPing;
    }

    const memUsage = process.memoryUsage();
    const totalSysMem = os.totalmem();
    const freeSysMem = os.freemem();
    const uptimeSec = process.uptime();

    const hours = Math.floor(uptimeSec / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = Math.floor(uptimeSec % 60);
    const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;

    res.json({
      server: {
        platform: os.platform(),
        architecture: os.arch(),
        node_version: process.version,
        cpu_cores: os.cpus().length,
        service_memory_rss_mb: Math.round(memUsage.rss / 1024 / 1024),
        service_memory_heap_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        system_total_mem_gb: Math.round((totalSysMem / 1024 / 1024 / 1024) * 10) / 10,
        system_free_mem_gb: Math.round((freeSysMem / 1024 / 1024 / 1024) * 10) / 10,
        uptime_formatted: uptimeFormatted,
        environment: process.env.NODE_ENV || 'production'
      },
      database: {
        status: dbStatus,
        database_name: dbName,
        ping_latency_ms: dbPing,
        host: mongoose.connection.host || 'cluster.mongodb.net'
      },
      services: {
        web_server: 'Healthy',
        database_service: mongoose.connection.readyState === 1 ? 'Healthy' : 'Degraded',
        auth_service: 'Healthy',
        payment_service: 'Healthy',
        subscription_daemon: 'Running'
      },
      cloud_host: {
        provider: 'Render Cloud Platform',
        region: 'Global Edge / Frankfurt / Oregon',
        instance_type: 'Render Web Service (Standard/Free)',
        storage_note: 'Render Disk / Cloud Storage metrics managed via Render Dashboard (Not exposed via app runtime)'
      }
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// ----------------------------------------------------
// OTHER MODULES & SERVER BOOTSTRAP
// ----------------------------------------------------
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ error: 'Invalid admin credentials' });
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(400).json({ error: 'Invalid admin credentials' });
    const token = jwt.sign({ id: admin._id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, username: admin.username });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/dashboard/full-overview', authAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ payment_status: 'Paid' });
    const totalRev = orders.reduce((acc, o) => acc + o.total_amount, 0);
    const customersCount = await User.countDocuments();
    const subsCount = await Subscription.countDocuments({ status: 'ACTIVE' });
    res.json({
      kpis: { revenue: { value: totalRev }, orders: { value: orders.length }, customers: { value: customersCount }, subscriptions: { value: subsCount } },
      revenue_timeline: [], order_statuses: { completed: orders.length, processing: 0, pending: 0 }, payment_methods: { upi: { amount: totalRev, count: orders.length }, crypto: { amount: 0, count: 0 } }, top_products: [], slot_summary: { total: 0, available: 0, assigned: 0 }, attention_items: [], live_visitors: activeSessions.size || 1
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/products', authAdmin, async (req, res) => {
  try { res.json(await Product.find().sort({ created_at: -1 })); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/admin/slots', authAdmin, async (req, res) => {
  try { const slots = await InventorySlot.find(); res.json({ slots, stats: { total: slots.length, available: 0, assigned: 0, full: 0, disabled: 0 } }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/admin/subscriptions/advanced', authAdmin, async (req, res) => {
  try { res.json({ subscriptions: [], stats: { total: 0, active: 0 } }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/admin/transactions', authAdmin, async (req, res) => {
  try { res.json(await Transaction.find().select('-proof_screenshot')); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/admin/customers/list', authAdmin, async (req, res) => {
  try { res.json(await User.find()); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/admin/payment-settings', authAdmin, async (req, res) => {
  try { res.json(await PaymentSettings.findOne() || {}); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ NEXUS Digital Engine running on port ${PORT}`);
});

const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(async () => {
      console.log('✓ Connected to MongoDB Atlas Cloud Database');
      await initializeSystem();
    })
    .catch(err => console.error('✕ Failed to connect to MongoDB Atlas:', err.message));
}
