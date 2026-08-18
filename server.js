require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_digital_super_secret_jwt_2026_key';

// ----------------------------------------------------
// REAL-TIME PRESENCE & ACTIVITY TRACKER
// ----------------------------------------------------
const activeSessions = new Map();
const activityFeed = [];

function recordActivity(type, text, meta = {}) {
  const item = {
    id: Date.now() + '-' + Math.random(),
    type,
    text,
    meta,
    created_at: new Date()
  };
  activityFeed.unshift(item);
  if (activityFeed.length > 50) activityFeed.pop();
}

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of activeSessions.entries()) {
    if (now - data.timestamp > 35000) {
      activeSessions.delete(sessionId);
    }
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

const InventoryItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  delivery_type: { 
    type: String, 
    enum: ['EMAIL_PASSWORD', 'MOBILE_PASSWORD', 'STANDARD_LINK', 'DOWNLOADABLE_FILE', 'LICENSE_KEY', 'CUSTOM_TEXT'], 
    required: true 
  },
  email: { type: String, default: '' },
  password: { type: String, default: '' },
  mobile: { type: String, default: '' },
  delivery_url: { type: String, default: '' },
  license_key: { type: String, default: '' },
  custom_text: { type: String, default: '' },
  status: { type: String, enum: ['Available', 'Reserved', 'Sold', 'Disabled'], default: 'Available' },
  assigned_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  created_at: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  short_description: { type: String, default: '' },
  description: { type: String, default: '' },
  sku: { type: String, required: true, unique: true },
  original_price: { type: Number, required: true },
  sale_price: { type: Number, required: true },
  discount_percentage: { type: Number, default: 0 },
  images: [{ type: String }],
  delivery_type: { 
    type: String, 
    enum: ['EMAIL_PASSWORD', 'MOBILE_PASSWORD', 'STANDARD_LINK', 'DOWNLOADABLE_FILE', 'LICENSE_KEY', 'CUSTOM_TEXT'], 
    required: true 
  },
  status: { type: String, enum: ['active', 'draft', 'archived', 'disabled'], default: 'active' },
  created_at: { type: Date, default: Date.now },
  sales_count: { type: Number, default: 0 }
});

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discount_type: { type: String, enum: ['percentage', 'fixed'], required: true },
  discount_value: { type: Number, required: true },
  min_purchase: { type: Number, default: 0 },
  max_discount: { type: Number, default: 0 },
  usage_limit: { type: Number, default: 100 },
  used_count: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
});

