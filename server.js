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

const uploadDir = path.join(__dirname, 'secure_storage');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_digital_super_secret_jwt_2026_key';

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
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  created_at: { type: Date, default: Date.now }
});

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '📂' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
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
  file_name: { type: String, default: '' },
  status: { type: String, enum: ['Available', 'Reserved', 'Sold', 'Disabled'], default: 'Available' },
  assigned_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  created_at: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  short_description: { type: String, default: '' },
  description: { type: String, default: '' },
  category: { type: String, required: true },
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
  specifications: [{
    label: { type: String },
    value: { type: String }
  }],
  faqs: [{
    question: { type: String },
    answer: { type: String }
  }],
  status: { type: String, enum: ['active', 'draft', 'archived', 'disabled'], default: 'active' },
  featured: { type: Boolean, default: false },
  deal: { type: Boolean, default: false },
  max_downloads: { type: Number, default: 5 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
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
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  expires_at: { type: Date, default: null }
});

const OrderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer_name: String,
  customer_email: String,
  customer_mobile: String,
  items: [{
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    delivery_type: String,
    delivered_data: { type: mongoose.Schema.Types.Mixed }
  }],
  subtotal: { type: Number, required: true },
  discount_amount: { type: Number, default: 0 },
  coupon_code: { type: String, default: '' },
  total_amount: { type: Number, required: true },
  payment_status: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded'], default: 'Paid' },
  delivery_status: { type: String, enum: ['Pending', 'Delivered', 'Failed'], default: 'Delivered' },
  created_at: { type: Date, default: Date.now }
});

const SettingsSchema = new mongoose.Schema({
  store_name: { type: String, default: 'NEXUS DIGITAL' },
  tagline: { type: String, default: 'Premium Verified Digital Assets & Software' },
  currency: { type: String, default: '₹' },
  contact_email: { type: String, default: 'support@nexusdigital.io' },
  banner_text: { type: String, default: '🎉 Summer Sale: Use code SAVE20 for 20% OFF all digital software!' }
});

