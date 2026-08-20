const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authAdmin } = require('../middleware/auth');

router.get(['/admin/customers', '/admin/customers/list'], authAdmin, async (req, res) => {
  try {
    res.json(await User.find().select('-password_hash').sort({ created_at: -1 }).lean());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
