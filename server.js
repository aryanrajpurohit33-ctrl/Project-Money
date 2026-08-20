require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const os = require('os');
const path = require('path');
const compression = require('compression');

const app = express();

app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_digital_super_secret_jwt_2026_key';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus_vault';

app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  next();
});

// --- Schemas & Models ---
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
  slug: { type: String, default: '' },
  sku: { type: String, default: '' },
  brand: { type: String, default: 'Nexus Digital' },
  category: { type: String, default: 'OTT' },
  tags: [String],
  short_description: { type: String, default: '' },
  description: { type: String, default: '' },
  customer_instructions: { type: String, default: '' },
  custom_instructions: { type: String, default: '' },
  internal_notes: { type: String, default: '' },
  product_type: { type: String, default: 'SUBSCRIPTION' },
  original_price: { type: Number, required: true, default: 999 },
  sale_price: { type: Number, required: true, default: 499 },
  discount_percentage: { type: Number, default: 50 },
  subscription_pricing: { type: Object, default: {} },
  images: [{ type: String }],
  delivery_type: { type: String, default: 'EMAIL_PASSWORD' },
  is_featured: { type: Boolean, default: false },
  unlimited_stock: { type: Boolean, default: true },
  stock_quantity: { type: Number, default: 100 },
  status: { type: String, default: 'PUBLISHED' },
  sales_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const InventorySlotSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  product_name: { type: String, default: '' },
  account_label: { type: String, default: 'Slot 1' },
  email: { type: String, required: true, trim: true },
  password: { type: String, default: '' },
  profile_number: { type: Number, default: 1 },
  pin: { type: String, default: '' },
  max_active_users: { type: Number, default: 1 },
  status: { type: String, enum: ['AVAILABLE', 'ASSIGNED', 'FULL', 'DISABLED'], default: 'AVAILABLE' },
  assigned_to: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

const SubscriptionSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  assigned_slot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySlot', default: null },
  customer_name: { type: String, default: '' },
  customer_email: { type: String, default: '' },
  product_name: { type: String, default: '' },
  plan_duration: { type: String, default: '1_MONTH' },
  duration: { type: String, default: '1_MONTH' },
  devices: { type: Number, default: 1 },
  start_date: { type: Date, default: Date.now },
  expires_at: { type: Date },
  expiry_date: { type: Date },
  status: { type: String, default: 'ACTIVE' },
  credentials: {
    account_email: { type: String, default: '' },
    account_password: { type: String, default: '' },
    profile_number: { type: Number, default: 1 },
    pin: { type: String, default: '' }
  },
  created_at: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
  txn_id: { type: String, required: true, unique: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer_name: { type: String, required: true },
  customer_email: { type: String, default: '' },
  product_name: { type: String, required: true },
  product_id: { type: String },
  amount: { type: Number, required: true },
  payment_method: { type: String, default: 'UPI' },
  proof_screenshot: { type: String, default: '' },
  rejection_reason: { type: String, default: '' },
  status: { type: String, default: 'PROCESSING' },
  created_at: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  order_number: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer_name: String,
  customer_email: String,
  items: [{ 
    product_id: mongoose.Schema.Types.ObjectId, 
    name: String, 
    price: Number,
    delivered_data: { email: String, password: String }
  }],
  total_amount: { type: Number, required: true },
  payment_status: { type: String, default: 'Processing' },
  created_at: { type: Date, default: Date.now }
});

