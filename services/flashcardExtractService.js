/**
 * Flashcard Extract Service
 * Extracts text from PDF/DOCX/images and generates flashcards via Claude.
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const claudeService = require('./claudeService');

/**
 * Extract text from PDF buffer
 */
const extractFromPDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (e) {
    throw new Error('Failed to parse PDF: ' + e.message);
  }
};

/**
 * Extract text from DOCX buffer
 */
const extractFromDOCX = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (e) {
    throw new Error('Failed to parse DOCX: ' + e.message);
  }
};

/**
 * Extract text based on mime type
 */
const extractText = async (buffer, mimeType) => {
  if (mimeType === 'application/pdf') return extractFromPDF(buffer);
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return extractFromDOCX(buffer);
  throw new Error('Unsupported file type. Use PDF or DOCX for text extraction.');
};

/**
 * Generate flashcards from text using Claude
 * Images would need Claude Vision - for now we support PDF/DOCX
 */
const generateFlashcardsFromText = async (text, maxCards = 20) => {
  const truncated = text.slice(0, 15000); // Limit token usage
  const prompt = `Extract key concepts from this text and create flashcards.
For each concept create one flashcard with:
- front: question or term
- back: answer or definition

Text:
${truncated}

Return a JSON array of objects: [{"front":"...","back":"..."}]
Create between 10 and ${maxCards} cards. Return only the JSON array.`;

  const result = await claudeService.generateJSON(prompt);
  const cards = Array.isArray(result) ? result : result.cards || [];
  return cards.slice(0, maxCards).map((c) => ({
    front: c.front || String(c),
    back: c.back || '',
  }));
};

module.exports = {
  extractFromPDF,
  extractFromDOCX,
  extractText,
  generateFlashcardsFromText,
};
