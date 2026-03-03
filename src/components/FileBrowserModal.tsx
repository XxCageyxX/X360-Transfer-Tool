import React, { useState, useEffect } from 'react';
import { X, Folder, File, ArrowUp, RefreshCw, Loader2, Trash2, FolderPlus, Check } from 'lucide-react';
import { FtpProfile } from '../types';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface FileEntry {
  name: string;
  type: 1 | 2; // 1=File, 2=Directory (basic-ftp types)
  size: number;
  date: string;
}

interface FileBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket: any;
  profile: FtpProfile | null;
  onSelectPath: (path: string) => void;
}

export default function FileBrowserModal({ isOpen, onClose, socket, profile, onSelectPath }: FileBrowserModalProps) {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      // Reset path to profile default or root
      setCurrentPath(profile.remotePath || '/');
      fetchFiles(profile.remotePath || '/');
    }
  }, [isOpen, profile]);

  useEffect(() => {
    if (!socket) return;

    const handleList = (data: { path: string, list: any[] }) => {
      // Basic-ftp returns objects, we map them to our interface if needed
      // Assuming data.list contains standard FTP list objects
      setFiles(data.list);
      setCurrentPath(data.path);
      setIsLoading(false);
    };

    const handleError = (err: string) => {
      toast.error(err);
      setIsLoading(false);
    };

    const handleSuccess = (msg: string) => {
      toast.success(msg);
      fetchFiles(currentPath); // Refresh
    };

    socket.on('ftp-list-success', handleList);
    socket.on('ftp-error', handleError); // General error handler might conflict, ensure specific event if possible
    socket.on('ftp-action-success', handleSuccess);

    return () => {
      socket.off('ftp-list-success', handleList);
      socket.off('ftp-error', handleError);
      socket.off('ftp-action-success', handleSuccess);
    };
  }, [socket, currentPath]);

  const fetchFiles = (path: string) => {
    if (!profile || !socket) return;
    setIsLoading(true);
    socket.emit('ftp-list', { profile, path });
  };

  const handleNavigate = (path: string) => {
    fetchFiles(path);
  };

  const handleUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    handleNavigate(parent);
  };

  const handleDelete = (entry: FileEntry) => {
    if (!confirm(`Are you sure you want to delete ${entry.name}?`)) return;
    socket.emit('ftp-delete', { profile, path: `${currentPath === '/' ? '' : currentPath}/${entry.name}`, isDir: entry.type === 2 });
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    socket.emit('ftp-mkdir', { profile, path: `${currentPath === '/' ? '' : currentPath}/${newFolderName}` });
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Folder className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">Remote Browser</h2>
              <p className="text-xs text-slate-500 truncate">{profile?.host} • {currentPath}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onSelectPath(currentPath)}
              className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 flex items-center gap-2"
            >
              <Check className="w-3.5 h-3.5" />
              Select This Folder
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900">
          <button 
            onClick={handleUp}
            disabled={currentPath === '/'}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-50"
            title="Go Up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button 
            onClick={() => fetchFiles(currentPath)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
          
          {isCreatingFolder ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
              <input 
                autoFocus
                type="text" 
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-700 rounded bg-transparent dark:text-white focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <button onClick={handleCreateFolder} className="p-1 hover:bg-emerald-500/10 text-emerald-600 rounded">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsCreatingFolder(false)} className="p-1 hover:bg-red-500/10 text-red-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
          )}
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && files.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {files.map((file, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg group transition-colors cursor-pointer"
                  onClick={() => {
                    if (file.type === 2) { // Directory
                      handleNavigate(`${currentPath === '/' ? '' : currentPath}/${file.name}`);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {file.type === 2 ? (
                      <Folder className="w-5 h-5 text-blue-500 fill-blue-500/20" />
                    ) : (
                      <File className="w-5 h-5 text-slate-400" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {file.type === 2 ? 'Directory' : `${(file.size / 1024).toFixed(1)} KB`} • {file.date}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file);
                    }}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {files.length === 0 && !isLoading && (
                <div className="text-center py-12 text-slate-400">
                  <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Folder is empty</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
