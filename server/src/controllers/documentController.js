const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { pushPdfJob, getJobStatus } = require('../queue/redisQueue');

// @desc Upload PDF document
// @route POST /documents/upload
// HTTP status 202 Accepted returned immediately
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const newDoc = await Document.create({
      owner: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filepath: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: 'Pending',
    });

    // Queue processing job in Redis
    await pushPdfJob({
      documentId: newDoc._id.toString(),
      filepath: req.file.path,
      filename: req.file.originalname,
    });

    return res.status(202).json({
      message: 'PDF file uploaded successfully. Processing job queued.',
      document: {
        _id: newDoc._id,
        filename: newDoc.filename,
        originalName: newDoc.originalName,
        size: newDoc.size,
        status: newDoc.status,
        uploadDate: newDoc.uploadDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get all user documents (with search & sorting)
// @route GET /documents
const getDocuments = async (req, res, next) => {
  try {
    const { search, sortBy, order } = req.query;
    const query = { owner: req.user._id };

    if (search) {
      query.originalName = { $regex: search, $options: 'i' };
    }

    const sortOption = {};
    const sortField = sortBy || 'uploadDate';
    const sortOrder = order === 'asc' ? 1 : -1;
    sortOption[sortField] = sortOrder;

    const documents = await Document.find(query).sort(sortOption).lean();

    // Attach chunk counts
    const docIds = documents.map((d) => d._id);
    const chunkCounts = await Chunk.aggregate([
      { $match: { documentId: { $in: docIds } } },
      { $group: { _id: '$documentId', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    chunkCounts.forEach((item) => {
      countMap[item._id.toString()] = item.count;
    });

    const enrichedDocs = documents.map((doc) => ({
      ...doc,
      chunkCount: countMap[doc._id.toString()] || 0,
    }));

    res.json(enrichedDocs);
  } catch (error) {
    next(error);
  }
};

// @desc Get single document by ID
// @route GET /documents/:id
const getDocumentById = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const chunkCount = await Chunk.countDocuments({ documentId: document._id });

    res.json({
      ...document.toObject(),
      chunkCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete document and perform cascade cleanup
// @route DELETE /documents/:id
const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Remove PDF file from disk
    if (fs.existsSync(document.filepath)) {
      try {
        fs.unlinkSync(document.filepath);
      } catch (err) {
        console.warn(`[File Removal Warning] Could not remove ${document.filepath}`);
      }
    }

    // Delete chunks
    await Chunk.deleteMany({ documentId: document._id });

    // Find and delete conversations & messages
    const conversations = await Conversation.find({ document: document._id });
    const convIds = conversations.map((c) => c._id);
    await Message.deleteMany({ conversation: { $in: convIds } });
    await Conversation.deleteMany({ document: document._id });

    // Delete Document
    await Document.findByIdAndDelete(document._id);

    res.json({ message: 'Document and associated data successfully deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc Get document processing status
// @route GET /documents/status/:id
const getDocumentStatus = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const redisStatus = await getJobStatus(document._id.toString());

    res.json({
      documentId: document._id,
      status: redisStatus ? redisStatus.status : document.status,
      pages: document.pages,
      summary: document.summary,
      errorMessage: document.errorMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Search inside document chunks
// @route GET /documents/:id/search
const searchInDocument = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const chunks = await Chunk.find({
      documentId: req.params.id,
      text: { $regex: query, $options: 'i' },
    })
      .select('page text chunkIndex')
      .limit(20);

    res.json(chunks);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  getDocumentStatus,
  searchInDocument,
};
