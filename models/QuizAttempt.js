/**
 * QuizAttempt Model
 * Tracks student quiz attempts for analytics and weakness detection.
 */

const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedOption: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  timeTaken: { type: Number, default: 0 }, // seconds
  difficultyLevel: { type: Number, default: 1 },
  subtopic: { type: String },
});

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    answers: [answerSchema],
    score: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    // Map subtopic -> accuracy for weakness detection
    subtopicScores: {
      type: Map,
      of: Number,
      default: {},
    },
    timeSpent: {
      type: Number,
      default: 0, // total seconds
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index for student quiz history
quizAttemptSchema.index({ studentId: 1, completedAt: -1 });
quizAttemptSchema.index({ quizId: 1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
