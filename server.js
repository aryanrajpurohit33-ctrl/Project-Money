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
  status: { type: String, enum: ['AVAILABLE', 'ASSIGNED', 'FULL', 'EXPIRED', 'DISABLED'], default: 'AVAILABLE' }
});

const SubscriptionSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  assigned_slot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySlot', default: null },
  product_name: String,
  expires_at: { type: Date, required: true },
  status: { type: String, default: 'ACTIVE' }
});

const TransactionSchema = new mongoose.Schema({
  txn_id: { type: String, required: true, unique: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'PENDING_PAYMENT' }
});

const OrderSchema = new mongoose.Schema({
  order_number: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  total_amount: { type: Number, required: true },
  payment_status: { type: String, default: 'Pending' }
});

const PaymentSettingsSchema = new mongoose.Schema({
  upi_enabled: { type: Boolean, default: true },
  upi_id: { type: String, default: 'merchant@okaxis' }
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
      console.log('✓ Initialized SuperAdmin: Aryan / 5669');
    }
  } catch (err) { console.error('Init error:', err.message); }
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
  } catch (err) { return res.status(403).json({ error: 'Forbidden' }); }
}

// ----------------------------------------------------
// PRODUCT STUDIO REST API ENDPOINTS
// ----------------------------------------------------
app.get('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const prods = await Product.find().sort({ created_at: -1 });
    const list = await Promise.all(prods.map(async (p) => {
      const total = await InventorySlot.countDocuments({ product_id: p._id });
      const activeSales = await Order.countDocuments({ 'items.product_id': p._id, payment_status: 'Paid' });
      return { ...p.toObject(), total_slots: total, sales_count: activeSales };
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
    if (!original) return res.status(404).json({ error: 'Product not found' });
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
    const activePurchases = await Order.countDocuments({ 'items.product_id': req.params.id, payment_status: 'Paid' });
    if (activePurchases > 0 && req.query.force !== 'true') {
      return res.status(400).json({ error: 'Product has active purchases and cannot be safely deleted. Use Archive instead.' });
    }
    await Product.findByIdAndDelete(req.params.id);
    await InventorySlot.deleteMany({ product_id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stubs for remaining admin navigation tabs to keep sidebar functional
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
  res.json({ sales: { revenue: 0, orders: 0 }, customers: { total: 0 }, subscriptions: { active: 0 } });
});
app.get('/api/admin/slots', authAdmin, async (req, res) => { res.json({ slots: [], stats: { total: 0, available: 0, assigned: 0, full: 0, disabled: 0, total_active_users: 0 } }); });
app.get('/api/admin/subscriptions/advanced', authAdmin, async (req, res) => { res.json({ subscriptions: [], stats: { total: 0, active: 0 } }); });
app.get('/api/admin/transactions', authAdmin, async (req, res) => { res.json([]); });
app.get('/api/admin/customers/list', authAdmin, async (req, res) => { res.json([]); });
app.get('/api/admin/payment-settings', authAdmin, async (req, res) => { res.json({}); });
app.get('/api/admin/system/infrastructure', authAdmin, async (req, res) => { res.json({ server: { service_memory_rss_mb: 40, uptime_formatted: '2h' }, database: { status: 'Connected', ping_latency_ms: 10 } }); });

app.get('/api/products', async (req, res) => {
  try { res.json(await Product.find({ status: 'active' })); } catch (e) { res.json([]); }
});

app.get('/api/products/:identifier', async (req, res) => {
  try {
    const p = mongoose.Types.ObjectId.isValid(req.params.identifier) ? await Product.findById(req.params.identifier) : await Product.findOne({ slug: req.params.identifier });
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) { res.status(404).json({ error: 'Not found' }); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`✓ NEXUS Digital Engine running on port ${PORT}`); });

const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI).then(async () => {
    console.log('✓ Connected to MongoDB Atlas Cloud Database');
    await initializeSystem();
  }).catch(err => console.error('✕ Failed to connect to MongoDB Atlas:', err.message));
}
