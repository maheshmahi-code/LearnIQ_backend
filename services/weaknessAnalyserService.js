/**
 * Weakness Analyser Service
 * Aggregates quiz attempts and identifies weak subtopics.
 */

const QuizAttempt = require('../models/QuizAttempt');
const WeaknessReport = require('../models/WeaknessReport');
const claudeService = require('./claudeService');
const axios = require('axios');
const { ML_SERVICE_URL } = require('../config/environment');

const WEAK_THRESHOLD = 0.6; // Accuracy below 60% = weak

/**
 * Update weakness report after a quiz attempt
 */
const updateFromAttempt = async (studentId, courseId, subtopicScores) => {
  const attempts = await QuizAttempt.find({
    studentId,
    quizId: { $in: await getQuizIdsByCourse(courseId) },
  }).sort({ completedAt: -1 });

  const aggregated = aggregateSubtopicScores(attempts);
  const weakSubtopics = aggregated
    .filter((s) => s.accuracyRate < WEAK_THRESHOLD)
    .map((s) => ({
      subtopic: s.subtopic,
      accuracyRate: s.accuracyRate,
      attemptCount: s.attemptCount,
      recommendedResources: [],
    }));

  await WeaknessReport.findOneAndUpdate(
    { studentId, courseId },
    {
      weakSubtopics,
      lastUpdated: new Date(),
    },
    { upsert: true, new: true }
  );
};

async function getQuizIdsByCourse(courseId) {
  const Quiz = require('../models/Quiz');
  const quizzes = await Quiz.find({ courseId }).select('_id');
  return quizzes.map((q) => q._id);
}

function aggregateSubtopicScores(attempts) {
  const bySubtopic = {};
  for (const attempt of attempts) {
    if (attempt.answers && Array.isArray(attempt.answers) && attempt.answers.length > 0) {
      // Prioritize modern format (answers include subtopic)
      for (const ans of attempt.answers) {
        const sub = ans.subtopic;
        if (!sub) continue;
        if (!bySubtopic[sub]) bySubtopic[sub] = { total: 0, correct: 0 };
        bySubtopic[sub].total += 1;
        bySubtopic[sub].correct += ans.isCorrect ? 1 : 0;
      }
    } else if (attempt.subtopicScores && attempt.subtopicScores instanceof Map) {
      // Fallback for older attempts (where one key = one correct count, but total is unknown, assuming 1 for now or skip)
      for (const [sub, score] of attempt.subtopicScores) {
        if (!bySubtopic[sub]) bySubtopic[sub] = { total: 0, correct: 0 };
        bySubtopic[sub].total += 1;
        bySubtopic[sub].correct += score;
      }
    }
  }
  return Object.entries(bySubtopic).map(([subtopic, d]) => ({
    subtopic,
    accuracyRate: d.total > 0 ? d.correct / d.total : 0,
    attemptCount: d.total,
  }));
}

/**
 * Get or create weakness report
 */
const getReport = async (studentId, courseId) => {
  let report = await WeaknessReport.findOne({ studentId, courseId }).populate('courseId', 'title category');
  
  if (!report) {
    report = new WeaknessReport({ studentId, courseId, weakSubtopics: [] });
    // Trigger find again to handle population if newly created (optional, but cleaner for display)
    await report.save();
    report = await WeaknessReport.findById(report._id).populate('courseId', 'title category');
  }

  // Auto-generate study plan if we have weaknesses but no plan
  if (report.weakSubtopics.length > 0 && (!report.studyPlanGenerated || report.studyPlanGenerated.length === 0)) {
    const topics = report.weakSubtopics.map(w => w.subtopic);
    const plan = await generateStudyPlan(topics);
    report.studyPlanGenerated = plan;
    await report.save();
  }

  return report;
};

/**
 * Predict score via ML service
 */
const predictScore = async (subtopicScores, studyHours = 0, attemptCount = 0) => {
  try {
    const { data } = await axios.post(`${ML_SERVICE_URL}/predict-score`, {
      subtopic_scores: Object.fromEntries(
        subtopicScores.map((s) => [s.subtopic, s.accuracyRate])
      ),
      study_hours: studyHours,
      attempt_count: attemptCount,
    }, { timeout: 3000 });
    return data;
  } catch (e) {
    // Local Fallback Heuristic
    let avgAccuracy = 0;
    if (subtopicScores.length > 0) {
      avgAccuracy = subtopicScores.reduce((acc, s) => acc + s.accuracyRate, 0) / subtopicScores.length;
    } else {
      avgAccuracy = 0.7; // Default baseline
    }

    // Boost factor based on study hours and attempts (diminishing returns)
    const factor = Math.min(0.15, (studyHours * 0.01) + (attemptCount * 0.005));
    const predictedBase = avgAccuracy * 100;
    const finalScore = Math.min(100, Math.round(predictedBase + (factor * 100)));

    const tips = [
      "Focus revision on topics with < 60% accuracy.",
      "Increase problem-solving consistency to improve predictive confidence.",
      "Spaced repetition would benefit your long-term retention of these subtopics."
    ];

    return { 
      predictedScore: finalScore, 
      confidence: 0.75, 
      improvementTips: tips.sort(() => 0.5 - Math.random()).slice(0, 2)
    };
  }
};

/**
 * Generate AI study plan based on weak areas
 */
const generateStudyPlan = async (weakTopics) => {
  const prompt = `Based on these weak areas: ${weakTopics.join(', ')}
Create a 5-step personalized study plan with:
1. Prioritized topics
2. Recommended resources (free online)
3. Time estimates per step
4. Practice suggestions

Return a JSON array of 5 strings, each a step. Example: ["Step 1: ...", "Step 2: ..."]`;

  try {
    const result = await claudeService.generateJSON(prompt);
    return Array.isArray(result) ? result : result.steps || [];
  } catch {
    return weakTopics.map((t, i) => `Step ${i + 1}: Focus on ${t}. Review materials and practice.`);
  }
};

module.exports = {
  updateFromAttempt,
  getReport,
  predictScore,
  generateStudyPlan,
  WEAK_THRESHOLD,
};
