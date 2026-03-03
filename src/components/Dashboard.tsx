import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion } from 'motion/react';
import { FolderOpen, Upload, Terminal, CheckCircle, XCircle, FileUp, FileArchive, History, Server } from 'lucide-react';
import { FtpProfile, ProgressData } from '../types';
import FtpProfileManager from './FtpProfileManager';
import ConfirmationModal from './ConfirmationModal';
import Header from './Header';
import StatusCard from './StatusCard';
import FileBrowserModal from './FileBrowserModal';
import axios from 'axios';
import JSZip from 'jszip';
import { useSettings } from '../context/SettingsContext';
import { toast } from 'sonner';

export default function Dashboard() {
  const { settings, addToHistory } = useSettings();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [profiles, setProfiles] = useState<FtpProfile[]>(() => {
    try {
      const saved = localStorage.getItem('ftpProfiles');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load profiles:', error);
      return [];
    }
  });
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [customSubfolder, setCustomSubfolder] = useState('');
  const [recentSubfolders, setRecentSubfolders] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState<ProgressData>({ step: 'upload', progress: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  
  // Archive Preview State
  const [filePreview, setFilePreview] = useState<{ files: string[], totalFiles: number, isLoading: boolean } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs for accessing current state in socket listeners without re-binding
  const selectedFileRef = useRef(selectedFile);
  const selectedProfileIdRef = useRef(selectedProfileId);
  const profilesRef = useRef(profiles);
  const customSubfolderRef = useRef(customSubfolder);

  useEffect(() => {
    localStorage.setItem('ftpProfiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(profiles[0].id);
    }
  }, []);

  useEffect(() => {
    selectedFileRef.current = selectedFile;
    selectedProfileIdRef.current = selectedProfileId;
    profilesRef.current = profiles;
    customSubfolderRef.current = customSubfolder;
  }, [selectedFile, selectedProfileId, profiles, customSubfolder]);

  useEffect(() => {
    // Load recent subfolders
    const savedSubfolders = localStorage.getItem('recent_subfolders');
    if (savedSubfolders) {
      try {
        setRecentSubfolders(JSON.parse(savedSubfolders));
      } catch (e) {
        console.error('Failed to load recent subfolders', e);
      }
    }

    const savedSubfolder = localStorage.getItem('customSubfolder');
    if (savedSubfolder) setCustomSubfolder(savedSubfolder);

    socketRef.current = io();

    socketRef.current.on('connect', () => {
      addLog('Connected to server.');
    });

    socketRef.current.on('log', (message: string) => {
      addLog(message);
    });

    socketRef.current.on('progress', (data: ProgressData) => {
      setProgress(data);
      if (data.step === 'upload') setStatus(`Uploading File... ${Math.round(data.progress)}%`);
      if (data.step === 'extract') setStatus(`Extracting... ${Math.round(data.progress)}%`);
      if (data.step === 'ftp') setStatus(`Uploading to Xbox... ${Math.round(data.progress)}%`);
    });

    socketRef.current.on('complete', (message: string) => {
      addLog(message);
      toast.success(message);
      setIsProcessing(false);
      setStatus('Completed');
      setProgress({ step: 'upload', progress: 100 });
      
      // Add to history using refs
      if (selectedFileRef.current && selectedProfileIdRef.current) {
        const profile = profilesRef.current.find(p => p.id === selectedProfileIdRef.current);
        addToHistory({
            filename: selectedFileRef.current.name,
            status: 'success',
            targetPath: `${profile?.remotePath}/${customSubfolderRef.current}`.replace(/\/+/g, '/'),
            profileName: profile?.name || 'Unknown'
        });
      }
    });

    socketRef.current.on('error', (message: string) => {
      addLog(`ERROR: ${message}`);
      toast.error(message);
      setIsProcessing(false);
      setStatus('Error');

      // Add to history as failed using refs
      if (selectedFileRef.current && selectedProfileIdRef.current) {
        const profile = profilesRef.current.find(p => p.id === selectedProfileIdRef.current);
        addToHistory({
            filename: selectedFileRef.current.name,
            status: 'failed',
            targetPath: `${profile?.remotePath}/${customSubfolderRef.current}`.replace(/\/+/g, '/'),
            profileName: profile?.name || 'Unknown'
        });
      }
    });

    socketRef.current.on('ftp-test-result', (result: { success: boolean; message: string }) => {
        setIsTestingConnection(false);
        setTestResult(result);
        if (result.success) {
            addLog(`FTP Test Success: ${result.message}`);
            toast.success('Connection Successful');
        } else {
            addLog(`FTP Test Failed: ${result.message}`);
            toast.error(`Connection Failed: ${result.message}`);
        }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []); // Empty dependency array to run only once on mount

  // Preview Archive Content whenever file changes
  useEffect(() => {
    if (!selectedFile) {
        setFilePreview(null);
        return;
    }

    const loadPreview = async () => {
        setFilePreview({ files: [], totalFiles: 0, isLoading: true });
        try {
            const zip = new JSZip();
            const content = await zip.loadAsync(selectedFile);
            
            const files: string[] = [];
            let count = 0;
            
            content.forEach((relativePath, file) => {
                if (count < 5 && !file.dir) {
                    files.push(relativePath);
                }
                if (!file.dir) count++;
            });
            
            setFilePreview({ files, totalFiles: count, isLoading: false });
        } catch (error) {
            console.error("Failed to read archive:", error);
            setFilePreview(null);
        }
    };

    if (selectedFile.name.endsWith('.zip') || selectedFile.name.endsWith('.rar') || selectedFile.name.endsWith('.7z')) {
        loadPreview();
    } else {
        setFilePreview(null);
    }

  }, [selectedFile]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSaveProfiles = (newProfiles: FtpProfile[]) => {
    setProfiles(newProfiles);
  };

  const handleTestConnection = (profile: FtpProfile) => {
      setIsTestingConnection(true);
      setTestResult(null);
      socketRef.current?.emit('test-ftp-connection', profile);
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          // Basic validation
          if (file.name.endsWith('.zip') || file.name.endsWith('.rar') || file.name.endsWith('.7z')) {
            setSelectedFile(file);
          } else {
            addLog('Error: Invalid file type. Please drop a .zip, .rar, or .7z file.');
            toast.error('Invalid file type');
          }
      }
  };

  const handleStartRequest = () => {
    if (!selectedFile) {
        addLog('Error: File is required.');
        toast.error('Please select a file first');
        return;
    }
    if (!selectedProfileId) {
        addLog('Error: No FTP profile selected.');
        toast.error('Please select an FTP profile');
        return;
    }
    
    setIsConfirmOpen(true);
  };

  const handleConfirmStart = async () => {
    setIsConfirmOpen(false);
    const profile = profiles.find(p => p.id === selectedProfileId);
    if (!profile) return;

    // Save subfolder to history
    if (customSubfolder.trim()) {
        const newHistory = [customSubfolder, ...recentSubfolders.filter(s => s !== customSubfolder)].slice(0, 5);
        setRecentSubfolders(newHistory);
        localStorage.setItem('recent_subfolders', JSON.stringify(newHistory));
        localStorage.setItem('customSubfolder', customSubfolder);
    } else {
        localStorage.removeItem('customSubfolder');
    }

    setIsProcessing(true);
    if (settings.autoClearLogs) {
        setLogs([]);
    }
    setStatus('Starting...');
    setProgress({ step: 'upload', progress: 0 });

        if (selectedFile) {
        // Upload file first
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            addLog('Uploading file to server...');
            setStatus('Uploading file...');
            const response = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setProgress({ step: 'upload', progress: percentCompleted });
                }
            });
            
            const uploadedFilename = response.data.filename;
            addLog(`File uploaded: ${uploadedFilename}`);
            
            // Small delay to ensure FS consistency
            await new Promise(resolve => setTimeout(resolve, 500));
            
            socketRef.current?.emit('start-process', { 
                ftpConfig: profile, 
                customSubfolder,
                filename: uploadedFilename,
                settings // Pass settings to server
            });
        } catch (error: any) {
            addLog(`Error uploading file: ${error.message}`);
            toast.error(`Upload failed: ${error.message}`);
            setIsProcessing(false);
            setStatus('Error');
        }
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 p-4 font-sans overflow-hidden flex flex-col"
    >
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col gap-2">
        
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
          
          {/* Configuration Panel */}
          <div className="lg:col-span-1 flex flex-col gap-3 h-full overflow-y-auto pr-1">
            
            {/* Source Section */}
            <section className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-2 shrink-0 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                <FileUp className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <h2 className="text-sm">Source File</h2>
              </div>
              
              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Select File (Zip/Rar)</label>
                <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full border border-dashed rounded-lg px-4 py-4 flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden
                        ${isDragging 
                            ? 'bg-blue-50 border-blue-500 dark:bg-blue-500/10 scale-[1.02]' 
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500'
                        }
                    `}
                >
                    <FileUp className={`w-6 h-6 mb-2 transition-colors ${isDragging ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-500'}`} />
                    <span className={`text-xs transition-colors ${isDragging ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                        {selectedFile ? selectedFile.name : 'Click or Drag & Drop file here'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">Max size: Server limit</span>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0]);
                        }
                    }}
                    className="hidden"
                    accept=".zip,.rar,.7z"
                />

                {/* Archive Preview */}
                {filePreview && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
                    >
                        <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <FileArchive className="w-3 h-3" /> Archive Content
                            </span>
                            {filePreview.isLoading ? (
                                <span className="text-[10px] text-blue-500 dark:text-blue-400 animate-pulse">Loading...</span>
                            ) : (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{filePreview.totalFiles} files</span>
                            )}
                        </div>
                        {!filePreview.isLoading && (
                            <div className="p-2 space-y-1">
                                {filePreview.files.map((file, i) => (
                                    <div key={i} className="text-[10px] text-slate-600 dark:text-slate-500 font-mono truncate pl-1 border-l-2 border-slate-200 dark:border-slate-800">
                                        {file}
                                    </div>
                                ))}
                                {filePreview.totalFiles > 5 && (
                                    <div className="text-[10px] text-slate-500 dark:text-slate-600 italic pl-2">
                                        ...and {filePreview.totalFiles - 5} more
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Destination Subfolder (Optional)</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input 
                        type="text" 
                        list="subfolder-history"
                        value={customSubfolder}
                        onChange={(e) => {
                            setCustomSubfolder(e.target.value);
                            localStorage.setItem('customSubfolder', e.target.value);
                        }}
                        placeholder="e.g. Halo 3"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                        <datalist id="subfolder-history">
                            {recentSubfolders.map((folder, index) => (
                                <option key={index} value={folder} />
                            ))}
                        </datalist>
                        {recentSubfolders.length > 0 && !customSubfolder && (
                            <div className="absolute right-3 top-2 text-slate-400 dark:text-slate-600 pointer-events-none">
                                <History className="w-3 h-3" />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            if (!selectedProfile) {
                                toast.error('Please select a profile first');
                                return;
                            }
                            setIsFileBrowserOpen(true);
                        }}
                        className="p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
                        title="Browse Remote Folder"
                    >
                        <FolderOpen className="w-4 h-4" />
                    </button>
                </div>
                {selectedProfile && (
                  <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">
                    Final Path: {selectedProfile.remotePath.replace(/\/+$/, '')}/{customSubfolder.replace(/^\/+/, '')}
                  </p>
                )}
              </div>
            </section>

            {/* FTP Profile Manager */}
            <div className="flex-1 min-h-0 flex flex-col">
                <FtpProfileManager 
                profiles={profiles}
                selectedProfileId={selectedProfileId}
                onSelectProfile={setSelectedProfileId}
                onSaveProfiles={handleSaveProfiles}
                onTestConnection={handleTestConnection}
                isTestingConnection={isTestingConnection}
                testResult={testResult}
                />
            </div>

            <button
              onClick={handleStartRequest}
              disabled={isProcessing || !selectedFile || !selectedProfileId}
              className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shrink-0 ${
                isProcessing || !selectedFile || !selectedProfileId
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Start Transfer'}
            </button>

            {isProcessing && (
                <button
                    onClick={() => {
                        socketRef.current?.emit('cancel-process');
                        addLog('Requesting cancellation...');
                    }}
                    className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shrink-0 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                >
                    Cancel Processing
                </button>
            )}

          </div>

          {/* Status Panel */}
          <div className="lg:col-span-2 flex flex-col gap-3 h-full min-h-0">
            
            {/* Progress Cards */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <StatusCard 
                icon={<Upload className="w-4 h-4" />} 
                label="File Upload" 
                active={progress.step === 'upload' && isProcessing} 
                completed={progress.step !== 'upload' && (progress.step === 'extract' || progress.step === 'ftp')}
                progress={progress.step === 'upload' ? progress.progress : (progress.step !== 'upload' ? 100 : 0)}
              />
              <StatusCard 
                icon={<FolderOpen className="w-4 h-4" />} 
                label="Extract" 
                active={progress.step === 'extract' && isProcessing} 
                completed={progress.step === 'ftp'}
                progress={progress.step === 'extract' ? progress.progress : (progress.step === 'ftp' ? 100 : 0)}
              />
              <StatusCard 
                icon={<Server className="w-4 h-4" />} 
                label="FTP Transfer" 
                active={progress.step === 'ftp' && isProcessing} 
                completed={status === 'Completed'} 
                progress={progress.step === 'ftp' ? progress.progress : (status === 'Completed' ? 100 : 0)}
              />
            </div>

            {/* Terminal Log */}
            <div className="bg-slate-900 dark:bg-black rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col flex-1 min-h-0 shadow-sm dark:shadow-none">
              <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">System Console</span>
                </div>
                <div className="flex items-center gap-2">
                    {status === 'Error' && <span className="flex items-center gap-1 text-xs text-red-500 font-bold"><XCircle className="w-3 h-3"/> Error</span>}
                    {status === 'Completed' && <span className="flex items-center gap-1 text-xs text-emerald-500 font-bold"><CheckCircle className="w-3 h-3"/> Success</span>}
                    {isProcessing && <span className="text-xs text-blue-500 dark:text-blue-400 animate-pulse">{status}</span>}
                </div>
              </div>
              <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                {logs.length === 0 && <span className="text-slate-400 dark:text-slate-600 italic">Ready for input...</span>}
                {logs.map((log, i) => {
                    const isError = log.includes('ERROR') || log.includes('failed');
                    return (
                        <div key={i} className={`break-all ${isError ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                            {log}
                        </div>
                    );
                })}
                <div ref={logsEndRef} />
              </div>
            </div>

          </div>
        </div>

        <footer className="shrink-0 text-center text-[10px] text-slate-400 dark:text-slate-600 py-1">
            Developed by Cagey °2026
        </footer>
      </div>

      <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmStart}
        fileName={selectedFile?.name}
        profile={selectedProfile}
        customSubfolder={customSubfolder}
      />

      <FileBrowserModal 
        isOpen={isFileBrowserOpen}
        onClose={() => setIsFileBrowserOpen(false)}
        socket={socketRef.current}
        profile={selectedProfile}
        onSelectPath={(path) => {
            // Calculate relative path from profile root if possible, or just set custom subfolder
            // If the user selects a path, we might want to update the customSubfolder to match relative to profile root
            // OR we might want to update the profile's root path? 
            // For now, let's assume we update the custom subfolder relative to profile root if it starts with it.
            
            if (selectedProfile && path.startsWith(selectedProfile.remotePath)) {
                const relative = path.substring(selectedProfile.remotePath.length);
                setCustomSubfolder(relative.replace(/^\//, ''));
            } else {
                // If completely different, maybe we should warn or just set it?
                // Let's just set the custom subfolder to the full path if it doesn't match, 
                // BUT the logic in start-process appends customSubfolder to remotePath.
                // So this is tricky. 
                // Ideally, the File Browser should probably update the Profile's "Remote Path" OR the Custom Subfolder.
                // Let's just update the Custom Subfolder for now, but we need to be careful.
                // If the user selects "/Hdd1/Content/Games", and profile is "/Hdd1/Content", subfolder becomes "Games".
                
                // Simple logic:
                if (selectedProfile && path.startsWith(selectedProfile.remotePath)) {
                     const relative = path.slice(selectedProfile.remotePath.length).replace(/^\//, '');
                     setCustomSubfolder(relative);
                } else {
                    toast.warning("Selected path is outside the profile's root path. Updating profile root path might be better.");
                    // For now, do nothing or maybe update the profile? 
                    // Let's just set the custom subfolder to the absolute path and hope the server handles it?
                    // Server logic: uploadDir = `${cleanBase}/${cleanSubfolder}`;
                    // If cleanSubfolder starts with /, it might append.
                    // Let's just stick to relative paths for safety.
                }
            }
            setIsFileBrowserOpen(false);
        }}
      />
    </motion.div>
  );
}