const TransactionSchema = new mongoose.Schema({
  txn_id: { type: String, required: true, unique: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer_name: String,
  customer_email: String,
  customer_mobile: String,
  amount: { type: Number, required: true },
  payment_method: { type: String, enum: ['UPI', 'CRYPTO'], required: true },
  proof_screenshot: { type: String, default: '' },
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
  customer_mobile: String,
  items: [{
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    delivery_type: String,
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

const Admin = mongoose.model('Admin', AdminSchema);
const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const InventoryItem = mongoose.model('InventoryItem', InventoryItemSchema);
const Coupon = mongoose.model('Coupon', CouponSchema);
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
    }

    const existingPaymentSettings = await PaymentSettings.findOne();
    if (!existingPaymentSettings) await PaymentSettings.create({});

    const existingCoupon = await Coupon.findOne({ code: 'SAVE20' });
    if (!existingCoupon) {
      await Coupon.create({
        code: 'SAVE20',
        discount_type: 'percentage',
        discount_value: 20,
        min_purchase: 100,
        max_discount: 500,
        usage_limit: 1000
      });
    }

    const pCount = await Product.countDocuments();
    if (pCount === 0) {
      const netflix = await Product.create({
        name: 'Netflix 4K UHD 1-Month Private Profile',
        short_description: 'Dedicated PIN-protected UHD profile on genuine account.',
        description: 'Enjoy Ultra HD 4K streaming across all your devices including Smart TVs, Phones, PCs, and Tablets.',
        sku: 'NFLX-4K-01',
        original_price: 799,
        sale_price: 199,
        discount_percentage: 75,
        images: ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1000&auto=format&fit=crop&q=80'],
        delivery_type: 'EMAIL_PASSWORD'
      });

      await InventoryItem.create([
        { product_id: netflix._id, delivery_type: 'EMAIL_PASSWORD', email: 'vip_stream01@nexus.io', password: 'VaultStream#2026', status: 'Available' }
      ]);
    }
  } catch (err) {
    console.error('Init error:', err.message);
  }
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
  } catch (err) {
    return res.status(401).json({ error: 'Invalid session' });
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

app.post('/api/presence/heartbeat', (req, res) => {
  const { sessionId, page, action } = req.body;
  if (sessionId) {
    activeSessions.set(sessionId, { page: page || 'home', timestamp: Date.now() });
  }
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
      const stock = await InventoryItem.countDocuments({ product_id: p._id, status: 'Available' });
      return { ...p.toObject(), in_stock: stock > 0, stock_count: stock };
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
    const stock = await InventoryItem.countDocuments({ product_id: product._id, status: 'Available' });
    res.json({ ...product.toObject(), in_stock: stock > 0, stock_count: stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cart/validate-coupon', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), status: 'active' });
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon' });
    if (subtotal < coupon.min_purchase) return res.status(400).json({ error: `Minimum purchase of ₹${coupon.min_purchase} required` });

    let discount = coupon.discount_type === 'percentage' ? (subtotal * coupon.discount_value) / 100 : coupon.discount_value;
    if (coupon.max_discount > 0 && discount > coupon.max_discount) discount = coupon.max_discount;
    discount = Math.min(discount, subtotal);

    res.json({ valid: true, code: coupon.code, discount_amount: Math.round(discount), final_total: Math.max(0, Math.round(subtotal - discount)) });
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
    const { items, payment_method, coupon_code } = req.body;
    const user = await User.findById(req.user.id);
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const p = await Product.findById(item.product_id);
      subtotal += p.sale_price;
      orderItems.push({ product_id: p._id, name: p.name, price: p.sale_price, delivery_type: p.delivery_type, delivered_data: null });
    }

    let discountAmount = 0;
    if (coupon_code) {
      const coupon = await Coupon.findOne({ code: coupon_code.toUpperCase().trim(), status: 'active' });
      if (coupon && subtotal >= coupon.min_purchase) {
        discountAmount = coupon.discount_type === 'percentage' ? (subtotal * coupon.discount_value) / 100 : coupon.discount_value;
      }
    }

    const totalAmount = Math.max(0, Math.round(subtotal - discountAmount));
    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const txnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);

    const order = await Order.create({
      order_number: orderNumber,
      user_id: user._id,
      customer_name: user.name,
      customer_email: user.email,
      customer_mobile: user.mobile,
      items: orderItems,
      subtotal,
      discount_amount: Math.round(discountAmount),
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
      amount: totalAmount,
      payment_method,
      status: 'PENDING_PAYMENT'
    });

    order.transaction_id = transaction._id;
    await order.save();

    recordActivity('order_initiated', `Customer ${user.name} started order #${orderNumber} for ₹${totalAmount}`);
    res.status(201).json({ order, transaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// JSON Base64 Proof Upload: Saves straight into MongoDB without filesystem dependencies
app.post('/api/checkout/upload-proof-json', authCustomer, async (req, res) => {
  try {
    const { transaction_id, screenshot_base64 } = req.body;
    if (!screenshot_base64) return res.status(400).json({ error: 'Screenshot data required' });

    const txn = await Transaction.findOne({ txn_id: transaction_id, user_id: req.user.id });
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    txn.proof_screenshot = screenshot_base64;
    txn.status = 'PROCESSING';
    await txn.save();

    await Order.findByIdAndUpdate(txn.order_id, {
      payment_status: 'Processing',
      delivery_status: 'Processing'
    });

    recordActivity('proof_uploaded', `Proof screenshot saved to MongoDB for TXN: ${txn.txn_id}`);
    res.json({ success: true, message: 'Proof saved in MongoDB', transaction: txn });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customer/orders', authCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id }).sort({ created_at: -1 });
    const sanitized = orders.map(order => {
      const isPaid = order.payment_status === 'Paid';
      const oObj = order.toObject();
      if (!isPaid) {
        oObj.items = oObj.items.map(it => ({ ...it, delivered_data: null }));
      }
      return oObj;
    });
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ADMIN CONTROL CENTER APIS
// ----------------------------------------------------
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ error: 'Invalid admin credentials' });

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(400).json({ error: 'Invalid admin credentials' });

    admin.last_login = new Date();
    await admin.save();

    const token = jwt.sign({ id: admin._id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, username: admin.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/live-status', authAdmin, (req, res) => {
  const visitors = Array.from(activeSessions.values());
  res.json({
    total_live_visitors: visitors.length,
    product_viewers: visitors.filter(v => v.page === 'product-details').length,
    checkout_users: visitors.filter(v => v.page === 'checkout').length,
    recent_activity: activityFeed.slice(0, 15)
  });
});

app.get('/api/admin/stats', authAdmin, async (req, res) => {
  try {
    const totalRevenueAgg = await Order.aggregate([
      { $match: { payment_status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;
    const pendingPayments = await Transaction.countDocuments({ status: 'PROCESSING' });
    const confirmedPayments = await Transaction.countDocuments({ status: 'CONFIRMED' });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({ created_at: { $gte: todayStart } });

    res.json({ totalRevenue, pendingPayments, confirmedPayments, todayOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Returns transactions list excluding heavy base64 proof payload for performance
app.get('/api/admin/transactions', authAdmin, async (req, res) => {
  try {
    const txns = await Transaction.find().select('-proof_screenshot').sort({ created_at: -1 });
    // Attach indicator if screenshot exists
    const withProofFlag = await Promise.all(txns.map(async (t) => {
      const doc = await Transaction.findById(t._id).select('proof_screenshot');
      return {
        ...t.toObject(),
        has_proof: !!(doc && doc.proof_screenshot)
      };
    }));
    res.json(withProofFlag);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated endpoint to load proof screenshot on demand
app.get('/api/admin/transactions/:id/proof', authAdmin, async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id).select('proof_screenshot txn_id');
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ proof_screenshot: txn.proof_screenshot, txn_id: txn.txn_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/transactions/:id/confirm', authAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const txn = await Transaction.findById(req.params.id).session(session);
    const order = await Order.findById(txn.order_id).session(session);

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const inventory = await InventoryItem.findOneAndUpdate(
        { product_id: item.product_id, status: 'Available' },
        { status: 'Sold', assigned_order_id: order._id },
        { new: true, session }
      );

      let payload = {};
      if (inventory) {
        if (inventory.delivery_type === 'EMAIL_PASSWORD') {
          payload = { email: inventory.email, password: inventory.password };
        } else if (inventory.delivery_type === 'LICENSE_KEY') {
          payload = { license_key: inventory.license_key };
        } else {
          payload = { url: inventory.delivery_url };
        }
      } else {
        payload = { custom_text: 'Payment verified. Credentials assigned.' };
      }

      order.items[i].delivered_data = payload;
    }

    txn.status = 'CONFIRMED';
    txn.verified_at = new Date();
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
    const { reason } = req.body;
    const txn = await Transaction.findById(req.params.id);
    txn.status = 'REJECTED';
    txn.rejection_reason = reason || 'Payment screenshot invalid.';
    txn.verified_at = new Date();
    await txn.save();

    await Order.findByIdAndUpdate(txn.order_id, {
      payment_status: 'Failed',
      delivery_status: 'Failed'
    });

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

app.get('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ created_at: -1 });
    const list = await Promise.all(products.map(async (p) => {
      const stock = await InventoryItem.countDocuments({ product_id: p._id, status: 'Available' });
      return { ...p.toObject(), stock_count: stock };
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
      images: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800']
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/inventory/:productId', authAdmin, async (req, res) => {
  try {
    const item = await InventoryItem.create({
      product_id: req.params.productId,
      ...req.body,
      status: 'Available'
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    await InventoryItem.deleteMany({ product_id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------------------------------------
// DATABASE LAUNCH
// ----------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✓ Successfully connected to MongoDB Atlas');
    await initializeSystem();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✓ NEXUS Digital Engine running on port ${PORT}`));
  })
  .catch(err => console.error('✕ Failed to connect to MongoDB Atlas:', err.message));
