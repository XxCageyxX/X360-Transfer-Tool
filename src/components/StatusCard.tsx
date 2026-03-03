import React from 'react';
import { motion } from 'motion/react';

interface StatusCardProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  completed: boolean;
  progress: number;
}

export default function StatusCard({ icon, label, active, completed, progress }: StatusCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
      active ? 'bg-blue-50 dark:bg-slate-900 border-blue-500/50 shadow-lg shadow-blue-500/10' : 
      completed ? 'bg-emerald-50 dark:bg-slate-900/50 border-emerald-500/30' : 
      'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-60'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${active ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : completed ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
          {icon}
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{Math.round(progress)}%</span>
      </div>
      <h3 className={`text-sm font-medium ${active || completed ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{label}</h3>
      
      {/* Progress Bar */}
      <div className="mt-3 h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          className={`h-full ${completed ? 'bg-emerald-500' : 'bg-blue-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
