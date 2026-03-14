/**
 * Quiz Model
 * Stores quizzes with AI-generated or manual questions.
 */

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [String],
  correctAnswer: { type: String, required: true },
  explanation: { type: String, default: '' },
  subtopic: { type: String, default: '' }, // For weakness mapping
  difficultyLevel: { type: Number, default: 1 }, // 1=easy, 2=medium, 3=hard
});

const quizSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
    },
    topic: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    adaptiveDifficulty: {
      type: Boolean,
      default: false,
    },
    questions: [questionSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isAIGenerated: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create index for faster course lookups
quizSchema.index({ courseId: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
