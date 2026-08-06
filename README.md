# FileMind – AI-Powered Document Q&A System

FileMind is a production-ready, full-stack RAG (Retrieval-Augmented Generation) application designed to process uploaded PDF documents asynchronously, extract semantic chunks, generate vector embeddings using Google Gemini (`gemini-embedding-001`), store vectors in MongoDB, and answer queries strictly without hallucination using `gemini-2.5-flash` with Server-Sent Events (SSE) streaming responses.

---

## Architecture Overview

```
+------------------+         +------------------+
| React 18 + Vite  | <-----> | Node.js Express  |
| Tailwind CSS UI  |   SSE   | API Gateway      |
+------------------+         +--------+---------+
                                      |
                     +----------------+----------------+
                     |                                 |
           +---------v--------+              +---------v--------+
           | MongoDB Database |              | Redis BRPOP Queue|
           | Chunks & Vectors |              +---------+--------+
           +------------------+                        |
                                             +---------v--------+
                                             | Standalone Worker|
                                             | pdf-parse & Embed|
                                             +---------+--------+
                                                       |
                                             +---------v--------+
                                             | Google Gemini    |
                                             | API Platform     |
                                             +------------------+
```

---

## Key Features

- **JWT Authentication**: Register, Login, Token persistence, and Protected workspace routes.
- **Asynchronous PDF Processing**: PDF text extraction via `pdf-parse`, chunking into 1000-character segments with 200-character overlap.
- **Redis Worker Queue**: Background worker using `BRPOP` blocking queue for fault-tolerant document processing and restart resilience.
- **Vector Search Engine**: Cosine similarity calculations on MongoDB chunks with a strict 0.70 threshold.
- **Strict Hallucination Prevention**: Prevents AI from fabricating facts. If retrieved context is insufficient, returns `"I couldn't find relevant information in your uploaded document."`
- **Server-Sent Events (SSE)**: Real-time token streaming for Q&A responses using `gemini-2.5-flash`.
- **Rich Interactive UI**: Modern dark theme glassmorphism with Framer Motion, Toast notifications, Markdown rendering, Export chat to PDF, and Multi-Document Context selection.

---

## Folder Structure

```
FileMind/
├── client/                     # Vite + React 18 Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── context/            # Auth & Theme Context providers
│   │   ├── layouts/            # Dashboard Sidebar Layout
│   │   ├── pages/              # Dashboard, Upload, Documents, Chat, Profile, Settings
│   │   ├── services/           # Axios API services
│   │   ├── App.jsx             # React Router setup
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Tailwind custom styles & glassmorphism
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── server/                     # Express.js Backend & Redis Worker
│   ├── src/
│   │   ├── config/             # DB (Mongoose), Redis, Gemini config
│   │   ├── controllers/        # Auth, Document, Chat controllers
│   │   ├── middleware/         # Auth JWT, Multer Upload, Rate limiting, Errors
│   │   ├── models/             # User, Document, Chunk, Conversation, Message
│   │   ├── queue/              # Redis LPUSH / BRPOP queue manager
│   │   ├── routes/             # Express API routes
│   │   ├── services/           # PDF parsing, Gemini embedding, RAG similarity engine
│   │   ├── workers/            # Independent Redis BRPOP background worker
│   │   └── index.js            # Express server entry point
│   ├── uploads/                # Local PDF storage directory
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
├── docker-compose.yml          # Multi-container Docker orchestration
└── README.md
```

---

## Quick Start & Installation

### Prerequisites

- **Node.js**: v18.0.0 or higher installed.
- **MongoDB Community Edition**: Running locally at `mongodb://127.0.0.1:27017/filemind`.
- **Redis**: Running locally at `127.0.0.1:6379`.

---

### Step 1: Clone & Configure Environment

```bash
# Navigate to the server folder
cd server

# Copy environment template
cp .env.example .env
```

Open `server/.env` and add your Google Gemini API Key:

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/filemind
JWT_SECRET=filemind_super_secret_jwt_key_2026
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
GEMINI_API_KEY=YOUR_ACTUAL_GEMINI_API_KEY_HERE
UPLOAD_PATH=uploads/
```

---

### Step 2: Local Services (MongoDB & Redis)

#### Start MongoDB:
```bash
# On macOS (Homebrew):
brew services start mongodb-community@7.0

# Or run direct mongod:
mongod --config /usr/local/etc/mongod.conf
```

#### Start Redis:
```bash
# On macOS (Homebrew):
brew services start redis

# Or run direct redis-server:
redis-server
```

---

### Step 3: Install Dependencies & Run Server

In terminal 1 (Backend Server):
```bash
cd server
npm install
npm run dev
```

In terminal 2 (Redis Worker):
```bash
cd server
npm run worker:dev
```

In terminal 3 (Frontend Client):
```bash
cd client
npm install
npm run dev
```

Open your browser and navigate to: `http://localhost:3000`

---

## API Documentation

### Authentication
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Authenticate and obtain JWT token
- `GET /auth/profile` - Fetch authenticated user info & system stats
- `PUT /auth/profile` - Update user name/password

### Documents
- `POST /documents/upload` - Upload PDF (returns HTTP 202 Accepted & queues Redis job)
- `GET /documents` - List user documents with sorting & filtering
- `GET /documents/:id` - Get document details & chunk metrics
- `GET /documents/status/:id` - Polling status of background processing job
- `GET /documents/:id/search` - Keyword search inside document chunks
- `DELETE /documents/:id` - Cascade delete document, chunks, embeddings, and chat history

### Chat & RAG Q&A
- `POST /chat` - Stream response via Server-Sent Events (SSE) using Gemini 2.5 Flash
- `GET /chat/history` - Fetch conversation message history
- `DELETE /chat/history` - Clear conversation history

---

## Docker Deployment

To launch all services (MongoDB, Redis, Server, Worker, Client) in containerized environment:

```bash
docker-compose up --build
```

---

## Troubleshooting

1. **MongoDB Connection Failed**: Ensure local MongoDB daemon is running at port 27017 (`mongod` or `brew services start mongodb-community`).
2. **Redis Connection Error**: Ensure Redis server is active on port 6379 (`redis-cli ping` should return `PONG`).
3. **Gemini API Errors**: Verify your API key has permissions for `gemini-2.5-flash` and `gemini-embedding-001` / `text-embedding-004`.

---

## License

MIT License. Designed & Built for Production RAG Workflows.
