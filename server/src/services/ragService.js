const Chunk = require('../models/Chunk');

/**
 * Calculate Cosine Similarity between vector A and vector B
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} similarity score [-1, 1]
 */
const calculateCosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Perform vector similarity search for top matching chunks
 * @param {string|string[]} documentIds Single document ID or array of document IDs
 * @param {number[]} queryEmbedding Vector embedding of user question
 * @param {number} topK Default 5
 * @param {number} threshold Default 0.45
 * @returns {Promise<{chunks: Array, maxScore: number, passedThreshold: boolean}>}
 */
const retrieveRelevantChunks = async (documentIds, queryEmbedding, topK = 5, threshold = 0.45) => {
  const docIdsArray = Array.isArray(documentIds) ? documentIds : [documentIds];
  
  const chunksInDb = await Chunk.find({ documentId: { $in: docIdsArray } }).lean();
  
  if (!chunksInDb || chunksInDb.length === 0) {
    return { chunks: [], maxScore: 0, passedThreshold: false };
  }

  const scoredChunks = chunksInDb.map((chunk) => {
    const similarity = calculateCosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      ...chunk,
      similarity,
    };
  });

  // Sort descending by similarity
  scoredChunks.sort((a, b) => b.similarity - a.similarity);

  const maxScore = scoredChunks.length > 0 ? scoredChunks[0].similarity : 0;
  let selectedChunks = scoredChunks.slice(0, topK);

  // Ensure intro chunk (chunkIndex 0) is included if missing so overview questions succeed
  const hasIntroChunk = selectedChunks.some((c) => c.chunkIndex === 0);
  if (!hasIntroChunk) {
    const introChunk = chunksInDb.find((c) => c.chunkIndex === 0);
    if (introChunk) {
      const introSimilarity = calculateCosineSimilarity(queryEmbedding, introChunk.embedding);
      selectedChunks.push({ ...introChunk, similarity: introSimilarity });
    }
  }

  // Sort selected chunks by page and chunkIndex for logical reading flow
  selectedChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

  const passedThreshold = maxScore >= threshold || chunksInDb.length <= 5;

  return {
    chunks: selectedChunks,
    maxScore,
    passedThreshold,
  };
};

module.exports = {
  calculateCosineSimilarity,
  retrieveRelevantChunks,
};
