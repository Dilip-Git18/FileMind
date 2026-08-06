import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Download,
  Sparkles,
  Search,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Bot,
  User,
  Loader2,
  Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import { getDocuments, getChatHistory, deleteChatHistory } from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const initialDocId = searchParams.get('documentId');

  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState(initialDocId ? [initialDocId] : []);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentChunkMeta, setCurrentChunkMeta] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [activeThreshold, setActiveThreshold] = useState(() => {
    const saved = localStorage.getItem('filemind_threshold');
    return saved ? parseFloat(saved) : 0.45;
  });

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const suggestedQuestions = [
    'What is the main topic and purpose of this document?',
    'List key findings, total metrics, or recommendations.',
    'Are there specific dates, figures, or amounts mentioned?',
    'Summarize section 1 and executive takeaways.',
  ];

  // Fetch completed documents
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await getDocuments();
        const completedDocs = res.data.filter((d) => d.status === 'Completed');
        setDocuments(completedDocs);

        if (!initialDocId && completedDocs.length > 0 && selectedDocIds.length === 0) {
          setSelectedDocIds([completedDocs[0]._id]);
        }
      } catch (err) {
        toast.error('Failed to load documents.');
      }
    };
    fetchDocs();
  }, [initialDocId]);

  // Load chat history when selected document changes
  useEffect(() => {
    if (selectedDocIds.length > 0) {
      loadHistory(selectedDocIds[0]);
    }
  }, [selectedDocIds]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const loadHistory = async (docId) => {
    try {
      const res = await getChatHistory({ documentId: docId });
      if (res.data.conversationId) {
        setConversationId(res.data.conversationId);
        setMessages(res.data.messages);
      } else {
        setConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('History load error', err);
    }
  };

  const handleDocToggle = (docId) => {
    setSelectedDocIds((prev) => {
      if (prev.includes(docId)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter((id) => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const handleSendMessage = async (customQuestion = null) => {
    const questionText = customQuestion || inputQuestion;
    if (!questionText.trim()) return;
    if (selectedDocIds.length === 0) {
      toast.error('Please select at least one document to query.');
      return;
    }

    const userMsg = { sender: 'user', content: questionText, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    if (!customQuestion) setInputQuestion('');
    setIsStreaming(true);
    setStreamingContent('');
    setCurrentChunkMeta(null);

    const token = localStorage.getItem('filemind_token');

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentIds: selectedDocIds,
          question: questionText,
          conversationId,
          threshold: activeThreshold,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let chunksRefMeta = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'meta') {
                if (parsed.conversationId) setConversationId(parsed.conversationId);
                if (parsed.chunksRef) {
                  chunksRefMeta = parsed.chunksRef;
                  setCurrentChunkMeta(parsed.chunksRef);
                }
              } else if (parsed.chunk) {
                accumulated += parsed.chunk;
                setStreamingContent(accumulated);
              }
            } catch (err) {
              // Ignore non-JSON chunk strings
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          content: accumulated,
          chunksRef: chunksRefMeta,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      toast.error('Failed to receive streaming response from Gemini engine.');
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success('Copied response to clipboard!');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear chat history for this document workspace?')) return;
    try {
      await deleteChatHistory({ documentId: selectedDocIds[0], conversationId });
      setMessages([]);
      setConversationId(null);
      toast.success('Chat history cleared.');
    } catch (err) {
      toast.error('Failed to clear history.');
    }
  };

  const handleExportPDF = () => {
    const element = chatContainerRef.current;
    if (!element) return;

    const opt = {
      margin: 0.5,
      filename: `FileMind-Chat-Export-${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    };

    html2pdf().set(opt).from(element).save();
    toast.success('Exporting chat transcript to PDF...');
  };

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
      {/* Sidebar Pane: Multi-Doc Selector & Prompts */}
      <div className="w-full lg:w-80 glass-panel-rich p-5 rounded-3xl border border-gray-800 flex flex-col justify-between space-y-4 shadow-xl flex-shrink-0">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-gray-800/80 mb-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-gray-200">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Context Documents</span>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
              Multi-Doc RAG
            </span>
          </div>

          <div className="space-y-2 max-h-48 lg:max-h-64 overflow-y-auto pr-1">
            {documents.length === 0 ? (
              <p className="text-xs text-gray-500 p-2 text-center">No completed documents available.</p>
            ) : (
              documents.map((doc) => {
                const isSelected = selectedDocIds.includes(doc._id);
                return (
                  <button
                    key={doc._id}
                    onClick={() => handleDocToggle(doc._id)}
                    className={`w-full text-left p-3 rounded-2xl border text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 font-bold shadow-md'
                        : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <FileText className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-emerald-400' : 'text-gray-500'}`} />
                      <span className="truncate">{doc.originalName}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Suggested Prompt Chips */}
        <div className="pt-4 border-t border-gray-800/80 space-y-2.5">
          <p className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Suggested Questions</span>
          </p>
          <div className="space-y-2">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="w-full text-left p-2.5 rounded-xl bg-gray-950/60 hover:bg-gray-900 text-[11px] text-gray-300 hover:text-emerald-300 border border-gray-800/80 transition line-clamp-2 leading-relaxed"
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-gray-800/80 flex items-center justify-between">
          <button
            onClick={handleExportPDF}
            className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-emerald-400 text-xs font-bold flex items-center space-x-1.5 transition"
            title="Export Chat to PDF"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleClearHistory}
            className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-bold flex items-center space-x-1.5 transition"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Main RAG Workspace */}
      <div className="flex-1 glass-panel-rich rounded-3xl border border-gray-800 flex flex-col min-h-0 overflow-hidden relative shadow-2xl">
        {/* Top Workspace Header */}
        <div className="px-6 py-3.5 border-b border-gray-800/80 bg-gray-950/60 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-gray-100 block">Gemini 2.5 Flash RAG Stream</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Strict Context Enforcement</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <span className="text-gray-400">Similarity Threshold: <strong className="text-emerald-400 font-mono">{activeThreshold}</strong></span>
            {messages.length > 0 && (
              <button
                onClick={handleRegenerate}
                className="text-emerald-400 hover:underline font-bold flex items-center space-x-1 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Feed Area */}
        <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.length === 0 && !isStreaming ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4 p-8">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Sparkles className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-200">FileMind AI Workspace</h3>
              <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                Ask any question regarding your uploaded PDFs. Gemini generates answers strictly from retrieved 3072-dimensional vector chunks.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-1 shadow-md">
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-3xl p-5 border space-y-3 relative group ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-500 text-gray-950 font-medium rounded-tr-none shadow-lg shadow-emerald-950/40'
                      : 'bg-gray-950/80 border-gray-800 text-gray-100 rounded-tl-none glass-card-interactive shadow-lg'
                  }`}
                >
                  <div className="markdown-body">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>

                  {/* Context Chunk References Badges */}
                  {msg.chunksRef && msg.chunksRef.length > 0 && (
                    <div className="pt-3 border-t border-gray-800/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                        Retrieved Context Chunks ({msg.chunksRef.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.chunksRef.map((c, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-xl bg-gray-900 border border-gray-800 text-[10px] text-gray-300 font-mono shadow-sm"
                            title={c.textSnippet}
                          >
                            Page {c.page} (Score: {(c.score * 100).toFixed(0)}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Copy Button */}
                  {msg.sender === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
                      title="Copy response"
                    >
                      {copiedIdx === idx ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-9 h-9 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-300 flex-shrink-0 mt-1 shadow-md">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </motion.div>
            ))
          )}

          {/* Active Streaming Token Animation */}
          {isStreaming && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-1 shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div className="max-w-[85%] rounded-3xl rounded-tl-none p-5 glass-card-interactive border border-emerald-500/40 text-gray-100 space-y-3 shadow-glow-emerald">
                <div className="markdown-body">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1" />
                </div>

                {currentChunkMeta && (
                  <div className="pt-2 border-t border-gray-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400">
                      Context Matched Top {currentChunkMeta.length} Vector Chunks
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-800/80 bg-gray-950/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ask a question about your uploaded document..."
              disabled={isStreaming}
              className="flex-1 glass-input rounded-2xl py-3.5 px-5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isStreaming || !inputQuestion.trim()}
              className="btn-primary-glow px-6 py-3.5 rounded-2xl text-xs font-bold disabled:opacity-40 flex items-center space-x-2"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
