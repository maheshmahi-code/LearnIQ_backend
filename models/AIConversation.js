/**
 * AIConversation Model
 * Stores chat history for AI Doubt Solver (24/7 AI Tutor).
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  subject: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const aiConversationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messages: [messageSchema],
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

aiConversationSchema.index({ studentId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('AIConversation', aiConversationSchema);
