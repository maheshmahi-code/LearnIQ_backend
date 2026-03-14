/**
 * Analytics Model
 * Stores aggregated analytics data for dashboards.
 */

const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    weeklyStudyTime: [
      {
        weekStart: Date,
        minutes: Number,
      },
    ],
    subjectPerformance: [
      {
        subject: String,
        score: Number,
        attemptCount: Number,
      },
    ],
    quizScores: [
      {
        quizId: mongoose.Schema.Types.ObjectId,
        score: Number,
        date: Date,
      },
    ],
    overallScore: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

analyticsSchema.index({ studentId: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
