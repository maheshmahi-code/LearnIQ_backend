const express = require('express');
const weaknessController = require('../controllers/weaknessController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/update', protect, weaknessController.updateFromAttempt);
router.get('/study-plan', protect, weaknessController.getStudyPlan);
router.get('/:studentId?', protect, weaknessController.getReport);
router.post('/predict-score', protect, weaknessController.predictScore);

module.exports = router;
