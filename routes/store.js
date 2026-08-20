const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

router.post(['/checkout', '/checkout/initiate-order'], async (req, res) => {
  try {
    const { txn_id, customer_name, customer_email, product_name, product_id, amount, payment_method, proof_screenshot, user_id } = req.body;
    const finalTxnId = txn_id || 'TXN-' + Math.floor(100000 + Math.random() * 900000);

    const txn = await Transaction.create({
      txn_id: finalTxnId,
      customer_name: customer_name || 'Customer',
      customer_email: customer_email || '',
      user_id: user_id || null,
      product_name: product_name || 'Digital Item',
      product_id: product_id || '',
      amount: Number(amount) || 499,
      payment_method: payment_method || 'UPI',
      proof_screenshot: proof_screenshot || '',
      status: 'PROCESSING'
    });

    res.status(201).json({ success: true, txn_id: finalTxnId, txn });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get(['/orders', '/customer/orders'], async (req, res) => {
  try {
    const email = (req.query.email || '').trim();
    if (!email) return res.json([]);

    const orders = await Transaction.find({
      $or: [
        { customer_email: email },
        { customer_name: email }
      ]
    }).sort({ created_at: -1 }).lean();

    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
