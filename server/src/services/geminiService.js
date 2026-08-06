const { getGeminiClient } = require('../config/gemini');

/**
 * Generate embedding vector for a string text using Gemini API
 * @param {string} text 
 * @returns {Promise<number[]>} Vector of floats
 */
const generateEmbedding = async (text) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return generateFallbackEmbedding(text);
  }

  const embeddingModels = ['gemini-embedding-001', 'text-embedding-004', 'embedding-001'];

  for (const modelName of embeddingModels) {
    try {
      const ai = getGeminiClient();
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.embedContent(text);
      if (result && result.embedding && result.embedding.values) {
        return result.embedding.values;
      }
    } catch (err) {
      console.warn(`[Gemini Embedding Warning] Model ${modelName} failed:`, err.message);
    }
  }

  return generateFallbackEmbedding(text);
};

/**
 * Deterministic fallback embedding generator for testing without active Gemini key
 */
const generateFallbackEmbedding = (text) => {
  const dim = 768;
  const vector = new Array(dim).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < dim; i++) {
    const val = Math.sin(hash + i) * 10000;
    vector[i] = val - Math.floor(val);
  }
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map((val) => (magnitude === 0 ? 0 : val / magnitude));
};

/**
 * Stream answer from Gemini Flash for RAG Q&A
 * @param {string} prompt System prompt + context + question
 * @param {Function} onChunk Callback receiving text tokens
 */
const streamAnswer = async (prompt, onChunk) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const fallbackText = "I have reviewed your document context. Note: Add your GEMINI_API_KEY to server/.env to get live response from Gemini Flash. Here is the processed result based on your retrieved chunks.";
    const tokens = fallbackText.split(' ');
    for (const token of tokens) {
      onChunk(token + ' ');
      await new Promise((r) => setTimeout(r, 40));
    }
    return;
  }

  const generativeModels = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

  for (const modelName of generativeModels) {
    try {
      const ai = getGeminiClient();
      const model = ai.getGenerativeModel({ model: modelName });
      const resultStream = await model.generateContentStream(prompt);

      for await (const chunk of resultStream.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          onChunk(chunkText);
        }
      }
      return; // Streamed successfully
    } catch (err) {
      console.warn(`[Gemini Stream Warning] Model ${modelName} failed:`, err.message);
    }
  }

  onChunk('\n\n[Error generating response with Gemini API. Check your API key and quota.]');
};

/**
 * Generate quick document summary
 */
const generateDocumentSummary = async (documentText) => {
  const truncatedText = documentText.substring(0, 4000);
  const prompt = `Provide a concise 3-bullet-point summary of the following document content:\n\n${truncatedText}`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return "• Document processed successfully.\n• Text extracted and split into vector embeddings.\n• Ready for RAG Q&A (Set GEMINI_API_KEY in .env for full AI summary).";
  }

  const generativeModels = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash'];

  for (const modelName of generativeModels) {
    try {
      const ai = getGeminiClient();
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.warn(`[Gemini Summary Warning] Model ${modelName} failed:`, error.message);
    }
  }

  return "• Document uploaded and indexed.\n• Text chunks ready for query retrieval.";
};

module.exports = {
  generateEmbedding,
  streamAnswer,
  generateDocumentSummary,
};
