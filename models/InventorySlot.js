const mongoose = require('mongoose');
const InventorySlotSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  product_name: { type: String, default: '' },
  account_label: { type: String, default: 'Slot 1' },
  email: { type: String, required: true, trim: true },
  password: { type: String, default: '' },
  profile_number: { type: Number, default: 1 },
  pin: { type: String, default: '' },
  max_active_users: { type: Number, default: 1 },
  status: { type: String, enum: ['AVAILABLE', 'ASSIGNED', 'FULL', 'DISABLED'], default: 'AVAILABLE' },
  assigned_to: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});
module.exports = mongoose.models.InventorySlot || mongoose.model('InventorySlot', InventorySlotSchema);
