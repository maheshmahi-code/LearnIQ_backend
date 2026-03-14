const express = require('express');
const { getMessages, sendMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Ensure all routes are protected

// For the global chat room ('global'), and specific ones as well.
router.route('/:roomId')
  .get(getMessages)
  .post(sendMessage);

module.exports = router;
