/**
 * LangChain Service
 * Wraps AI operations with LangChain for structured chains.
 */

const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { GOOGLE_API_KEY, GOOGLE_MODEL } = require('../config/environment');

let llm = null;

const getLLM = () => {
  if (!llm) {
    if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY is not configured');
    llm = new ChatGoogleGenerativeAI({
      apiKey: GOOGLE_API_KEY,
      model: GOOGLE_MODEL || 'gemini-2.5-flash',
      maxOutputTokens: 2048,
      temperature: 0.7,
    });
  }
  return llm;
};

/**
 * Invoke a simple chain with system + user message
 */
const invoke = async (systemPrompt, userMessage) => {
  const chat = getLLM();
  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(userMessage),
  ];
  const response = await chat.invoke(messages);
  return response.content;
};

/**
 * Stream response for real-time UI
 */
const stream = async (systemPrompt, userMessage, onChunk) => {
  const chat = getLLM();
  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(userMessage),
  ];
  const stream = await chat.stream(messages);
  for await (const chunk of stream) {
    if (chunk.content) onChunk(chunk.content);
  }
};

module.exports = { invoke, stream, getLLM };
