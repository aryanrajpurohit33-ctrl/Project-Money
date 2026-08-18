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
// MONGOOSE SCHEMAS & MODELS
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

// Product Schema with One-Time & Subscription Tier Support
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  short_description: { type: String, default: '' },
  description: { type: String, default: '' },
  sku: { type: String, required: true, unique: true },
  product_type: { type: String, enum: ['ONE_TIME', 'SUBSCRIPTION'], default: 'ONE_TIME' },
  original_price: { type: Number, required: true },
  sale_price: { type: Number, required: true },
  discount_percentage: { type: Number, default: 0 },
  // Subscription Duration Pricing
  subscription_pricing: {
    one_month: { type: Number, default: 199 },
    six_months: { type: Number, default: 899 },
    one_year: { type: Number, default: 1499 }
  },
  images: [{ type: String }],
  delivery_type: { 
    type: String, 
    enum: ['EMAIL_PASSWORD', 'MOBILE_PASSWORD', 'STANDARD_LINK', 'DOWNLOADABLE_FILE', 'LICENSE_KEY', 'CUSTOM_TEXT'], 
    default: 'EMAIL_PASSWORD' 
  },
  status: { type: String, enum: ['active', 'draft', 'archived', 'disabled'], default: 'active' },
  created_at: { type: Date, default: Date.now },
  sales_count: { type: Number, default: 0 }
});

// Inventory Account Slot (One-time and Subscription)
const InventorySlotSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  account_label: { type: String, default: 'Account Slot' },
  email: { type: String, default: '' },
  password: { type: String, default: '' },
  custom_text: { type: String, default: '' },
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
  created_at: { type: Date, default: Date.now }
});

// Active & Historical Customer Subscriptions
const SubscriptionSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  inventory_slot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySlot', default: null },
  product_name: String,
  duration: { type: String, enum: ['1_MONTH', '6_MONTHS', '1_YEAR'], required: true },
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
    subscription_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
    delivered_data: { type: mongoose.Schema.Types.Mixed, default: null }
  }],
  subtotal: { type: Number, required: true },
  discount_amount: { type: Number, default: 0 },
  coupon_code: { type: String, default: '' },
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

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discount_type: { type: String, enum: ['percentage', 'fixed'], required: true },
  discount_value: { type: Number, required: true },
  min_purchase: { type: Number, default: 0 },
  max_discount: { type: Number, default: 0 },
  status: { type: String, default: 'active' }
});

