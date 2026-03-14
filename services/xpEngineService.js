/**
 * XP Engine Service
 * Gamification: XP awards, streaks, badges.
 */

const User = require('../models/User');
const UserXP = require('../models/UserXP');

// XP rewards per action
const XP_REWARDS = {
  complete_lesson: 10,
  submit_assignment: 20,
  complete_quiz: 15,
  perfect_quiz: 30,
  daily_login: 5,
  week_streak: 50,
  community_help: 10,
  upload_flashcard: 15,
};

// XP needed per level (cumulative)
const xpForLevel = (level) => level * 100;

/**
 * Award XP for an action
 */
const awardXP = async (studentId, action, metadata = {}) => {
  const amount = XP_REWARDS[action] || 0;
  if (amount <= 0) return { xpEarned: 0, newTotal: 0, levelUp: false };

  let userXP = await UserXP.findOne({ studentId });
  if (!userXP) {
    userXP = new UserXP({ studentId, totalXP: 0, level: 1 });
    await userXP.save();
  }

  userXP.totalXP += amount;
  const oldLevel = userXP.level;
  userXP.level = Math.floor(userXP.totalXP / 100) + 1;
  userXP.lastUpdated = new Date();
  await userXP.save();

  await User.findByIdAndUpdate(studentId, {
    xpPoints: userXP.totalXP,
    level: userXP.level,
  });

  return {
    xpEarned: amount,
    newTotal: userXP.totalXP,
    levelUp: userXP.level > oldLevel,
  };
};

/**
 * Update streak on login
 */
const updateStreak = async (studentId) => {
  const user = await User.findById(studentId);
  if (!user) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  if (!last) {
    await User.findByIdAndUpdate(studentId, {
      streakDays: 1,
      lastActiveDate: today,
    });
    const uxp = await UserXP.findOne({ studentId });
    if (uxp) {
      uxp.currentStreak = 1;
      uxp.longestStreak = Math.max(uxp.longestStreak, 1);
      await uxp.save();
    }
    return { streak: 1, isNew: true };
  }

  last.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - last) / (24 * 60 * 60 * 1000));

  let userXP = await UserXP.findOne({ studentId });
  if (!userXP) userXP = new UserXP({ studentId });
  let streak = userXP.currentStreak || 0;

  if (diffDays === 0) return { streak, isNew: false };
  if (diffDays === 1) {
    streak += 1;
    if (streak === 7) await awardXP(studentId, 'week_streak');
  } else {
    streak = 1;
  }

  userXP.currentStreak = streak;
  userXP.longestStreak = Math.max(userXP.longestStreak, streak);
  await userXP.save();

  await User.findByIdAndUpdate(studentId, {
    streakDays: streak,
    lastActiveDate: today,
  });

  return { streak, isNew: diffDays === 1 };
};

/**
 * Get leaderboard (top N by XP)
 */
const getLeaderboard = async (limit = 50) => {
  const list = await UserXP.find()
    .sort({ totalXP: -1 })
    .limit(limit)
    .populate('studentId', 'name avatar level');

  return list.map((uxp, i) => ({
    rank: i + 1,
    studentId: uxp.studentId?._id,
    name: uxp.studentId?.name,
    avatar: uxp.studentId?.avatar,
    totalXP: uxp.totalXP,
    level: uxp.level,
    currentStreak: uxp.currentStreak,
  }));
};

module.exports = {
  awardXP,
  updateStreak,
  getLeaderboard,
  XP_REWARDS,
};
