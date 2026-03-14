const express = require('express');
const multer = require('multer');
const flashcardController = require('../controllers/flashcardController');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
const router = express.Router();

router.post('/generate', protect, upload.single('file'), flashcardController.generate);
router.post('/generate-from-course', protect, flashcardController.generateFromCourse);
router.get('/decks', protect, flashcardController.getDecks);
router.get('/deck/:id', protect, flashcardController.getDeck);
router.put('/card/:id', protect, flashcardController.updateCard);
router.get('/due-today', protect, flashcardController.getDueToday);

module.exports = router;
