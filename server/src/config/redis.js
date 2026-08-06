const Redis = require('ioredis');

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  retryStrategy(times) {
    const delay = Math.min(times * 1000, 3000);
    return delay;
  },
  maxRetriesPerRequest: null,
});

redisClient.on('connect', () => {
  console.log(`[Redis] Connected to ${redisHost}:${redisPort}`);
});

redisClient.on('error', (err) => {
  console.error('[Redis Error]', err.message);
});

module.exports = redisClient;
