const mongoose = require('mongoose');
const TransactionSchema = new mongoose.Schema({
  txn_id: { type: String, required: true, unique: true },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer_name: { type: String, required: true },
  customer_email: { type: String, default: '' },
  product_name: { type: String, required: true },
  product_id: { type: String },
  amount: { type: Number, required: true },
  payment_method: { type: String, default: 'UPI' },
  proof_screenshot: { type: String, default: '' },
  rejection_reason: { type: String, default: '' },
  status: { type: String, default: 'PROCESSING' },
  created_at: { type: Date, default: Date.now }
});
module.exports = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
