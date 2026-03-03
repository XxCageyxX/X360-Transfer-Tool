import React, { createContext, useContext, useEffect, useState } from 'react';

interface Settings {
  defaultPath: string;
  connectionTimeout: number;
  autoClearLogs: boolean;
  autoDisconnect: boolean;
}

interface HistoryItem {
  id: string;
  filename: string;
  timestamp: number;
  status: 'success' | 'failed';
  targetPath: string;
  profileName: string;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  history: HistoryItem[];
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
}

const defaultSettings: Settings = {
  defaultPath: '/Hdd1/Content/0000000000000000',
  connectionTimeout: 10000,
  autoClearLogs: true,
  autoDisconnect: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('app_settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('transfer_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('transfer_history', JSON.stringify(history));
  }, [history]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep last 50
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, history, addToHistory, clearHistory }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
