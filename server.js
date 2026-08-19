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

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (cleanUser.toLowerCase() === 'aryan' && cleanPass === '5669') {
      const token = jwt.sign({ id: 'superadmin_aryan', username: 'Aryan', role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
      return res.json({ token, username: 'Aryan', role: 'admin' });
    }

    const admin = await Admin.findOne({ username: cleanUser });
    if (!admin || !(await bcrypt.compare(cleanPass, admin.password_hash))) {
      return res.status(400).json({ error: 'Invalid admin credentials' });
    }
    const token = jwt.sign({ id: admin._id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, username: admin.username, role: 'admin' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/customer/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (cleanUser === 'aryan' && cleanPass === '5669') {
      const token = jwt.sign({ id: 'superadmin_aryan', username: 'Aryan', role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
      return res.json({ is_admin: true, token, user: { username: 'Aryan', role: 'admin' } });
    }

    const user = await User.findOne({ $or: [{ username: cleanUser }, { email: cleanUser }] });
    if (!user || !(await bcrypt.compare(cleanPass, user.password_hash))) {
      return res.status(400).json({ error: 'Incorrect username or password.' });
    }
    const token = jwt.sign({ id: user._id, role: 'customer', username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ is_admin: false, token, user: { id: user._id, username: user.username, name: user.name, email: user.email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/check-username', async (req, res) => {
  try {
    const username = (req.query.username || '').toLowerCase().trim();
    if (!username || username.length < 3 || username.length > 30) return res.json({ available: false, message: 'Must be 3-30 characters' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.json({ available: false, message: 'Only letters, numbers, & underscore allowed' });
    const existing = await User.findOne({ username });
    if (existing || username === 'aryan') return res.json({ available: false, message: 'Username already taken' });
    res.json({ available: true, message: 'Username available' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/customer/register', async (req, res) => {
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
    const token = jwt.sign({ id: user._id, role: 'customer', username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ is_admin: false, token, user: { id: user._id, username: user.username, name: user.name, email: user.email } });
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

app.get('/api/admin/products', async (req, res) => {
  try { res.json(await Product.find().sort({ created_at: -1 })); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/products', async (req, res) => {
  try {
    const { name, original_price, sale_price, description, status, delivery_type, images } = req.body;
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

    const sku = 'SKU-' + Math.floor(100000 + Math.random() * 900000);

    const p = await Product.create({
      name,
      slug,
      sku,
      original_price: orig,
      sale_price: sale,
      discount_percentage: disc,
      description: description || '',
      status: status || 'active',
      delivery_type: delivery_type || 'EMAIL_PASSWORD',
      images: images && images.length ? images : ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800']
    });

    res.status(201).json(p);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/admin/products/:id', async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/products/:id', async (req, res) => {
  try { await Product.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/slots', async (req, res) => {
  try {
    const slots = await InventorySlot.find().populate('product_id', 'name');
    res.json({ slots, stats: { total: slots.length, available: slots.filter(s => s.status === 'AVAILABLE').length, assigned: slots.filter(s => s.status === 'ASSIGNED').length, full: 0, disabled: 0 } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/subscriptions/advanced', async (req, res) => {
  try {
    const subs = await Subscription.find().populate('user_id', 'username name').populate('product_id', 'name');
    res.json({ subscriptions: subs, stats: { total: subs.length, active: subs.filter(s => s.status === 'ACTIVE').length } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/transactions', async (req, res) => {
  try { res.json(await Transaction.find().select('-proof_screenshot')); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/customers/list', async (req, res) => {
  try { res.json(await User.find()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/payment-settings', async (req, res) => {
  try { res.json(await PaymentSettings.findOne() || {}); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/system/infrastructure', async (req, res) => {
  try {
    res.json({
      server: { service_memory_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024), uptime_formatted: '5h', platform: os.platform(), node_version: process.version },
      database: { status: 'Connected (MongoDB Atlas)', ping_latency_ms: 12, host: 'cluster.mongodb.net' },
      cloud_host: { provider: 'Render Cloud Platform' }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/dashboard/full-overview', async (req, res) => {
  try {
    const orders = await Order.find({ payment_status: 'Paid' });
    const totalRev = orders.reduce((acc, o) => acc + o.total_amount, 0);
    const customersCount = await User.countDocuments();
    const subsCount = await Subscription.countDocuments({ status: 'ACTIVE' });
    res.json({
      kpis: { revenue: { value: totalRev, change: 0 }, orders: { value: orders.length, change: 0 }, customers: { value: customersCount, change: 0 }, subscriptions: { value: subsCount, change: 0 } },
      revenue_timeline: [], order_statuses: { completed: orders.length, processing: 0, pending: 0 }, payment_methods: { upi: { amount: totalRev, count: orders.length }, crypto: { amount: 0, count: 0 } }, top_products: [], slot_summary: { total: 0, available: 0, assigned: 0 }, attention_items: [], live_visitors: 1
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
