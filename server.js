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

app.use((req, res, next) => {
  const startHrTime = process.hrtime();
  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedMs = Math.round((elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6) * 10) / 10;
    if (req.originalUrl.startsWith('/api/')) {
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
  });
  next();
});

function recordActivity(type, text, meta = {}) {
  const item = { id: Date.now() + '-' + Math.random(), type, text, meta, created_at: new Date() };
  activityFeed.unshift(item);
  if (activityFeed.length > 50) activityFeed.pop();
}

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of activeSessions.entries()) {
    if (now - data.timestamp > 35000) activeSessions.delete(sessionId);
  }
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
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, default: '' },
  password_hash: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  sku: { type: String, required: true, unique: true },
  category: { type: String, default: 'Software & Digital Goods' },
  tags: [String],
  short_description: { type: String, default: '' },
  description: { type: String, default: '' },
  product_type: { type: String, enum: ['ONE_TIME', 'SUBSCRIPTION'], default: 'ONE_TIME' },
  original_price: { type: Number, required: true, default: 999 },
  sale_price: { type: Number, required: true, default: 499 },
  discount_percentage: { type: Number, default: 0 },
  subscription_pricing: {
    one_month: { type: Number, default: 199 },
    six_months: { type: Number, default: 899 },
    one_year: { type: Number, default: 1499 }
  },
  images: [{ type: String }],
  features: [{ type: String }],
  whats_included: [{ type: String }],
  specifications: [{ label: String, value: String }],
  delivery_type: { 
    type: String, 
    enum: ['EMAIL_PASSWORD', 'MOBILE_PASSWORD', 'STANDARD_LINK', 'DOWNLOADABLE_FILE', 'LICENSE_KEY', 'CUSTOM_TEXT'], 
    default: 'EMAIL_PASSWORD' 
  },
  status: { type: String, enum: ['active', 'draft', 'archived', 'disabled'], default: 'active' },
  sales_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Single Source of Truth for Credential Slots
const InventorySlotSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  account_label: { type: String, required: true, default: 'Account Slot 1' },
  email: { type: String, default: '' },
  password: { type: String, default: '' },
  custom_text: { type: String, default: '' },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['AVAILABLE', 'RESERVED', 'ASSIGNED', 'EXPIRED', 'DISABLED'], default: 'AVAILABLE' },
  current_customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  current_subscription_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
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

// Subscription referencing the assigned_slot_id (no permanent duplicated password)
const SubscriptionSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  assigned_slot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySlot', default: null },
  product_name: String,
  duration: { type: String, enum: ['1_MONTH', '6_MONTHS', '1_YEAR', 'ONE_TIME'], required: true },
  start_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
  status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'REVOKED'], default: 'ACTIVE' },
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
  duration: { type: String, default: 'ONE_TIME' },
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

