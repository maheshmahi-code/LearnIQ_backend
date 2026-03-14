/**
 * DiscussionPost Model
 * Community forum posts with upvotes and nested comments.
 */

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, default: null }, // For nested replies
  createdAt: { type: Date, default: Date.now },
  upvotes: { type: Number, default: 0 },
});

const discussionPostSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
    },
    topic: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    upvotes: {
      type: Number,
      default: 0,
    },
    upvotedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    attachments: [
      {
        url: String,
        name: String,
      },
    ],
    comments: [commentSchema],
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

discussionPostSchema.index({ subject: 1 });
discussionPostSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DiscussionPost', discussionPostSchema);
