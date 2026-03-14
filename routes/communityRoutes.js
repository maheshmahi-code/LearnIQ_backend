const express = require('express');
const communityController = require('../controllers/communityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/posts', communityController.getPosts);
router.post('/posts', protect, communityController.createPost);
router.post('/posts/:id/comment', protect, communityController.comment);
router.put('/posts/:id/upvote', protect, communityController.upvote);

module.exports = router;