// ----------------------------------------------------
// DATABASE INITIALIZATION
// ----------------------------------------------------
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

    const pCount = await Product.countDocuments();
    if (pCount === 0) {
      const subProduct = await Product.create({
        name: 'Authorized Streaming Subscription',
        slug: 'authorized-streaming-subscription',
        sku: 'SUB-STRM-01',
        category: 'Streaming & Accounts',
        tags: ['netflix', 'streaming', '4k', 'uhd'],
        short_description: 'PIN-protected 4K UHD streaming profile with instant activation.',
        description: 'Enjoy Ultra HD 4K streaming across all your devices. Dedicated private profile on authorized high-speed streaming accounts.',
        product_type: 'SUBSCRIPTION',
        original_price: 299,
        sale_price: 199,
        discount_percentage: 33,
        subscription_pricing: { one_month: 199, six_months: 899, one_year: 1499 },
        images: ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1000&auto=format&fit=crop&q=80'],
        features: ['Ultra HD 4K Video Quality', 'Private PIN Lock Profile', 'Works on All Smart Devices', 'Instant Replacement Guarantee'],
        whats_included: ['1x Private Profile Credentials', 'Exclusive PIN code', 'Quick Login Guide'],
        specifications: [
          { label: 'Quality', value: '4K HDR' },
          { label: 'Screens', value: '1 Screen (Private Profile)' },
          { label: 'Delivery', value: 'Instant Manual Approval' }
        ],
        delivery_type: 'EMAIL_PASSWORD'
      });

      await InventorySlot.create([
        { product_id: subProduct._id, account_label: 'Slot 1', email: 'account1@example.com', password: 'VaultStream#2026', status: 'AVAILABLE' },
        { product_id: subProduct._id, account_label: 'Slot 2', email: 'account2@example.com', password: 'StreamBeast!889', status: 'AVAILABLE' }
      ]);
    }
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
// SYSTEM & INFRASTRUCTURE MONITORING
// ----------------------------------------------------
app.get('/api/admin/system/infrastructure', authAdmin, async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const rssMB = Math.round((memUsage.rss / 1024 / 1024) * 10) / 10;
    const heapUsedMB = Math.round((memUsage.heapUsed / 1024 / 1024) * 10) / 10;
    const heapTotalMB = Math.round((memUsage.heapTotal / 1024 / 1024) * 10) / 10;

    const osFreeMemMB = Math.round(os.freemem() / 1024 / 1024);
    const osTotalMemMB = Math.round(os.totalmem() / 1024 / 1024);
    const osUsedMemMB = osTotalMemMB - osFreeMemMB;
    const osMemPercent = Math.round((osUsedMemMB / osTotalMemMB) * 100);

    let dbStatus = 'Disconnected';
    let dbDataSizeMB = 0;
    let dbStorageSizeMB = 0;
    let dbIndexesSizeMB = 0;
    let dbCollectionsCount = 0;
    let dbPingMs = 0;

    if (mongoose.connection.readyState === 1) {
      dbStatus = 'Connected';
      const pingStart = Date.now();
      const stats = await mongoose.connection.db.stats();
      dbPingMs = Date.now() - pingStart;

      dbDataSizeMB = Math.round((stats.dataSize / 1024 / 1024) * 100) / 100;
      dbStorageSizeMB = Math.round((stats.storageSize / 1024 / 1024) * 100) / 100;
      dbIndexesSizeMB = Math.round((stats.indexSize / 1024 / 1024) * 100) / 100;
      dbCollectionsCount = stats.collections;
    }

    const [usersCount, productsCount, ordersCount, txnsCount, invCount] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Transaction.countDocuments(),
      InventorySlot.countDocuments()
    ]);

    const recentRequests = requestLogs.slice(0, 50);
    const avgResponseTime = recentRequests.length > 0
      ? Math.round(recentRequests.reduce((a, b) => a + b.responseTime, 0) / recentRequests.length)
      : 12;

    const errorCount = recentRequests.filter(r => r.statusCode >= 400).length;
    const errorRatePercent = recentRequests.length > 0
      ? Math.round((errorCount / recentRequests.length) * 100)
      : 0;

    const uptimeSec = Math.floor(process.uptime());
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const formattedUptime = `${days > 0 ? days + 'd ' : ''}${hours}h ${mins}m ${uptimeSec % 60}s`;

    const isRender = !!process.env.RENDER;
    const hostingDetails = {
      provider: isRender ? 'Render Cloud (Production)' : 'Node.js Standalone Container',
      service_id: process.env.RENDER_SERVICE_ID || 'Container-Local',
      node_version: process.version,
      platform: `${os.type()} ${os.arch()}`,
      environment: process.env.NODE_ENV || 'production'
    };

    res.json({
      server: {
        status: 'Operational',
        uptime_seconds: uptimeSec,
        uptime_formatted: formattedUptime,
        service_memory_rss_mb: rssMB,
        heap_used_mb: heapUsedMB,
        heap_total_mb: heapTotalMB,
        os_used_mem_mb: osUsedMemMB,
        os_total_mem_mb: osTotalMemMB,
        os_mem_percent: osMemPercent,
        avg_response_time_ms: avgResponseTime,
        error_rate_percent: errorRatePercent,
        request_count_tracked: requestLogs.length,
        hosting: hostingDetails
      },
      database: {
        status: dbStatus,
        ping_latency_ms: dbPingMs,
        data_size_mb: dbDataSizeMB,
        storage_size_mb: dbStorageSizeMB,
        indexes_size_mb: dbIndexesSizeMB,
        collections_count: dbCollectionsCount,
        collections: [
          { name: 'Users', count: usersCount, status: 'Healthy' },
          { name: 'Products', count: productsCount, status: 'Healthy' },
          { name: 'Orders', count: ordersCount, status: 'Healthy' },
          { name: 'Transactions', count: txnsCount, status: 'Healthy' },
          { name: 'Account Slots', count: invCount, status: 'Healthy' }
        ]
      },
      recent_api_metrics: requestLogs.slice(0, 8),
      recent_errors: appErrorLogs.slice(0, 10),
      timestamp: new Date()
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/system/health-check', authAdmin, async (req, res) => {
  const results = {
    frontend: { status: 'Operational', latency_ms: 2 },
    backend: { status: 'Operational', uptime_sec: Math.floor(process.uptime()) },
    database: { status: 'Disconnected', latency_ms: null },
    auth_service: { status: 'Operational', algorithm: 'HS256' },
    payment_gateway: { status: 'Operational', configured: true },
    digital_delivery: { status: 'Operational', stock_ready: false }
  };

  try {
    const dbStart = Date.now();
    await mongoose.connection.db.admin().ping();
    results.database.status = 'Connected';
    results.database.latency_ms = Date.now() - dbStart;

    const availableStock = await InventorySlot.countDocuments({ status: 'AVAILABLE' });
    results.digital_delivery.stock_ready = availableStock > 0;
    results.digital_delivery.available_stock = availableStock;

    res.json({ success: true, timestamp: new Date(), checks: results });
  } catch (err) {
    results.database.status = 'Degraded';
    results.database.error = err.message;
    res.status(500).json({ success: false, checks: results });
  }
});

