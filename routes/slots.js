const express = require('express');
const router = express.Router();
const InventorySlot = require('../models/InventorySlot');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const { authAdmin } = require('../middleware/auth');

// Get all inventory slots
router.get('/admin/slots', authAdmin, async (req, res) => {
  try {
    const slots = await InventorySlot.find().sort({ created_at: -1 }).lean();
    res.json({ slots });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create new slot
router.post('/admin/slots', authAdmin, async (req, res) => {
  try {
    const { product_id, product_name, account_label, email, password, profile_number, pin, max_active_users, status } = req.body;
    if (!email) return res.status(400).json({ error: 'Account email is required' });

    const slot = await InventorySlot.create({
      product_id: product_id || null,
      product_name: product_name || 'Master Account',
      account_label: account_label || 'Slot 1',
      email: email.trim(),
      password: password || '',
      profile_number: Number(profile_number) || 1,
      pin: pin || '',
      max_active_users: Number(max_active_users) || 1,
      status: status || 'AVAILABLE'
    });

    res.status(201).json(slot);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Edit Slot & Cascade Sync Credentials to Subscriptions
router.put('/admin/slots/:id', authAdmin, async (req, res) => {
  try {
    const { email, password, pin, profile_number, account_label, max_active_users, status } = req.body;
    
    const updatedSlot = await InventorySlot.findByIdAndUpdate(
      req.params.id,
      {
        ...(email && { email: email.trim() }),
        ...(password !== undefined && { password }),
        ...(pin !== undefined && { pin }),
        ...(profile_number !== undefined && { profile_number: Number(profile_number) }),
        ...(account_label && { account_label }),
        ...(max_active_users !== undefined && { max_active_users: Number(max_active_users) }),
        ...(status && { status })
      },
      { new: true }
    );

    if (!updatedSlot) return res.status(404).json({ error: 'Slot not found' });

    // CASCADE SYNC: Update all customer subscriptions assigned to this slot
    await Subscription.updateMany(
      { assigned_slot_id: updatedSlot._id },
      {
        $set: {
          'credentials.account_email': updatedSlot.email,
          'credentials.account_password': updatedSlot.password,
          'credentials.pin': updatedSlot.pin,
          'credentials.profile_number': updatedSlot.profile_number
        }
      }
    );

    res.json({ success: true, slot: updatedSlot });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete Slot
router.delete('/admin/slots/:id', authAdmin, async (req, res) => {
  try {
    await InventorySlot.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
