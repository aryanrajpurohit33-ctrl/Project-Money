const express = require('express');
const router = express.Router();
const InventorySlot = require('../models/InventorySlot');
const { authAdmin } = require('../middleware/auth');

router.get('/admin/slots', authAdmin, async (req, res) => {
  try {
    const slots = await InventorySlot.find().populate('product_id', 'name').lean();
    res.json({ slots, stats: { total: slots.length, available: slots.filter(s => s.status === 'AVAILABLE').length, assigned: slots.filter(s => s.status === 'ASSIGNED').length, full: 0, disabled: 0 } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/slots', authAdmin, async (req, res) => {
  try {
    const slot = await InventorySlot.create(req.body);
    res.status(201).json(slot);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/admin/slots/:id', authAdmin, async (req, res) => {
  try {
    await InventorySlot.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
