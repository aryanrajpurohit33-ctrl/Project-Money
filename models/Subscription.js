const mongoose = require('mongoose');
const SubscriptionSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  assigned_slot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InventorySlot', default: null },
  customer_name: { type: String, default: '' },
  customer_email: { type: String, default: '' },
  product_name: { type: String, default: '' },
  plan_duration: { type: String, default: '1_MONTH' },
  duration: { type: String, default: '1_MONTH' },
  devices: { type: Number, default: 1 },
  start_date: { type: Date, default: Date.now },
  expires_at: { type: Date },
  expiry_date: { type: Date },
  status: { type: String, default: 'ACTIVE' },
  credentials: {
    account_email: { type: String, default: '' },
    account_password: { type: String, default: '' },
    profile_number: { type: Number, default: 1 },
    pin: { type: String, default: '' }
  },
  created_at: { type: Date, default: Date.now }
});
module.exports = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
