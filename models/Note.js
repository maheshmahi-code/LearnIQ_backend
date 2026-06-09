const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  standard: {
    type: String, // e.g., '10th', 'Intermediate', 'B.Tech'
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

noteSchema.index({ uploadedBy: 1 });
noteSchema.index({ subject: 1 });

module.exports = mongoose.model('Note', noteSchema);
