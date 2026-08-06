import React, { useState } from 'react';
import { User, Mail, Lock, Shield, CheckCircle2, Save, Sparkles, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, stats, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name };
      if (password.trim()) payload.password = password;
      await updateProfile(payload);
      await refreshProfile();
      toast.success('Profile updated successfully!');
      setPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">User Profile & Account</h1>
        <p className="text-xs text-gray-400">Manage credentials, security parameters, and workspace stats</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Stats Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel-rich p-6 rounded-3xl border border-gray-800 text-center space-y-5 shadow-2xl flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-1 shadow-lg shadow-emerald-500/25">
              <div className="w-full h-full rounded-full bg-gray-950 flex items-center justify-center text-emerald-400 font-extrabold text-3xl">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg text-gray-100">{user?.name}</h3>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800 text-left space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-gray-800/60">
              <span className="text-gray-400 font-medium">Account Tier</span>
              <strong className="text-emerald-400 font-bold flex items-center space-x-1">
                <Award className="w-3.5 h-3.5" />
                <span>Developer Pro</span>
              </strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-800/60">
              <span className="text-gray-400 font-medium">Indexed PDFs</span>
              <strong className="text-gray-200 font-bold">{stats?.totalDocuments || 0} Files</strong>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-400 font-medium">Active Conversations</span>
              <strong className="text-gray-200 font-bold">{stats?.totalChats || 0} Chats</strong>
            </div>
          </div>
        </motion.div>

        {/* Update Form */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2 glass-panel-rich p-6 md:p-8 rounded-3xl border border-gray-800 space-y-6 shadow-2xl"
        >
          <h3 className="font-bold text-lg text-gray-100 flex items-center space-x-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span>Account & Security Settings</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Full Name</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input rounded-2xl py-3.5 pl-12 pr-4 text-sm text-gray-100 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full glass-input rounded-2xl py-3.5 pl-12 pr-4 text-sm text-gray-500 cursor-not-allowed opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">New Password (Optional)</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full glass-input rounded-2xl py-3.5 pl-12 pr-4 text-sm text-gray-100 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary-glow px-6 py-3.5 rounded-2xl text-xs font-bold disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
