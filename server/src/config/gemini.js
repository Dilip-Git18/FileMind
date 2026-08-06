const { GoogleGenerativeAI } = require('@google/generative-ai');

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Gemini Warning] GEMINI_API_KEY is not set in process.env');
  }
  return new GoogleGenerativeAI(apiKey || 'DUMMY_KEY');
};

module.exports = {
  getGeminiClient,
};
