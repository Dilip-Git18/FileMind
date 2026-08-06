import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Trash2,
  Search,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileCheck,
  Calendar,
  Layers,
  Info,
  Filter,
} from 'lucide-react';
import { getDocuments, deleteDocument, searchDocumentContent } from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('uploadDate');
  const [order, setOrder] = useState('desc');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [innerSearchQuery, setInnerSearchQuery] = useState('');
  const [innerSearchResults, setInnerSearchResults] = useState([]);
  const [searchingInner, setSearchingInner] = useState(false);

  const fetchDocs = async () => {
    try {
      const res = await getDocuments({ search: searchTerm, sortBy, order });
      setDocuments(res.data);
    } catch (err) {
      toast.error('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [searchTerm, sortBy, order]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will permanently remove all vector embeddings and chat history.`)) {
      return;
    }
    try {
      await deleteDocument(id);
      toast.success('Document deleted successfully.');
      if (selectedDoc?._id === id) setSelectedDoc(null);
      fetchDocs();
    } catch (err) {
      toast.error('Failed to delete document.');
    }
  };

  const handleInnerSearch = async (e) => {
    e.preventDefault();
    if (!innerSearchQuery.trim() || !selectedDoc) return;
    setSearchingInner(true);
    try {
      const res = await searchDocumentContent(selectedDoc._id, innerSearchQuery);
      setInnerSearchResults(res.data);
    } catch (err) {
      toast.error('Search failed inside document.');
    } finally {
      setSearchingInner(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Document Workspace</h1>
          <p className="text-xs text-gray-400">Manage vector-indexed PDF documents, view summaries, and search content</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by filename..."
              className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-100 placeholder-gray-500 focus:outline-none"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="glass-input rounded-xl py-2.5 px-3 text-xs text-gray-200 focus:outline-none"
            >
              <option value="uploadDate">Sort by Date</option>
              <option value="originalName">Sort by Name</option>
              <option value="size">Sort by Size</option>
            </select>

            <select
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="glass-input rounded-xl py-2.5 px-3 text-xs text-gray-200 focus:outline-none"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="p-16 text-center text-gray-400 flex items-center justify-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Fetching documents...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="glass-panel-rich p-12 rounded-3xl border border-gray-800 text-center text-gray-500 space-y-3">
          <FileText className="w-12 h-12 mx-auto text-gray-600" />
          <p className="text-lg font-bold text-gray-200">No documents found</p>
          <p className="text-xs text-gray-400">Upload a PDF document to begin RAG vector search</p>
          <Link
            to="/upload"
            className="mt-2 inline-block btn-primary-glow px-6 py-2.5 rounded-xl text-xs font-bold"
          >
            Upload PDF Now
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <motion.div
              key={doc._id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card-interactive p-6 rounded-3xl border border-gray-800 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    {doc.status === 'Completed' && (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    )}
                    {(doc.status === 'Pending' || doc.status === 'Processing') && (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{doc.status}</span>
                      </span>
                    )}
                    {doc.status === 'Failed' && (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Failed</span>
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-gray-100 truncate text-base mb-1.5" title={doc.originalName}>
                  {doc.originalName}
                </h3>
                <div className="flex items-center space-x-2 text-xs text-gray-400 font-medium">
                  <span>{formatSize(doc.size)}</span>
                  <span>•</span>
                  <span>{doc.pages || 0} Pages</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">{doc.chunkCount || 0} Chunks</span>
                </div>

                {doc.summary && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-gray-950/70 border border-gray-800 text-xs text-gray-300 line-clamp-3">
                    <div className="flex items-center space-x-1 text-emerald-400 font-bold mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Summary</span>
                    </div>
                    {doc.summary}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center justify-between">
                <button
                  onClick={() => setSelectedDoc(doc)}
                  className="text-xs font-bold text-gray-300 hover:text-emerald-400 transition flex items-center space-x-1"
                >
                  <Info className="w-4 h-4 text-emerald-400" />
                  <span>View Details</span>
                </button>

                <div className="flex items-center space-x-2">
                  <Link
                    to={`/chat?documentId=${doc._id}`}
                    className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition"
                    title="Open RAG Workspace"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => handleDelete(doc._id, doc.originalName)}
                    className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Details & Search Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel-rich w-full max-w-2xl max-h-[85vh] rounded-3xl border border-gray-800 p-6 md:p-8 overflow-y-auto space-y-6 relative shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-100">{selectedDoc.originalName}</h3>
                    <p className="text-xs text-gray-400 font-mono">ID: {selectedDoc._id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-gray-950/80 border border-gray-800 space-y-1">
                  <span className="text-gray-400 block font-medium">File Size</span>
                  <strong className="text-gray-100 text-sm font-bold">{formatSize(selectedDoc.size)}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-gray-950/80 border border-gray-800 space-y-1">
                  <span className="text-gray-400 block font-medium">Pages</span>
                  <strong className="text-gray-100 text-sm font-bold">{selectedDoc.pages}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-gray-950/80 border border-gray-800 space-y-1">
                  <span className="text-gray-400 block font-medium">Vector Chunks</span>
                  <strong className="text-emerald-400 text-sm font-bold">{selectedDoc.chunkCount}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-gray-950/80 border border-gray-800 space-y-1">
                  <span className="text-gray-400 block font-medium">Upload Date</span>
                  <strong className="text-gray-100 text-sm font-bold">{new Date(selectedDoc.uploadDate).toLocaleDateString()}</strong>
                </div>
              </div>

              {/* AI Summary Card */}
              {selectedDoc.summary && (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Gemini Executive Summary</span>
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-line font-medium">{selectedDoc.summary}</p>
                </div>
              )}

              {/* Inner Document Keyword Search */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-gray-200">Search Inside PDF Content</h4>
                <form onSubmit={handleInnerSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={innerSearchQuery}
                    onChange={(e) => setInnerSearchQuery(e.target.value)}
                    placeholder="Search keywords (e.g. 'amount', 'tax', 'receipt')..."
                    className="flex-1 glass-input rounded-xl px-4 py-2.5 text-xs text-gray-100 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={searchingInner}
                    className="btn-primary-glow px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    {searchingInner ? 'Searching...' : 'Search'}
                  </button>
                </form>

                {innerSearchResults.length > 0 && (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {innerSearchResults.map((res, i) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-gray-950/90 border border-gray-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-gray-400 text-[10px] font-bold">
                          <span>Page {res.page}</span>
                          <span>Chunk #{res.chunkIndex}</span>
                        </div>
                        <p className="text-gray-200 leading-relaxed">{res.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
