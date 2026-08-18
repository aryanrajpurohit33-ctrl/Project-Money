require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure upload & storage directories exist
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_digital_super_secret_jwt_2026_key';

// ----------------------------------------------------
// LIVE REAL-TIME PRESENCE & ACTIVITY TRACKER (IN-MEMORY)
// ----------------------------------------------------
const activeSessions = new Map(); // sessionId -> { page, timestamp }
const activityFeed = []; // Array of recent live events

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

// Clean inactive sessions older than 35 seconds
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
  file_reference: { type: String, default: '' },
  status: { type: String, enum: ['Available', 'Reserved', 'Sold', 'Disabled'], default: 'Available' },
  assigned_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  created_at: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  short_description: { type: String, default: '' },
  description: { type: String, default: '' },
  category: { type: String, default: 'Digital Goods' },
  tags: [String],
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
  features: [{ type: String }],
  whats_included: [{ type: String }],
  specifications: [{ label: String, value: String }],
  faqs: [{ question: String, answer: String }],
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
    // Sensitive delivery data: only attached or revealed upon transaction confirmation
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

// ----------------------------------------------------
// DATABASE INITIAL SEEDING
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
    if (!existingPaymentSettings) {
      await PaymentSettings.create({});
      console.log('✓ Initialized Payment Settings (UPI & Crypto)');
    }

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
        description: 'Enjoy Ultra HD 4K streaming across all your devices including Smart TVs, Phones, PCs, and Tablets. Private PIN lock ensures your profile stays private.',
        category: 'Accounts',
        tags: ['streaming', 'netflix', 'uhd', 'account', '4k'],
        sku: 'NFLX-4K-01',
        original_price: 799,
        sale_price: 199,
        discount_percentage: 75,
        images: [
          'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1000&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1000&auto=format&fit=crop&q=80'
        ],
        delivery_type: 'EMAIL_PASSWORD',
        features: ['Ultra HD 4K Video Quality', 'Private PIN Lock Profile', 'Works on All Smart Devices', '30-Day Instant Replacement Warranty'],
        whats_included: ['1x Private Profile Credentials', 'Exclusive PIN code', 'Quick Login Guide'],
        specifications: [
          { label: 'Quality', value: '4K HDR / Dolby Vision' },
          { label: 'Duration', value: '30 Days' },
          { label: 'Screen Limit', value: '1 Screen (Private Profile)' },
          { label: 'Delivery', value: 'Instant Manual Approval' }
        ],
        faqs: [
          { question: 'When do I get my credentials?', answer: 'Immediately after the admin confirms your payment screenshot.' }
        ]
      });

      await InventoryItem.create([
        { product_id: netflix._id, delivery_type: 'EMAIL_PASSWORD', email: 'vip_stream01@nexus.io', password: 'VaultStream#2026', status: 'Available' },
        { product_id: netflix._id, delivery_type: 'EMAIL_PASSWORD', email: 'vip_stream02@nexus.io', password: 'StreamBeast!889', status: 'Available' }
      ]);

      const winKey = await Product.create({
        name: 'Windows 11 Pro Genuine OEM Key',
        short_description: 'Lifetime activation for 1 PC with global Microsoft updates.',
        description: 'Official OEM activation key for Microsoft Windows 11 Professional 64-bit/32-bit. Unlocks BitLocker encryption, Remote Desktop, and full enterprise security suite.',
        category: 'License Keys',
        tags: ['windows', 'microsoft', 'os', 'key', 'license'],
        sku: 'WIN-11-PRO',
        original_price: 3999,
        sale_price: 499,
        discount_percentage: 87,
        images: [
          'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=1000&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1000&auto=format&fit=crop&q=80'
        ],
        delivery_type: 'LICENSE_KEY',
        features: ['Lifetime Permanent Activation', 'Online Direct Microsoft Activation', 'Global Multilingual Support', 'Full Security & Windows Updates'],
        whats_included: ['1x 25-Digit License Key', 'Step-by-step Official Activation Guide'],
        specifications: [
          { label: 'Edition', value: 'Windows 11 Professional' },
          { label: 'Architecture', value: '32/64 Bit Supported' },
          { label: 'Validity', value: 'Lifetime / Permanent' }
        ],
        faqs: [
          { question: 'Is this genuine?', answer: 'Yes, keys activate directly with Microsoft validation servers.' }
        ]
      });

      await InventoryItem.create([
        { product_id: winKey._id, delivery_type: 'LICENSE_KEY', license_key: 'W269N-WFGWX-YVC9B-4J6C9-T83GX', status: 'Available' },
        { product_id: winKey._id, delivery_type: 'LICENSE_KEY', license_key: 'MH37W-N47XK-V7XM9-C7227-GCQG9', status: 'Available' }
      ]);
    }
  } catch (err) {
    console.error('Initialization error:', err.message);
  }
}

