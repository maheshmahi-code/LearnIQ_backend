/**
 * Weakness Controller
 * Report, study plan, ML score prediction.
 */

const weaknessAnalyserService = require('../services/weaknessAnalyserService');

const updateFromAttempt = async (req, res) => {
  try {
    const { studentId, courseId, subtopicScores } = req.body;
    const sid = studentId || req.user?.id;
    if (!sid || !courseId) {
      return res.status(400).json({ success: false, message: 'studentId and courseId required.' });
    }
    await weaknessAnalyserService.updateFromAttempt(sid, courseId, subtopicScores || []);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getReport = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user?.id;
    const { courseId } = req.query;
    if (!studentId) return res.status(400).json({ success: false, message: 'studentId required.' });
    if (!courseId) return res.status(400).json({ success: false, message: 'courseId required.' });
    const report = await weaknessAnalyserService.getReport(studentId, courseId);
    res.json({ success: true, report });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getStudyPlan = async (req, res) => {
  try {
    const { weakTopics } = req.query;
    const topics = weakTopics ? weakTopics.split(',') : [];
    const plan = await weaknessAnalyserService.generateStudyPlan(topics);
    res.json({ success: true, studyPlan: plan });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const predictScore = async (req, res) => {
  try {
    const { subtopic_scores, study_hours, attempt_count } = req.body;
    const result = await weaknessAnalyserService.predictScore(
      Object.entries(subtopic_scores || {}).map(([k, v]) => ({ subtopic: k, accuracyRate: v })),
      study_hours || 0,
      attempt_count || 0
    );
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { updateFromAttempt, getReport, getStudyPlan, predictScore };
