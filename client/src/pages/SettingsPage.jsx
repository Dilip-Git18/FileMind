import React, { useState } from 'react';
import { Settings, Sliders, ShieldCheck, Sun, Moon, Database, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [threshold, setThreshold] = useState(() => {
    const saved = localStorage.getItem('filemind_threshold');
    return saved ? parseFloat(saved) : 0.45;
  });
  const [chunkSize, setChunkSize] = useState(1000);
  const [overlap, setOverlap] = useState(200);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('filemind_threshold', threshold);
    toast.success('RAG Configuration updated successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Application Settings</h1>
        <p className="text-xs text-gray-400">Configure RAG model parameters, similarity threshold, and interface preferences</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel-rich p-6 md:p-8 rounded-3xl border border-gray-800 space-y-6 shadow-2xl"
      >
        <h3 className="font-bold text-lg text-gray-100 flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <span>Vector Search & Cosine Threshold Config</span>
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="space-y-3 p-5 rounded-2xl bg-gray-950/80 border border-gray-800">
            <div className="flex justify-between items-center text-sm font-bold">
              <label className="text-gray-200">Cosine Similarity Threshold</label>
              <span className="text-emerald-400 font-mono text-base">{threshold}</span>
            </div>
            <input
              type="range"
              min="0.40"
              max="0.95"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-gray-900 rounded-lg h-2 cursor-pointer"
            />
            <p className="text-xs text-gray-400 leading-relaxed">
              Queries with vector similarity scores below <strong className="text-emerald-400">{threshold}</strong> will trigger hallucination prevention and return: <em>"I couldn't find relevant information in your uploaded document."</em>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-gray-950/80 border border-gray-800 space-y-1">
              <span className="text-xs text-gray-400 block font-bold">Semantic Chunk Size</span>
              <strong className="text-gray-100 text-sm font-extrabold">{chunkSize} characters</strong>
              <p className="text-[11px] text-gray-500">Character window per chunk during PDF parsing.</p>
            </div>
            <div className="p-5 rounded-2xl bg-gray-950/80 border border-gray-800 space-y-1">
              <span className="text-xs text-gray-400 block font-bold">Chunk Overlap</span>
              <strong className="text-gray-100 text-sm font-extrabold">{overlap} characters</strong>
              <p className="text-[11px] text-gray-500">Overlap between adjacent semantic chunks.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-gray-300">Theme Mode:</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs font-bold text-gray-200 hover:text-white flex items-center space-x-2 transition"
              >
                {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              </button>
            </div>

            <button
              type="submit"
              className="btn-primary-glow px-6 py-3 rounded-xl text-xs font-bold"
            >
              Save Settings
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
