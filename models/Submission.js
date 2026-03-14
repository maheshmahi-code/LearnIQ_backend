/**
 * Submission Model
 * Stores student assignment submissions.
 */

const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attachments: [
      {
        url: { type: String, required: true },
        name: { type: String, default: '' },
        mimeType: { type: String, default: '' },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'submitted', 'graded'],
      default: 'submitted',
    },
    score: {
      type: Number,
      default: null,
    },
    feedback: {
      type: String,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    gradedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
