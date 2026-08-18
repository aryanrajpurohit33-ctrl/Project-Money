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
    let query = { status: { $ne: 'draft' } };
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { description: regex }, { sku: regex }, { tags: regex }, { category: regex }];
    }
    const products = await Product.find(query).sort({ created_at: -1 });
    const formatted = products.map(p => {
      const inStock = p.status === 'active';
      return { ...p.toObject(), in_stock: inStock };
    });
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
// CUSTOMER PURCHASED ITEMS (DYNAMIC CREDENTIAL RESOLUTION)
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
// ADMIN TRANSACTIONS (DYNAMIC LIVE SLOT MATCHING)
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

// Live dynamic slot population regardless of transaction timestamp
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
        
        // Query ALL non-disabled slots for this product created at ANY time
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

// Confirm Payment + Assign (Supports selecting existing slot OR creating on-the-fly)
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

    // Support creating slot directly during transaction confirmation
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
    const expiresAt = new Date(startAt);

    if (item.duration === '1_MONTH') expiresAt.setMonth(expiresAt.getMonth() + 1);
    else if (item.duration === '6_MONTHS') expiresAt.setMonth(expiresAt.getMonth() + 6);
    else if (item.duration === '1_YEAR') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setFullYear(expiresAt.getFullYear() + 50);

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
