/**
 * Recommendation Service
 * Suggests courses, quizzes, and study materials based on user behavior.
 */

const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const WeaknessReport = require('../models/WeaknessReport');
const User = require('../models/User');

/**
 * Get recommended courses for a student (not yet enrolled)
 */
const getRecommendedCourses = async (studentId, limit = 5) => {
  const user = await User.findById(studentId);
  const enrolled = user?.enrolledCourses || [];
  const courses = await Course.find({
    _id: { $nin: enrolled },
    isPublished: true,
  })
    .limit(limit * 2)
    .populate('instructor', 'name');
  return courses.slice(0, limit);
};

/**
 * Get recommended quizzes for weak areas
 */
const getRecommendedQuizzes = async (studentId, courseId, limit = 3) => {
  const report = await WeaknessReport.findOne({ studentId, courseId });
  const weakTopics = report?.weakSubtopics?.map((w) => w.subtopic) || [];
  if (weakTopics.length === 0) return [];
  const quizzes = await Quiz.find({
    courseId,
    topic: { $in: weakTopics },
  })
    .limit(limit)
    .select('title topic difficulty');
  return quizzes;
};

module.exports = { getRecommendedCourses, getRecommendedQuizzes };