// ----------------------------------------------------
// AUTHENTICATION MIDDLEWARES
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
    return res.status(401).json({ error: 'Invalid or expired customer session' });
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
// PRESENCE & HEARTBEAT API
// ----------------------------------------------------
app.post('/api/presence/heartbeat', (req, res) => {
  const { sessionId, page, action } = req.body;
  if (sessionId) {
    activeSessions.set(sessionId, {
      page: page || 'home',
      timestamp: Date.now()
    });
  }
  if (action) {
    recordActivity('visitor_action', action);
  }
  res.json({ status: 'ok' });
});

// ----------------------------------------------------
// PUBLIC STORE APIS
// ----------------------------------------------------

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
    const { search, sort } = req.query;
    let query = { status: 'active' };

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { description: regex }, { sku: regex }];
    }

    let sortOption = { created_at: -1 };
    if (sort === 'price_asc') sortOption = { sale_price: 1 };
    if (sort === 'price_desc') sortOption = { sale_price: -1 };

    const products = await Product.find(query).sort(sortOption);
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
    const related = await Product.find({ _id: { $ne: product._id }, status: 'active' }).limit(4);
    res.json({ ...product.toObject(), in_stock: stock > 0, stock_count: stock, related });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cart/validate-coupon', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), status: 'active' });
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon' });

    if (subtotal < coupon.min_purchase) {
      return res.status(400).json({ error: `Minimum purchase of ₹${coupon.min_purchase} required` });
    }

    let discount = coupon.discount_type === 'percentage' 
      ? (subtotal * coupon.discount_value) / 100 
      : coupon.discount_value;
    
    if (coupon.max_discount > 0 && discount > coupon.max_discount) discount = coupon.max_discount;
    discount = Math.min(discount, subtotal);

    res.json({
      valid: true,
      code: coupon.code,
      discount_amount: Math.round(discount),
      final_total: Math.max(0, Math.round(subtotal - discount))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// CUSTOMER AUTH & TRANSACTIONS
// ----------------------------------------------------

app.post('/api/auth/customer/register', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const user = await User.create({ name, email: email.toLowerCase().trim(), mobile: mobile || '', password_hash });

    recordActivity('customer_registered', `New customer registered: ${user.name}`);

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

// 1. Initiate Order & Create Transaction
app.post('/api/checkout/initiate-order', authCustomer, async (req, res) => {
  try {
    const { items, payment_method, coupon_code } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'Cart is empty' });

    const user = await User.findById(req.user.id);
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const p = await Product.findById(item.product_id);
      if (!p || p.status !== 'active') throw new Error(`Product "${item.name}" is no longer available`);
      subtotal += p.sale_price;
      orderItems.push({
        product_id: p._id,
        name: p.name,
        price: p.sale_price,
        delivery_type: p.delivery_type,
        delivered_data: null // Sensitive credentials remain NULL until confirmed
      });
    }

    let discountAmount = 0;
    if (coupon_code) {
      const coupon = await Coupon.findOne({ code: coupon_code.toUpperCase().trim(), status: 'active' });
      if (coupon && subtotal >= coupon.min_purchase) {
        discountAmount = coupon.discount_type === 'percentage' 
          ? (subtotal * coupon.discount_value) / 100 
          : coupon.discount_value;
        if (coupon.max_discount > 0 && discountAmount > coupon.max_discount) discountAmount = coupon.max_discount;
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
      coupon_code: coupon_code || '',
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
      customer_mobile: user.mobile,
      amount: totalAmount,
      payment_method,
      status: 'PENDING_PAYMENT'
    });

    order.transaction_id = transaction._id;
    await order.save();

    recordActivity('order_initiated', `Customer ${user.name} started order #${orderNumber} for ₹${totalAmount} via ${payment_method}`);

    res.status(201).json({
      order,
      transaction
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Upload Payment Proof Screenshot
app.post('/api/checkout/upload-proof', authCustomer, upload.single('screenshot'), async (req, res) => {
  try {
    const { transaction_id } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Please upload an image file (JPG, PNG, WEBP)' });

    const txn = await Transaction.findOne({ txn_id: transaction_id, user_id: req.user.id });
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    const screenshotUrl = `/uploads/${req.file.filename}`;
    txn.proof_screenshot = screenshotUrl;
    txn.status = 'PROCESSING';
    await txn.save();

    await Order.findByIdAndUpdate(txn.order_id, {
      payment_status: 'Processing',
      delivery_status: 'Processing'
    });

    recordActivity('proof_uploaded', `Payment screenshot submitted for TXN: ${txn.txn_id} (₹${txn.amount})`);

    res.json({
      success: true,
      message: 'Proof submitted. Payment is currently waiting for admin manual verification.',
      transaction: txn
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Customer Purchased Items (Masked until Confirmed)
app.get('/api/customer/orders', authCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id })
      .populate('transaction_id')
      .sort({ created_at: -1 });

    // Ensure digital secrets are never exposed if payment is still Processing or Rejected
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
// DEDICATED ADMIN CONTROL CENTER APIS
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

    recordActivity('admin_login', `Admin user "${admin.username}" authenticated to Control Center`);

    const token = jwt.sign({ id: admin._id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, username: admin.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Live Presence & Activity Feed
app.get('/api/admin/live-status', authAdmin, (req, res) => {
  const visitors = Array.from(activeSessions.values());
  const productViewers = visitors.filter(v => v.page === 'product-details').length;
  const checkoutUsers = visitors.filter(v => v.page === 'checkout').length;
  const cartUsers = visitors.filter(v => v.page === 'cart').length;

  res.json({
    total_live_visitors: visitors.length,
    product_viewers: productViewers,
    checkout_users: checkoutUsers,
    cart_users: cartUsers,
    recent_activity: activityFeed.slice(0, 15)
  });
});

// Admin Core Dashboard Statistics
app.get('/api/admin/stats', authAdmin, async (req, res) => {
  try {
    const totalRevenueAgg = await Order.aggregate([
      { $match: { payment_status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    const totalTransactions = await Transaction.countDocuments();
    const pendingPayments = await Transaction.countDocuments({ status: 'PROCESSING' });
    const confirmedPayments = await Transaction.countDocuments({ status: 'CONFIRMED' });
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await User.countDocuments();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({ created_at: { $gte: todayStart } });

    res.json({
      totalRevenue,
      totalTransactions,
      pendingPayments,
      confirmedPayments,
      totalProducts,
      totalCustomers,
      todayOrders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Transactions Queue
app.get('/api/admin/transactions', authAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status && status !== 'ALL') filter.status = status;

    const txns = await Transaction.find(filter).sort({ created_at: -1 });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Confirm Payment -> Unlocks Inventory & Credentials
app.post('/api/admin/transactions/:id/confirm', authAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const txn = await Transaction.findById(req.params.id).session(session);
    if (!txn) throw new Error('Transaction not found');
    if (txn.status === 'CONFIRMED') throw new Error('Transaction already confirmed');

    const order = await Order.findById(txn.order_id).session(session);
    if (!order) throw new Error('Associated order not found');

    // Deliver inventory credentials to each item
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
        } else if (inventory.delivery_type === 'STANDARD_LINK') {
          payload = { url: inventory.delivery_url };
        } else {
          payload = { custom_text: inventory.custom_text };
        }
      } else {
        payload = { custom_text: 'Admin confirmed payment. Contact support for direct credential delivery.' };
      }

      order.items[i].delivered_data = payload;
      await Product.findByIdAndUpdate(item.product_id, { $inc: { sales_count: 1 } }).session(session);
    }

    txn.status = 'CONFIRMED';
    txn.verified_at = new Date();
    await txn.save({ session });

    order.payment_status = 'Paid';
    order.delivery_status = 'Delivered';
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    recordActivity('payment_confirmed', `Admin confirmed payment for TXN: ${txn.txn_id} (₹${txn.amount})`);

    res.json({ success: true, message: 'Payment confirmed and digital goods unlocked for customer.' });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
});

// Admin Reject Payment
app.post('/api/admin/transactions/:id/reject', authAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    txn.status = 'REJECTED';
    txn.rejection_reason = reason || 'Payment screenshot invalid or amount mismatch.';
    txn.verified_at = new Date();
    await txn.save();

    await Order.findByIdAndUpdate(txn.order_id, {
      payment_status: 'Failed',
      delivery_status: 'Failed'
    });

    recordActivity('payment_rejected', `Admin rejected payment for TXN: ${txn.txn_id} (Reason: ${txn.rejection_reason})`);

    res.json({ success: true, message: 'Transaction marked as rejected.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Payment Settings Management
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
    recordActivity('settings_updated', 'Payment settings updated by Admin');
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Products CRUD & Inventory
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
    const { name, short_description, description, original_price, sale_price, delivery_type, images, sku } = req.body;
    const orig = Number(original_price) || Number(sale_price) || 0;
    const sale = Number(sale_price) || 0;
    const disc = orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0;

    const product = await Product.create({
      name,
      short_description,
      description,
      sku: sku || 'SKU-' + Date.now(),
      original_price: orig,
      sale_price: sale,
      discount_percentage: disc,
      images: images || ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'],
      delivery_type
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    const { name, short_description, description, original_price, sale_price, delivery_type, images, sku, status } = req.body;
    const orig = Number(original_price) || Number(sale_price) || 0;
    const sale = Number(sale_price) || 0;
    const disc = orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0;

    const p = await Product.findByIdAndUpdate(req.params.id, {
      name, short_description, description, original_price: orig, sale_price: sale,
      discount_percentage: disc, delivery_type, images, sku, status
    }, { new: true });
    res.json(p);
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------------------------------------
// START SERVER
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
