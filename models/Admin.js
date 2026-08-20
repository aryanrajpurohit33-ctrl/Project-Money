const mongoose = require('mongoose');
const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  last_login: { type: Date, default: Date.now }
});
module.exports = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
