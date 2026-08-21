const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const InventorySlot = require('../models/InventorySlot');

router.get('/orders', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json([]);

    const txns = await Transaction.find({ customer_email: email.toLowerCase().trim() })
      .sort({ created_at: -1 })
      .lean();

    const enrichedOrders = await Promise.all(txns.map(async (t) => {
      // Find associated subscription
      const sub = await Subscription.findOne({ 
        $or: [{ order_id: t._id }, { customer_email: t.customer_email, product_name: t.product_name }]
      }).populate('assigned_slot_id').lean();

      let creds = null;
      if (sub) {
        if (sub.assigned_slot_id) {
          // Pull directly from latest slot state
          creds = {
            email: sub.assigned_slot_id.email,
            password: sub.assigned_slot_id.password,
            profile_pin: sub.assigned_slot_id.pin,
            profile_number: sub.assigned_slot_id.profile_number
          };
        } else if (sub.credentials) {
          creds = {
            email: sub.credentials.account_email,
            password: sub.credentials.account_password,
            profile_pin: sub.credentials.pin,
            profile_number: sub.credentials.profile_number
          };
        }
      }

      return {
        ...t,
        credentials: creds
      };
    }));

    res.json(enrichedOrders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
