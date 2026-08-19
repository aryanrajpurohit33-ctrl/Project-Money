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

const activeSessions = new Map();

app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
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
  brand: { type: String, default: 'Nexus Digital' },
  category: { type: String, default: 'Software & Digital Goods' },
  tags: [String],
  short_description: { type: String, default: '' },
  description: { type: String, default: '' },
  customer_instructions: { type: String, default: '' },
  internal_notes: { type: String, default: '' },
  product_type: { type: String, default: 'ONE_TIME' },
  original_price: { type: Number, required: true, default: 999 },
  sale_price: { type: Number, required: true, default: 499 },
  discount_percentage: { type: Number, default: 0 },
  subscription_pricing: {
    one_month: { type: Number, default: 199 },
    six_months: { type: Number, default: 899 },
    one_year: { type: Number, default: 1499 }
  },
  images: [{ type: String }],
  delivery_type: { type: String, default: 'EMAIL_PASSWORD' },
  is_featured: { type: Boolean, default: false },
  unlimited_stock: { type: Boolean, default: true },
  stock_quantity: { type: Number, default: 100 },
  low_stock_threshold: { type: Number, default: 5 },
  seo_title: { type: String, default: '' },
  seo_description: { type: String, default: '' },
  status: { type: String, default: 'active' },
  sales_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const InventorySlotSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  account_label: { type: String, required: true, default: 'Slot 1' },
  email: { type: String, required: true, trim: true },
  password: { type: String, default: '' },
  max_active_users: { type: Number, default: 1 },
  status: { type: String, enum: ['AVAILABLE', 'ASSIGNED', 'FULL', 'DISABLED'], default: 'AVAILABLE' },
  created_at: { type: Date, default: Date.now }
});

const SubscriptionSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  assigned_slot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySlot', default: null },
  product_name: String,
  duration: { type: String, default: '1_MONTH' },
  expires_at: { type: Date, required: true },
  status: { type: String, default: 'ACTIVE' },
  created_at: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
  txn_id: { type: String, required: true, unique: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer_name: String,
  customer_email: String,
  product_name: String,
  amount: { type: Number, required: true },
  payment_method: { type: String, default: 'UPI' },
  proof_screenshot: { type: String, default: '' },
  status: { type: String, default: 'PENDING_PAYMENT' },
  created_at: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  order_number: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer_name: String,
  customer_email: String,
  items: [{ product_id: mongoose.Schema.Types.ObjectId, name: String, price: Number }],
  total_amount: { type: Number, required: true },
  payment_status: { type: String, default: 'Pending' },
  created_at: { type: Date, default: Date.now }
});

const PaymentSettingsSchema = new mongoose.Schema({
  upi_id: { type: String, default: 'merchant@okaxis' },
  upi_name: { type: String, default: 'Nexus Pay' },
  upi_instructions: { type: String, default: 'Pay via UPI' },
  crypto_wallet_address: { type: String, default: 'TXYz98765...' }
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
    }
    const ps = await PaymentSettings.findOne();
    if (!ps) await PaymentSettings.create({});
  } catch (e) {}
}

// ----------------------------------------------------
// AUTH MIDDLEWARES
// ----------------------------------------------------
function authCustomer(req, res, next) {
  const h = req.headers['authorization'];
  if (!h) return res.status(401).json({ error: 'Auth required' });
  try {
    req.user = jwt.verify(h.split(' ')[1], JWT_SECRET);
    next();
  } catch (e) { res.status(401).json({ error: 'Invalid session' }); }
}

function authAdmin(req, res, next) {
  const h = req.headers['authorization'];
  if (!h) return res.status(401).json({ error: 'Admin required' });
  try {
    req.admin = jwt.verify(h.split(' ')[1], JWT_SECRET);
    next();
  } catch (e) { res.status(403).json({ error: 'Forbidden' }); }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(400).json({ error: 'Invalid admin credentials' });
    }
    const token = jwt.sign({ id: admin._id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, username: admin.username });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/products', async (req, res) => {
  try { res.json(await Product.find({ status: { $ne: 'archived' } }).sort({ created_at: -1 })); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id) || await Product.findOne({ slug: req.params.id });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ ...p.toObject(), in_stock: p.unlimited_stock || p.stock_quantity > 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/products', authAdmin, async (req, res) => {
  try { res.json(await Product.find().sort({ created_at: -1 })); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const { name, original_price, sale_price } = req.body;
    const orig = Number(original_price) || 999;
    const sale = Number(sale_price) || 499;
    const disc = orig > sale ? Math.round(((orig - sale) / orig) * 100) : 0;
    const slug = (name || 'prod').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const p = await Product.create({ ...req.body, slug, sku: 'SKU-' + Date.now(), original_price: orig, sale_price: sale, discount_percentage: disc });
    res.status(201).json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/products/:id', authAdmin, async (req, res) => {
  try { await Product.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/slots', authAdmin, async (req, res) => {
  try {
    const slots = await InventorySlot.find().populate('product_id', 'name');
    res.json({ slots, stats: { total: slots.length, available: slots.filter(s => s.status === 'AVAILABLE').length, assigned: slots.filter(s => s.status === 'ASSIGNED').length, full: 0, disabled: 0 } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/slots', authAdmin, async (req, res) => {
  try { res.status(201).json(await InventorySlot.create(req.body)); } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/slots/:id', authAdmin, async (req, res) => {
  try { await InventorySlot.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/subscriptions/advanced', authAdmin, async (req, res) => {
  try {
    const subs = await Subscription.find().populate('user_id', 'username name').populate('product_id', 'name');
    res.json({ subscriptions: subs, stats: { total: subs.length, active: subs.filter(s => s.status === 'ACTIVE').length } });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
app.post('/api/admin/payment-settings', authAdmin, async (req, res) => {
  try {
    let ps = await PaymentSettings.findOne();
    if (!ps) ps = await PaymentSettings.create(req.body);
    else { Object.assign(ps, req.body); await ps.save(); }
    res.json(ps);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/system/infrastructure', authAdmin, async (req, res) => {
  try {
    res.json({
      server: { service_memory_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024), uptime_formatted: '5h', platform: os.platform(), node_version: process.version },
      database: { status: 'Connected (MongoDB Atlas)', ping_latency_ms: 12, host: 'cluster.mongodb.net' },
      cloud_host: { provider: 'Render Cloud Platform' }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/dashboard/full-overview', authAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ payment_status: 'Paid' });
    const totalRev = orders.reduce((acc, o) => acc + o.total_amount, 0);
    const customersCount = await User.countDocuments();
    const subsCount = await Subscription.countDocuments({ status: 'ACTIVE' });
    res.json({
      kpis: { revenue: { value: totalRev, change: 0 }, orders: { value: orders.length, change: 0 }, customers: { value: customersCount, change: 0 }, subscriptions: { value: subsCount, change: 0 } },
      revenue_timeline: [], order_statuses: { completed: orders.length, processing: 0, pending: 0 }, payment_methods: { upi: { amount: totalRev, count: orders.length }, crypto: { amount: 0, count: 0 } }, top_products: [], slot_summary: { total: 0, available: 0, assigned: 0 }, attention_items: [], live_visitors: activeSessions.size || 1
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`✓ NEXUS Digital Engine running on port ${PORT}`); });

const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI).then(async () => {
    console.log('✓ Connected to MongoDB Atlas');
    await initializeSystem();
  }).catch(err => console.error('DB error:', err.message));
}
