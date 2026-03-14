const express = require('express');
const courseController = require('../controllers/courseController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/', optionalAuth, courseController.getAll);
router.get('/:id', optionalAuth, courseController.getOne);
router.post('/:id/enroll', protect, courseController.enroll);

router.post('/generate', protect, courseController.generateCourse);

router.post('/', protect, adminOnly, courseController.create);
router.put('/:id', protect, adminOnly, courseController.update);
router.delete('/:id', protect, adminOnly, courseController.remove);

module.exports = router;
