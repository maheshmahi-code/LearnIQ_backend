/**
 * AI API Service (formerly Claude)
 * Direct integration with Google Gemini for AI responses.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GOOGLE_API_KEY, GOOGLE_MODEL } = require('../config/environment');

let client = null;

const getClient = () => {
  if (!client) {
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }
    client = new GoogleGenerativeAI(GOOGLE_API_KEY);
  }
  return client;
};

/**
 * Send a message to AI and get a streaming response
 */
const streamMessage = async (systemPrompt, userMessage, onChunk) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: GOOGLE_MODEL || 'gemini-2.5-flash', systemInstruction: systemPrompt });
  
  const result = await model.generateContentStream(userMessage);

  let fullResponse = '';
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullResponse += text;
      onChunk?.(text);
    }
  }

  return fullResponse;
};

/**
 * Send a message and get a complete response (non-streaming)
 */
const complete = async (systemPrompt, userMessage) => {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: GOOGLE_MODEL || 'gemini-2.5-flash', systemInstruction: systemPrompt });
  
  const result = await model.generateContent(userMessage);
  return result.response.text();
};

/**
 * Doubt solver prompt - structured tutor response
 */
const getDoubtSolverPrompt = (subject) => `
You are an expert ${subject} tutor. When a student asks a question, respond with:
1. A simple explanation (2-3 sentences)
2. Step-by-step breakdown (numbered)
3. A real-world example
4. A practice question to test understanding

Be encouraging and clear. If they upload an image, describe what you see and explain it.`;

/**
 * Generate JSON response - for structured data like flashcards, quiz questions
 */
const generateJSON = async (prompt) => {
  const response = await complete(
    'You respond only with valid JSON. No markdown code blocks, no extra text.',
    prompt
  );
  try {
    const jsonStr = response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Failed to parse AI response as JSON');
  }
};

module.exports = {
  streamMessage,
  complete,
  getDoubtSolverPrompt,
  generateJSON,
  getClient,
};
