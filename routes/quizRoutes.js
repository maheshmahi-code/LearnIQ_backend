const express = require('express');
const quizController = require('../controllers/quizController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/course/:courseId', quizController.getByCourse);
router.get('/:id', quizController.getOne);
router.get('/:id/results', protect, quizController.getResults);
router.post('/generate', protect, quizController.generate);
router.post('/:id/attempt', protect, quizController.attempt);

module.exports = router;
