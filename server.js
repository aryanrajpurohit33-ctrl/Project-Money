const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret_jwt_key_2026';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus_vault';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
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
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

// Auth Middleware
const authAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Unified Login Endpoint (Handles both Admin & Customer)
app.post(['/api/auth/login', '/api/admin/login'], async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if credentials match Admin
    if (username === 'Aryan' && password === '5669') {
      const token = jwt.sign({ username: 'Aryan', isAdmin: true }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ 
        token, 
        isAdmin: true,
        username: 'Aryan',
        user: { username: 'Aryan', email: 'aryan@nexus.internal', isAdmin: true } 
      });
    }

    // Otherwise check regular customer in DB
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) return res.status(400).json({ error: 'Invalid username or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ id: user._id, username: user.username, email: user.email, isAdmin: false }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token, isAdmin: false, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields are required' });

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ error: 'Username or Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products Endpoints
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
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json(newProduct);
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
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Transactions Endpoints
app.get('/api/admin/transactions', authAdmin, async (req, res) => {
  try {
    const txns = await Transaction.find().sort({ created_at: -1 });
    res.json(txns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/transactions/:id/verify', authAdmin, async (req, res) => {
  try {
    const txn = await Transaction.findByIdAndUpdate(req.params.id, { status: 'SUCCESS' }, { new: true });
    res.json(txn);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fallback SPA Routing (Prevents returning HTML for missing API routes)
app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
