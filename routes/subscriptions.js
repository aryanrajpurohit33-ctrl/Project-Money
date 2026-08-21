const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const InventorySlot = require('../models/InventorySlot');
const { authAdmin } = require('../middleware/auth');

// Helper: Auto-check and revoke expired subscriptions
async function checkAndRevokeExpiredSubscriptions() {
  const now = new Date();
  const expiredSubs = await Subscription.find({
    status: 'ACTIVE',
    expires_at: { $lte: now }
  });

  for (const sub of expiredSubs) {
    sub.status = 'EXPIRED';
    await sub.save();

    // Release slot back to available pool
    if (sub.assigned_slot_id) {
      await InventorySlot.findByIdAndUpdate(sub.assigned_slot_id, {
        status: 'AVAILABLE',
        assigned_to: ''
      });
    }
  }
}

// 1. Get All Subscriptions
router.get('/admin/subscriptions', authAdmin, async (req, res) => {
  try {
    await checkAndRevokeExpiredSubscriptions();

    const subs = await Subscription.find()
      .populate('assigned_slot_id')
      .sort({ created_at: -1 })
      .lean();

    res.json(subs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Edit / Update / Extend Subscription
router.put('/admin/subscriptions/:id', authAdmin, async (req, res) => {
  try {
    const { status, plan_duration, expires_at, slot_id } = req.body;
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    // Handle Manual Revocation or Expiry -> Free Up Slot
    if (status === 'EXPIRED' || status === 'REVOKED' || status === 'CANCELLED') {
      if (sub.assigned_slot_id) {
        await InventorySlot.findByIdAndUpdate(sub.assigned_slot_id, {
          status: 'AVAILABLE',
          assigned_to: ''
        });
      }
      sub.status = status;
    } else if (status === 'ACTIVE') {
      sub.status = 'ACTIVE';
    }

    if (plan_duration) sub.plan_duration = plan_duration;
    if (expires_at) sub.expires_at = new Date(expires_at);

    // If Admin switches to a new slot
    if (slot_id && String(sub.assigned_slot_id) !== String(slot_id)) {
      // Free old slot
      if (sub.assigned_slot_id) {
        await InventorySlot.findByIdAndUpdate(sub.assigned_slot_id, {
          status: 'AVAILABLE',
          assigned_to: ''
        });
      }
      // Assign new slot
      const newSlot = await InventorySlot.findById(slot_id);
      if (newSlot) {
        newSlot.status = 'ASSIGNED';
        newSlot.assigned_to = sub.customer_email || sub.customer_name;
        await newSlot.save();

        sub.assigned_slot_id = newSlot._id;
        sub.credentials = {
          account_email: newSlot.email,
          account_password: newSlot.password,
          profile_number: newSlot.profile_number,
          pin: newSlot.pin
        };
      }
    }

    await sub.save();
    res.json({ success: true, subscription: sub });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 3. Instant Slot Revoke Action Endpoint
router.post('/admin/subscriptions/:id/revoke', authAdmin, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (sub.assigned_slot_id) {
      await InventorySlot.findByIdAndUpdate(sub.assigned_slot_id, {
        status: 'AVAILABLE',
        assigned_to: ''
      });
      sub.assigned_slot_id = null;
    }

    sub.status = 'REVOKED';
    await sub.save();

    res.json({ success: true, message: 'Slot revoked and returned to available inventory.' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
