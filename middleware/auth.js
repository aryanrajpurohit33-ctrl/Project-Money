const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'nexus_digital_super_secret_jwt_2026_key';

function authAdmin(req, res, next) {
  const h = req.headers['authorization'];
  if (!h) return res.status(401).json({ error: 'Admin authorization required' });
  try {
    const decoded = jwt.verify(h.split(' ')[1], JWT_SECRET);
    if (decoded.role !== 'admin' && !decoded.isAdmin) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    req.admin = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired admin session' });
  }
}

function authCustomer(req, res, next) {
  const h = req.headers['authorization'];
  if (!h) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(h.split(' ')[1], JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid customer session' });
  }
}

module.exports = { authAdmin, authCustomer, JWT_SECRET };
