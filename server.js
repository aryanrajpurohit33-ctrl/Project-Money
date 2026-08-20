const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const os = require('os');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret_jwt_key_2026';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus_vault';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Schemas & Models ---
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'CUSTOMER' },
  created_at: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'OTT' },
  images: [{ type: String }],
  product_type: { type: String, default: 'SUBSCRIPTION' },
  status: { type: String, default: 'PUBLISHED' },
  sale_price: { type: Number, required: true },
  original_price: { type: Number, required: true },
  subscription_pricing: { type: Object, default: {} },
  custom_instructions: { type: String, default: '' },
  features: [{ type: String }],
  created_at: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
  txn_id: { type: String, required: true, unique: true },
  customer_name: { type: String, required: true },
  customer_email: { type: String, default: '' },
  user_id: { type: String },
  product_name: { type: String, required: true },
  product_id: { type: String },
  amount: { type: Number, required: true },
  payment_method: { type: String, default: 'UPI' },
  status: { type: String, default: 'PROCESSING' },
  proof_screenshot: { type: String, default: '' },
  credentials: {
    email: { type: String, default: '' },
    password: { type: String, default: '' },
    profile_pin: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  created_at: { type: Date, default: Date.now }
});

const SubscriptionSchema = new mongoose.Schema({
  customer_name: { type: String, required: true },
  customer_email: { type: String, required: true },
  product_name: { type: String, required: true },
  plan_duration: { type: String, default: '1_MONTH' },
  devices: { type: Number, default: 1 },
  start_date: { type: Date, default: Date.now },
  expiry_date: { type: Date },
  status: { type: String, default: 'ACTIVE' },
  credentials: {
    account_email: { type: String, default: '' },
    account_password: { type: String, default: '' },
    profile_number: { type: Number, default: 1 },
    pin: { type: String, default: '' }
  }
});

const SlotSchema = new mongoose.Schema({
  product_name: { type: String, required: true },
  account_email: { type: String, required: true },
  account_password: { type: String, required: true },
  profile_number: { type: Number, default: 1 },
  pin: { type: String, default: '' },
  status: { type: String, default: 'AVAILABLE' },
  assigned_to: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

const PaymentSettingSchema = new mongoose.Schema({
  upi_id: { type: String, default: 'merchant@upi' },
  upi_name: { type: String, default: 'Nexus Digital' },
  qr_image: { type: String, default: '' },
  instructions: { type: String, default: 'Pay via any UPI App and upload screenshot.' }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
const Slot = mongoose.models.Slot || mongoose.model('Slot', SlotSchema);
const PaymentSetting = mongoose.models.PaymentSetting || mongoose.model('PaymentSetting', PaymentSettingSchema);

// --- Auth Middleware ---
const authAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Forbidden: Admin access required' });
    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }
};

const authCustomer = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid customer session' });
  }
};

