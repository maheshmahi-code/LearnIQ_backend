/**
 * Gamification Controller
 * XP, streaks, leaderboard.
 */

const xpEngineService = require('../services/xpEngineService');
const User = require('../models/User');
const UserXP = require('../models/UserXP');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    let uxp = await UserXP.findOne({ studentId: req.user.id });
    if (!uxp) {
      uxp = new UserXP({ studentId: req.user.id });
      await uxp.save();
    }
    res.json({
      success: true,
      profile: {
        xpPoints: uxp.totalXP,
        level: uxp.level,
        currentStreak: uxp.currentStreak,
        longestStreak: uxp.longestStreak,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const awardXP = async (req, res) => {
  try {
    const { action } = req.body;
    const result = await xpEngineService.awardXP(req.user.id, action);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const leaderboard = await xpEngineService.getLeaderboard(limit);
    res.json({ success: true, leaderboard });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getProfile, awardXP, getLeaderboard };
