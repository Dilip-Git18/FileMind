import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  Cpu,
  HardDrive,
  UploadCloud,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDocuments } from '../services/api';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { user, stats, refreshProfile } = useAuth();
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      await refreshProfile();
      const res = await getDocuments({ sortBy: 'uploadDate', order: 'desc' });
      setRecentDocs(res.data.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 8000);
    return () => clearInterval(interval);
  }, []);

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const statCards = [
    {
      title: 'Total Documents',
      value: stats?.totalDocuments || 0,
      subtext: 'Indexed PDF Files',
      icon: FileText,
      gradient: 'from-emerald-500 to-teal-400',
      glow: 'shadow-glow-emerald',
    },
    {
      title: 'Total Chats',
      value: stats?.totalChats || 0,
      subtext: 'RAG Conversations',
      icon: MessageSquare,
      gradient: 'from-cyan-500 to-blue-500',
      glow: 'shadow-glow-cyan',
    },
    {
      title: 'Processing Jobs',
      value: stats?.processingJobs || 0,
      subtext: 'Redis Worker Queue',
      icon: Cpu,
      gradient: 'from-amber-500 to-orange-500',
      glow: 'shadow-amber-500/10',
    },
    {
      title: 'Storage Used',
      value: formatSize(stats?.storageUsedBytes),
      subtext: 'Local Storage Occupied',
      icon: HardDrive,
      gradient: 'from-violet-500 to-purple-500',
      glow: 'shadow-glow-violet',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel-rich p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-gray-800/80 relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-3 z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Gemini 2.5 Flash RAG Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-gray-100 tracking-tight">
            Welcome back, <span className="gradient-text-emerald">{user?.name || 'Developer'}</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed">
            Upload PDF documents, extract 1000-char semantic vectors via Redis BRPOP worker, and perform zero-hallucination document query retrieval.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10 w-full lg:w-auto">
          <Link
            to="/upload"
            className="btn-primary-glow px-6 py-3.5 rounded-2xl flex items-center justify-center space-x-2 text-sm font-bold w-full sm:w-auto"
          >
            <UploadCloud className="w-5 h-5" />
            <span>Upload PDF</span>
          </Link>
          <Link
            to="/chat"
            className="bg-slate-200 dark:bg-gray-900/80 hover:bg-slate-300 dark:hover:bg-gray-800 border border-slate-300 dark:border-gray-700/80 text-slate-800 dark:text-gray-200 font-bold px-6 py-3.5 rounded-2xl flex items-center justify-center space-x-2 transition text-sm w-full sm:w-auto shadow-sm"
          >
            <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Chat Workspace</span>
          </Link>
        </div>
      </motion.div>

      {/* Dashboard Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`glass-card-interactive p-6 rounded-2xl border border-slate-200 dark:border-gray-800/80 flex flex-col justify-between ${card.glow}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">{card.title}</p>
                  <h3 className="text-3xl font-extrabold text-slate-900 dark:text-gray-100">{card.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.gradient} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-gray-950 stroke-[2.2]" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-gray-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
                <span>{card.subtext}</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Documents Table */}
      <div className="glass-panel-rich rounded-3xl border border-slate-200 dark:border-gray-800/80 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-200 dark:border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">Recent Documents</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">Real-time status of uploaded PDF files</p>
            </div>
          </div>

          <Link
            to="/documents"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 transition"
          >
            <span>View All Documents</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-gray-400 flex items-center justify-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="text-sm font-medium">Fetching documents...</span>
          </div>
        ) : recentDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-gray-500 space-y-3">
            <FileText className="w-12 h-12 mx-auto text-slate-400 dark:text-gray-600" />
            <p className="text-base font-semibold text-slate-700 dark:text-gray-300">No documents uploaded yet.</p>
            <Link to="/upload" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-block">
              Upload your first PDF
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-gray-300">
              <thead className="bg-slate-100 dark:bg-gray-950/80 text-[11px] uppercase font-bold text-slate-600 dark:text-gray-400 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4">Filename</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Pages</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Upload Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800/60">
                {recentDocs.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-100/60 dark:hover:bg-gray-800/30 transition">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-gray-100 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="truncate max-w-xs font-semibold">{doc.originalName}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-gray-400 text-xs">{formatSize(doc.size)}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-gray-400 text-xs">{doc.pages || '-'}</td>
                    <td className="px-6 py-4">
                      {doc.status === 'Completed' && (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                      )}
                      {(doc.status === 'Pending' || doc.status === 'Processing') && (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{doc.status}</span>
                        </span>
                      )}
                      {doc.status === 'Failed' && (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-gray-400 text-xs">
                      {new Date(doc.uploadDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/chat?documentId=${doc._id}`}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30 transition"
                      >
                        <span>Chat</span>
                        <MessageSquare className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
