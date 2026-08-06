const redisClient = require('../config/redis');

const QUEUE_NAME = 'filemind:pdf_processing_queue';
const STATUS_HASH_KEY = 'filemind:job_statuses';

/**
 * Push PDF processing job to queue
 * @param {Object} jobData { documentId, filepath, filename }
 */
const pushPdfJob = async (jobData) => {
  const payload = JSON.stringify(jobData);
  await redisClient.lpush(QUEUE_NAME, payload);
  await redisClient.hset(STATUS_HASH_KEY, jobData.documentId, JSON.stringify({
    status: 'Pending',
    updatedAt: new Date().toISOString(),
  }));
  console.log(`[Redis Queue] Job queued for document: ${jobData.documentId}`);
};

/**
 * Update job status in Redis hash
 */
const updateJobStatus = async (documentId, status, error = null) => {
  await redisClient.hset(STATUS_HASH_KEY, documentId, JSON.stringify({
    status,
    error,
    updatedAt: new Date().toISOString(),
  }));
};

/**
 * Get job status from Redis hash
 */
const getJobStatus = async (documentId) => {
  const data = await redisClient.hget(STATUS_HASH_KEY, documentId);
  return data ? JSON.parse(data) : null;
};

module.exports = {
  QUEUE_NAME,
  STATUS_HASH_KEY,
  pushPdfJob,
  updateJobStatus,
  getJobStatus,
};
