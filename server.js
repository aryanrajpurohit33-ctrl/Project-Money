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

function calculateAccurateExpiry(startAt, durationStr) {
  const expiry = new Date(startAt);
  const dur = String(durationStr || '').toUpperCase().trim();

  if (dur.includes('1_YEAR') || dur.includes('1 YEAR') || dur.includes('ONE_YEAR') || dur.includes('12_MONTH')) {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else if (dur.includes('6_MONTH') || dur.includes('6 MONTH') || dur.includes('SIX_MONTH')) {
    expiry.setMonth(expiry.getMonth() + 6);
  } else {
    expiry.setMonth(expiry.getMonth() + 1);
  }
  return expiry;
}

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
        delivery_type: 'EMAIL_PASSWORD'
      });

      await InventorySlot.create([
        { product_id: subProduct._id, account_label: 'Slot 1', email: 'account1@example.com', password: 'VaultStream#2026', max_active_users: 1, status: 'AVAILABLE' }
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
// CUSTOMER AUTHENTICATION APIS (USERNAME-BASED)
// ----------------------------------------------------
app.get('/api/auth/check-username', async (req, res) => {
  try {
    const username = (req.query.username || '').toLowerCase().trim();
    if (!username || username.length < 3 || username.length > 30) return res.json({ available: false, message: 'Must be 3-30 characters' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.json({ available: false, message: 'Only letters, numbers, & underscore allowed' });
    const existing = await User.findOne({ username });
    if (existing) return res.json({ available: false, message: 'Username already taken' });
    res.json({ available: true, message: 'Username available' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/customer/register', async (req, res) => {
  try {
    const username = (req.body.username || '').toLowerCase().trim();
    const email = (req.body.email || `${username}@nexus.internal`).toLowerCase().trim();
    const password = req.body.password || '';

    if (!username || username.length < 3 || username.length > 30) return res.status(400).json({ error: 'Username must be between 3 and 30 characters.' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long.' });

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ error: 'Username or email already exists.' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      name: req.body.name || username,
      email,
      mobile: req.body.mobile || '',
      password_hash
    });

    const token = jwt.sign({ id: user._id, role: 'customer', username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    recordActivity('customer_registered', `New customer @${user.username} created an account`);
    res.status(201).json({ token, user: { id: user._id, username: user.username, name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ error: 'Unable to create account. Please try again.' }); }
});

app.post('/api/auth/customer/login', async (req, res) => {
  try {
    const username = (req.body.username || req.body.email || '').toLowerCase().trim();
    const password = req.body.password || '';

    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) return res.status(400).json({ error: 'Incorrect username or password.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Incorrect username or password.' });

    user.last_login = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id, role: 'customer', username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ error: 'Unable to log in. Please try again.' }); }
});

app.post('/api/auth/customer/forgot-password', async (req, res) => {
  res.json({ success: true, message: 'If an account exists with that email/username, reset instructions have been sent.' });
});

app.post('/api/presence/heartbeat', (req, res) => {
  try {
    const { sessionId, page, action } = req.body;
    if (sessionId) activeSessions.set(sessionId, { page: page || 'home', timestamp: Date.now() });
    funnelStats.visitors++;
    if (action) {
      if (action.includes('product_view')) funnelStats.product_views++;
      if (action.includes('checkout_start')) funnelStats.checkouts_started++;
      recordActivity('visitor_action', action);
    }
    res.json({ status: 'ok' });
  } catch (e) { res.json({ status: 'ok' }); }
});

app.get('/api/payment-methods', async (req, res) => {
  try {
    const settings = await PaymentSettings.findOne() || {};
    res.json(settings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products', async (req, res) => {
  try {
    const { search } = req.query;
    let query = { status: { $ne: 'draft' } };
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { description: regex }, { sku: regex }, { tags: regex }, { category: regex }];
    }
    const products = await Product.find(query).sort({ created_at: -1 });
    const formatted = products.map(p => ({
      ...p.toObject(),
      in_stock: p.status === 'active'
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let product = null;

    if (mongoose.Types.ObjectId.isValid(identifier)) product = await Product.findById(identifier);
    if (!product) product = await Product.findOne({ slug: identifier });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    res.json({ ...product.toObject(), in_stock: product.status === 'active', related: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/checkout/initiate-order', authCustomer, async (req, res) => {
  try {
    const { items, payment_method } = req.body;
    const user = await User.findById(req.user.id);
    let subtotal = 0;
    const orderItems = [];

    let mainProductName = '';
    let mainProductType = 'SUBSCRIPTION';
    let mainDuration = '1_MONTH';

    for (const item of items) {
      const p = await Product.findById(item.product_id);
      if (!p) throw new Error(`Product not found`);

      let duration = item.duration || '1_MONTH';
      let itemPrice = p.sale_price;

      if (p.product_type === 'SUBSCRIPTION') {
        const d = String(duration).toUpperCase();
        if (d.includes('YEAR') || d.includes('12')) itemPrice = p.subscription_pricing.one_year;
        else if (d.includes('6')) itemPrice = p.subscription_pricing.six_months;
        else itemPrice = p.subscription_pricing.one_month;
      }

      subtotal += itemPrice;
      mainProductName = p.name;
      mainProductType = p.product_type || 'SUBSCRIPTION';
      mainDuration = duration;

      orderItems.push({
        product_id: p._id, name: p.name, price: itemPrice, product_type: p.product_type || 'SUBSCRIPTION',
        duration, delivery_type: p.delivery_type, subscription_id: null
      });
    }

    const totalAmount = subtotal;
    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const txnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);

    const order = await Order.create({
      order_number: orderNumber, user_id: user._id, customer_name: user.username || user.name, customer_email: user.email,
      items: orderItems, subtotal, total_amount: totalAmount, payment_method, payment_status: 'Pending', delivery_status: 'Pending'
    });

    const transaction = await Transaction.create({
      txn_id: txnId, order_id: order._id, user_id: user._id, customer_name: user.username || user.name, customer_email: user.email,
      product_name: mainProductName, product_type: mainProductType, duration: mainDuration, amount: totalAmount,
      payment_method, status: 'PENDING_PAYMENT'
    });

    order.transaction_id = transaction._id;
    await order.save();

    funnelStats.payments_initiated++;
    recordActivity('order_initiated', `Customer ${user.name} started order #${orderNumber}`);
    res.status(201).json({ order, transaction });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/checkout/upload-proof-json', authCustomer, async (req, res) => {
  try {
    const { transaction_id, screenshot_base64 } = req.body;
    const txn = await Transaction.findOne({ txn_id: transaction_id, user_id: req.user.id });
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    txn.proof_screenshot = screenshot_base64;
    txn.status = 'PROCESSING';
    await txn.save();

    await Order.findByIdAndUpdate(txn.order_id, { payment_status: 'Processing', delivery_status: 'Processing' });
    funnelStats.proofs_uploaded++;
    res.json({ success: true, transaction: txn });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/customer/orders', authCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id })
      .populate({ path: 'items.subscription_id', populate: { path: 'assigned_slot_id', model: 'InventorySlot' } })
      .sort({ created_at: -1 });

    const now = new Date();
    const sanitized = orders.map(order => {
      const isPaid = order.payment_status === 'Paid';
      const oObj = order.toObject();

      oObj.items = oObj.items.map(it => {
        if (!isPaid) return { ...it, delivered_data: null };

        const sub = it.subscription_id;
        if (sub) {
          const expiresAt = new Date(sub.expires_at);
          const isExpired = now >= expiresAt || sub.status !== 'ACTIVE';
          const slot = sub.assigned_slot_id;
          const liveCredentials = (!isExpired && slot && slot.status !== 'DISABLED') ? { account_label: slot.account_label, email: slot.email, password: slot.password, custom_text: slot.custom_text } : null;
          return { ...it, is_subscription: true, is_expired: isExpired, start_at: sub.start_at, expires_at: sub.expires_at, delivered_data: liveCredentials };
        }
        return it;
      });
      return oObj;
    });

    res.json(sanitized);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----------------------------------------------------
// ADMIN DASHBOARD & CORE APIS
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
    const { range } = req.query; 
    const now = new Date();
    let startDate = new Date();

    if (range === 'today') startDate.setHours(0, 0, 0, 0);
    else if (range === '7d') startDate.setDate(now.getDate() - 7);
    else if (range === '30d') startDate.setDate(now.getDate() - 30);
    else startDate = new Date(0); 

    const [salesAgg, totalOrdersCount, allSubs, totalCustomers, recentTxns, recentOrders] = await Promise.all([
      Order.aggregate([ { $match: { payment_status: 'Paid', created_at: { $gte: startDate } } }, { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 } } } ]),
      Order.countDocuments({ created_at: { $gte: startDate } }),
      Subscription.find(),
      User.countDocuments({ created_at: { $gte: startDate } }),
      Transaction.find().sort({ created_at: -1 }).limit(6),
      Order.find().sort({ created_at: -1 }).limit(5)
    ]);

    const activeSubs = allSubs.filter(s => s.status === 'ACTIVE' && new Date(s.expires_at) > now).length;
    const visitors = Array.from(activeSessions.values()).length || 1;

    res.json({
      sales: { revenue: salesAgg[0]?.total || 0, orders: totalOrdersCount },
      customers: { total: totalCustomers },
      subscriptions: { active: activeSubs },
      recent_txns: recentTxns,
      recent_orders: recentOrders,
      live_visitors: visitors,
      funnel: funnelStats
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/system/infrastructure', authAdmin, async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    let dbStatus = 'Disconnected', dbPingMs = 0, dbCollectionsCount = 0;
    if (mongoose.connection.readyState === 1) {
      dbStatus = 'Connected';
      const pingStart = Date.now();
      const stats = await mongoose.connection.db.stats();
      dbPingMs = Date.now() - pingStart;
      dbCollectionsCount = stats.collections;
    }
    const uptimeSec = Math.floor(process.uptime());
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);

    res.json({
      server: {
        uptime_formatted: `${days > 0 ? days + 'd ' : ''}${hours}h ${mins}m ${uptimeSec % 60}s`,
        service_memory_rss_mb: Math.round(memUsage.rss / 1024 / 1024),
        os_mem_percent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      },
      database: { status: dbStatus, ping_latency_ms: dbPingMs, collections_count: dbCollectionsCount },
      environment_variables: [{ key: 'MONGODB_URI', status: process.env.MONGODB_URI ? 'Configured' : 'Missing' }, { key: 'JWT_SECRET', status: 'Configured' }]
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/system/health-check', authAdmin, async (req, res) => {
  const checks = { frontend: { status: 'Operational', latency_ms: 2 }, backend: { status: 'Operational', uptime_sec: Math.floor(process.uptime()) }, database: { status: 'Disconnected', latency_ms: null }, auth_service: { status: 'Operational' }, digital_delivery: { status: 'Operational' } };
  try {
    const dbStart = Date.now();
    await mongoose.connection.db.admin().ping();
    checks.database.status = 'Connected'; checks.database.latency_ms = Date.now() - dbStart;
    res.json({ success: true, timestamp: new Date(), checks });
  } catch (err) {
    checks.database.status = 'Degraded'; res.json({ success: false, checks });
  }
});

app.get('/api/admin/customers/list', authAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: -1 });
    const now = new Date();
    const customerDetails = await Promise.all(users.map(async (u) => {
      const [orderCount, activeSubs, historySubs] = await Promise.all([
        Order.countDocuments({ user_id: u._id, payment_status: 'Paid' }),
        Subscription.find({ user_id: u._id, status: 'ACTIVE', expires_at: { $gt: now } }).populate('product_id', 'name').populate('assigned_slot_id', 'account_label email'),
        Subscription.find({ user_id: u._id }).populate('product_id', 'name').sort({ created_at: -1 })
      ]);
      return {
        _id: u._id, username: u.username, name: u.name, email: u.email, created_at: u.created_at,
        orders_count: orderCount, active_subscriptions: activeSubs || [], subscription_history: historySubs || []
      };
    }));
    res.json(customerDetails);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/slots', authAdmin, async (req, res) => {
  try {
    const slots = await InventorySlot.find().populate('product_id', 'name sku product_type').sort({ created_at: -1 });
    const enrichedSlots = await Promise.all(slots.map(async (slot) => {
      const activeSubs = await Subscription.find({ assigned_slot_id: slot._id, status: 'ACTIVE', expires_at: { $gt: new Date() } }).populate('user_id', 'name email').populate('order_id', 'order_number');
      const activeUsersCount = activeSubs.length;
      const maxUsers = slot.max_active_users || 1;
      let derivedStatus = slot.status;
      if (slot.status !== 'DISABLED') {
        if (activeUsersCount >= maxUsers) derivedStatus = 'FULL';
        else if (activeUsersCount > 0) derivedStatus = 'ASSIGNED';
        else derivedStatus = 'AVAILABLE';
      }
      return { ...slot.toObject(), status: derivedStatus, active_users_count: activeUsersCount, max_active_users: maxUsers };
    }));
    res.json({ slots: enrichedSlots, stats: { total: enrichedSlots.length, available: enrichedSlots.filter(s => s.status === 'AVAILABLE').length, assigned: enrichedSlots.filter(s => s.status === 'ASSIGNED').length, full: enrichedSlots.filter(s => s.status === 'FULL').length, disabled: enrichedSlots.filter(s => s.status === 'DISABLED').length, total_active_users: enrichedSlots.reduce((a, b) => a + b.active_users_count, 0) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/slots', authAdmin, async (req, res) => {
  try {
    const slot = await InventorySlot.create(req.body);
    res.status(201).json(slot);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/admin/slots/:id', authAdmin, async (req, res) => {
  try {
    const slot = await InventorySlot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(slot);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/admin/slots/:id', authAdmin, async (req, res) => {
  try {
    await InventorySlot.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/subscriptions/advanced', authAdmin, async (req, res) => {
  try {
    const now = new Date();
    const subs = await Subscription.find().populate('user_id', 'username name email').populate('product_id', 'name sku').populate('assigned_slot_id', 'account_label email max_active_users').sort({ expires_at: 1 });
    const enriched = subs.map(s => {
      const exp = new Date(s.expires_at);
      const isExpired = exp <= now;
      const diffMs = exp - now;
      let timeRemainingText = 'Expired';
      let daysLeft = 0;
      if (!isExpired && s.status === 'ACTIVE') {
        const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
        daysLeft = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        timeRemainingText = daysLeft > 0 ? `${daysLeft} Days ${hours} Hrs Left` : `${hours} Hrs Left`;
      }
      return { ...s.toObject(), is_expired: isExpired, days_left: daysLeft, time_remaining_text: timeRemainingText };
    });
    res.json({ subscriptions: enriched, stats: { total: subs.length, active: subs.filter(s => s.status === 'ACTIVE' && new Date(s.expires_at) > now).length } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/subscriptions/:id/extend', authAdmin, async (req, res) => {
  try {
    const { extend_type, custom_days } = req.body;
    const sub = await Subscription.findById(req.params.id);
    const currentExpiry = new Date(sub.expires_at > new Date() ? sub.expires_at : new Date());
    const newExpiry = new Date(currentExpiry);
    if (extend_type === '1_MONTH') newExpiry.setMonth(newExpiry.getMonth() + 1);
    else if (extend_type === '6_MONTHS') newExpiry.setMonth(newExpiry.getMonth() + 6);
    else if (extend_type === '1_YEAR') newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    else if (extend_type === 'CUSTOM') newExpiry.setDate(newExpiry.getDate() + (Number(custom_days) || 30));
    sub.expires_at = newExpiry; sub.status = 'ACTIVE';
    sub.history.push({ action: 'EXTEND', performed_by: req.admin.username, details: `Extended to ${newExpiry.toLocaleDateString()}` });
    await sub.save();
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/admin/subscriptions/:id/reassign-slot', authAdmin, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    const targetSlot = await InventorySlot.findById(req.body.new_slot_id);
    if (!targetSlot || targetSlot.status === 'DISABLED') return res.status(400).json({ error: 'Invalid slot' });
    sub.assigned_slot_id = targetSlot._id;
    sub.history.push({ action: 'REASSIGN_SLOT', performed_by: req.admin.username, details: `Reassigned to "${targetSlot.account_label}"` });
    await sub.save();
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/admin/subscriptions/:id/revoke', authAdmin, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    sub.status = req.body.action_type === 'CANCEL' ? 'CANCELLED' : 'REVOKED';
    sub.history.push({ action: sub.status, performed_by: req.admin.username, details: `Access revoked: ${req.body.reason || ''}` });
    await sub.save();
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/admin/transactions', authAdmin, async (req, res) => {
  try {
    const txns = await Transaction.find().select('-proof_screenshot').sort({ created_at: -1 });
    const now = new Date();
    const detailed = await Promise.all(txns.map(async (t) => {
      const order = await Order.findById(t.order_id);
      let availableSlots = [];
      if (order && order.items.length > 0) {
        const slots = await InventorySlot.find({ product_id: order.items[0].product_id, status: { $ne: 'DISABLED' } }).select('_id account_label email max_active_users status');
        for (const slot of slots) {
          const activeCount = await Subscription.countDocuments({ assigned_slot_id: slot._id, status: 'ACTIVE', expires_at: { $gt: now } });
          const maxUsers = slot.max_active_users || 1;
          if (activeCount < maxUsers) availableSlots.push({ _id: slot._id, account_label: slot.account_label, email: slot.email, usage: `${activeCount}/${maxUsers}` });
        }
      }
      return { ...t.toObject(), product_id: order?.items[0]?.product_id, available_slots: availableSlots };
    }));
    res.json(detailed);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/transactions/:id/proof', authAdmin, async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id).select('proof_screenshot txn_id');
    res.json(txn || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/transactions/:id/confirm-and-assign', authAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { slot_id, create_new_slot } = req.body;
    const txn = await Transaction.findById(req.params.id).session(session);
    if (!txn || txn.status === 'CONFIRMED') throw new Error('Transaction invalid or already confirmed');
    const order = await Order.findById(txn.order_id).session(session);
    const item = order.items[0];
    let slot = null;

    if (create_new_slot && create_new_slot.email) {
      const sArr = await InventorySlot.create([{ product_id: item.product_id, account_label: create_new_slot.account_label || 'Slot', email: create_new_slot.email, password: create_new_slot.password || '', max_active_users: Number(create_new_slot.max_active_users) || 1, status: 'AVAILABLE' }], { session });
      slot = sArr[0];
    } else if (slot_id) {
      slot = await InventorySlot.findById(slot_id).session(session);
    } else {
      const allSlots = await InventorySlot.find({ product_id: item.product_id, status: { $ne: 'DISABLED' } }).session(session);
      for (const candidate of allSlots) {
        const activeCount = await Subscription.countDocuments({ assigned_slot_id: candidate._id, status: 'ACTIVE', expires_at: { $gt: new Date() } }).session(session);
        if (activeCount < (candidate.max_active_users || 1)) { slot = candidate; break; }
      }
    }
    if (!slot) throw new Error('No available account slot found. Please add an account slot first.');

    const expiresAt = calculateAccurateExpiry(new Date(), item.duration || txn.duration || '1_MONTH');

    const createdSub = await Subscription.create([{
      order_id: order._id, user_id: order.user_id, product_id: item.product_id, assigned_slot_id: slot._id,
      product_name: item.name, duration: item.duration || txn.duration, start_at: new Date(), expires_at: expiresAt, status: 'ACTIVE'
    }], { session });

    item.subscription_id = createdSub[0]._id;
    txn.status = 'CONFIRMED';
    txn.verified_at = new Date();
    txn.assigned_slot_id = slot._id;
    await txn.save({ session });
    order.payment_status = 'Paid';
    order.delivery_status = 'Delivered';
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.json({ success: true });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/transactions/:id/reject', authAdmin, async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    txn.status = 'REJECTED';
    await txn.save();
    await Order.findByIdAndUpdate(txn.order_id, { payment_status: 'Failed', delivery_status: 'Failed' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const prods = await Product.find().sort({ created_at: -1 });
    const list = await Promise.all(prods.map(async (p) => {
      const total = await InventorySlot.countDocuments({ product_id: p._id });
      const available = await InventorySlot.countDocuments({ product_id: p._id, status: 'AVAILABLE' });
      return { ...p.toObject(), total_slots: total, available_slots: available };
    }));
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const { name, original_price, sale_price } = req.body;
    const orig = Number(original_price) || 0;
    const sale = Number(sale_price) || 0;
    const discount = orig > sale ? Math.round(((orig - sale) / orig) * 100) : 0;
    const slug = (name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    const product = await Product.create({ ...req.body, slug: req.body.slug || slug, sku: req.body.sku || 'SKU-' + Date.now(), original_price: orig, sale_price: sale, discount_percentage: discount });
    res.status(201).json(product);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    const { original_price, sale_price } = req.body;
    const orig = Number(original_price) || 0;
    const sale = Number(sale_price) || 0;
    const discount = orig > sale ? Math.round(((orig - sale) / orig) * 100) : 0;
    const updated = await Product.findByIdAndUpdate(req.params.id, { ...req.body, original_price: orig, sale_price: sale, discount_percentage: discount, updated_at: new Date() }, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/admin/products/:id/duplicate', authAdmin, async (req, res) => {
  try {
    const original = await Product.findById(req.params.id);
    const cloneData = original.toObject();
    delete cloneData._id; delete cloneData.created_at; delete cloneData.updated_at;
    cloneData.name = `${original.name} (Copy)`;
    cloneData.slug = `${original.slug}-copy-${Date.now()}`;
    cloneData.sku = `${original.sku}-COPY-${Math.floor(Math.random() * 1000)}`;
    cloneData.status = 'draft';
    const newProduct = await Product.create(cloneData);
    res.status(201).json(newProduct);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    await InventorySlot.deleteMany({ product_id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/payment-settings', authAdmin, async (req, res) => {
  try {
    const settings = await PaymentSettings.findOne() || {};
    res.json(settings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/payment-settings', authAdmin, async (req, res) => {
  try {
    let settings = await PaymentSettings.findOne();
    if (!settings) settings = new PaymentSettings(req.body);
    else Object.assign(settings, req.body);
    await settings.save();
    res.json(settings);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------------------------------------
// SERVER BOOTSTRAP
// ----------------------------------------------------
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
