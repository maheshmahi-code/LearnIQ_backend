const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/student', protect, analyticsController.getStudentAnalytics);
router.get('/student/:id', protect, analyticsController.getStudentAnalytics);
router.get('/admin/overview', protect, adminOnly, analyticsController.getAdminOverview);

module.exports = router;
