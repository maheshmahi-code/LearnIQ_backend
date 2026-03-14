/**
 * Quiz Controller
 * Generate, attempt, and retrieve quiz results.
 */

const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const quizGeneratorService = require('../services/quizGeneratorService');
const weaknessAnalyserService = require('../services/weaknessAnalyserService');
const xpEngineService = require('../services/xpEngineService');

const getByCourse = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ courseId: req.params.courseId }).sort('-createdAt');
    res.json({ success: true, quizzes });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const generate = async (req, res) => {
  try {
    const { topic, difficulty, questionCount, courseId } = req.body;
    const studentId = req.user?.id;
    let weakAreas = [];
    if (studentId && courseId) {
      const report = await weaknessAnalyserService.getReport(studentId, courseId);
      weakAreas = report.weakSubtopics?.map((w) => w.subtopic) || [];
    }
    const questions = await quizGeneratorService.generateQuiz({
      topic: topic || 'General Knowledge',
      difficulty: difficulty || 'medium',
      questionCount: Math.min(Math.max(parseInt(questionCount, 10) || 10, 5), 30),
      studentWeakAreas: weakAreas,
    });
    const quiz = await Quiz.create({
      courseId: courseId || null,
      title: `Quiz: ${topic}`,
      topic,
      difficulty,
      questions,
      createdBy: studentId,
      isAIGenerated: true,
    });
    res.status(201).json({ success: true, quiz });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const attempt = async (req, res) => {
  // #region agent log
  const { _log } = require('../utils/debugLog');
  _log('quizController.js:attempt:entry', 'Quiz attempt', { quizId: req.params.id, answersLen: req.body?.answers?.length }, 'B');
  // #endregion
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

    const { answers, timeSpent } = req.body; // answers: [{ questionIdx, selectedOption }]
    const correctMap = {};
    quiz.questions.forEach((q, i) => {
      correctMap[i] = q.correctAnswer;
    });

    let correct = 0;
    const answerRecords = [];
    const subtopicScores = new Map();
    const subtopicStats = {};

    for (const a of answers || []) {
      const idx = a.questionIdx;
      const q = quiz.questions[idx];
      if (!q) continue;
      const isCorrect = q.correctAnswer === a.selectedOption;
      if (isCorrect) correct++;
      
      const subtopic = q.subtopic || quiz.topic;
      if (!subtopicStats[subtopic]) subtopicStats[subtopic] = { correct: 0, total: 0 };
      subtopicStats[subtopic].total++;
      if (isCorrect) {
        subtopicStats[subtopic].correct++;
        subtopicScores.set(subtopic, (subtopicScores.get(subtopic) || 0) + 1);
      } else {
        subtopicScores.set(subtopic, subtopicScores.get(subtopic) || 0);
      }

      answerRecords.push({
        questionId: q._id,
        selectedOption: a.selectedOption,
        isCorrect,
        timeTaken: a.timeTaken || 0,
        difficultyLevel: q.difficultyLevel,
        subtopic,
      });
    }

    const total = quiz.questions.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const attempt = await QuizAttempt.create({
      quizId: quiz._id,
      studentId: req.user.id,
      answers: answerRecords,
      score,
      totalQuestions: total,
      subtopicScores,
      timeSpent: timeSpent || 0,
    });

    // XP
    await xpEngineService.awardXP(req.user.id, 'complete_quiz');
    if (score === 100) await xpEngineService.awardXP(req.user.id, 'perfect_quiz');

    // Weakness update
    if (quiz.courseId) {
      const updateData = Object.entries(subtopicStats).map(([sub, stats]) => ({
        subtopic: sub,
        accuracyRate: stats.correct / stats.total,
        attemptCount: 1,
      }));
      await weaknessAnalyserService.updateFromAttempt(req.user.id, quiz.courseId, updateData);
    }

    // #region agent log
    _log('quizController.js:attempt:success', 'Attempt saved', { attemptId: String(attempt._id), score }, 'B');
    // #endregion
    res.status(201).json({
      success: true,
      attempt: { id: attempt._id, score, totalQuestions: total, correct },
    });
  } catch (e) {
    // #region agent log
    _log('quizController.js:attempt:error', 'Attempt error', { msg: e?.message }, 'B');
    // #endregion
    res.status(500).json({ success: false, message: e.message });
  }
};

const getResults = async (req, res) => {
  // #region agent log
  const { _log } = require('../utils/debugLog');
  _log('quizController.js:getResults:entry', 'Get results', { id: req.params.id }, 'B');
  // #endregion
  try {
    const attempt = await QuizAttempt.findById(req.params.id)
      .populate('quizId')
      .lean();
    if (!attempt) {
      // #region agent log
      _log('quizController.js:getResults:notFound', 'Attempt not found', { id: req.params.id }, 'B');
      // #endregion
      return res.status(404).json({ success: false, message: 'Attempt not found.' });
    }
    if (attempt.studentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }
    // #region agent log
    _log('quizController.js:getResults:success', 'Results returned', { attemptId: String(attempt._id) }, 'B');
    // #endregion
    res.json({ success: true, attempt });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getOne = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });
    res.json({ success: true, quiz });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getByCourse, generate, attempt, getResults, getOne };
