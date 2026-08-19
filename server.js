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

const funnelStats = { visitors: 0, product_views: 0, checkouts_started: 0, payments_initiated: 0, proofs_uploaded: 0, confirmed_purchases: 0 };

app.use((req, res, next) => {
  const startHrTime = process.hrtime();
  res.on('finish', () => {
    try {
      const elapsedHrTime = process.hrtime(startHrTime);
      const elapsedMs = Math.round((elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6) * 10) / 10;
      if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
        requestLogs.unshift({ endpoint: req.originalUrl.split('?')[0], method: req.method, statusCode: res.statusCode, responseTime: elapsedMs, timestamp: new Date() });
        if (requestLogs.length > 200) requestLogs.pop();
      }
    } catch (e) {}
  });
  next();
});

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
  assignment_history: [{ customer_name: String, customer_email: String, order_id: String, duration: String, start_at: Date, expires_at: Date, assigned_at: { type: Date, default: Date.now } }],
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
  history: [{ action: String, performed_by: String, details: String, timestamp: { type: Date, default: Date.now } }],
  cancelled_at: { type: Date, default: null },
  cancellation_reason: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
  txn_id: { type: String, required: true, unique: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer_name: String, customer_email: String, product_name: String, product_type: String, duration: { type: String, default: '1_MONTH' },
  amount: { type: Number, required: true },
  payment_method: { type: String, enum: ['UPI', 'CRYPTO'], required: true },
  proof_screenshot: { type: String, default: '' },
  assigned_slot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySlot', default: null },
  status: { type: String, enum: ['PENDING_PAYMENT', 'PROCESSING', 'CONFIRMED', 'REJECTED', 'REFUNDED'], default: 'PENDING_PAYMENT' },
  rejection_reason: { type: String, default: '' },
  verified_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  order_number: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer_name: String, customer_email: String,
  items: [{ product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, name: String, price: Number, product_type: String, duration: String, delivery_type: String, subscription_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null } }],
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
  upi_instructions: { type: String, default: '1. Scan QR code or copy UPI ID.\n2. Pay the exact order amount.' },
  crypto_enabled: { type: Boolean, default: true },
  crypto_currency: { type: String, default: 'USDT' },
  crypto_network: { type: String, default: 'TRC20' },
  crypto_wallet_address: { type: String, default: 'TXYz9876543210AbCdEfGhIjKlMnOpQrStU' }
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
  if (dur.includes('1_YEAR') || dur.includes('1 YEAR') || dur.includes('ONE_YEAR') || dur.includes('12_MONTH')) expiry.setFullYear(expiry.getFullYear() + 1);
  else if (dur.includes('6_MONTH') || dur.includes('6 MONTH') || dur.includes('SIX_MONTH')) expiry.setMonth(expiry.getMonth() + 6);
  else expiry.setMonth(expiry.getMonth() + 1);
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
  } catch (err) { console.error('Init error:', err.message); }
}

function authCustomer(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'customer') throw new Error('Unauthorized');
    req.user = decoded;
    next();
  } catch (err) { return res.status(401).json({ error: 'Invalid customer session' }); }
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
  } catch (err) { return res.status(403).json({ error: 'Forbidden: Admin session invalid' }); }
}

// ----------------------------------------------------
// CUSTOMER & PUBLIC APIS
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
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long.' });

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ error: 'Username or email already exists.' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const user = await User.create({ username, name: req.body.name || username, email, mobile: req.body.mobile || '', password_hash });

    const token = jwt.sign({ id: user._id, role: 'customer', username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, username: user.username, name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ error: 'Unable to create account.' }); }
});

app.post('/api/auth/customer/login', async (req, res) => {
  try {
    const username = (req.body.username || req.body.email || '').toLowerCase().trim();
    const password = req.body.password || '';
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) return res.status(400).json({ error: 'Incorrect username or password.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Incorrect username or password.' });

    const token = jwt.sign({ id: user._id, role: 'customer', username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ error: 'Unable to log in.' }); }
});

app.post('/api/auth/customer/forgot-password', async (req, res) => {
  res.json({ success: true, message: 'If an account exists, reset instructions have been dispatched.' });
});

app.post('/api/presence/heartbeat', (req, res) => {
  try {
    const { sessionId, page } = req.body;
    if (sessionId) activeSessions.set(sessionId, { page: page || 'home', timestamp: Date.now() });
    funnelStats.visitors++;
    res.json({ status: 'ok' });
  } catch (e) { res.json({ status: 'ok' }); }
});

