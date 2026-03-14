/**
 * Authentication Middleware
 * Protects routes using JWT from cookies or Authorization header.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/environment');

/**
 * Protect routes - requires valid JWT
 */
const protect = async (req, res, next) => {
  let token = null;

  // Check for token in cookie first (httpOnly cookie)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // Fallback to Authorization header
  else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. Please login.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Optional auth - attaches user if token present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  let token = null;
  if (req.cookies?.token) token = req.cookies.token;
  else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user) req.user = user;
  } catch (_) {
    // Ignore invalid token for optional auth
  }
  next();
};

module.exports = { protect, optionalAuth };