const Admin = mongoose.model('Admin', AdminSchema);
const User = mongoose.model('User', UserSchema);
const Category = mongoose.model('Category', CategorySchema);
const Product = mongoose.model('Product', ProductSchema);
const InventoryItem = mongoose.model('InventoryItem', InventoryItemSchema);
const Coupon = mongoose.model('Coupon', CouponSchema);
const Order = mongoose.model('Order', OrderSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

// ----------------------------------------------------
// DATABASE SEEDING
// ----------------------------------------------------
async function initializeSystem() {
  try {
    const existingAdmin = await Admin.findOne({ username: 'Aryan' });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('5669', salt);
      await Admin.create({ username: 'Aryan', password_hash: hash });
      console.log('✓ Initialized Admin User: Aryan');
    }

    const existingSettings = await Settings.findOne();
    if (!existingSettings) await Settings.create({});

    const catCount = await Category.countDocuments();
    if (catCount === 0) {
      await Category.insertMany([
        { name: 'Software', description: 'Productivity & developer utilities', icon: '💻' },
        { name: 'Accounts', description: 'Verified streaming & premium service accounts', icon: '🔐' },
        { name: 'License Keys', description: 'Official OS & software license activations', icon: '🔑' },
        { name: 'E-books', description: 'Programming, UI design & tech manuals', icon: '📚' },
        { name: 'Courses', description: 'Full-stack development video packs', icon: '🎓' },
        { name: 'Templates', description: 'Production UI kits and site templates', icon: '🎨' }
      ]);
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

    // Seed/Update rich mock items with detailed specifications
    const pCount = await Product.countDocuments();
    if (pCount === 0) {
      const netflix = await Product.create({
        name: 'Netflix 4K UHD 1-Month Private Profile',
        short_description: 'Dedicated PIN-protected UHD profile on genuine account.',
        description: 'Enjoy Ultra HD 4K streaming across all your devices including Smart TVs, Smartphones, PCs, and Tablets. Private PIN lock ensures your watch history and recommendations stay untouched.',
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
          { label: 'Delivery', value: 'Instant Automation' }
        ],
        faqs: [
          { question: 'Can I change the PIN?', answer: 'Yes, you can configure your profile PIN right after login.' },
          { question: 'What happens if my subscription stops?', answer: 'We offer a 30-day instant warranty with automated credential replacement.' }
        ],
        featured: true,
        deal: true
      });
      await InventoryItem.create([
        { product_id: netflix._id, delivery_type: 'EMAIL_PASSWORD', email: 'vip_stream01@nexus.io', password: 'VaultStream#2026', status: 'Available' },
        { product_id: netflix._id, delivery_type: 'EMAIL_PASSWORD', email: 'vip_stream02@nexus.io', password: 'StreamBeast!889', status: 'Available' }
      ]);

      const winKey = await Product.create({
        name: 'Windows 11 Pro Genuine OEM Key',
        short_description: 'Lifetime activation for 1 PC with global Microsoft updates.',
        description: 'Official OEM activation key for Microsoft Windows 11 Professional 64-bit/32-bit. Unlocks BitLocker encryption, Remote Desktop, Hyper-V, and full enterprise security suite.',
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
        whats_included: ['1x 25-Digit Alpha-Numeric License Key', 'Step-by-step Official Activation Guide'],
        specifications: [
          { label: 'Edition', value: 'Windows 11 Professional' },
          { label: 'Architecture', value: '32/64 Bit Supported' },
          { label: 'Validity', value: 'Lifetime / Permanent' },
          { label: 'Devices', value: '1 PC' }
        ],
        faqs: [
          { question: 'Is this a genuine license?', answer: 'Yes, all keys authenticate directly through Microsoft activation servers.' }
        ],
        featured: true,
        deal: true
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
// STOREFRONT & CATALOG APIS
// ----------------------------------------------------

app.get('/api/store/info', async (req, res) => {
  try {
    const settings = await Settings.findOne() || {};
    const categories = await Category.find({ status: 'active' });
    res.json({ settings, categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { category, search, deal, featured, sort } = req.query;
    let query = { status: 'active' };

    if (category && category !== 'All') query.category = category;
    if (deal === 'true') query.deal = true;
    if (featured === 'true') query.featured = true;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { description: regex },
        { short_description: regex },
        { tags: regex },
        { sku: regex }
      ];
    }

    let sortOption = { created_at: -1 };
    if (sort === 'price_asc') sortOption = { sale_price: 1 };
    if (sort === 'price_desc') sortOption = { sale_price: -1 };
    if (sort === 'best_selling') sortOption = { sales_count: -1 };

    const products = await Product.find(query).sort(sortOption);

    const productsWithStock = await Promise.all(products.map(async (p) => {
      const stock = await InventoryItem.countDocuments({ product_id: p._id, status: 'Available' });
      return {
        ...p.toObject(),
        in_stock: stock > 0,
        stock_count: stock
      };
    }));

    res.json(productsWithStock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single Product with Real-time Stock & Related Items
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const stock = await InventoryItem.countDocuments({ product_id: product._id, status: 'Available' });
    
    // Fetch real related products
    const related = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
      status: 'active'
    }).limit(4);

    res.json({
      ...product.toObject(),
      in_stock: stock > 0,
      stock_count: stock,
      related
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cart/validate-coupon', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), status: 'active' });
    if (!coupon) return res.status(404).json({ error: 'Invalid or inactive coupon code' });

    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ error: 'This coupon has reached its maximum limit' });
    }

    if (subtotal < coupon.min_purchase) {
      return res.status(400).json({ error: `Minimum order amount of ₹${coupon.min_purchase} required` });
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (subtotal * coupon.discount_value) / 100;
      if (coupon.max_discount > 0 && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else {
      discount = coupon.discount_value;
    }

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
// CUSTOMER & ORDER APIS
// ----------------------------------------------------

app.post('/api/auth/customer/register', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

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
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id, role: 'customer', email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customer/orders', authCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/checkout/process', authCustomer, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, coupon_code } = req.body;
    if (!items || !items.length) throw new Error('Shopping cart is empty');

    const user = await User.findById(req.user.id);
    let calculatedSubtotal = 0;
    const orderItems = [];

    for (const cartItem of items) {
      const product = await Product.findById(cartItem.product_id).session(session);
      if (!product || product.status !== 'active') throw new Error(`Product "${cartItem.name}" is no longer available`);

      calculatedSubtotal += product.sale_price;

      const inventory = await InventoryItem.findOneAndUpdate(
        { product_id: product._id, status: 'Available' },
        { status: 'Sold' },
        { new: true, session }
      );

      if (!inventory) throw new Error(`Product "${product.name}" is currently OUT OF STOCK.`);

      product.sales_count += 1;
      await product.save({ session });

      let deliveryPayload = {};
      if (inventory.delivery_type === 'EMAIL_PASSWORD') {
        deliveryPayload = { email: inventory.email, password: inventory.password };
      } else if (inventory.delivery_type === 'MOBILE_PASSWORD') {
        deliveryPayload = { mobile: inventory.mobile, password: inventory.password };
      } else if (inventory.delivery_type === 'STANDARD_LINK') {
        deliveryPayload = { url: inventory.delivery_url };
      } else if (inventory.delivery_type === 'LICENSE_KEY') {
        deliveryPayload = { license_key: inventory.license_key };
      } else if (inventory.delivery_type === 'CUSTOM_TEXT') {
        deliveryPayload = { custom_text: inventory.custom_text };
      } else if (inventory.delivery_type === 'DOWNLOADABLE_FILE') {
        const fileToken = jwt.sign({ file: inventory.file_reference, filename: inventory.file_name }, JWT_SECRET, { expiresIn: '72h' });
        deliveryPayload = { file_name: inventory.file_name, download_url: `/api/download/${fileToken}` };
      }

      orderItems.push({
        product_id: product._id,
        name: product.name,
        price: product.sale_price,
        delivery_type: inventory.delivery_type,
        delivered_data: deliveryPayload
      });
    }

    let discountAmount = 0;
    if (coupon_code) {
      const coupon = await Coupon.findOne({ code: coupon_code.toUpperCase().trim(), status: 'active' }).session(session);
      if (coupon && calculatedSubtotal >= coupon.min_purchase) {
        if (coupon.discount_type === 'percentage') {
          discountAmount = (calculatedSubtotal * coupon.discount_value) / 100;
          if (coupon.max_discount > 0 && discountAmount > coupon.max_discount) discountAmount = coupon.max_discount;
        } else {
          discountAmount = coupon.discount_value;
        }
        coupon.used_count += 1;
        await coupon.save({ session });
      }
    }

    const finalAmount = Math.max(0, Math.round(calculatedSubtotal - discountAmount));

    const order = new Order({
      user_id: user._id,
      customer_name: user.name,
      customer_email: user.email,
      customer_mobile: user.mobile,
      items: orderItems,
      subtotal: calculatedSubtotal,
      discount_amount: Math.round(discountAmount),
      coupon_code: coupon_code || '',
      total_amount: finalAmount,
      payment_status: 'Paid',
      delivery_status: 'Delivered'
    });

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, order });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ADMIN OPERATIONS & PRODUCT STUDIO
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

app.get('/api/admin/stats', authAdmin, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenueAgg = await Order.aggregate([
      { $match: { payment_status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await User.countDocuments();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyRevenue = await Order.aggregate([
      { $match: { payment_status: 'Paid', created_at: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
          revenue: { $sum: "$total_amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ totalRevenue, totalOrders, totalProducts, totalCustomers, dailyRevenue });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const {
      name, short_description, description, category, tags, sku,
      original_price, sale_price, images, delivery_type,
      features, whats_included, specifications, faqs, featured, deal, status
    } = req.body;

    const orig = Number(original_price) || Number(sale_price) || 0;
    const sale = Number(sale_price) || 0;
    const discount = orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0;

    const product = await Product.create({
      name,
      short_description,
      description,
      category,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      sku: sku || 'SKU-' + Date.now(),
      original_price: orig,
      sale_price: sale,
      discount_percentage: discount,
      images: images && images.length ? images : ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'],
      delivery_type,
      features: Array.isArray(features) ? features : [],
      whats_included: Array.isArray(whats_included) ? whats_included : [],
      specifications: Array.isArray(specifications) ? specifications : [],
      faqs: Array.isArray(faqs) ? faqs : [],
      status: status || 'active',
      featured: !!featured,
      deal: !!deal
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Product
app.put('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    const {
      name, short_description, description, category, tags, sku,
      original_price, sale_price, images, delivery_type,
      features, whats_included, specifications, faqs, featured, deal, status
    } = req.body;

    const orig = Number(original_price) || Number(sale_price) || 0;
    const sale = Number(sale_price) || 0;
    const discount = orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0;

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        short_description,
        description,
        category,
        tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
        sku,
        original_price: orig,
        sale_price: sale,
        discount_percentage: discount,
        images,
        delivery_type,
        features,
        whats_included,
        specifications,
        faqs,
        featured: !!featured,
        deal: !!deal,
        status: status || 'active',
        updated_at: new Date()
      },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Duplicate Product Endpoint
app.post('/api/admin/products/:id/duplicate', authAdmin, async (req, res) => {
  try {
    const original = await Product.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Original product not found' });

    const cloneData = original.toObject();
    delete cloneData._id;
    delete cloneData.created_at;
    delete cloneData.updated_at;

    cloneData.name = `${original.name} (Copy)`;
    cloneData.sku = `${original.sku}-COPY-${Math.floor(Math.random() * 1000)}`;
    cloneData.status = 'draft';
    cloneData.sales_count = 0;

    const newProduct = await Product.create(cloneData);
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Status (Enable/Disable)
app.patch('/api/admin/products/:id/toggle-status', authAdmin, async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    p.status = p.status === 'active' ? 'disabled' : 'active';
    await p.save();
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Product
app.delete('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    await InventoryItem.deleteMany({ product_id: req.params.id });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory stock attachment
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
// DATABASE LAUNCH
// ----------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✓ Successfully connected to MongoDB Atlas Cloud Database');
    await initializeSystem();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`✓ NEXUS Digital Engine running on port ${PORT}`));
  })
  .catch(err => console.error('✕ Failed to connect to MongoDB Atlas:', err.message));
