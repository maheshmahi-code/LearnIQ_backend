/**
 * AI Controller
 * Doubt solver, streaming, chat history.
 */

const claudeService = require('../services/claudeService');
const langchainService = require('../services/langchainService');
const AIConversation = require('../models/AIConversation');

/**
 * POST /api/ai/doubt-solver
 * Stream AI response for student question
 */
const doubtSolver = async (req, res) => {
  try {
    const { question, subject = 'General', imageUrl, conversationId } = req.body;
    if (!question && !imageUrl) {
      return res.status(400).json({ success: false, message: 'Question or image required.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const systemPrompt = claudeService.getDoubtSolverPrompt(subject);
    const userMsg = imageUrl
      ? `[Image: ${imageUrl}]\n\nStudent question: ${question || 'Explain what you see in this image.'}`
      : question;

    let fullResponse = '';
    await langchainService.stream(systemPrompt, userMsg, (chunk) => {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
    res.end();

    // Save to conversation history
    const studentId = req.user?.id;
    if (studentId) {
      let conv;
      if (conversationId) {
        conv = await AIConversation.findOne({ _id: conversationId, studentId });
      }
      
      if (!conv) {
        // Fallback or auto-create if ID not provided
        conv = await AIConversation.findOne({ studentId }).sort('-lastMessageAt');
        if (!conv) {
          conv = new AIConversation({ studentId, messages: [] });
        }
      }
      
      conv.messages.push({ role: 'user', content: question || '[Image]', subject, imageUrl });
      conv.messages.push({ role: 'assistant', content: fullResponse, subject });
      conv.lastMessageAt = new Date();
      await conv.save();
    }
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: e.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
  }
};

const getConversations = async (req, res) => {
  try {
    const conversations = await AIConversation.find({ studentId: req.user.id })
      .select('lastMessageAt messages')
      .sort('-lastMessageAt');
    
    // Simplify for list view
    const list = conversations.map(c => ({
      _id: c._id,
      lastMessage: c.messages[c.messages.length - 1]?.content || 'Empty Chat',
      lastMessageAt: c.lastMessageAt
    }));

    res.json({ success: true, conversations: list });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getConversation = async (req, res) => {
  try {
    const conversation = await AIConversation.findOne({ 
      _id: req.params.id, 
      studentId: req.user.id 
    });
    if (!conversation) return res.status(404).json({ success: false, message: 'Chat not found.' });
    res.json({ success: true, conversation });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const createConversation = async (req, res) => {
  try {
    const conversation = await AIConversation.create({
      studentId: req.user.id,
      messages: []
    });
    res.status(201).json({ success: true, conversation });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /api/ai/explain-topic
 */
const explainTopic = async (req, res) => {
  try {
    const { topic } = req.body;
    const response = await claudeService.complete(
      'You are an expert tutor. Explain concepts clearly and concisely.',
      `Explain the topic: ${topic}`
    );
    res.json({ success: true, explanation: response });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /api/ai/generate-study-plan
 */
const generateStudyPlan = async (req, res) => {
  try {
    const { weakTopics } = req.body;
    const { generateStudyPlan: genPlan } = require('../services/weaknessAnalyserService');
    const plan = await genPlan(weakTopics || []);
    res.json({ success: true, studyPlan: plan });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const conversation = await AIConversation.findOneAndDelete({
      _id: req.params.id,
      studentId: req.user.id
    });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }
    res.json({ success: true, message: 'Conversation deleted successfully.' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { 
  doubtSolver, 
  getConversations, 
  getConversation, 
  createConversation,
  deleteConversation, 
  explainTopic, 
  generateStudyPlan 
};