app.get('/api/payment-methods', async (req, res) => {
  try { res.json(await PaymentSettings.findOne() || {}); } catch (err) { res.status(500).json({ error: err.message }); }
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
    res.json(products.map(p => ({ ...p.toObject(), in_stock: p.status === 'active' })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let product = mongoose.Types.ObjectId.isValid(identifier) ? await Product.findById(identifier) : await Product.findOne({ slug: identifier });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ ...product.toObject(), in_stock: product.status === 'active', related: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/checkout/initiate-order', authCustomer, async (req, res) => {
  try {
    const { items, payment_method } = req.body;
    const user = await User.findById(req.user.id);
    let subtotal = 0; const orderItems = [];
    let mainProductName = '', mainProductType = 'SUBSCRIPTION', mainDuration = '1_MONTH';

    for (const item of items) {
      const p = await Product.findById(item.product_id);
      if (!p) throw new Error('Product not found');
      subtotal += p.sale_price;
      mainProductName = p.name; mainProductType = p.product_type || 'SUBSCRIPTION'; mainDuration = item.duration || '1_MONTH';
      orderItems.push({ product_id: p._id, name: p.name, price: p.sale_price, product_type: p.product_type || 'SUBSCRIPTION', duration: mainDuration, delivery_type: p.delivery_type, subscription_id: null });
    }

    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const txnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);

    const order = await Order.create({ order_number: orderNumber, user_id: user._id, customer_name: user.username || user.name, customer_email: user.email, items: orderItems, subtotal, total_amount: subtotal, payment_method, payment_status: 'Pending', delivery_status: 'Pending' });
    const transaction = await Transaction.create({ txn_id: txnId, order_id: order._id, user_id: user._id, customer_name: user.username || user.name, customer_email: user.email, product_name: mainProductName, product_type: mainProductType, duration: mainDuration, amount: subtotal, payment_method, status: 'PENDING_PAYMENT' });

    order.transaction_id = transaction._id;
    await order.save();
    res.status(201).json({ order, transaction });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/checkout/upload-proof-json', authCustomer, async (req, res) => {
  try {
    const { transaction_id, screenshot_base64 } = req.body;
    const txn = await Transaction.findOne({ txn_id: transaction_id, user_id: req.user.id });
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    txn.proof_screenshot = screenshot_base64; txn.status = 'PROCESSING'; await txn.save();
    await Order.findByIdAndUpdate(txn.order_id, { payment_status: 'Processing', delivery_status: 'Processing' });
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
          const isExpired = now >= new Date(sub.expires_at) || sub.status !== 'ACTIVE';
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
// ADMIN APIS & REDESIGNED PRODUCT STUDIO
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

    const [salesAgg, totalOrdersCount, allSubs, totalCustomers, recentTxns] = await Promise.all([
      Order.aggregate([ { $match: { payment_status: 'Paid', created_at: { $gte: startDate } } }, { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 } } } ]),
      Order.countDocuments({ created_at: { $gte: startDate } }),
      Subscription.find(),
      User.countDocuments({ created_at: { $gte: startDate } }),
      Transaction.find().sort({ created_at: -1 }).limit(6)
    ]);

    const activeSubs = allSubs.filter(s => s.status === 'ACTIVE' && new Date(s.expires_at) > now).length;
    res.json({
      sales: { revenue: salesAgg[0]?.total || 0, orders: totalOrdersCount },
      customers: { total: totalCustomers },
      subscriptions: { active: activeSubs },
      recent_txns: recentTxns,
      live_visitors: activeSessions.size || 1
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Product Studio CRUD APIs
app.get('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const prods = await Product.find().sort({ created_at: -1 });
    const list = await Promise.all(prods.map(async (p) => {
      const total = await InventorySlot.countDocuments({ product_id: p._id });
      return { ...p.toObject(), total_slots: total };
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

// Other required admin routes stubs for complete app continuity
app.get('/api/admin/slots', authAdmin, async (req, res) => {
  try {
    const slots = await InventorySlot.find().populate('product_id', 'name sku');
    res.json({ slots, stats: { total: slots.length, available: 0, assigned: 0, full: 0, disabled: 0, total_active_users: 0 } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/subscriptions/advanced', authAdmin, async (req, res) => {
  try {
    const subs = await Subscription.find().populate('user_id', 'username name email');
    res.json({ subscriptions: subs, stats: { total: subs.length, active: subs.length } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/transactions', authAdmin, async (req, res) => {
  try { res.json(await Transaction.find().select('-proof_screenshot')); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/customers/list', authAdmin, async (req, res) => {
  try { res.json(await User.find().sort({ created_at: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/payment-settings', authAdmin, async (req, res) => {
  try { res.json(await PaymentSettings.findOne() || {}); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/system/infrastructure', authAdmin, async (req, res) => {
  try { res.json({ server: { service_memory_rss_mb: 45, uptime_formatted: '5h' }, database: { status: 'Connected', ping_latency_ms: 12 } }); } catch (err) { res.status(500).json({ error: err.message }); }
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
