/**
 * Flashcard Model
 * Individual cards with spaced repetition support.
 */

const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema(
  {
    deckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FlashcardDeck',
      required: true,
    },
    front: {
      type: String,
      required: [true, 'Card front (question/term) is required'],
    },
    back: {
      type: String,
      required: [true, 'Card back (answer/definition) is required'],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'ok', 'hard'],
      default: 'ok',
    },
    nextReviewDate: {
      type: Date,
      default: Date.now,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

flashcardSchema.index({ deckId: 1 });
flashcardSchema.index({ nextReviewDate: 1 });

module.exports = mongoose.model('Flashcard', flashcardSchema);