// ----------------------------------------------------
// STORE & CUSTOMER APIS
// ----------------------------------------------------
app.post('/api/presence/heartbeat', (req, res) => {
  const { sessionId, page, action } = req.body;
  if (sessionId) activeSessions.set(sessionId, { page: page || 'home', timestamp: Date.now() });
  if (action) recordActivity('visitor_action', action);
  res.json({ status: 'ok' });
});

app.get('/api/payment-methods', async (req, res) => {
  try {
    const settings = await PaymentSettings.findOne() || {};
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { search } = req.query;
    let query = { status: 'active' };
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { description: regex }, { sku: regex }, { tags: regex }, { category: regex }];
    }
    const products = await Product.find(query).sort({ created_at: -1 });
    const withStock = await Promise.all(products.map(async (p) => {
      const availableCount = await InventorySlot.countDocuments({ product_id: p._id, status: 'AVAILABLE' });
      return { ...p.toObject(), in_stock: availableCount > 0, stock_count: availableCount };
    }));
    res.json(withStock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let product = null;

    if (mongoose.Types.ObjectId.isValid(identifier)) {
      product = await Product.findById(identifier);
    }
    if (!product) {
      product = await Product.findOne({ slug: identifier });
    }
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const availableCount = await InventorySlot.countDocuments({ product_id: product._id, status: 'AVAILABLE' });
    const related = await Product.find({ _id: { $ne: product._id }, status: 'active' }).limit(4);

    res.json({ 
      ...product.toObject(), 
      in_stock: availableCount > 0, 
      stock_count: availableCount,
      related 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/customer/register', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const user = await User.create({ name, email: email.toLowerCase().trim(), mobile: mobile || '', password_hash });
    const token = jwt.sign({ id: user._id, role: 'customer', email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/customer/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: 'customer', email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/checkout/initiate-order', authCustomer, async (req, res) => {
  try {
    const { items, payment_method } = req.body;
    const user = await User.findById(req.user.id);
    let subtotal = 0;
    const orderItems = [];

    let mainProductName = '';
    let mainProductType = 'ONE_TIME';
    let mainDuration = 'ONE_TIME';

    for (const item of items) {
      const p = await Product.findById(item.product_id);
      if (!p) throw new Error(`Product not found`);

      let itemPrice = p.sale_price;
      let duration = item.duration || 'ONE_TIME';

      if (p.product_type === 'SUBSCRIPTION') {
        if (duration === '1_MONTH') itemPrice = p.subscription_pricing.one_month;
        else if (duration === '6_MONTHS') itemPrice = p.subscription_pricing.six_months;
        else if (duration === '1_YEAR') itemPrice = p.subscription_pricing.one_year;
      }

      subtotal += itemPrice;
      mainProductName = p.name;
      mainProductType = p.product_type;
      mainDuration = duration;

      orderItems.push({
        product_id: p._id,
        name: p.name,
        price: itemPrice,
        product_type: p.product_type,
        duration,
        delivery_type: p.delivery_type,
        subscription_id: null
      });
    }

    const totalAmount = subtotal;
    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const txnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);

    const order = await Order.create({
      order_number: orderNumber,
      user_id: user._id,
      customer_name: user.name,
      customer_email: user.email,
      items: orderItems,
      subtotal,
      total_amount: totalAmount,
      payment_method,
      payment_status: 'Pending',
      delivery_status: 'Pending'
    });

    const transaction = await Transaction.create({
      txn_id: txnId,
      order_id: order._id,
      user_id: user._id,
      customer_name: user.name,
      customer_email: user.email,
      product_name: mainProductName,
      product_type: mainProductType,
      duration: mainDuration,
      amount: totalAmount,
      payment_method,
      status: 'PENDING_PAYMENT'
    });

    order.transaction_id = transaction._id;
    await order.save();

    recordActivity('order_initiated', `Customer ${user.name} started order #${orderNumber} (${mainDuration}) for ₹${totalAmount}`);
    res.status(201).json({ order, transaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/checkout/upload-proof-json', authCustomer, async (req, res) => {
  try {
    const { transaction_id, screenshot_base64 } = req.body;
    const txn = await Transaction.findOne({ txn_id: transaction_id, user_id: req.user.id });
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    txn.proof_screenshot = screenshot_base64;
    txn.status = 'PROCESSING';
    await txn.save();

    await Order.findByIdAndUpdate(txn.order_id, {
      payment_status: 'Processing',
      delivery_status: 'Processing'
    });

    recordActivity('proof_uploaded', `Proof submitted for TXN: ${txn.txn_id}`);
    res.json({ success: true, transaction: txn });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// CUSTOMER PURCHASED ITEMS (DYNAMIC CREDENTIAL RESOLUTION FROM ASSIGNED SLOT)
// =========================================================================
app.get('/api/customer/orders', authCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id })
      .populate({
        path: 'items.subscription_id',
        populate: {
          path: 'assigned_slot_id',
          model: 'InventorySlot'
        }
      })
      .sort({ created_at: -1 });

    const now = new Date();

    const sanitized = orders.map(order => {
      const isPaid = order.payment_status === 'Paid';
      const oObj = order.toObject();

      oObj.items = oObj.items.map(it => {
        if (!isPaid) {
          return { ...it, delivered_data: null };
        }

        const sub = it.subscription_id;
        if (sub) {
          const expiresAt = new Date(sub.expires_at);
          const isExpired = now >= expiresAt || sub.status !== 'ACTIVE';
          const slot = sub.assigned_slot_id;

          // Single source of truth: If active, return CURRENT live credentials from the slot
          const liveCredentials = (!isExpired && slot && slot.status !== 'DISABLED') ? {
            account_label: slot.account_label,
            email: slot.email,
            password: slot.password,
            custom_text: slot.custom_text
          } : null;

          return {
            ...it,
            is_subscription: true,
            is_expired: isExpired,
            start_at: sub.start_at,
            expires_at: sub.expires_at,
            delivered_data: liveCredentials
          };
        }

        return it;
      });

      return oObj;
    });

    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DEDICATED ACCOUNT SLOTS APIS (ADMIN ONLY)
// ----------------------------------------------------

// 1. List All Slots with Multi-Product & Status Filtering
app.get('/api/admin/slots', authAdmin, async (req, res) => {
  try {
    const { product_id, status, search } = req.query;
    let filter = {};

    if (product_id && product_id !== 'ALL') filter.product_id = product_id;
    if (status && status !== 'ALL') filter.status = status;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ account_label: regex }, { email: regex }];
    }

    const slots = await InventorySlot.find(filter)
      .populate('product_id', 'name sku product_type')
      .populate('current_customer_id', 'name email')
      .populate('current_subscription_id', 'start_at expires_at duration status')
      .sort({ created_at: -1 });

    const totalSlots = await InventorySlot.countDocuments();
    const availableSlots = await InventorySlot.countDocuments({ status: 'AVAILABLE' });
    const assignedSlots = await InventorySlot.countDocuments({ status: 'ASSIGNED' });
    const expiredSlots = await InventorySlot.countDocuments({ status: 'EXPIRED' });
    const disabledSlots = await InventorySlot.countDocuments({ status: 'DISABLED' });

    res.json({
      slots,
      stats: {
        total: totalSlots,
        available: availableSlots,
        assigned: assignedSlots,
        expired: expiredSlots,
        disabled: disabledSlots
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Create a New Account Slot
app.post('/api/admin/slots', authAdmin, async (req, res) => {
  try {
    const { product_id, account_label, email, password, custom_text, notes, status } = req.body;
    if (!product_id || !email) {
      return res.status(400).json({ error: 'Product and Email/Username are required' });
    }

    const slot = await InventorySlot.create({
      product_id,
      account_label: account_label || 'Account Slot',
      email,
      password: password || '',
      custom_text: custom_text || '',
      notes: notes || '',
      status: status || 'AVAILABLE'
    });

    recordActivity('slot_created', `New slot "${slot.account_label}" created for product`);
    res.status(201).json(slot);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Edit Account Slot (Live Syncs to Active Customer!)
app.put('/api/admin/slots/:id', authAdmin, async (req, res) => {
  try {
    const { account_label, email, password, custom_text, notes, status } = req.body;
    
    const slot = await InventorySlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Account slot not found' });

    if (account_label !== undefined) slot.account_label = account_label;
    if (email !== undefined) slot.email = email;
    if (password !== undefined) slot.password = password;
    if (custom_text !== undefined) slot.custom_text = custom_text;
    if (notes !== undefined) slot.notes = notes;
    if (status !== undefined) slot.status = status;
    slot.updated_at = new Date();

    await slot.save();

    recordActivity('slot_updated', `Credentials updated for slot "${slot.account_label}". Live synced to active customers.`);
    res.json(slot);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Delete Account Slot
app.delete('/api/admin/slots/:id', authAdmin, async (req, res) => {
  try {
    const slot = await InventorySlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.status === 'ASSIGNED') {
      return res.status(400).json({ error: 'Cannot delete an active assigned slot. Please revoke or reassign the subscription first.' });
    }
    await InventorySlot.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ADMIN TRANSACTIONS & CONFIRMATION WITH SLOT BINDING
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/stats', authAdmin, async (req, res) => {
  try {
    const totalRevenueAgg = await Order.aggregate([
      { $match: { payment_status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;
    const pendingPayments = await Transaction.countDocuments({ status: 'PROCESSING' });
    const activeSubs = await Subscription.countDocuments({ status: 'ACTIVE', expires_at: { $gt: new Date() } });

    res.json({ totalRevenue, pendingPayments, activeSubs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/transactions', authAdmin, async (req, res) => {
  try {
    const txns = await Transaction.find().select('-proof_screenshot').sort({ created_at: -1 });
    const detailed = await Promise.all(txns.map(async (t) => {
      const doc = await Transaction.findById(t._id).select('proof_screenshot');
      const order = await Order.findById(t.order_id);
      
      let availableSlots = [];
      if (order && order.items.length > 0) {
        availableSlots = await InventorySlot.find({
          product_id: order.items[0].product_id,
          status: 'AVAILABLE'
        }).select('_id account_label email status');
      }

      return {
        ...t.toObject(),
        has_proof: !!(doc && doc.proof_screenshot),
        available_slots: availableSlots
      };
    }));
    res.json(detailed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/transactions/:id/proof', authAdmin, async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id).select('proof_screenshot txn_id');
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ proof_screenshot: txn.proof_screenshot, txn_id: txn.txn_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/transactions/:id/confirm-and-assign', authAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { slot_id } = req.body;
    const txn = await Transaction.findById(req.params.id).session(session);
    if (!txn) throw new Error('Transaction not found');
    if (txn.status === 'CONFIRMED') throw new Error('Transaction is already confirmed');

    const order = await Order.findById(txn.order_id).session(session);
    const item = order.items[0];

    // Atomically find & lock selected slot or next available slot
    let slot = null;
    if (slot_id) {
      slot = await InventorySlot.findOneAndUpdate(
        { _id: slot_id, status: 'AVAILABLE' },
        { status: 'ASSIGNED', current_customer_id: order.user_id },
        { new: true, session }
      );
    } else {
      slot = await InventorySlot.findOneAndUpdate(
        { product_id: item.product_id, status: 'AVAILABLE' },
        { status: 'ASSIGNED', current_customer_id: order.user_id },
        { new: true, session }
      );
    }

    if (!slot) throw new Error('No available account slot found for this product. Please add an account slot under "Account Slots".');

    const startAt = new Date();
    const expiresAt = new Date(startAt);

    if (item.duration === '1_MONTH') expiresAt.setMonth(expiresAt.getMonth() + 1);
    else if (item.duration === '6_MONTHS') expiresAt.setMonth(expiresAt.getMonth() + 6);
    else if (item.duration === '1_YEAR') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setFullYear(expiresAt.getFullYear() + 50); // Lifetime / One-time

    const createdSub = await Subscription.create([{
      order_id: order._id,
      user_id: order.user_id,
      product_id: item.product_id,
      assigned_slot_id: slot._id,
      product_name: item.name,
      duration: item.duration,
      start_at: startAt,
      expires_at: expiresAt,
      status: 'ACTIVE'
    }], { session });

    slot.current_subscription_id = createdSub[0]._id;
    item.subscription_id = createdSub[0]._id;

    slot.assignment_history.push({
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      order_id: order.order_number,
      duration: item.duration,
      start_at: startAt,
      expires_at: expiresAt
    });
    await slot.save({ session });

    txn.status = 'CONFIRMED';
    txn.verified_at = new Date();
    txn.assigned_slot_id = slot._id;
    await txn.save({ session });

    order.payment_status = 'Paid';
    order.delivery_status = 'Delivered';
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    recordActivity('subscription_activated', `Payment verified. Bound slot "${slot.account_label}" to ${order.customer_name}`);
    res.json({ success: true });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/transactions/:id/reject', authAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const txn = await Transaction.findById(req.params.id);
    txn.status = 'REJECTED';
    txn.rejection_reason = reason || 'Payment proof verification failed.';
    txn.verified_at = new Date();
    await txn.save();
    await Order.findByIdAndUpdate(txn.order_id, { payment_status: 'Failed', delivery_status: 'Failed' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ADMIN PRODUCT STUDIO APIS
// ----------------------------------------------------
app.get('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ created_at: -1 });
    const list = await Promise.all(products.map(async (p) => {
      const total = await InventorySlot.countDocuments({ product_id: p._id });
      const available = await InventorySlot.countDocuments({ product_id: p._id, status: 'AVAILABLE' });
      return { ...p.toObject(), total_slots: total, available_slots: available };
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const { name, original_price, sale_price } = req.body;
    const orig = Number(original_price) || 0;
    const sale = Number(sale_price) || 0;
    const discount = orig > sale ? Math.round(((orig - sale) / orig) * 100) : 0;
    const generatedSlug = (name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

    const product = await Product.create({
      ...req.body,
      slug: req.body.slug || generatedSlug,
      sku: req.body.sku || 'SKU-' + Date.now(),
      original_price: orig,
      sale_price: sale,
      discount_percentage: discount,
      images: req.body.images && req.body.images.length ? req.body.images : ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800'],
      updated_at: new Date()
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    const { original_price, sale_price } = req.body;
    const orig = Number(original_price) || 0;
    const sale = Number(sale_price) || 0;
    const discount = orig > sale ? Math.round(((orig - sale) / orig) * 100) : 0;

    const updated = await Product.findByIdAndUpdate(req.params.id, {
      ...req.body,
      original_price: orig,
      sale_price: sale,
      discount_percentage: discount,
      updated_at: new Date()
    }, { new: true });

    if (!updated) return res.status(404).json({ error: 'Product not found' });
    recordActivity('product_updated', `Product updated: ${updated.name}`);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/products/:id/duplicate', authAdmin, async (req, res) => {
  try {
    const original = await Product.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Original product not found' });

    const cloneData = original.toObject();
    delete cloneData._id;
    delete cloneData.created_at;
    delete cloneData.updated_at;

    cloneData.name = `${original.name} (Copy)`;
    cloneData.slug = `${original.slug}-copy-${Date.now()}`;
    cloneData.sku = `${original.sku}-COPY-${Math.floor(Math.random() * 1000)}`;
    cloneData.status = 'draft';
    cloneData.sales_count = 0;

    const newProduct = await Product.create(cloneData);
    recordActivity('product_duplicated', `Duplicated product: ${newProduct.name}`);
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    await InventorySlot.deleteMany({ product_id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/payment-settings', authAdmin, async (req, res) => {
  try {
    const settings = await PaymentSettings.findOne() || {};
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/payment-settings', authAdmin, async (req, res) => {
  try {
    let settings = await PaymentSettings.findOne();
    if (!settings) settings = new PaymentSettings(req.body);
    else Object.assign(settings, req.body);
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------------------------------------
// DATABASE STARTUP
// ----------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✓ Connected to MongoDB Atlas Cloud Database');
    await initializeSystem();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✓ NEXUS Digital Engine running on port ${PORT}`));
  })
  .catch(err => console.error('✕ Failed to connect to MongoDB Atlas:', err.message));
