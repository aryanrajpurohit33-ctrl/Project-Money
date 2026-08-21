const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const InventorySlot = require('../models/InventorySlot');
const { authAdmin } = require('../middleware/auth');

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
    const { assigned_slots } = req.body; // Array of { product_name, slot_id } or single slot_id
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    txn.status = 'SUCCESS';
    txn.rejection_reason = '';
    await txn.save();

    // Process Slot Assignments
    if (Array.isArray(assigned_slots) && assigned_slots.length > 0) {
      for (const item of assigned_slots) {
        if (!item.slot_id) continue;
        const slot = await InventorySlot.findById(item.slot_id);
        if (slot) {
          slot.status = 'ASSIGNED';
          slot.assigned_to = txn.customer_email || txn.customer_name;
          await slot.save();

          // Create or update subscription record
          await Subscription.create({
            order_id: txn._id,
            product_id: slot.product_id || null,
            assigned_slot_id: slot._id,
            customer_name: txn.customer_name,
            customer_email: txn.customer_email,
            product_name: item.product_name || slot.product_name || txn.product_name,
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
    } else if (req.body.slot_id) {
      // Fallback single slot assignment
      const slot = await InventorySlot.findById(req.body.slot_id);
      if (slot) {
        slot.status = 'ASSIGNED';
        slot.assigned_to = txn.customer_email || txn.customer_name;
        await slot.save();

        await Subscription.create({
          order_id: txn._id,
          product_id: slot.product_id || null,
          assigned_slot_id: slot._id,
          customer_name: txn.customer_name,
          customer_email: txn.customer_email,
          product_name: txn.product_name,
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

    res.json({ success: true, transaction: txn });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Reject Transaction with Reason
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
