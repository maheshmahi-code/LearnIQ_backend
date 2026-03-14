/**
 * FlashcardDeck Model
 * Stores flashcard decks generated from PDFs or manual creation.
 */

const mongoose = require('mongoose');

const flashcardDeckSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Deck title is required'],
    },
    sourceFile: {
      type: String,
      default: '',
    },
    sourceMimeType: {
      type: String,
      default: '',
    },
    sourceCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    cards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flashcard',
      },
    ],
    totalCards: {
      type: Number,
      default: 0,
    },
    masteredCards: {
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

flashcardDeckSchema.index({ studentId: 1 });

module.exports = mongoose.model('FlashcardDeck', flashcardDeckSchema);
