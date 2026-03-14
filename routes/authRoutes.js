const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  authController.register
);

router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty()],
  authController.login
);

router.post('/google', authController.googleAuth);
router.get('/me', protect, authController.getMe);
router.post('/logout', authController.logout);

module.exports = router;
