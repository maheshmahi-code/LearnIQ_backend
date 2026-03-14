/**
 * WeaknessReport Model
 * AI/ML-generated weakness analysis per student per course.
 */

const mongoose = require('mongoose');

const weakSubtopicSchema = new mongoose.Schema({
  subtopic: { type: String, required: true },
  accuracyRate: { type: Number, required: true },
  attemptCount: { type: Number, default: 0 },
  recommendedResources: [String],
});

const weaknessReportSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    weakSubtopics: [weakSubtopicSchema],
    predictedScore: {
      type: Number,
      default: null,
    },
    studyPlanGenerated: [String],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

weaknessReportSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('WeaknessReport', weaknessReportSchema);
