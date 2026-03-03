import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { FtpProfile } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fileName?: string;
  profile: FtpProfile | null;
  customSubfolder: string;
}

export default function ConfirmationModal({ isOpen, onClose, onConfirm, fileName, profile, customSubfolder }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 dark:bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-amber-500">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Transfer</h3>
          </div>
          
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>You are about to start the following operation:</p>
            
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg space-y-2 border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase">File</span>
                <span className="truncate font-mono text-blue-600 dark:text-blue-400">
                    {fileName}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase">Destination</span>
                <span className="font-mono text-purple-600 dark:text-purple-400 break-all">
                  {profile ? (
                    <>
                      {profile.user}@{profile.host}:{profile.remotePath.replace(/\/+$/, '')}/{customSubfolder ? customSubfolder.replace(/^\/+/, '') : ''}
                    </>
                  ) : 'No profile selected'}
                </span>
              </div>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-xs">
              This process will upload the file, extract it, and transfer it to your Xbox 360. 
              Existing files in the destination folder might be overwritten.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 p-4 flex gap-3 justify-end border-t border-slate-200 dark:border-slate-800">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-colors text-sm font-medium"
          >
            Start Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
