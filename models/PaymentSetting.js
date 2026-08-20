const mongoose = require('mongoose');
const PaymentSettingsSchema = new mongoose.Schema({
  upi_id: { type: String, default: 'merchant@okaxis' },
  upi_name: { type: String, default: 'Nexus Pay' },
  upi_instructions: { type: String, default: 'Pay via any UPI App and upload screenshot.' },
  qr_image: { type: String, default: '' },
  crypto_wallet_address: { type: String, default: '' }
});
module.exports = mongoose.models.PaymentSettings || mongoose.model('PaymentSettings', PaymentSettingsSchema);
