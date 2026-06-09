/**
 * Auth Controller
 * Registration, login, Google OAuth, JWT handling.
 */

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/environment');
const xpEngineService = require('../services/xpEngineService');
const cache = require('../utils/cache');

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' is better for cross-domain
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const signToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const { name, email, password, role = 'student' } = req.body;
    const exists = await User.findOne({ email: email?.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }
    const user = await User.create({ name, email: email?.toLowerCase(), password, role });
    await cache.del('analytics:admin_overview');
    const token = signToken(user._id);
    res.cookie('token', token, cookieOptions);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        xpPoints: user.xpPoints,
        level: user.level,
        streakDays: user.streakDays,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Registration failed.' });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  // #region agent log
  const { _log } = require('../utils/debugLog');
  _log('authController.js:login:entry', 'Login attempt', { email: req.body?.email }, 'A');
  // #endregion
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    const streakResult = await xpEngineService.updateStreak(user._id);
    await xpEngineService.awardXP(user._id, 'daily_login');
    await User.findByIdAndUpdate(user._id, { lastActiveDate: new Date() });

    const token = signToken(user._id);
    res.cookie('token', token, cookieOptions);
    // #region agent log
    _log('authController.js:login:success', 'Login success', { userId: String(user._id) }, 'A');
    // #endregion
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        xpPoints: user.xpPoints,
        level: user.level,
        streakDays: user.streakDays,
      },
      streak: streakResult,
    });
  } catch (e) {
    // #region agent log
    _log('authController.js:login:error', 'Login error', { msg: e?.message }, 'A');
    // #endregion
    res.status(500).json({ success: false, message: e.message || 'Login failed.' });
  }
};

/**
 * POST /api/auth/google
 * Verify Google ID token and create/login user
 */
const googleAuth = async (req, res) => {
  try {
    const { idToken, name, email, avatar } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required.' });
    }
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId: idToken?.slice(0, 50) || null,
        role: 'student',
        avatar: avatar || '',
      });
      await cache.del('analytics:admin_overview');
    } else if (avatar && !user.avatar) {
      user.avatar = avatar;
      await user.save();
    }
    const streakResult = await xpEngineService.updateStreak(user._id);
    await xpEngineService.awardXP(user._id, 'daily_login');

    const token = signToken(user._id);
    res.cookie('token', token, cookieOptions);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        xpPoints: user.xpPoints,
        level: user.level,
        streakDays: user.streakDays,
      },
      streak: streakResult,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Google auth failed.' });
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  res.cookie('token', '', { ...cookieOptions, maxAge: 0 });
  res.json({ success: true });
};

module.exports = { register, login, googleAuth, getMe, logout };
