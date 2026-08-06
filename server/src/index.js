require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// Security & Utility Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

// Serve static uploaded files if needed
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Healthcheck Route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'FileMind RAG Server', timestamp: new Date() });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/documents', documentRoutes);
app.use('/chat', chatRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

const { startWorker } = require('./workers/pdfWorker');

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 FileMind Backend Server running on port ${PORT}`);
  console.log(`MongoDB URI: ${process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/filemind'}`);
  console.log(`=================================`);

  // Auto-start Redis worker loop in background
  startWorker().catch((err) => console.error('[Worker AutoStart Error]', err.message));
});
