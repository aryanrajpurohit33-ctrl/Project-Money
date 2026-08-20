const mongoose = require('mongoose');
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
module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
