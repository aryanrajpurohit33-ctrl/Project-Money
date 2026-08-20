require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');

const connectDB = require('./config/db');
const startSelfKeepAlive = require('./services/keepAlive');

const app = express();

// Global Middleware
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Assets Caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true
}));

// API Cache-Control & Content Type Headers
app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=30');
  }
  next();
});

// Uptime Check
app.get('/api/ping', (req, res) => res.json({ status: 'ok', time: Date.now() }));

// Modular Route Mounts
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/products'));
app.use('/api', require('./routes/transactions'));
app.use('/api', require('./routes/subscriptions'));
app.use('/api', require('./routes/slots'));
app.use('/api', require('./routes/customers'));
app.use('/api', require('./routes/paymentSettings'));
app.use('/api', require('./routes/system'));
app.use('/api', require('./routes/store'));

app.use('/api/*', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

// Single Page Application Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Database & Server Bootstrap
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✓ NEXUS Digital Engine running on port ${PORT}`);
    startSelfKeepAlive();
  });
});
