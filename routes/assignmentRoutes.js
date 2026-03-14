const express = require('express');
const assignmentController = require('../controllers/assignmentController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/', protect, assignmentController.getAll);
router.post('/generate', protect, assignmentController.generateAssignment);
router.post('/', protect, adminOnly, assignmentController.create);
router.put('/:id', protect, adminOnly, assignmentController.update);
router.delete('/:id', protect, adminOnly, assignmentController.remove);
router.post('/:id/submit', protect, assignmentController.submit);
router.get('/:id/submissions', protect, adminOnly, assignmentController.getSubmissions);
router.put('/:id/grade/:subId', protect, adminOnly, assignmentController.grade);

module.exports = router;
