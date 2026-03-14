/**
 * Course Model
 * Stores course information with modules and lessons.
 */

const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'pdf', 'text'], default: 'text' },
  contentUrl: { type: String, default: '' },
  content: { type: String, default: '' },
  duration: { type: Number, default: 0 }, // minutes
  order: { type: Number, default: 0 },
});

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  lessons: [lessonSchema],
  order: { type: Number, default: 0 },
});

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'Other',
    },
    difficulty: {
      type: String,
      default: 'beginner',
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    modules: [moduleSchema],
    thumbnail: {
      type: String,
      default: '',
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
