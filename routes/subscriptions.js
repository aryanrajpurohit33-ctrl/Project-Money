const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const { authAdmin } = require('../middleware/auth');

router.get(['/admin/subscriptions', '/admin/subscriptions/advanced'], authAdmin, async (req, res) => {
  try {
    res.json(await Subscription.find().sort({ start_date: -1 }).lean());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/subscriptions', authAdmin, async (req, res) => {
  try {
    const sub = await Subscription.create(req.body);
    res.status(201).json(sub);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/admin/subscriptions/:id', authAdmin, async (req, res) => {
  try {
    const updated = await Subscription.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/admin/subscriptions/:id', authAdmin, async (req, res) => {
  try {
    await Subscription.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
