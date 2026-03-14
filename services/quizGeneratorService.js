/**
 * Quiz Generator Service
 * AI-powered quiz generation using Claude via LangChain.
 */

const claudeService = require('./claudeService');

/**
 * Generate MCQ quiz questions
 * @param {Object} opts - { topic, difficulty, questionCount, studentWeakAreas }
 */
const generateQuiz = async ({ topic, difficulty, questionCount = 10, studentWeakAreas = [] }) => {
  const weakAreaHint = studentWeakAreas.length
    ? `Focus 30% of questions on these weak areas: ${studentWeakAreas.join(', ')}.`
    : '';

  const prompt = `Generate exactly ${questionCount} multiple choice questions on the topic: "${topic}".
Difficulty: ${difficulty}
${weakAreaHint}

Return a JSON array of objects, each with:
{
  "question": "The question text",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correctAnswer": "Exact text of the correct option",
  "explanation": "Brief explanation of the correct answer",
  "subtopic": "Specific subtopic this question tests"
}

Return only the JSON array, no other text.`;

  const result = await claudeService.generateJSON(prompt);
  const questions = Array.isArray(result) ? result : result.questions || [];
  return questions.slice(0, questionCount).map((q, i) => ({
    question: q.question || '',
    options: q.options || [],
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || '',
    subtopic: q.subtopic || topic,
    difficultyLevel: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
  }));
};

/**
 * Generate explanation for a single question
 */
const generateExplanation = async (question, correctAnswer) => {
  try {
    const response = await claudeService.complete(
      'You are a helpful tutor. Explain concepts clearly.',
      `Question: ${question}\nCorrect answer: ${correctAnswer}\nProvide a brief, clear explanation.`
    );
    return response;
  } catch (e) {
    return 'See the correct answer above.';
  }
};

module.exports = { generateQuiz, generateExplanation };
