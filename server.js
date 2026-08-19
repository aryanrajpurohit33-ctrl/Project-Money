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

// ----------------------------------------------------
// DURATION CALCULATOR (STRICT ACCURATE CALENDAR MATH)
// ----------------------------------------------------
function calculateAccurateExpiry(startAt, durationStr) {
  const expiry = new Date(startAt);
  const dur = String(durationStr || '').toUpperCase().trim();

  if (dur.includes('1_YEAR') || dur.includes('1 YEAR') || dur.includes('ONE_YEAR') || dur.includes('12_MONTH')) {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else if (dur.includes('6_MONTH') || dur.includes('6 MONTH') || dur.includes('SIX_MONTH')) {
    expiry.setMonth(expiry.getMonth() + 6);
  } else {
    // Default subscription period is strictly 1 month!
    expiry.setMonth(expiry.getMonth() + 1);
  }
  return expiry;
}

// ----------------------------------------------------
// DATABASE INITIALIZATION & AUTO-CORRECTION FIX
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

    // AUTO-FIX: Correct any glitched 50-year subscriptions back to their accurate duration
    const glitchedSubs = await Subscription.find({});
    for (const sub of glitchedSubs) {
      const start = new Date(sub.start_at || sub.created_at || Date.now());
      const currentExpiry = new Date(sub.expires_at);
      const diffYears = currentExpiry.getFullYear() - start.getFullYear();

      if (diffYears >= 2) {
        // Fix to accurate 1 month or specified duration
        const correctedExpiry = calculateAccurateExpiry(start, sub.duration || '1_MONTH');
        sub.expires_at = correctedExpiry;
        sub.duration = sub.duration || '1_MONTH';
        await sub.save();
        console.log(`✓ Fixed glitched subscription #${sub._id} expiry to ${correctedExpiry.toLocaleDateString()}`);
      }
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
// STORE & CUSTOMER APIS
// ----------------------------------------------------
app.post('/api/presence/heartbeat', (req, res) => {
  const { sessionId, page, action } = req.body;
  if (sessionId) activeSessions.set(sessionId, { page: page || 'home', timestamp: Date.now() });
  funnelStats.visitors++;
  if (action) {
    if (action.includes('product_view')) funnelStats.product_views++;
    if (action.includes('checkout_start')) funnelStats.checkouts_started++;
    recordActivity('visitor_action', action);
  }
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

    const inStock = product.status === 'active';
    const related = await Product.find({ _id: { $ne: product._id }, status: { $ne: 'draft' } }).limit(4);

    res.json({ 
      ...product.toObject(), 
      in_stock: inStock,
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
        product_id: p._id,
        name: p.name,
        price: itemPrice,
        product_type: p.product_type || 'SUBSCRIPTION',
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

    funnelStats.payments_initiated++;
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

    funnelStats.proofs_uploaded++;
    recordActivity('proof_uploaded', `Proof submitted for TXN: ${txn.txn_id}`);
    res.json({ success: true, transaction: txn });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
        if (!isPaid) return { ...it, delivered_data: null };

        const sub = it.subscription_id;
        if (sub) {
          const expiresAt = new Date(sub.expires_at);
          const isExpired = now >= expiresAt || sub.status !== 'ACTIVE';
          const slot = sub.assigned_slot_id;

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
// DEDICATED SUBSCRIPTION MANAGEMENT APIS (ADMIN ONLY)
// ----------------------------------------------------
app.get('/api/admin/subscriptions/advanced', authAdmin, async (req, res) => {
  try {
    const { status, expiring_within_days, search, product_id, sort_by } = req.query;
    let filter = {};

    if (product_id && product_id !== 'ALL') filter.product_id = product_id;
    if (status && status !== 'ALL') filter.status = status;

    const now = new Date();

    if (expiring_within_days) {
      const targetDays = Number(expiring_within_days) || 7;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + targetDays);
      filter.status = 'ACTIVE';
      filter.expires_at = { $gte: now, $lte: futureDate };
    }

    let sortOption = { expires_at: 1 };
    if (sort_by === 'newest') sortOption = { created_at: -1 };
    if (sort_by === 'oldest') sortOption = { created_at: 1 };
    if (sort_by === 'expiring_latest') sortOption = { expires_at: -1 };

    const rawSubs = await Subscription.find(filter)
      .populate('user_id', 'name email mobile')
      .populate('product_id', 'name sku original_price sale_price')
      .populate('order_id', 'order_number total_amount payment_method payment_status transaction_id')
      .populate('assigned_slot_id', 'account_label email max_active_users')
      .sort(sortOption);

    const enrichedSubs = await Promise.all(rawSubs.map(async (s) => {
      const exp = new Date(s.expires_at);
      const diffMs = exp - now;
      const isExpired = diffMs <= 0;

      let currentStatus = s.status;
      if (s.status === 'ACTIVE' && isExpired) {
        currentStatus = 'EXPIRED';
      }

      let timeRemainingText = 'Expired';
      let daysLeft = 0;
      if (!isExpired && currentStatus === 'ACTIVE') {
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        const totalHours = Math.floor(totalMinutes / 60);
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        const minutes = totalMinutes % 60;
        daysLeft = days;

        if (days > 30) {
          const months = Math.floor(days / 30);
          const remainingDays = days % 30;
          timeRemainingText = `${months} Month${months > 1 ? 's' : ''} ${remainingDays} Day${remainingDays !== 1 ? 's' : ''} Left`;
        } else if (days > 0) {
          timeRemainingText = `${days} Day${days > 1 ? 's' : ''} ${hours} Hr${hours !== 1 ? 's' : ''} Left`;
        } else if (hours > 0) {
          timeRemainingText = `${hours} Hr${hours > 1 ? 's' : ''} ${minutes} Min Left`;
        } else {
          timeRemainingText = `${minutes} Min Left`;
        }
      }

      let slotUsage = '1 / 1';
      if (s.assigned_slot_id) {
        const activeOnSlot = await Subscription.countDocuments({
          assigned_slot_id: s.assigned_slot_id._id,
          status: 'ACTIVE',
          expires_at: { $gt: now }
        });
        slotUsage = `${activeOnSlot} / ${s.assigned_slot_id.max_active_users || 1}`;
      }

      return {
        ...s.toObject(),
        status: currentStatus,
        is_expired: isExpired,
        days_left: daysLeft,
        time_remaining_text: timeRemainingText,
        slot_usage: slotUsage
      };
    }));

    let finalSubs = enrichedSubs;
    if (search) {
      const q = search.toLowerCase();
      finalSubs = enrichedSubs.filter(s => 
        (s.user_id?.name || '').toLowerCase().includes(q) ||
        (s.user_id?.email || '').toLowerCase().includes(q) ||
        (s.product_name || '').toLowerCase().includes(q) ||
        (s.order_id?.order_number || '').toLowerCase().includes(q) ||
        (s.assigned_slot_id?.account_label || '').toLowerCase().includes(q)
      );
    }

    const allSubs = await Subscription.find();
    const sevenDaysFuture = new Date();
    sevenDaysFuture.setDate(sevenDaysFuture.getDate() + 7);

    const stats = {
      total: allSubs.length,
      active: allSubs.filter(s => s.status === 'ACTIVE' && new Date(s.expires_at) > now).length,
      expiring_soon: allSubs.filter(s => s.status === 'ACTIVE' && new Date(s.expires_at) > now && new Date(s.expires_at) <= sevenDaysFuture).length,
      expired: allSubs.filter(s => s.status === 'EXPIRED' || (s.status === 'ACTIVE' && new Date(s.expires_at) <= now)).length,
      cancelled: allSubs.filter(s => s.status === 'CANCELLED' || s.status === 'REVOKED').length,
      active_customers_count: (await Subscription.distinct('user_id', { status: 'ACTIVE', expires_at: { $gt: now } })).length
    };

    res.json({
      subscriptions: finalSubs,
      stats,
      server_time: now
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/subscriptions/:id/extend', authAdmin, async (req, res) => {
  try {
    const { extend_type, custom_days } = req.body;
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const currentExpiry = new Date(sub.expires_at > new Date() ? sub.expires_at : new Date());
    const newExpiry = new Date(currentExpiry);

    if (extend_type === '1_MONTH') newExpiry.setMonth(newExpiry.getMonth() + 1);
    else if (extend_type === '6_MONTHS') newExpiry.setMonth(newExpiry.getMonth() + 6);
    else if (extend_type === '1_YEAR') newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    else if (extend_type === 'CUSTOM') newExpiry.setDate(newExpiry.getDate() + (Number(custom_days) || 30));

    sub.expires_at = newExpiry;
    sub.status = 'ACTIVE';
    sub.history.push({
      action: 'EXTEND',
      performed_by: req.admin.username,
      details: `Subscription extended to ${newExpiry.toLocaleDateString()}`
    });

    await sub.save();
    recordActivity('subscription_extended', `Extended subscription #${sub._id} until ${newExpiry.toLocaleDateString()}`);
    res.json({ success: true, subscription: sub });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/subscriptions/:id/reassign-slot', authAdmin, async (req, res) => {
  try {
    const { new_slot_id } = req.body;
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const targetSlot = await InventorySlot.findById(new_slot_id);
    if (!targetSlot || targetSlot.status === 'DISABLED') {
      return res.status(400).json({ error: 'Target slot is invalid or disabled' });
    }

    sub.assigned_slot_id = targetSlot._id;
    sub.history.push({
      action: 'REASSIGN_SLOT',
      performed_by: req.admin.username,
      details: `Reassigned from previous slot to "${targetSlot.account_label}" (${targetSlot.email})`
    });
    await sub.save();

    targetSlot.assignment_history.push({
      customer_name: sub.product_name,
      order_id: sub.order_id?.toString() || 'ORD',
      duration: sub.duration,
      start_at: sub.start_at,
      expires_at: sub.expires_at
    });
    await targetSlot.save();

    recordActivity('slot_reassigned', `Reassigned subscription to slot "${targetSlot.account_label}"`);
    res.json({ success: true, subscription: sub });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/subscriptions/:id/revoke', authAdmin, async (req, res) => {
  try {
    const { reason, action_type } = req.body;
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    sub.status = action_type === 'CANCEL' ? 'CANCELLED' : 'REVOKED';
    sub.cancelled_at = new Date();
    sub.cancellation_reason = reason || 'Revoked by Administrator';
    sub.history.push({
      action: sub.status,
      performed_by: req.admin.username,
      details: `Access revoked. Reason: ${sub.cancellation_reason}`
    });

    await sub.save();
    recordActivity('subscription_revoked', `Revoked subscription for product "${sub.product_name}"`);
    res.json({ success: true, subscription: sub });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DASHBOARD FULL OVERVIEW
// ----------------------------------------------------
app.get('/api/admin/dashboard/full-overview', authAdmin, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);

    const [todaySalesAgg, weekSalesAgg, monthSalesAgg, totalSalesAgg] = await Promise.all([
      Order.aggregate([
        { $match: { payment_status: 'Paid', created_at: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { payment_status: 'Paid', created_at: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { payment_status: 'Paid', created_at: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { payment_status: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 } } }
      ])
    ]);

    const totalOrdersCount = await Order.countDocuments({ payment_status: 'Paid' });
    const totalRev = totalSalesAgg[0]?.total || 0;
    const avgOrderVal = totalOrdersCount > 0 ? Math.round(totalRev / totalOrdersCount) : 0;

    const allSubs = await Subscription.find();
    const sevenDaysFuture = new Date();
    sevenDaysFuture.setDate(sevenDaysFuture.getDate() + 7);

    const activeSubsList = allSubs.filter(s => s.status === 'ACTIVE' && new Date(s.expires_at) > now);
    const expiringSoonList = allSubs.filter(s => s.status === 'ACTIVE' && new Date(s.expires_at) > now && new Date(s.expires_at) <= sevenDaysFuture);

    const totalCustomers = await User.countDocuments();
    const todayCustomers = await User.countDocuments({ created_at: { $gte: todayStart } });
    const weekCustomers = await User.countDocuments({ created_at: { $gte: weekStart } });

    const allProducts = await Product.find().sort({ sales_count: -1 });
    const totalProducts = allProducts.length;
    const publishedProducts = allProducts.filter(p => p.status === 'active').length;
    const subProductsCount = allProducts.filter(p => p.product_type === 'SUBSCRIPTION').length;
    const oneTimeCount = allProducts.filter(p => p.product_type === 'ONE_TIME').length;
    const topSelling = allProducts.slice(0, 5);

    const allSlots = await InventorySlot.find();
    const slotStats = {
      total: allSlots.length,
      available: allSlots.filter(s => s.status === 'AVAILABLE').length,
      assigned: allSlots.filter(s => s.status === 'ASSIGNED').length,
      full: allSlots.filter(s => s.status === 'FULL').length,
      active_users: activeSubsList.length
    };

    const [recentTxns, recentOrders, expiringSoonDetailed] = await Promise.all([
      Transaction.find().sort({ created_at: -1 }).limit(5),
      Order.find().sort({ created_at: -1 }).limit(5),
      Subscription.find({ status: 'ACTIVE', expires_at: { $gte: now, $lte: sevenDaysFuture } })
        .populate('user_id', 'name email')
        .populate('product_id', 'name')
        .limit(5)
    ]);

    const visitors = Array.from(activeSessions.values());
    const liveStats = {
      total: visitors.length,
      home: visitors.filter(v => v.page === 'home').length,
      products: visitors.filter(v => v.page === 'products').length,
      details: visitors.filter(v => v.page === 'product-details').length,
      checkout: visitors.filter(v => v.page === 'checkout').length
    };

    const alerts = [];
    const pendingTxnsCount = await Transaction.countDocuments({ status: 'PROCESSING' });
    if (pendingTxnsCount > 0) alerts.push({ type: 'danger', text: `${pendingTxnsCount} payments waiting for admin verification.` });
    if (expiringSoonList.length > 0) alerts.push({ type: 'warning', text: `${expiringSoonList.length} customer subscriptions expire within 7 days.` });
    alerts.push({ type: 'success', text: `Nexus Cloud Engine is online & operational.` });

    res.json({
      sales: {
        today: todaySalesAgg[0]?.total || 0,
        today_orders: todaySalesAgg[0]?.count || 0,
        week: weekSalesAgg[0]?.total || 0,
        month: monthSalesAgg[0]?.total || 0,
        total: totalRev,
        total_orders: totalOrdersCount,
        avg_order_value: avgOrderVal
      },
      subscriptions: {
        active: activeSubsList.length,
        expiring_soon: expiringSoonList.length,
        expired: allSubs.filter(s => s.status === 'EXPIRED' || (s.status === 'ACTIVE' && new Date(s.expires_at) <= now)).length,
        total_sub_customers: (await Subscription.distinct('user_id', { status: 'ACTIVE', expires_at: { $gt: now } })).length
      },
      customers: {
        total: totalCustomers,
        today: todayCustomers,
        week: weekCustomers,
        active_sub_users: activeSubsList.length
      },
      products: {
        total: totalProducts,
        published: publishedProducts,
        subscriptions_count: subProductsCount,
        one_time_count: oneTimeCount,
        top_selling: topSelling
      },
      slots: slotStats,
      funnel: {
        ...funnelStats,
        visitors: Math.max(funnelStats.visitors, visitors.length)
      },
      live: liveStats,
      alerts,
      recent_txns: recentTxns,
      recent_orders: recentOrders,
      expiring_soon_list: expiringSoonDetailed
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DEDICATED ACCOUNT SLOTS APIS
// ----------------------------------------------------
app.get('/api/admin/slots', authAdmin, async (req, res) => {
  try {
    const { product_id, status, search } = req.query;
    let filter = {};

    if (product_id && product_id !== 'ALL') filter.product_id = product_id;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ account_label: regex }, { email: regex }];
    }

    const now = new Date();
    const rawSlots = await InventorySlot.find(filter)
      .populate('product_id', 'name sku product_type')
      .sort({ created_at: -1 });

    const enrichedSlots = await Promise.all(rawSlots.map(async (slot) => {
      const activeSubs = await Subscription.find({
        assigned_slot_id: slot._id,
        status: 'ACTIVE',
        expires_at: { $gt: now }
      }).populate('user_id', 'name email').populate('order_id', 'order_number');

      const activeUsersCount = activeSubs.length;
      const maxUsers = slot.max_active_users || 1;

      let derivedStatus = slot.status;
      if (slot.status !== 'DISABLED') {
        if (activeUsersCount >= maxUsers) {
          derivedStatus = 'FULL';
        } else if (activeUsersCount > 0) {
          derivedStatus = 'ASSIGNED';
        } else {
          derivedStatus = 'AVAILABLE';
        }
      }

      const activeCustomers = activeSubs.map(s => ({
        subscription_id: s._id,
        customer_name: s.user_id?.name || 'Customer',
        customer_email: s.user_id?.email || 'N/A',
        order_number: s.order_id?.order_number || 'ORD',
        duration: s.duration,
        start_at: s.start_at,
        expires_at: s.expires_at,
        status: s.status
      }));

      return {
        ...slot.toObject(),
        status: derivedStatus,
        active_users_count: activeUsersCount,
        max_active_users: maxUsers,
        available_capacity: Math.max(0, maxUsers - activeUsersCount),
        active_customers: activeCustomers
      };
    }));

    let finalSlots = enrichedSlots;
    if (status && status !== 'ALL') {
      finalSlots = enrichedSlots.filter(s => s.status === status);
    }

    const totalSlots = enrichedSlots.length;
    const availableSlots = enrichedSlots.filter(s => s.status === 'AVAILABLE').length;
    const assignedSlots = enrichedSlots.filter(s => s.status === 'ASSIGNED').length;
    const fullSlots = enrichedSlots.filter(s => s.status === 'FULL').length;
    const disabledSlots = enrichedSlots.filter(s => s.status === 'DISABLED').length;
    const totalActiveUsers = enrichedSlots.reduce((acc, curr) => acc + curr.active_users_count, 0);

    res.json({
      slots: finalSlots,
      stats: {
        total: totalSlots,
        available: availableSlots,
        assigned: assignedSlots,
        full: fullSlots,
        disabled: disabledSlots,
        total_active_users: totalActiveUsers
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/slots', authAdmin, async (req, res) => {
  try {
    const { product_id, account_label, email, password, custom_text, notes, max_active_users, status } = req.body;
    if (!product_id || !email) {
      return res.status(400).json({ error: 'Product and Email/Username are required' });
    }

    const slot = await InventorySlot.create({
      product_id,
      account_label: account_label || 'Slot ' + Math.floor(Math.random() * 1000),
      email: email.trim(),
      password: password || '',
      custom_text: custom_text || '',
      notes: notes || '',
      max_active_users: Number(max_active_users) || 1,
      status: status || 'AVAILABLE'
    });

    recordActivity('slot_created', `New slot "${slot.account_label}" created in database`);
    res.status(201).json(slot);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/slots/:id', authAdmin, async (req, res) => {
  try {
    const { account_label, email, password, custom_text, notes, max_active_users, status } = req.body;
    const slot = await InventorySlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Account slot not found in database' });

    if (account_label !== undefined) slot.account_label = account_label;
    if (email !== undefined) slot.email = email.trim();
    if (password !== undefined) slot.password = password;
    if (custom_text !== undefined) slot.custom_text = custom_text;
    if (notes !== undefined) slot.notes = notes;
    if (max_active_users !== undefined) slot.max_active_users = Number(max_active_users) || 1;
    if (status !== undefined) slot.status = status;
    slot.updated_at = new Date();

    await slot.save();
    recordActivity('slot_updated', `Credentials updated for slot "${slot.account_label}". Live synced to active customers.`);
    res.json(slot);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/slots/:id', authAdmin, async (req, res) => {
  try {
    const now = new Date();
    const activeSubsCount = await Subscription.countDocuments({
      assigned_slot_id: req.params.id,
      status: 'ACTIVE',
      expires_at: { $gt: now }
    });

    if (activeSubsCount > 0) {
      return res.status(400).json({ error: `Cannot delete slot: currently assigned to ${activeSubsCount} active customer(s).` });
    }

    await InventorySlot.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Slot deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ADMIN TRANSACTIONS & CONFIRMATION (ACCURATE SUBSCRIPTION MATH)
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
    const now = new Date();

    const detailed = await Promise.all(txns.map(async (t) => {
      const doc = await Transaction.findById(t._id).select('proof_screenshot');
      const order = await Order.findById(t.order_id);
      
      let availableSlots = [];
      let productId = null;

      if (order && order.items.length > 0) {
        productId = order.items[0].product_id;
        
        const slots = await InventorySlot.find({
          product_id: productId,
          status: { $ne: 'DISABLED' }
        }).select('_id account_label email max_active_users status');

        for (const slot of slots) {
          const activeCount = await Subscription.countDocuments({
            assigned_slot_id: slot._id,
            status: 'ACTIVE',
            expires_at: { $gt: now }
          });
          const maxUsers = slot.max_active_users || 1;
          if (activeCount < maxUsers) {
            availableSlots.push({
              _id: slot._id,
              account_label: slot.account_label,
              email: slot.email,
              usage: `${activeCount}/${maxUsers}`
            });
          }
        }
      }

      return {
        ...t.toObject(),
        product_id: productId,
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

// Confirmation & Slot Assignment with Strict Accurate Calendar Expiry Calculation
app.post('/api/admin/transactions/:id/confirm-and-assign', authAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { slot_id, create_new_slot } = req.body;
    const txn = await Transaction.findById(req.params.id).session(session);
    if (!txn) throw new Error('Transaction not found');
    if (txn.status === 'CONFIRMED') throw new Error('Transaction is already confirmed');

    const order = await Order.findById(txn.order_id).session(session);
    const item = order.items[0];
    const now = new Date();

    let slot = null;

    if (create_new_slot && create_new_slot.email) {
      slot = await InventorySlot.create([{
        product_id: item.product_id,
        account_label: create_new_slot.account_label || 'Slot ' + Math.floor(Math.random() * 1000),
        email: create_new_slot.email.trim(),
        password: create_new_slot.password || '',
        max_active_users: Number(create_new_slot.max_active_users) || 1,
        status: 'AVAILABLE'
      }], { session });
      slot = slot[0];
    } else if (slot_id) {
      slot = await InventorySlot.findById(slot_id).session(session);
      if (!slot || slot.status === 'DISABLED') throw new Error('Selected slot is invalid or disabled');
      
      const activeCount = await Subscription.countDocuments({
        assigned_slot_id: slot._id,
        status: 'ACTIVE',
        expires_at: { $gt: now }
      }).session(session);

      if (activeCount >= (slot.max_active_users || 1)) {
        throw new Error(`Slot "${slot.account_label}" is at full capacity (${activeCount}/${slot.max_active_users})`);
      }
    } else {
      const allSlots = await InventorySlot.find({
        product_id: item.product_id,
        status: { $ne: 'DISABLED' }
      }).session(session);

      for (const candidate of allSlots) {
        const activeCount = await Subscription.countDocuments({
          assigned_slot_id: candidate._id,
          status: 'ACTIVE',
          expires_at: { $gt: now }
        }).session(session);

        if (activeCount < (candidate.max_active_users || 1)) {
          slot = candidate;
          break;
        }
      }
    }

    if (!slot) {
      throw new Error('No available account slot found for this product. Click "+ New Slot" to create one instantly.');
    }

    const startAt = new Date();
    // Use the normalized duration string (e.g. '1_MONTH', '6_MONTHS', '1_YEAR')
    const customerPurchasedDuration = item.duration || txn.duration || '1_MONTH';
    const expiresAt = calculateAccurateExpiry(startAt, customerPurchasedDuration);

    const createdSub = await Subscription.create([{
      order_id: order._id,
      user_id: order.user_id,
      product_id: item.product_id,
      assigned_slot_id: slot._id,
      product_name: item.name,
      duration: customerPurchasedDuration,
      start_at: startAt,
      expires_at: expiresAt,
      status: 'ACTIVE',
      history: [{
        action: 'CONFIRM_PAYMENT',
        performed_by: req.admin.username,
        details: `Assigned to slot "${slot.account_label}" (${slot.email}) for ${customerPurchasedDuration.replace('_', ' ')}`
      }]
    }], { session });

    item.subscription_id = createdSub[0]._id;

    slot.assignment_history.push({
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      order_id: order.order_number,
      duration: customerPurchasedDuration,
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

    funnelStats.confirmed_purchases++;
    await session.commitTransaction();
    session.endSession();

    recordActivity('subscription_activated', `Payment verified. Bound slot "${slot.account_label}" to ${order.customer_name} (${customerPurchasedDuration})`);
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
// START SERVER
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