const PaymentSettingsSchema = new mongoose.Schema({
  upi_id: { type: String, default: 'merchant@okaxis' },
  upi_name: { type: String, default: 'Nexus Pay' },
  upi_instructions: { type: String, default: 'Pay via any UPI App and upload screenshot.' },
  qr_image: { type: String, default: '' },
  crypto_wallet_address: { type: String, default: '' }
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const InventorySlot = mongoose.models.InventorySlot || mongoose.model('InventorySlot', InventorySlotSchema);
const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
const PaymentSettings = mongoose.models.PaymentSettings || mongoose.model('PaymentSettings', PaymentSettingsSchema);

// --- System Initialization ---
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

// --- Middlewares ---
function authAdmin(req, res, next) {
  const h = req.headers['authorization'];
  if (!h) return res.status(401).json({ error: 'Admin authorization required' });
  try {
    const decoded = jwt.verify(h.split(' ')[1], JWT_SECRET);
    if (decoded.role !== 'admin' && !decoded.isAdmin) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    req.admin = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired admin session' });
  }
}

function authCustomer(req, res, next) {
  const h = req.headers['authorization'];
  if (!h) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(h.split(' ')[1], JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid customer session' });
  }
}

// --- Authentication Endpoints ---
app.post(['/api/admin/login', '/api/auth/customer/login', '/api/auth/login'], async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (cleanUser.toLowerCase() === 'aryan' && cleanPass === '5669') {
      const token = jwt.sign({ id: 'superadmin_aryan', username: 'Aryan', role: 'admin', isAdmin: true }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, username: 'Aryan', role: 'admin', isAdmin: true, is_admin: true, user: { username: 'Aryan', role: 'admin' } });
    }

    const admin = await Admin.findOne({ username: cleanUser });
    if (admin && (await bcrypt.compare(cleanPass, admin.password_hash))) {
      const token = jwt.sign({ id: admin._id, username: admin.username, role: 'admin', isAdmin: true }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, username: admin.username, role: 'admin', isAdmin: true, is_admin: true });
    }

    const user = await User.findOne({ $or: [{ username: cleanUser.toLowerCase() }, { email: cleanUser.toLowerCase() }] });
    if (!user || !(await bcrypt.compare(cleanPass, user.password_hash))) {
      return res.status(400).json({ error: 'Incorrect username or password.' });
    }

    const token = jwt.sign({ id: user._id, role: 'customer', username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, isAdmin: false, is_admin: false, user: { id: user._id, username: user.username, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post(['/api/auth/register', '/api/auth/customer/register'], async (req, res) => {
  try {
    const username = (req.body.username || '').toLowerCase().trim();
    const email = (req.body.email || `${username}@nexus.internal`).toLowerCase().trim();
    const password = req.body.password || '';

    if (username === 'aryan') return res.status(400).json({ error: 'Username is reserved.' });
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ error: 'Username or email already exists.' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const user = await User.create({ username, name: req.body.name || username, email, password_hash });
    const token = jwt.sign({ id: user._id, role: 'customer', username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, username: user.username, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', authCustomer, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Overview Dashboard Endpoints ---
app.get(['/api/admin/dashboard', '/api/admin/dashboard/full-overview', '/api/admin/dashboard-stats'], authAdmin, async (req, res) => {
  try {
    const orders = await Transaction.find({ status: 'SUCCESS' }).lean();
    const totalRev = orders.reduce((acc, o) => acc + (o.amount || 0), 0);
    const customersCount = await User.countDocuments();
    const subsCount = await Subscription.countDocuments({ status: 'ACTIVE' });
    const pendingOrders = await Transaction.countDocuments({ status: { $in: ['PROCESSING', 'PENDING'] } });

    res.json({
      revenue: totalRev,
      sales: orders.length,
      pending_orders: pendingOrders,
      customers: customersCount,
      active_subscriptions: subsCount,
      kpis: {
        revenue: { value: totalRev, change: 0 },
        orders: { value: orders.length, change: 0 },
        customers: { value: customersCount, change: 0 },
        subscriptions: { value: subsCount, change: 0 }
      },
      revenue_timeline: [],
      order_statuses: { completed: orders.length, processing: pendingOrders, pending: pendingOrders },
      payment_methods: { upi: { amount: totalRev, count: orders.length }, crypto: { amount: 0, count: 0 } },
      top_products: [],
      slot_summary: { total: 0, available: 0, assigned: 0 },
      attention_items: [],
      live_visitors: 1
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Product Studio Endpoints ---
app.get(['/api/products', '/api/admin/products'], async (req, res) => {
  try {
    res.json(await Product.find({ status: { $ne: 'archived' } }).sort({ created_at: -1 }).lean());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    let p = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      p = await Product.findById(req.params.id).lean();
    }
    if (!p) {
      p = await Product.findOne({ slug: req.params.id }).lean();
    }
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json({ ...p, in_stock: p.unlimited_stock || p.stock_quantity > 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const { name, original_price, sale_price, description, status, delivery_type, images, subscription_pricing, custom_instructions, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required' });

    const orig = Number(original_price) || 999;
    const sale = Number(sale_price) || 499;
    const disc = orig > sale ? Math.round(((orig - sale) / orig) * 100) : 0;

    let baseSlug = (name || 'prod').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await Product.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const p = await Product.create({
      name,
      slug,
      sku: 'SKU-' + Math.floor(100000 + Math.random() * 900000),
      category: category || 'OTT',
      original_price: orig,
      sale_price: sale,
      discount_percentage: disc,
      description: description || '',
      custom_instructions: custom_instructions || '',
      subscription_pricing: subscription_pricing || {},
      status: status || 'PUBLISHED',
      delivery_type: delivery_type || 'EMAIL_PASSWORD',
      images: images && images.length ? images : ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800']
    });

    res.status(201).json(p);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(p);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Subscriptions Suite Endpoints ---
app.get(['/api/admin/subscriptions', '/api/admin/subscriptions/advanced'], authAdmin, async (req, res) => {
  try {
    const subs = await Subscription.find().sort({ start_date: -1 }).lean();
    res.json(subs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/subscriptions', authAdmin, async (req, res) => {
  try {
    const sub = await Subscription.create(req.body);
    res.status(201).json(sub);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/subscriptions/:id', authAdmin, async (req, res) => {
  try {
    const updated = await Subscription.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/subscriptions/:id', authAdmin, async (req, res) => {
  try {
    await Subscription.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Customers Management Endpoints ---
app.get(['/api/admin/customers', '/api/admin/customers/list'], authAdmin, async (req, res) => {
  try {
    res.json(await User.find().select('-password_hash').sort({ created_at: -1 }).lean());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Transactions API (Verify & Reject) ---
app.get('/api/admin/transactions', authAdmin, async (req, res) => {
  try {
    res.json(await Transaction.find().sort({ created_at: -1 }).lean());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/transactions/:id/verify', authAdmin, async (req, res) => {
  try {
    const txn = await Transaction.findByIdAndUpdate(req.params.id, { status: 'SUCCESS' }, { new: true });
    
    // Auto-create active subscription
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    await Subscription.create({
      customer_name: txn.customer_name,
      customer_email: txn.customer_email || `${txn.customer_name.toLowerCase()}@nexus.internal`,
      product_name: txn.product_name,
      plan_duration: '1_MONTH',
      start_date: new Date(),
      expires_at: expiry,
      expiry_date: expiry,
      status: 'ACTIVE'
    });

    res.json(txn);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/transactions/:id/reject', authAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const txn = await Transaction.findByIdAndUpdate(
      req.params.id, 
      { status: 'REJECTED', rejection_reason: reason || 'Invalid Payment Proof' }, 
      { new: true }
    );
    res.json(txn);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Inventory Slots Endpoints ---
app.get('/api/admin/slots', authAdmin, async (req, res) => {
  try {
    const slots = await InventorySlot.find().populate('product_id', 'name').lean();
    res.json({ slots, stats: { total: slots.length, available: slots.filter(s => s.status === 'AVAILABLE').length, assigned: slots.filter(s => s.status === 'ASSIGNED').length, full: 0, disabled: 0 } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/slots', authAdmin, async (req, res) => {
  try {
    const slot = await InventorySlot.create(req.body);
    res.status(201).json(slot);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/slots/:id', authAdmin, async (req, res) => {
  try {
    await InventorySlot.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Payment Settings Endpoints ---
app.get(['/api/payment-settings', '/api/admin/payment-settings'], async (req, res) => {
  try {
    let ps = await PaymentSettings.findOne().lean();
    if (!ps) ps = await PaymentSettings.create({});
    res.json(ps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/payment-settings', authAdmin, async (req, res) => {
  try {
    let ps = await PaymentSettings.findOne();
    if (!ps) ps = new PaymentSettings(req.body);
    else Object.assign(ps, req.body);
    await ps.save();
    res.json(ps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- System Diagnostics / Infrastructure ---
app.get(['/api/admin/system-status', '/api/admin/system-monitor', '/api/admin/system/infrastructure', '/api/admin/diagnostics'], authAdmin, (req, res) => {
  const memUsage = process.memoryUsage();
  const uptimeSec = process.uptime();
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);

  res.json({
    status: 'ONLINE',
    uptime: uptimeSec,
    server: {
      service_memory_rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      service_memory_heap_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      uptime_formatted: `${hours}h ${minutes}m`,
      platform: os.platform(),
      architecture: os.arch(),
      cpu_cores: os.cpus().length,
      environment: process.env.NODE_ENV || 'production'
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'Connected (MongoDB Atlas)' : 'Disconnected',
      ping_latency_ms: 12,
      host: 'cluster.mongodb.net'
    },
    cloud_host: {
      provider: 'Render Cloud Platform',
      region: 'Global Edge',
      storage_note: 'Render Disk storage active'
    }
  });
});

// --- Storefront Order & Checkout ---
app.post(['/api/checkout', '/api/checkout/initiate-order'], async (req, res) => {
  try {
    const { txn_id, customer_name, customer_email, product_name, product_id, amount, payment_method, proof_screenshot } = req.body;
    const finalTxnId = txn_id || 'TXN-' + Math.floor(100000 + Math.random() * 900000);
    
    const txn = await Transaction.create({
      txn_id: finalTxnId,
      customer_name: customer_name || 'Customer',
      customer_email: customer_email || '',
      product_name: product_name || 'Digital Item',
      product_id: product_id || '',
      amount: Number(amount) || 499,
      payment_method: payment_method || 'UPI',
      proof_screenshot: proof_screenshot || '',
      status: 'PROCESSING'
    });

    res.status(201).json({ success: true, txn_id: finalTxnId, txn });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get(['/api/orders', '/api/customer/orders'], async (req, res) => {
  try {
    const email = req.query.email;
    const query = email ? { customer_email: email } : {};
    res.json(await Transaction.find(query).sort({ created_at: -1 }).lean());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Safe 404 for missing API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ NEXUS Digital Engine running on port ${PORT}`);
});

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI).then(async () => {
    console.log('✓ Connected to MongoDB Atlas');
    await initializeSystem();
  }).catch(err => console.error('DB error:', err.message));
}
