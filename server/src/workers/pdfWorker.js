const connectDB = require('../config/db');
const redisClient = require('../config/redis');
const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const { extractPdfContent, createSemanticChunks } = require('../services/pdfService');
const { generateEmbedding, generateDocumentSummary } = require('../services/geminiService');
const { QUEUE_NAME, updateJobStatus } = require('../queue/redisQueue');

/**
 * Process a single document job
 */
const processDocumentJob = async (documentId, filepath) => {
  console.log(`[Worker] Starting PDF extraction for Document ID: ${documentId}`);

  // 1. Update status to Processing
  await Document.findByIdAndUpdate(documentId, { status: 'Processing' });
  await updateJobStatus(documentId, 'Processing');

  // 2. Extract PDF text & page count
  const { text, pages } = await extractPdfContent(filepath);

  if (!text || text.trim().length === 0) {
    throw new Error('PDF file appears to be empty or unscannable text.');
  }

  // 3. Create semantic chunks (1000 size, 200 overlap)
  const rawChunks = createSemanticChunks(text, pages, 1000, 200);

  // 4. Generate embeddings and save chunks
  const chunkDocs = [];
  for (const rawChunk of rawChunks) {
    const embedding = await generateEmbedding(rawChunk.text);
    chunkDocs.push({
      documentId,
      page: rawChunk.page,
      chunkIndex: rawChunk.chunkIndex,
      text: rawChunk.text,
      embedding,
    });
  }

  // Bulk insert chunks into MongoDB
  await Chunk.deleteMany({ documentId }); // Clean previous if any
  await Chunk.insertMany(chunkDocs);

  // 5. Generate summary
  const summaryText = await generateDocumentSummary(text);

  // 6. Update document status to Completed
  await Document.findByIdAndUpdate(documentId, {
    status: 'Completed',
    pages,
    summary: summaryText,
  });
  await updateJobStatus(documentId, 'Completed');

  console.log(`[Worker SUCCESS] Finished processing document ID ${documentId}: ${chunkDocs.length} chunks generated.`);
};

/**
 * Check and recover any pending documents from database
 */
const recoverPendingDocuments = async () => {
  try {
    const pendingDocs = await Document.find({ status: { $in: ['Pending', 'Processing'] } });
    if (pendingDocs.length > 0) {
      console.log(`[Worker Recovery] Found ${pendingDocs.length} pending/stuck documents in database. Auto-processing...`);
      for (const doc of pendingDocs) {
        try {
          await processDocumentJob(doc._id.toString(), doc.filepath);
        } catch (err) {
          console.error(`[Worker Recovery Error] Document ${doc._id} failed:`, err.message);
          await Document.findByIdAndUpdate(doc._id, {
            status: 'Failed',
            errorMessage: err.message,
          });
          await updateJobStatus(doc._id.toString(), 'Failed', err.message);
        }
      }
    }
  } catch (err) {
    console.error('[Worker Recovery Exception]', err.message);
  }
};

/**
 * Start worker BRPOP queue listener using a dedicated duplicated Redis client connection
 */
const startWorker = async () => {
  await connectDB();
  console.log('[Worker] FileMind PDF Worker initialized and polling Redis queue with BRPOP...');

  // Process any stuck documents from previous sessions
  await recoverPendingDocuments();

  // Create a separate Redis connection for blocking BRPOP calls
  const brpopClient = redisClient.duplicate();

  while (true) {
    try {
      // BRPOP blocks until a job is available (timeout 0 = block indefinitely)
      const res = await brpopClient.brpop(QUEUE_NAME, 0);
      if (!res) continue;

      const [listName, jobDataRaw] = res;
      const job = JSON.parse(jobDataRaw);
      const { documentId, filepath } = job;

      await processDocumentJob(documentId, filepath);
    } catch (err) {
      console.error('[Worker Loop Error]', err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
};

if (require.main === module) {
  require('dotenv').config();
  startWorker();
}

module.exports = { startWorker, processDocumentJob };
