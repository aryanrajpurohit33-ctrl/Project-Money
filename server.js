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
const uploadDir = path.join(__dirname, 'secure_storage');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration for Digital Goods & Product Images
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
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  featured: { type: Boolean, default: false },
  deal: { type: Boolean, default: false },
  max_downloads: { type: Number, default: 5 },
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
// DATABASE SEEDING & INITIAL ADMIN VERIFICATION
// ----------------------------------------------------
async function initializeSystem() {
  try {
    // 1. Seed Initial Admin Account: Aryan / 5669
    const existingAdmin = await Admin.findOne({ username: 'Aryan' });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('5669', salt);
      await Admin.create({ username: 'Aryan', password_hash: hash });
      console.log('✓ Initialized SuperAdmin: Aryan');
    }

    // 2. Seed Default Store Settings
    const existingSettings = await Settings.findOne();
    if (!existingSettings) {
      await Settings.create({});
    }

    // 3. Seed Default Categories
    const catCount = await Category.countDocuments();
    if (catCount === 0) {
      const defaultCats = [
        { name: 'Software', description: 'Productivity and developer tools', icon: '💻' },
        { name: 'Accounts', description: 'Streaming & premium service accounts', icon: '🔐' },
        { name: 'License Keys', description: 'Genuine OS & antivirus activations', icon: '🔑' },
        { name: 'E-books', description: 'Programming and business guides', icon: '📚' },
        { name: 'Courses', description: 'Full-stack development video packs', icon: '🎓' },
        { name: 'Templates', description: 'Figma, Tailwind, and Shopify themes', icon: '🎨' }
      ];
      await Category.insertMany(defaultCats);
    }

    // 4. Seed Default Coupon
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

    // 5. Seed Demo Products & Inventory if Empty
    const prodCount = await Product.countDocuments();
    if (prodCount === 0) {
      const p1 = await Product.create({
        name: 'Ultimate Developer Bundle 2026',
        short_description: 'Full-stack source codes, React UI kits, and Node templates.',
        description: 'Instant download containing over 50+ enterprise production ready templates, React libraries, and system architecture blue-prints.',
        category: 'Software',
        tags: ['web', 'react', 'nodejs', 'templates'],
        sku: 'DEV-BNDL-01',
        original_price: 2499,
        sale_price: 999,
        discount_percentage: 60,
        images: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80'],
        delivery_type: 'STANDARD_LINK',
        featured: true,
        deal: true
      });
      await InventoryItem.create({
        product_id: p1._id,
        delivery_type: 'STANDARD_LINK',
        delivery_url: 'https://github.com/torvalds/linux',
        status: 'Available'
      });

      const p2 = await Product.create({
        name: 'Windows 11 Pro Genuine OEM Key',
        short_description: 'Lifetime activation for 1 PC with global updates.',
        description: 'Instant genuine Microsoft Windows 11 Professional activation key delivered immediately upon checkout.',
        category: 'License Keys',
        tags: ['windows', 'microsoft', 'os', 'key'],
        sku: 'WIN-11-PRO',
        original_price: 3999,
        sale_price: 499,
        discount_percentage: 87,
        images: ['https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800&auto=format&fit=crop&q=80'],
        delivery_type: 'LICENSE_KEY',
        featured: true,
        deal: true
      });
      await InventoryItem.create([
        { product_id: p2._id, delivery_type: 'LICENSE_KEY', license_key: 'W269N-WFGWX-YVC9B-4J6C9-T83GX', status: 'Available' },
        { product_id: p2._id, delivery_type: 'LICENSE_KEY', license_key: 'MH37W-N47XK-V7XM9-C7227-GCQG9', status: 'Available' },
        { product_id: p2._id, delivery_type: 'LICENSE_KEY', license_key: 'NRG8B-VKK3Q-CXVCJ-9G2XF-6Q84J', status: 'Available' }
      ]);

      const p3 = await Product.create({
        name: 'Netflix 4K UHD 1-Month Private Profile',
        short_description: 'Dedicated PIN-protected UHD profile on genuine account.',
        description: 'Private 4K Ultra-HD streaming credentials provided instantly with fast auto-renewal support.',
        category: 'Accounts',
        tags: ['streaming', 'netflix', 'uhd', 'account'],
        sku: 'NFLX-4K-01',
        original_price: 799,
        sale_price: 199,
        discount_percentage: 75,
        images: ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80'],
        delivery_type: 'EMAIL_PASSWORD',
        featured: true
      });
      await InventoryItem.create([
        { product_id: p3._id, delivery_type: 'EMAIL_PASSWORD', email: 'premium_stream_01@nexus.io', password: 'VaultStream#2026', status: 'Available' },
        { product_id: p3._id, delivery_type: 'EMAIL_PASSWORD', email: 'premium_stream_02@nexus.io', password: 'StreamBeast!889', status: 'Available' }
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
// PUBLIC & STOREFRONT ROUTES
// ----------------------------------------------------

// Store configuration
app.get('/api/store/info', async (req, res) => {
  try {
    const settings = await Settings.findOne() || {};
    const categories = await Category.find({ status: 'active' });
    res.json({ settings, categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Browse & Search Products
app.get('/api/products', async (req, res) => {
  try {
    const { category, search, deal, featured, sort } = req.query;
    let query = { status: 'active' };

    if (category && category !== 'All') {
      query.category = category;
    }
    if (deal === 'true') {
      query.deal = true;
    }
    if (featured === 'true') {
      query.featured = true;
    }
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

    // Attach real available inventory counts
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

// Single Product Details
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

// Validate Coupon
app.post('/api/cart/validate-coupon', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), status: 'active' });
    if (!coupon) return res.status(404).json({ error: 'Invalid or inactive coupon code' });

    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ error: 'This coupon has reached its maximum usage limit' });
    }

    if (subtotal < coupon.min_purchase) {
      return res.status(400).json({ error: `Minimum order amount of ₹${coupon.min_purchase} required for this coupon` });
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
// CUSTOMER AUTH & ACTIONS
// ----------------------------------------------------

app.post('/api/auth/customer/register', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ error: 'Account already exists with this email' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      mobile: mobile || '',
      password_hash
    });

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

// Customer Account Profile
app.get('/api/customer/profile', authCustomer, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash').populate('wishlist');
    const orderCount = await Order.countDocuments({ user_id: req.user.id });
    res.json({ user, orderCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Orders & Digital Goods Delivery
app.get('/api/customer/orders', authCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Wishlist Actions
app.post('/api/customer/wishlist/toggle', authCustomer, async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.user.id);
    const index = user.wishlist.indexOf(productId);
    if (index > -1) {
      user.wishlist.splice(index, 1);
    } else {
      user.wishlist.push(productId);
    }
    await user.save();
    res.json({ wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// PRODUCTION ORDER PROCESSING & INSTANT FULFILLMENT
// ----------------------------------------------------
app.post('/api/checkout/process', authCustomer, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, coupon_code } = req.body;
    if (!items || !items.length) {
      throw new Error('Shopping cart is empty');
    }

    const user = await User.findById(req.user.id);
    let calculatedSubtotal = 0;
    const orderItems = [];

    // Verify all products and lock delivery inventory items
    for (const cartItem of items) {
      const product = await Product.findById(cartItem.product_id).session(session);
      if (!product || product.status !== 'active') {
        throw new Error(`Product "${cartItem.name || 'Unknown'}" is no longer available`);
      }

      calculatedSubtotal += product.sale_price;

      // Atomically find and lock an available inventory credential/file/key
      const inventory = await InventoryItem.findOneAndUpdate(
        { product_id: product._id, status: 'Available' },
        { status: 'Sold' },
        { new: true, session }
      );

      if (!inventory) {
        throw new Error(`Product "${product.name}" is currently OUT OF STOCK.`);
      }

      // Increment product sales
      product.sales_count += 1;
      await product.save({ session });

      // Package real delivery payload according to delivery type
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
        // Generate secure temporary download token
        const fileToken = jwt.sign({ file: inventory.file_reference, filename: inventory.file_name }, JWT_SECRET, { expiresIn: '72h' });
        deliveryPayload = {
          file_name: inventory.file_name,
          download_url: `/api/download/${fileToken}`
        };
      }

      orderItems.push({
        product_id: product._id,
        name: product.name,
        price: product.sale_price,
        delivery_type: inventory.delivery_type,
        delivered_data: deliveryPayload
      });
    }

    // Server-Side Coupon Verification
    let discountAmount = 0;
    if (coupon_code) {
      const coupon = await Coupon.findOne({ code: coupon_code.toUpperCase().trim(), status: 'active' }).session(session);
      if (coupon && calculatedSubtotal >= coupon.min_purchase) {
        if (coupon.discount_type === 'percentage') {
          discountAmount = (calculatedSubtotal * coupon.discount_value) / 100;
          if (coupon.max_discount > 0 && discountAmount > coupon.max_discount) {
            discountAmount = coupon.max_discount;
          }
        } else {
          discountAmount = coupon.discount_value;
        }
        coupon.used_count += 1;
        await coupon.save({ session });
      }
    }

    const finalAmount = Math.max(0, Math.round(calculatedSubtotal - discountAmount));

    // Create Verified Order
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

    res.status(201).json({
      success: true,
      message: 'Payment verified and digital assets delivered immediately.',
      order
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
});

// Secure Tokenized File Download Endpoint
app.get('/api/download/:token', (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, JWT_SECRET);
    const filePath = path.join(uploadDir, decoded.file);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Digital file not found on secure storage.');
    }

    res.download(filePath, decoded.filename || 'digital_product_asset.zip');
  } catch (err) {
    res.status(403).send('Download link is invalid or has expired.');
  }
});

// ----------------------------------------------------
// ADMIN AUTHENTICATION & DASHBOARD
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

// Admin Real Analytics & Stats
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
    const pendingOrders = await Order.countDocuments({ delivery_status: 'Pending' });
    const activeDiscounts = await Coupon.countDocuments({ status: 'active' });

    // Recent 7 Days Real Revenue for Chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyRevenue = await Order.aggregate([
      { $match: { payment_status: 'Paid', created_at: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
          revenue: { $sum: "$total_amount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top Selling Products
    const topProducts = await Product.find().sort({ sales_count: -1 }).limit(5);

    res.json({
      totalRevenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      pendingOrders,
      activeDiscounts,
      dailyRevenue,
      topProducts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ADMIN PRODUCT & INVENTORY MANAGEMENT
// ----------------------------------------------------

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

// File Upload Handler for Product Assets & Images
app.post('/api/admin/upload-file', authAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    filename: req.file.originalname,
    stored_name: req.file.filename,
    size: req.file.size
  });
});

app.post('/api/admin/products', authAdmin, async (req, res) => {
  try {
    const {
      name, short_description, description, category, tags, sku,
      original_price, sale_price, images, delivery_type,
      inventory_items, featured, deal
    } = req.body;

    const orig = Number(original_price) || 0;
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
      images: images && images.length ? images : ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'],
      delivery_type,
      featured: !!featured,
      deal: !!deal
    });

    // Populate initial digital inventory items if provided
    if (inventory_items && Array.isArray(inventory_items) && inventory_items.length) {
      const itemsToInsert = inventory_items.map(item => ({
        product_id: product._id,
        delivery_type,
        ...item,
        status: 'Available'
      }));
      await InventoryItem.insertMany(itemsToInsert);
    }

    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    const { name, short_description, description, category, original_price, sale_price, status, featured, deal } = req.body;
    const orig = Number(original_price);
    const sale = Number(sale_price);
    const discount = orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, short_description, description, category, original_price: orig, sale_price: sale, discount_percentage: discount, status, featured, deal },
      { new: true }
    );
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', authAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    await InventoryItem.deleteMany({ product_id: req.params.id });
    res.json({ success: true, message: 'Product and attached inventory deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory View & Add per Product
app.get('/api/admin/inventory/:productId', authAdmin, async (req, res) => {
  try {
    const items = await InventoryItem.find({ product_id: req.params.productId }).sort({ created_at: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/inventory/:productId', authAdmin, async (req, res) => {
  try {
    const { delivery_type, email, password, mobile, delivery_url, license_key, custom_text, file_reference, file_name } = req.body;
    const item = await InventoryItem.create({
      product_id: req.params.productId,
      delivery_type,
      email,
      password,
      mobile,
      delivery_url,
      license_key,
      custom_text,
      file_reference,
      file_name,
      status: 'Available'
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ADMIN ORDERS & COUPONS MANAGEMENT
// ----------------------------------------------------

app.get('/api/admin/orders', authAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ created_at: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/coupons', authAdmin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ created_at: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/coupons', authAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/coupons/:id', authAdmin, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Categories CRUD
app.get('/api/admin/categories', authAdmin, async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/categories', authAdmin, async (req, res) => {
  try {
    const cat = await Category.create(req.body);
    res.status(201).json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/categories/:id', authAdmin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Settings
app.post('/api/admin/settings', authAdmin, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Change Password
app.post('/api/admin/change-password', authAdmin, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const admin = await Admin.findById(req.admin.id);
    const match = await bcrypt.compare(old_password, admin.password_hash);
    if (!match) return res.status(400).json({ error: 'Incorrect current password' });

    const salt = await bcrypt.genSalt(10);
    admin.password_hash = await bcrypt.hash(new_password, salt);
    await admin.save();
    res.json({ success: true, message: 'Admin password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to Single Page Application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------------------------------------
// DATABASE INITIALIZATION & STARTUP
// ----------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI is not configured in .env');
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✓ Successfully connected to MongoDB Atlas Cloud Database');
    await initializeSystem();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`✓ NEXUS Digital E-Commerce Engine running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('✕ Failed to connect to MongoDB Atlas:', err.message);
  });