// --- Auth Routes ---
app.post(['/api/auth/login', '/api/admin/login'], async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username === 'Aryan' && password === '5669') {
      const token = jwt.sign({ username: 'Aryan', isAdmin: true }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, username: 'Aryan', isAdmin: true, user: { username: 'Aryan', email: 'aryan@nexus.internal' } });
    }

    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) return res.status(400).json({ error: 'Invalid username or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ id: user._id, username: user.username, email: user.email, isAdmin: false }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token, isAdmin: false, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', authCustomer, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Admin Overview Dashboard API ---
app.get(['/api/admin/dashboard', '/api/admin/dashboard-stats'], authAdmin, async (req, res) => {
  try {
    const totalSales = await Transaction.countDocuments({ status: 'SUCCESS' });
    const pendingTxns = await Transaction.countDocuments({ status: { $ne: 'SUCCESS' } });
    const totalCustomers = await User.countDocuments();
    const activeSubs = await Subscription.countDocuments({ status: 'ACTIVE' });
    const productsCount = await Product.countDocuments();
    
    const txns = await Transaction.find({ status: 'SUCCESS' });
    const totalRevenue = txns.reduce((acc, t) => acc + (t.amount || 0), 0);

    res.json({
      revenue: totalRevenue,
      sales: totalSales,
      pending_orders: pendingTxns,
      customers: totalCustomers,
      active_subscriptions: activeSubs,
      products_count: productsCount,
      recent_orders: await Transaction.find().sort({ created_at: -1 }).limit(5)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Products API ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ created_at: -1 });
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const newProd = new Product(req.body);
    await newProd.save();
    res.json(newProd);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Subscriptions Suite API ---
app.get('/api/admin/subscriptions', authAdmin, async (req, res) => {
  try {
    const subs = await Subscription.find().sort({ start_date: -1 });
    res.json(subs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/subscriptions', authAdmin, async (req, res) => {
  try {
    const sub = new Subscription(req.body);
    await sub.save();
    res.json(sub);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/subscriptions/:id', authAdmin, async (req, res) => {
  try {
    const updated = await Subscription.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/subscriptions/:id', authAdmin, async (req, res) => {
  try {
    await Subscription.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subscription removed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Customers Management API ---
app.get('/api/admin/customers', authAdmin, async (req, res) => {
  try {
    const customers = await User.find().select('-password').sort({ created_at: -1 });
    res.json(customers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Transactions API ---
app.get('/api/admin/transactions', authAdmin, async (req, res) => {
  try {
    const txns = await Transaction.find().sort({ created_at: -1 });
    res.json(txns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/transactions/:id/verify', authAdmin, async (req, res) => {
  try {
    const txn = await Transaction.findByIdAndUpdate(req.params.id, { status: 'SUCCESS' }, { new: true });
    
    // Auto-create active subscription upon verification if not existing
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    const sub = new Subscription({
      customer_name: txn.customer_name,
      customer_email: txn.customer_email || 'aryanrajpurohit33@gmail.com',
      product_name: txn.product_name,
      plan_duration: '1_MONTH',
      start_date: new Date(),
      expiry_date: expiry,
      status: 'ACTIVE'
    });
    await sub.save();

    res.json(txn);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Account Slots API ---
app.get('/api/admin/slots', authAdmin, async (req, res) => {
  try {
    const slots = await Slot.find().sort({ created_at: -1 });
    res.json(slots);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/slots', authAdmin, async (req, res) => {
  try {
    const slot = new Slot(req.body);
    await slot.save();
    res.json(slot);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/slots/:id', authAdmin, async (req, res) => {
  try {
    await Slot.findByIdAndDelete(req.params.id);
    res.json({ message: 'Slot deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Payment Settings Gateway API ---
app.get(['/api/payment-settings', '/api/admin/payment-settings'], async (req, res) => {
  try {
    let setting = await PaymentSetting.findOne();
    if (!setting) {
      setting = new PaymentSetting();
      await setting.save();
    }
    res.json(setting);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/payment-settings', authAdmin, async (req, res) => {
  try {
    let setting = await PaymentSetting.findOne();
    if (!setting) setting = new PaymentSetting(req.body);
    else Object.assign(setting, req.body);
    await setting.save();
    res.json(setting);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Website / System Diagnostics API ---
app.get(['/api/admin/system-status', '/api/admin/system-monitor', '/api/admin/diagnostics'], authAdmin, (req, res) => {
  res.json({
    status: 'ONLINE',
    uptime: Math.floor(process.uptime()),
    platform: process.platform,
    node_version: process.version,
    memory: {
      free: Math.round(os.freemem() / (1024 * 1024)),
      total: Math.round(os.totalmem() / (1024 * 1024))
    },
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'
  });
});

// --- Store Orders API ---
app.post('/api/checkout', async (req, res) => {
  try {
    const { txn_id, customer_name, customer_email, product_name, product_id, amount, payment_method, proof_screenshot, user_id } = req.body;
    const txn = new Transaction({
      txn_id: txn_id || 'TXN-' + Math.floor(100000 + Math.random() * 900000),
      customer_name,
      customer_email,
      product_name,
      product_id,
      amount,
      payment_method: payment_method || 'UPI',
      proof_screenshot: proof_screenshot || '',
      user_id: user_id || '',
      status: 'PROCESSING'
    });
    await txn.save();
    res.json(txn);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', async (req, res) => {
  try {
    const email = req.query.email;
    const query = email ? { customer_email: email } : {};
    const orders = await Transaction.find(query).sort({ created_at: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// API Catch-All (Returns JSON 404 for nonexistent endpoints)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Client SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
