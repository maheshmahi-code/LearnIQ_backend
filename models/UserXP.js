/**
 * UserXP Model
 * Extended gamification data per student.
 */

const mongoose = require('mongoose');

const weeklyXPSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  xpEarned: { type: Number, default: 0 },
});

const userXPSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    totalXP: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    weeklyXP: [weeklyXPSchema],
    leaderboardRank: {
      type: Number,
      default: null,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

userXPSchema.index({ totalXP: -1 }); // For leaderboard sorting

module.exports = mongoose.model('UserXP', userXPSchema);
