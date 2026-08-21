const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authAdmin } = require('../middleware/auth');

// Public: Get all published products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ created_at: -1 }).lean();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public: Get single product details
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (e) {
    res.status(404).json({ error: 'Invalid product ID' });
  }
});

// Admin: Create product with multiple images
router.post('/admin/products', authAdmin, async (req, res) => {
  try {
    const {
      name, category, brand, short_description, description,
      customer_instructions, original_price, sale_price,
      subscription_pricing, images, is_featured, stock_quantity, status
    } = req.body;

    const imgArray = Array.isArray(images) ? images.filter(Boolean) : (req.body.image ? [req.body.image] : []);

    const product = await Product.create({
      name,
      category: category || 'OTT',
      brand: brand || 'Nexus Digital',
      short_description: short_description || '',
      description: description || '',
      customer_instructions: customer_instructions || 'Never share your password.',
      original_price: Number(original_price) || 999,
      sale_price: Number(sale_price) || 499,
      subscription_pricing: subscription_pricing || {},
      images: imgArray,
      is_featured: Boolean(is_featured),
      stock_quantity: Number(stock_quantity) || 100,
      status: status || 'PUBLISHED'
    });

    res.status(201).json(product);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: Update product
router.put('/admin/products/:id', authAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.images && Array.isArray(data.images)) {
      data.images = data.images.filter(Boolean);
    }
    if (data.original_price) data.original_price = Number(data.original_price);
    if (data.sale_price) data.sale_price = Number(data.sale_price);

    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: Delete product
router.delete('/admin/products/:id', authAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
