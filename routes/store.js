const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const InventorySlot = require('../models/InventorySlot');

// Checkout Endpoint
router.post(['/orders/checkout', '/checkout', '/orders', '/transactions/submit'], async (req, res) => {
  try {
    const { items, customer_name, customer_email, total_amount, amount, proof_screenshot, payment_method } = req.body;

    if (!proof_screenshot) {
      return res.status(400).json({ error: 'Please upload a payment screenshot proof' });
    }

    const payAmount = Number(total_amount ?? amount ?? 0);
    const itemList = Array.isArray(items) ? items : [];
    const productName = itemList.length > 0 
      ? itemList.map(i => i.name).join(', ')
      : (req.body.product_name || 'Digital Goods Subscription');

    const generatedTxnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);

    const txn = await Transaction.create({
      txn_id: generatedTxnId,
      customer_name: customer_name || 'Anonymous Customer',
      customer_email: (customer_email || '').toLowerCase().trim(),
      product_name: productName,
      amount: payAmount,
      payment_method: payment_method || 'UPI',
      proof_screenshot: proof_screenshot || '',
      status: 'PROCESSING',
      rejection_reason: ''
    });

    res.status(201).json({
      success: true,
      txn_id: txn.txn_id,
      order: txn
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Customer Vault Items Query
router.get('/orders', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json([]);

    const cleanEmail = email.toLowerCase().trim();
    const txns = await Transaction.find({ customer_email: cleanEmail })
      .sort({ created_at: -1 })
      .lean();

    const now = new Date();

    const enrichedOrders = await Promise.all(txns.map(async (t) => {
      const sub = await Subscription.findOne({ 
        $or: [{ order_id: t._id }, { customer_email: t.customer_email, product_name: t.product_name }]
      }).populate('assigned_slot_id').lean();

      let creds = null;
      let subStatus = sub ? sub.status : 'ACTIVE';

      // Check validity window
      if (sub && sub.expires_at && new Date(sub.expires_at) <= now) {
        subStatus = 'EXPIRED';
      }

      if (sub && subStatus === 'ACTIVE') {
        if (sub.assigned_slot_id && sub.assigned_slot_id.status !== 'DISABLED') {
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
        sub_status: subStatus,
        credentials: creds
      };
    }));

    res.json(enrichedOrders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
