require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ... [Keep existing Schemas: Admin, User, Product, InventorySlot, Subscription, Transaction, Order, PaymentSettings] ...
// (Ensure your server.js contains the full schemas from previous steps, only updated dashboard endpoint below)

app.get('/api/admin/dashboard/full-overview', authAdmin, async (req, res) => {
  try {
    const { range } = req.query; // e.g., 'today', '7d', '30d'
    const now = new Date();
    let startDate = new Date();
    
    if (range === 'today') startDate.setHours(0,0,0,0);
    else if (range === '7d') startDate.setDate(now.getDate() - 7);
    else if (range === '30d') startDate.setDate(now.getDate() - 30);
    else startDate = new Date(0); // All time

    const [salesAgg, totalOrdersCount, totalSubs, allSlots] = await Promise.all([
      Order.aggregate([
        { $match: { payment_status: 'Paid', created_at: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 } } }
      ]),
      Order.countDocuments({ payment_status: 'Paid', created_at: { $gte: startDate } }),
      Subscription.find(),
      InventorySlot.find()
    ]);

    const stats = {
      revenue: salesAgg[0]?.total || 0,
      orders: totalOrdersCount,
      customers: await User.countDocuments({ created_at: { $gte: startDate } }),
      active_subs: totalSubs.filter(s => s.status === 'ACTIVE' && s.expires_at > now).length,
      recent_txns: await Transaction.find().sort({ created_at: -1 }).limit(5),
      recent_orders: await Order.find().sort({ created_at: -1 }).limit(5),
      slot_stats: {
        total: allSlots.length,
        available: allSlots.filter(s => s.status === 'AVAILABLE').length,
        assigned: allSlots.filter(s => s.status === 'ASSIGNED').length,
        full: allSlots.filter(s => s.status === 'FULL').length
      }
    };
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ... [Keep other APIs] ...
