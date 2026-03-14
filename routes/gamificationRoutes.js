const express = require('express');
const gamificationController = require('../controllers/gamificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/profile', protect, gamificationController.getProfile);
router.post('/award-xp', protect, gamificationController.awardXP);
router.get('/leaderboard', gamificationController.getLeaderboard);

module.exports = router;
