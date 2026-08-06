import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  MessageSquare,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Brain,
  Sun,
  Moon,
  ShieldCheck,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload PDF', path: '/upload', icon: UploadCloud },
    { name: 'Documents', path: '/documents', icon: FileText },
    { name: 'Chat Workspace', path: '/chat', icon: MessageSquare },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const getPageTitle = () => {
    const active = navItems.find((item) => location.pathname.startsWith(item.path));
    return active ? active.name : 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07090e] ambient-bg text-slate-900 dark:text-gray-100 flex overflow-hidden selection:bg-emerald-500 selection:text-gray-950 transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 glass-panel-rich border-r border-slate-200 dark:border-gray-800/70 z-30 flex-shrink-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200 dark:border-gray-800/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Brain className="w-6 h-6 text-gray-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight gradient-text-emerald">FileMind</h1>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-widest uppercase flex items-center space-x-1">
                <span>RAG AI ENGINE</span>
                <Sparkles className="w-2.5 h-2.5" />
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`relative flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-950 font-bold shadow-lg shadow-emerald-500/20'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 hover:bg-slate-200/60 dark:hover:bg-gray-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-gray-950 stroke-[2.5]' : 'text-slate-500 dark:text-gray-400'}`} />
                <span className="truncate">{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute right-2 w-1.5 h-5 rounded-full bg-gray-950"
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Status Badge & User Card */}
        <div className="p-4 border-t border-slate-200 dark:border-gray-800/70 space-y-3">
          <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            <span>Gemini 2.5 Flash Online</span>
          </div>

          <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-100 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md">
              <div className="w-full h-full rounded-full bg-slate-900 dark:bg-gray-950 flex items-center justify-center font-bold text-emerald-400 text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-gray-200 truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition text-xs font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden flex"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-80 bg-white dark:bg-[#0d111a] border-r border-slate-200 dark:border-gray-800 p-5 flex flex-col justify-between h-full"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-gray-950" />
                    </div>
                    <span className="font-bold text-lg gradient-text-emerald">FileMind</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="mt-6 space-y-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition ${
                            isActive
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-950 font-bold shadow-lg'
                              : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 hover:bg-slate-100 dark:hover:bg-gray-800/60'
                          }`
                        }
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-gray-800 space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 glass-panel-rich border-b border-slate-200 dark:border-gray-800/70 px-4 md:px-8 flex items-center justify-between z-20">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-gray-800"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-gray-100 tracking-tight">{getPageTitle()}</h2>
          </div>

          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Strict RAG Guardrails Active</span>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-gray-800/60 border border-slate-300 dark:border-gray-700/60 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition hover:scale-105 shadow-sm"
              title="Toggle Theme Mode"
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-indigo-600" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-[#07090e] ambient-bg transition-colors duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
