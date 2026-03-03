import React from 'react';
import { X, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { motion } from 'motion/react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const { history, clearHistory } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            Transfer History
          </h2>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No transfer history yet.</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    item.status === 'success' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' 
                      : 'bg-red-500/10 text-red-600 dark:text-red-500'
                  }`}>
                    {item.status === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-slate-900 dark:text-white truncate text-sm">{item.filename}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span className="truncate max-w-[150px]">{item.profileName}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs font-mono text-slate-400 ml-4 hidden sm:block truncate max-w-[150px]">
                  {item.targetPath}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
