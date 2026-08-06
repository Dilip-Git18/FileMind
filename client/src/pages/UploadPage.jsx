import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  X,
  FileCheck,
} from 'lucide-react';
import { uploadDocument, getDocumentStatus } from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      toast.error('Only PDF documents are allowed!');
      return false;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error('File size exceeds maximum 20MB limit!');
      return false;
    }
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const pollJobStatus = (docId) => {
    const interval = setInterval(async () => {
      try {
        const res = await getDocumentStatus(docId);
        const currentStatus = res.data.status;
        setJobStatus({ documentId: docId, status: currentStatus });

        if (currentStatus === 'Completed') {
          clearInterval(interval);
          setUploading(false);
          toast.success('Document processed and vector embeddings indexed!');
          setTimeout(() => {
            navigate(`/chat?documentId=${docId}`);
          }, 1000);
        } else if (currentStatus === 'Failed') {
          clearInterval(interval);
          setUploading(false);
          toast.error(res.data.errorMessage || 'Document processing failed.');
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2000);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a PDF document first.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setJobStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadDocument(formData, (percent) => {
        setProgress(percent);
      });

      if (res.status === 202) {
        const doc = res.data.document;
        toast.success('PDF uploaded! Redis worker job initialized.');
        setJobStatus({ documentId: doc._id, status: 'Pending' });
        pollJobStatus(doc._id);
      }
    } catch (err) {
      setUploading(false);
      toast.error(err.response?.data?.error || 'Failed to upload document.');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Semantic Vector Embedding Pipeline</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-100 tracking-tight">Upload PDF Document</h1>
        <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
          Upload PDF files up to 20MB. Text is chunked into 1000-character segments and embedded into 3072-dim vectors via Redis BRPOP worker queue.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel-rich p-8 rounded-3xl border border-gray-800/80 space-y-6 shadow-2xl"
      >
        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-10 md:p-12 text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
            dragActive
              ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
              : 'border-gray-700/80 bg-gray-950/60 hover:border-emerald-500/60 hover:bg-gray-900/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 border border-emerald-500/40 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/10">
            <UploadCloud className="w-10 h-10 text-emerald-400" />
          </div>

          <h3 className="text-xl font-bold text-gray-100 mb-1">
            {file ? file.name : 'Drag & Drop PDF file here'}
          </h3>
          <p className="text-xs text-gray-400 mb-5">
            {file ? `${formatBytes(file.size)} • Ready to process` : 'or click to browse PDF files from your computer'}
          </p>

          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Maximum size 20MB • PDF format only</span>
          </div>
        </div>

        {/* Selected File Card */}
        {file && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card-interactive p-5 rounded-2xl border border-gray-800 flex items-center justify-between"
          >
            <div className="flex items-center space-x-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-gray-100 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {!uploading && (
                <button
                  onClick={() => setFile(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition"
                  title="Remove File"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-primary-glow px-6 py-3 rounded-xl flex items-center space-x-2 text-xs font-bold disabled:opacity-50"
              >
                <span>{uploading ? 'Processing Job...' : 'Upload & Process PDF'}</span>
                {!uploading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}

        {/* Progress & Pipeline Step Indicators */}
        {uploading && (
          <div className="space-y-5 p-6 rounded-2xl bg-gray-950/80 border border-gray-800 shadow-inner">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-300">HTTP Upload Progress</span>
              <span className="text-emerald-400 font-mono">{progress}%</span>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden p-0.5 border border-gray-800">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-300 shadow-glow-emerald"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Redis Pipeline Status Tracker */}
            {jobStatus && (
              <div className="pt-4 border-t border-gray-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span className="text-gray-300">
                      Redis Queue Job Status: <strong className="text-emerald-400 font-bold">{jobStatus.status}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gray-900 border border-gray-800 text-gray-400">
                    BRPOP Polling Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
                    <span className="text-emerald-400 font-bold block">1. File Saved</span>
                    <span className="text-gray-400">Local Uploads</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
                    <span className="text-emerald-400 font-bold block">2. Text Parsed</span>
                    <span className="text-gray-400">pdf-parse Engine</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
                    <span className="text-emerald-400 font-bold block">3. Chunked & Embedded</span>
                    <span className="text-gray-400">Gemini Embedding</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 text-center">
                    <span className="text-emerald-400 font-bold block">4. Mongo Vector DB</span>
                    <span className="text-gray-400">3072-Dim Vectors</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
