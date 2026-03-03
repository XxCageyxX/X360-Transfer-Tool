import React from 'react';
import { motion } from 'motion/react';
import { Server } from 'lucide-react';

export default function SplashScreen() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
          <div className="relative p-6 bg-slate-900 rounded-2xl border border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
            <Server className="w-16 h-16 text-emerald-500" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
            X360 Transfer Tool
          </h1>
          <p className="text-slate-500 text-sm font-medium tracking-wide uppercase">
            Initializing System
          </p>
        </div>

        {/* Loading Bar */}
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-4">
          <motion.div 
            className="h-full bg-emerald-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 4.5, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      <div className="absolute bottom-8 text-slate-600 text-xs font-mono">
        v1.0.0 • Secure Connection
      </div>
    </motion.div>
  );
}
