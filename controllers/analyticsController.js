/**
 * Analytics Controller
 */

const Analytics = require('../models/Analytics');
const QuizAttempt = require('../models/QuizAttempt');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Course = require('../models/Course');
const cache = require('../utils/cache');

const getStudentAnalytics = async (req, res) => {
  try {
    const isSelf = !req.params.id || req.params.id === req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only view your own analytics.' });
    }

    const studentId = req.params.id || req.user?.id;
    if (!studentId) return res.status(400).json({ success: false, message: 'Student ID required.' });

    let analytics = await Analytics.findOne({ studentId }).lean();
    if (!analytics) {
      const newAnalytics = new Analytics({ studentId });
      analytics = await newAnalytics.save();
      analytics = analytics.toObject();
    }

    const quizAttempts = await QuizAttempt.find({ studentId })
      .populate('quizId')
      .sort({ completedAt: -1 })
      .limit(50)
      .lean();

    const submissions = await Submission.find({ studentId, status: 'graded' })
      .populate('assignmentId')
      .sort({ gradedAt: -1 })
      .limit(50)
      .lean();

    const mappedQuizzes = quizAttempts.map((a) => ({
      quizId: a.quizId?._id,
      title: a.quizId?.title || 'Untitled Quiz',
      score: a.score,
      date: a.completedAt,
      type: 'Quiz'
    }));

    const mappedAssignments = submissions.map((a) => ({
      quizId: a.assignmentId?._id,
      title: a.assignmentId?.title || 'Untitled Assignment',
      score: a.score,
      date: a.gradedAt,
      type: 'Assignment'
    }));

    const allScores = [...mappedQuizzes, ...mappedAssignments]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50);

    // Calculate score distribution for circular charts
    const distribution = {
      excellent: allScores.filter(a => a.score >= 80).length,
      good: allScores.filter(a => a.score >= 60 && a.score < 80).length,
      average: allScores.filter(a => a.score >= 40 && a.score < 60).length,
      poor: allScores.filter(a => a.score < 40).length,
    };

    let overall = 0;
    if (allScores.length) {
      overall = Math.round(
        allScores.reduce((sum, a) => sum + a.score, 0) / allScores.length
      );
    }

    res.json({
      success: true,
      analytics: {
        ...analytics.toObject(),
        quizScores: allScores,
        overallScore: overall,
        scoreDistribution: distribution,
        totalAttempts: allScores.length,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getAdminOverview = async (req, res) => {
  try {
    const cacheKey = 'analytics:admin_overview';
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, stats: cached, fromCache: true });
    }

    const students = await User.countDocuments({ role: 'student' });
    const courses = await Course.countDocuments();
    const quizCount = await QuizAttempt.countDocuments();

    const stats = {
      totalStudents: students,
      totalCourses: courses,
      totalQuizAttempts: quizCount,
    };

    await cache.set(cacheKey, stats, 600); // Cache for 10 minutes
    res.json({ success: true, stats });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getPerformanceMetrics = async (req, res) => {
  try {
    const stats = require('../middleware/performanceMiddleware').getMetrics();
    res.json({ success: true, ...stats });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getStudentAnalytics, getAdminOverview, getPerformanceMetrics };
