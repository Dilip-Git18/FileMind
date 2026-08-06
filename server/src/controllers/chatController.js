const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Document = require('../models/Document');
const { generateEmbedding, streamAnswer } = require('../services/geminiService');
const { retrieveRelevantChunks } = require('../services/ragService');

// @desc Stream RAG Chat Q&A with Server Sent Events (SSE)
// @route POST /chat
const askQuestion = async (req, res, next) => {
  try {
    const { documentId, documentIds, question, conversationId, threshold } = req.body;
    const targetThreshold = typeof threshold === 'number' ? threshold : 0.45;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const targetDocIds = documentIds && Array.isArray(documentIds) && documentIds.length > 0
      ? documentIds
      : documentId ? [documentId] : [];

    if (targetDocIds.length === 0) {
      return res.status(400).json({ error: 'At least one documentId must be selected.' });
    }

    // Verify document ownership
    const validDocs = await Document.find({
      _id: { $in: targetDocIds },
      owner: req.user._id,
    });

    if (validDocs.length === 0) {
      return res.status(404).json({ error: 'No valid documents found for user.' });
    }

    // Find or create conversation
    let conv;
    if (conversationId) {
      conv = await Conversation.findOne({ _id: conversationId, user: req.user._id });
    }
    if (!conv) {
      conv = await Conversation.create({
        user: req.user._id,
        document: targetDocIds[0],
        title: question.substring(0, 40) + '...',
      });
    }

    // Save user question to DB
    await Message.create({
      conversation: conv._id,
      sender: 'user',
      content: question,
    });

    // Setup Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 1. Generate question embedding
    const questionEmbedding = await generateEmbedding(question);

    // 2. Perform Cosine Similarity Search
    const { chunks, maxScore, passedThreshold } = await retrieveRelevantChunks(
      targetDocIds,
      questionEmbedding,
      6,
      targetThreshold
    );

    // 3. Threshold Guard Check
    if (!passedThreshold || chunks.length === 0) {
      const fallbackMsg = "I couldn't find relevant information in your uploaded document context for this specific query.";
      
      res.write(`data: ${JSON.stringify({ chunk: fallbackMsg, conversationId: conv._id })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();

      // Save assistant message to DB
      await Message.create({
        conversation: conv._id,
        sender: 'assistant',
        content: fallbackMsg,
      });
      return;
    }

    // Include document summary in context if available
    const summariesText = validDocs
      .filter((d) => d.summary)
      .map((d) => `[Document Executive Summary for ${d.originalName}]:\n${d.summary}`)
      .join('\n\n');

    // 4. Construct Context Text
    const contextChunksText = chunks
      .map((c, i) => `[Chunk ${i + 1} | Page ${c.page}]:\n${c.text}`)
      .join('\n\n');

    const combinedContext = [summariesText, contextChunksText].filter(Boolean).join('\n\n---\n\n');

    const prompt = `You are FileMind, an expert AI document assistant. Answer the user's question clearly, thoroughly, and accurately based on the provided document context below.

INSTRUCTIONS:
1. Synthesize a comprehensive and helpful response using the retrieved document context.
2. Rely strictly on the information contained in the context below. Do not fabricate, hallucinate, or assume unmentioned facts.
3. If the user asks for a summary, main topic, or overview, summarize the provided document chunks effectively.
4. If the provided document context is completely unrelated to the question and does not contain relevant details, state politely: "I cannot find this specific information in the provided document chunks."

Retrieved Document Context:
---
${combinedContext}
---

User Question: ${question}

Response:`;

    let fullAnswer = '';

    // Send context references metadata event
    const chunksRef = chunks.map((c) => ({
      page: c.page,
      textSnippet: c.text.substring(0, 100) + '...',
      score: c.similarity,
    }));

    res.write(`data: ${JSON.stringify({ type: 'meta', conversationId: conv._id, chunksRef })}\n\n`);

    // Stream response from Gemini
    await streamAnswer(prompt, (token) => {
      fullAnswer += token;
      res.write(`data: ${JSON.stringify({ chunk: token })}\n\n`);
    });

    res.write(`data: [DONE]\n\n`);
    res.end();

    // Save full assistant response to DB
    await Message.create({
      conversation: conv._id,
      sender: 'assistant',
      content: fullAnswer,
      chunksRef,
    });
  } catch (error) {
    console.error('[Chat Controller Error]', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
};

// @desc Get chat history for a document or conversation
// @route GET /chat/history
const getChatHistory = async (req, res, next) => {
  try {
    const { documentId, conversationId } = req.query;

    let conv;
    if (conversationId) {
      conv = await Conversation.findOne({ _id: conversationId, user: req.user._id });
    } else if (documentId) {
      conv = await Conversation.findOne({ document: documentId, user: req.user._id }).sort({ createdAt: -1 });
    }

    if (!conv) {
      return res.json({ conversationId: null, messages: [] });
    }

    const messages = await Message.find({ conversation: conv._id }).sort({ timestamp: 1 });

    res.json({
      conversationId: conv._id,
      title: conv.title,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Clear chat history for a document
// @route DELETE /chat/history
const deleteChatHistory = async (req, res, next) => {
  try {
    const { documentId, conversationId } = req.body;

    let query = { user: req.user._id };
    if (conversationId) query._id = conversationId;
    else if (documentId) query.document = documentId;

    const convs = await Conversation.find(query);
    const convIds = convs.map((c) => c._id);

    await Message.deleteMany({ conversation: { $in: convIds } });
    await Conversation.deleteMany({ _id: { $in: convIds } });

    res.json({ message: 'Conversation history cleared successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  askQuestion,
  getChatHistory,
  deleteChatHistory,
};
