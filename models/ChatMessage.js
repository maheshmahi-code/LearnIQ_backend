const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomId: {
      type: String,
      default: 'global', // 'global' for the main community chat
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index for fast querying by room and time
chatMessageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
