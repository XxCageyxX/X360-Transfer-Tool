import React, { useEffect, useState } from 'react';
import { Server, AlertTriangle, Settings, Moon, Sun, Power, History } from 'lucide-react';
import SettingsModal from './SettingsModal';
import HistoryModal from './HistoryModal';

export default function Header() {
  const [isDark, setIsDark] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleQuit = async () => {
    if (confirm('Are you sure you want to quit the application?')) {
        try {
            await fetch('/api/shutdown', { method: 'POST' });
            // Replace body content to indicate shutdown
            document.body.innerHTML = `
                <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;background-color:${isDark ? '#0f172a' : '#f8fafc'};color:${isDark ? '#e2e8f0' : '#1e293b'};font-family:sans-serif;">
                    <h1 style="font-size:2rem;margin-bottom:1rem;">Application Stopped</h1>
                    <p>You can now close this tab.</p>
                </div>
            `;
            window.close(); // Attempt to close, though browsers may block this
        } catch (e) {
            console.error('Failed to quit:', e);
            alert('Failed to shutdown server. It may already be stopped.');
        }
    }
  };

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Server className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">X360 Transfer Tool</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Upload, Extract, and FTP Manager</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full hidden sm:flex">
              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-500" />
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-500">Use only for legal backups</span>
          </div>

          <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="History"
              onClick={() => setShowHistory(true)}
          >
              <History className="w-5 h-5" />
          </button>

          <button 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Settings"
              onClick={() => setShowSettings(true)}
          >
              <Settings className="w-5 h-5" />
          </button>

          <button 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
              title="Quit App"
              onClick={handleQuit}
          >
              <Power className="w-5 h-5" />
          </button>
        </div>
      </header>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </>
  );
}
