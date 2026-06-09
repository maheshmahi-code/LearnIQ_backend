/**
 * Flashcard Controller
 * PDF upload, generation, deck management, spaced repetition.
 */

const FlashcardDeck = require('../models/FlashcardDeck');
const Flashcard = require('../models/Flashcard');
const flashcardExtractService = require('../services/flashcardExtractService');
const xpEngineService = require('../services/xpEngineService');

// Spaced repetition: days until next review
const DAYS = { hard: 1, ok: 3, easy: 7 };

const generate = async (req, res) => {
  try {
    const { file } = req; // Multer
    const { title } = req.body;
    if (!file?.buffer) {
      return res.status(400).json({ success: false, message: 'File required (PDF or DOCX).' });
    }

    const text = await flashcardExtractService.extractText(file.buffer, file.mimetype);
    const cards = await flashcardExtractService.generateFlashcardsFromText(text);

    const deck = new FlashcardDeck({
      studentId: req.user.id,
      title: title || file.originalname || 'New Deck',
      sourceFile: file.originalname || '',
      sourceMimeType: file.mimetype || '',
      totalCards: cards.length,
      masteredCards: 0,
    });
    await deck.save();

    const cardDocs = cards.map((c) => ({
      deckId: deck._id,
      front: c.front,
      back: c.back,
      difficulty: 'ok',
      nextReviewDate: new Date(),
    }));
    const inserted = await Flashcard.insertMany(cardDocs);
    deck.cards = inserted.map((c) => c._id);
    await deck.save();

    await xpEngineService.awardXP(req.user.id, 'upload_flashcard');

    res.status(201).json({
      success: true,
      deck: await FlashcardDeck.findById(deck._id).populate('cards'),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getDecks = async (req, res) => {
  try {
    const decks = await FlashcardDeck.find({ studentId: req.user.id })
      .sort('-createdAt')
      .select('-cards')
      .lean();
    res.json({ success: true, decks });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getDeck = async (req, res) => {
  try {
    const deck = await FlashcardDeck.findOne({
      _id: req.params.id,
      studentId: req.user.id,
    }).populate('cards').lean();
    if (!deck) return res.status(404).json({ success: false, message: 'Deck not found.' });
    res.json({ success: true, deck });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const updateCard = async (req, res) => {
  // #region agent log
  const { _log } = require('../utils/debugLog');
  _log('flashcardController.js:updateCard:entry', 'Update card', { cardId: req.params.id }, 'D');
  // #endregion
  try {
    const { difficulty } = req.body;
    const card = await Flashcard.findById(req.params.id).populate('deckId');
    if (!card) return res.status(404).json({ success: false, message: 'Card not found.' });
    // #region agent log
    const deckIdVal = card.deckId;
    _log('flashcardController.js:updateCard:deckCheck', 'Before deckId check', { hasDeckId: !!deckIdVal, deckStudentId: deckIdVal?.studentId != null }, 'D');
    // #endregion
    if (card.deckId.studentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }
    if (['easy', 'ok', 'hard'].includes(difficulty)) {
      card.difficulty = difficulty;
      const days = DAYS[difficulty] || 3;
      const next = new Date();
      next.setDate(next.getDate() + days);
      card.nextReviewDate = next;
      card.reviewCount = (card.reviewCount || 0) + 1;
      await card.save();
    }
    res.json({ success: true, card });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getDueToday = async (req, res) => {
  try {
    const decks = await FlashcardDeck.find({ studentId: req.user.id }).select('_id').lean();
    const ids = decks.map((d) => d._id);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const cards = await Flashcard.find({
      deckId: { $in: ids },
      nextReviewDate: { $lte: today },
    }).populate('deckId', 'title').lean();
    res.json({ success: true, cards });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const generateFromCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID required.' });
    }

    const Course = require('../models/Course');
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Combine lesson content into text
    let text = course.description + '\n';
    course.modules.forEach((mod) => {
      text += mod.title + '\n' + (mod.description || '') + '\n';
      mod.lessons.forEach((les) => {
        text += les.title + '\n' + (les.content || '') + '\n';
      });
    });

    const cards = await flashcardExtractService.generateFlashcardsFromText(text, 25);

    const deck = new FlashcardDeck({
      studentId: req.user.id,
      title: `Course: ${course.title}`,
      sourceCourse: courseId,
      totalCards: (cards || []).length,
      masteredCards: 0,
    });
    await deck.save();

    const cardDocs = (cards || []).map((c) => ({
      deckId: deck._id,
      front: c.front,
      back: c.back,
      difficulty: 'ok',
      nextReviewDate: new Date(),
    }));
    
    if (cardDocs.length > 0) {
      const inserted = await Flashcard.insertMany(cardDocs);
      deck.cards = inserted.map((c) => c._id);
      await deck.save();
    }

    await xpEngineService.awardXP(req.user.id, 'generate_flashcard');

    res.status(201).json({
      success: true,
      deck: await FlashcardDeck.findById(deck._id).populate('cards'),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { generate, generateFromCourse, getDecks, getDeck, updateCard, getDueToday };
