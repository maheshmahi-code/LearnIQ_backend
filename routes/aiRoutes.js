const express = require('express');
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/doubt-solver', protect, aiController.doubtSolver);
router.post('/explain-topic', protect, aiController.explainTopic);
router.post('/generate-study-plan', protect, aiController.generateStudyPlan);

// Conversation History
router.get('/conversations', protect, aiController.getConversations);
router.get('/conversations/:id', protect, aiController.getConversation);
router.post('/conversations', protect, aiController.createConversation);
router.delete('/conversations/:id', protect, aiController.deleteConversation);

module.exports = router;
