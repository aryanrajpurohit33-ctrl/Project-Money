const express = require('express');
const router = express.Router();
const PaymentSettings = require('../models/PaymentSetting');
const { authAdmin } = require('../middleware/auth');

router.get(['/payment-settings', '/admin/payment-settings'], async (req, res) => {
  try {
    let ps = await PaymentSettings.findOne().lean();
    if (!ps) ps = await PaymentSettings.create({});
    res.json(ps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/payment-settings', authAdmin, async (req, res) => {
  try {
    let ps = await PaymentSettings.findOne();
    if (!ps) ps = new PaymentSettings(req.body);
    else Object.assign(ps, req.body);
    await ps.save();
    res.json(ps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
