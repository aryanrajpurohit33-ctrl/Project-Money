const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const { authAdmin } = require('../middleware/auth');

router.get('/admin/transactions', authAdmin, async (req, res) => {
  try {
    res.json(await Transaction.find().sort({ created_at: -1 }).lean());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/transactions/:id/verify', authAdmin, async (req, res) => {
  try {
    const txn = await Transaction.findByIdAndUpdate(req.params.id, { status: 'SUCCESS' }, { new: true });

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    await Subscription.create({
      customer_name: txn.customer_name,
      customer_email: txn.customer_email || `${txn.customer_name.toLowerCase()}@nexus.internal`,
      product_name: txn.product_name,
      plan_duration: '1_MONTH',
      start_date: new Date(),
      expires_at: expiry,
      expiry_date: expiry,
      status: 'ACTIVE'
    });

    res.json(txn);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/transactions/:id/reject', authAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const txn = await Transaction.findByIdAndUpdate(
      req.params.id, 
      { status: 'REJECTED', rejection_reason: reason || 'Invalid Payment Proof' }, 
      { new: true }
    );
    res.json(txn);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