const Admin = mongoose.model('Admin', AdminSchema);
const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const InventorySlot = mongoose.model('InventorySlot', InventorySlotSchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Order = mongoose.model('Order', OrderSchema);
const PaymentSettings = mongoose.model('PaymentSettings', PaymentSettingsSchema);
const Coupon = mongoose.model('Coupon', CouponSchema);

// ----------------------------------------------------
// SEEDING
// ----------------------------------------------------
async function initializeSystem() {
  try {
    const existingAdmin = await Admin.findOne({ username: 'Aryan' });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('5669', salt);
      await Admin.create({ username: 'Aryan', password_hash: hash });
    }

    const existingPaymentSettings = await PaymentSettings.findOne();
    if (!existingPaymentSettings) await PaymentSettings.create({});

    const pCount = await Product.countDocuments();
    if (pCount === 0) {
      // Seed Demo Subscription Product with Account Slots
      const subProduct = await Product.create({
        name: 'Authorized Streaming Subscription',
        short_description: 'PIN-protected 4K UHD streaming profile with instant activation.',
        description: 'Choose your desired subscription duration (1 Month, 6 Months, or 1 Year). Dedicated private profile on authorized high-speed streaming accounts.',
        sku: 'SUB-STRM-01',
        product_type: 'SUBSCRIPTION',
        original_price: 299,
        sale_price: 199,
        subscription_pricing: {
          one_month: 199,
          six_months: 899,
          one_year: 1499
        },
        images: ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1000&auto=format&fit=crop&q=80'],
        delivery_type: 'EMAIL_PASSWORD'
      });

      await InventorySlot.create([
        { product_id: subProduct._id, account_label: 'Account #1 (Dedicated)', email: 'stream_vip01@nexus.io', password: 'NexusPass@2026', status: 'AVAILABLE' },
        { product_id: subProduct._id, account_label: 'Account #2 (Dedicated)', email: 'stream_vip02@nexus.io', password: 'VaultStream#889', status: 'AVAILABLE' },
        { product_id: subProduct._id, account_label: 'Account #3 (Dedicated)', email: 'stream_vip03@nexus.io', password: 'UltraAccess#990', status: 'AVAILABLE' }
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
// STORE & CHECKOUT APIS
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
      query.$or = [{ name: regex }, { description: regex }, { sku: regex }];
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

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const availableCount = await InventorySlot.countDocuments({ product_id: product._id, status: 'AVAILABLE' });
    res.json({ ...product.toObject(), in_stock: availableCount > 0, stock_count: availableCount });
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

// Create Order & Start Transaction (With Subscription Duration Validation)
app.post('/api/checkout/initiate-order', authCustomer, async (req, res) => {
  try {
    const { items, payment_method, coupon_code } = req.body;
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
        delivered_data: null
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

// Customer Purchased Items with Server-Side Subscription Expiration Checks
app.get('/api/customer/orders', authCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id })
      .populate('items.subscription_id')
      .sort({ created_at: -1 });

    const now = new Date();

    const sanitized = orders.map(order => {
      const isPaid = order.payment_status === 'Paid';
      const oObj = order.toObject();

      oObj.items = oObj.items.map(it => {
        if (!isPaid) return { ...it, delivered_data: null };

        // For Subscription Items, check live expiration
        if (it.product_type === 'SUBSCRIPTION' && it.subscription_id) {
          const expiresAt = new Date(it.subscription_id.expires_at);
          const isExpired = now >= expiresAt;

          return {
            ...it,
            is_subscription: true,
            is_expired: isExpired,
            start_at: it.subscription_id.start_at,
            expires_at: it.subscription_id.expires_at,
            // Mask credentials server-side if expired!
            delivered_data: isExpired ? null : it.delivered_data
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
// ADMIN CONTROL CENTER & SUBSCRIPTION ENGINE
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

// Admin Subscriptions Overview
app.get('/api/admin/subscriptions', authAdmin, async (req, res) => {
  try {
    const now = new Date();
    const subs = await Subscription.find()
      .populate('user_id', 'name email')
      .populate('product_id', 'name')
      .populate('inventory_slot_id', 'account_label email')
      .sort({ created_at: -1 });

    const totalActive = subs.filter(s => s.status === 'ACTIVE' && s.expires_at > now).length;
    const totalExpired = subs.filter(s => s.expires_at <= now || s.status === 'EXPIRED').length;

    res.json({
      subscriptions: subs,
      totalActive,
      totalExpired
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Transactions Queue with Associated Available Inventory Slots
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

// Admin Confirm Payment + Bind Account Slot + Calculate Calendar Expiration Date
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

    if (!slot) {
      throw new Error('No available account slot found in inventory for this product. Please add an account slot first.');
    }

    // Calculate Calendar-Accurate Expiration Date
    const startAt = new Date();
    const expiresAt = new Date(startAt);

    if (item.duration === '1_MONTH') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (item.duration === '6_MONTHS') {
      expiresAt.setMonth(expiresAt.getMonth() + 6);
    } else if (item.duration === '1_YEAR') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      // Default fallback for 30 days
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    let createdSub = null;
    if (item.product_type === 'SUBSCRIPTION') {
      createdSub = await Subscription.create([{
        order_id: order._id,
        user_id: order.user_id,
        product_id: item.product_id,
        inventory_slot_id: slot._id,
        product_name: item.name,
        duration: item.duration,
        start_at: startAt,
        expires_at: expiresAt,
        status: 'ACTIVE'
      }], { session });

      slot.current_subscription_id = createdSub[0]._id;
      item.subscription_id = createdSub[0]._id;
    }

    // Record Slot History
    slot.assignment_history.push({
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      order_id: order.order_number,
      duration: item.duration,
      start_at: startAt,
      expires_at: expiresAt
    });
    await slot.save({ session });

    // Package Delivered Data for Instant Unlock
    item.delivered_data = {
      account_label: slot.account_label,
      email: slot.email,
      password: slot.password,
      custom_text: slot.custom_text
    };

    txn.status = 'CONFIRMED';
    txn.verified_at = new Date();
    txn.assigned_slot_id = slot._id;
    await txn.save({ session });

    order.payment_status = 'Paid';
    order.delivery_status = 'Delivered';
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    recordActivity('subscription_activated', `Subscription confirmed & ${slot.account_label} assigned to ${order.customer_name}`);
    res.json({ success: true, message: 'Payment confirmed, account assigned, and subscription activated!' });

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

// Admin Product & Subscription Inventory Slots
app.get('/api/admin/products/:id/slots', authAdmin, async (req, res) => {
  try {
    const slots = await InventorySlot.find({ product_id: req.params.id }).sort({ created_at: -1 });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/products/:id/slots', authAdmin, async (req, res) => {
  try {
    const slot = await InventorySlot.create({
      product_id: req.params.id,
      account_label: req.body.account_label || 'Account Slot',
      email: req.body.email,
      password: req.body.password,
      custom_text: req.body.custom_text || '',
      status: 'AVAILABLE'
    });
    res.status(201).json(slot);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/slots/:id', authAdmin, async (req, res) => {
  try {
    await InventorySlot.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ created_at: -1 });
    const list = await Promise.all(products.map(async (p) => {
      const total = await InventorySlot.countDocuments({ product_id: p._id });
      const available = await InventorySlot.countDocuments({ product_id: p._id, status: 'AVAILABLE' });
      const assigned = await InventorySlot.countDocuments({ product_id: p._id, status: 'ASSIGNED' });
      return { ...p.toObject(), total_slots: total, available_slots: available, assigned_slots: assigned };
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      sku: req.body.sku || 'SKU-' + Date.now(),
      images: ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800']
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    console.log('✓ Successfully connected to MongoDB Atlas Cloud Database');
    await initializeSystem();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✓ NEXUS Engine running on port ${PORT}`));
  })
  .catch(err => console.error('✕ Failed to connect to MongoDB Atlas:', err.message));
