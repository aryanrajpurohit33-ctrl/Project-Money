const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { authAdmin } = require('../middleware/auth');

router.get(['/products', '/admin/products'], async (req, res) => {
  try {
    // Fast projected query
    const products = await Product.find({ status: { $ne: 'archived' } })
      .select('name slug category original_price sale_price discount_percentage images status is_featured unlimited_stock stock_quantity')
      .sort({ created_at: -1 })
      .lean();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    let p = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) p = await Product.findById(req.params.id).lean();
    if (!p) p = await Product.findOne({ slug: req.params.id }).lean();
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json({ ...p, in_stock: p.unlimited_stock || p.stock_quantity > 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/products', authAdmin, async (req, res) => {
  try {
    const { name, original_price, sale_price, description, status, delivery_type, images, subscription_pricing, custom_instructions, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name required' });

    const orig = Number(original_price) || 999;
    const sale = Number(sale_price) || 499;
    const disc = orig > sale ? Math.round(((orig - sale) / orig) * 100) : 0;

    let baseSlug = (name || 'prod').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await Product.findOne({ slug })) slug = `${baseSlug}-${counter++}`;

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

router.put('/admin/products/:id', authAdmin, async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(p);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/admin/products/:id', authAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
