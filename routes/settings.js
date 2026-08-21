const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { authAdmin } = require('../middleware/auth');

// Public: Fetch store settings for checkout
router.get('/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne().lean();
    if (!settings) {
      settings = await Settings.create({
        merchant_upi: 'merchant@okaxis',
        upi_id: 'merchant@okaxis',
        upi_name: 'Nexus Digital Pay',
        upi_instructions: '1. Scan QR code or copy UPI ID.\n2. Pay the exact order amount.\n3. Take a screenshot of the completed payment.',
        upi_qr_image: ''
      });
    }
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: Update store payment settings
router.post('/settings', authAdmin, async (req, res) => {
  try {
    const data = req.body;
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(data);
    } else {
      settings = await Settings.findByIdAndUpdate(settings._id, data, { new: true });
    }
    res.json(settings);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
