const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const InventorySlot = require('../models/InventorySlot');
const { authAdmin } = require('../middleware/auth');

function calculateExpiryDate(productName) {
  const name = (productName || '').toLowerCase();
  const date = new Date();
  if (name.includes('1 year') || name.includes('12 month') || name.includes('1_year')) {
    date.setFullYear(date.getFullYear() + 1);
  } else if (name.includes('6 month') || name.includes('6_month')) {
    date.setMonth(date.getMonth() + 6);
  } else if (name.includes('3 month') || name.includes('3_month')) {
    date.setMonth(date.getMonth() + 3);
  } else {
    date.setMonth(date.getMonth() + 1); // Default 1 Month
  }
  return date;
}

// Get all transactions
router.get('/admin/transactions', authAdmin, async (req, res) => {
  try {
    const txns = await Transaction.find().sort({ created_at: -1 }).lean();
    res.json(txns);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Confirm & Verify Transaction with Explicit Slot Assignment
router.post('/admin/transactions/:id/verify', authAdmin, async (req, res) => {
  try {
    const { assigned_slots } = req.body;
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    txn.status = 'SUCCESS';
    txn.rejection_reason = '';
    await txn.save();

    if (Array.isArray(assigned_slots) && assigned_slots.length > 0) {
      for (const item of assigned_slots) {
        if (!item.slot_id) continue;
        const slot = await InventorySlot.findById(item.slot_id);
        if (slot) {
          slot.status = 'ASSIGNED';
          slot.assigned_to = txn.customer_email || txn.customer_name;
          await slot.save();

          const prodTitle = item.product_name || slot.product_name || txn.product_name;
          const expiryDate = calculateExpiryDate(prodTitle);

          await Subscription.create({
            order_id: txn._id,
            product_id: slot.product_id || null,
            assigned_slot_id: slot._id,
            customer_name: txn.customer_name,
            customer_email: txn.customer_email,
            product_name: prodTitle,
            plan_duration: prodTitle,
            expires_at: expiryDate,
            expiry_date: expiryDate,
            status: 'ACTIVE',
            credentials: {
              account_email: slot.email,
              account_password: slot.password,
              profile_number: slot.profile_number,
              pin: slot.pin
            }
          });
        }
      }
    }

    res.json({ success: true, transaction: txn });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Reject Transaction
router.post('/admin/transactions/:id/reject', authAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const txn = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        status: 'REJECTED',
        rejection_reason: reason || 'Payment verification failed.'
      },
      { new: true }
    );
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ success: true, transaction: txn });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
