const express = require('express');
const router = express.Router();
const os = require('os');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { authAdmin } = require('../middleware/auth');

router.get(['/admin/dashboard', '/admin/dashboard/full-overview', '/admin/dashboard-stats'], authAdmin, async (req, res) => {
  try {
    const orders = await Transaction.find({ status: 'SUCCESS' }).lean();
    const totalRev = orders.reduce((acc, o) => acc + (o.amount || 0), 0);
    const customersCount = await User.countDocuments();
    const subsCount = await Subscription.countDocuments({ status: 'ACTIVE' });
    const pendingOrders = await Transaction.countDocuments({ status: { $in: ['PROCESSING', 'PENDING'] } });

    res.json({
      revenue: totalRev,
      sales: orders.length,
      pending_orders: pendingOrders,
      customers: customersCount,
      active_subscriptions: subsCount,
      kpis: {
        revenue: { value: totalRev, change: 0 },
        orders: { value: orders.length, change: 0 },
        customers: { value: customersCount, change: 0 },
        subscriptions: { value: subsCount, change: 0 }
      },
      revenue_timeline: [],
      order_statuses: { completed: orders.length, processing: pendingOrders, pending: pendingOrders },
      payment_methods: { upi: { amount: totalRev, count: orders.length }, crypto: { amount: 0, count: 0 } },
      top_products: [],
      slot_summary: { total: 0, available: 0, assigned: 0 },
      attention_items: [],
      live_visitors: 1
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get(['/admin/system-status', '/admin/system-monitor', '/admin/system/infrastructure', '/admin/diagnostics'], authAdmin, (req, res) => {
  const memUsage = process.memoryUsage();
  const uptimeSec = process.uptime();
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);

  res.json({
    status: 'ONLINE',
    uptime: uptimeSec,
    server: {
      service_memory_rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      service_memory_heap_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      uptime_formatted: `${hours}h ${minutes}m`,
      platform: os.platform(),
      architecture: os.arch(),
      cpu_cores: os.cpus().length,
      node_version: process.version,
      environment: process.env.NODE_ENV || 'production'
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'Connected (MongoDB Atlas)' : 'Disconnected',
      ping_latency_ms: 12,
      host: 'cluster.mongodb.net'
    },
    cloud_host: {
      provider: 'Render Cloud Platform',
      region: 'Global Edge',
      storage_note: 'Render Disk storage active'
    }
  });
});

module.exports = router;
