import React, { useState, useEffect } from 'react';
import { FtpProfile } from '../types';
import { Plus, Trash2, Edit2, Save, X, Server, CheckCircle, Wifi } from 'lucide-react';

interface FtpProfileManagerProps {
  profiles: FtpProfile[];
  selectedProfileId: string | null;
  onSelectProfile: (id: string) => void;
  onSaveProfiles: (profiles: FtpProfile[]) => void;
  onTestConnection: (profile: FtpProfile) => void;
  isTestingConnection: boolean;
  testResult: { success: boolean; message: string } | null;
}

export default function FtpProfileManager({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onSaveProfiles,
  onTestConnection,
  isTestingConnection,
  testResult
}: FtpProfileManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<FtpProfile | null>(null);

  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  const handleAddNew = () => {
    const newProfile: FtpProfile = {
      id: Date.now().toString(),
      name: 'New Profile',
      host: '',
      port: '21',
      user: 'xbox',
      password: 'xbox',
      remotePath: '/Hdd1/Content/0000000000000000/',
      activeMode: true,
      timeout: 30000
    };
    setEditingProfile(newProfile);
    setIsEditing(true);
    setDeleteConfirmationId(null);
  };

  const handleEdit = (profile: FtpProfile) => {
    setEditingProfile({ ...profile });
    setIsEditing(true);
    setDeleteConfirmationId(null);
  };

  const executeDelete = (id: string) => {
    const index = profiles.findIndex(p => p.id === id);
    const updated = profiles.filter(p => p.id !== id);
    onSaveProfiles(updated);

    if (selectedProfileId === id) {
        if (updated.length > 0) {
            // Try to select the next profile (same index), or the previous one if we deleted the last one
            const newIndex = index < updated.length ? index : updated.length - 1;
            onSelectProfile(updated[newIndex].id);
        } else {
            onSelectProfile('');
        }
    }

    setDeleteConfirmationId(null);
    if (editingProfile?.id === id) {
        setIsEditing(false);
        setEditingProfile(null);
    }
  };

  const handleSave = () => {
    if (!editingProfile) return;
    
    // Validation
    if (!editingProfile.name) return alert('Profile Name is required');
    if (!editingProfile.host) return alert('Host IP is required');
    
    // IP Validation Regex (Simple)
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(editingProfile.host)) return alert('Invalid IP Address format');

    const existingIndex = profiles.findIndex(p => p.id === editingProfile.id);
    let updatedProfiles;
    if (existingIndex >= 0) {
      updatedProfiles = [...profiles];
      updatedProfiles[existingIndex] = editingProfile;
    } else {
      updatedProfiles = [...profiles, editingProfile];
    }
    
    onSaveProfiles(updatedProfiles);
    onSelectProfile(editingProfile.id);
    setIsEditing(false);
    setEditingProfile(null);
  };

  if (isEditing && editingProfile) {
    return (
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between text-slate-900 dark:text-white font-medium mb-2">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            <h2>{profiles.find(p => p.id === editingProfile.id) ? 'Edit Profile' : 'New Profile'}</h2>
          </div>
          <button onClick={() => setIsEditing(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Profile Name</label>
            <input 
              type="text" 
              value={editingProfile.name}
              onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Host IP</label>
              <input 
                type="text" 
                value={editingProfile.host}
                onChange={(e) => setEditingProfile({...editingProfile, host: e.target.value})}
                placeholder="192.168.1.x"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Port</label>
              <input 
                type="text" 
                value={editingProfile.port}
                onChange={(e) => setEditingProfile({...editingProfile, port: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Username</label>
              <input 
                type="text" 
                value={editingProfile.user}
                onChange={(e) => setEditingProfile({...editingProfile, user: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Password</label>
              <input 
                type="password" 
                value={editingProfile.password}
                onChange={(e) => setEditingProfile({...editingProfile, password: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Remote Path</label>
            <input 
              type="text" 
              value={editingProfile.remotePath}
              onChange={(e) => setEditingProfile({...editingProfile, remotePath: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Timeout (ms)</label>
                <input 
                type="number" 
                value={editingProfile.timeout || 30000}
                onChange={(e) => setEditingProfile({...editingProfile, timeout: parseInt(e.target.value) || 30000})}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
            </div>
            <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input 
                    type="checkbox" 
                    checked={editingProfile.activeMode ?? true}
                    onChange={(e) => setEditingProfile({...editingProfile, activeMode: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium group-hover:text-blue-500 transition-colors">Active Mode (Xbox)</span>
                </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button 
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Profile
          </button>
          <button 
            onClick={() => onTestConnection(editingProfile)}
            disabled={isTestingConnection}
            className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {isTestingConnection ? <div className="animate-spin w-4 h-4 border-2 border-slate-900/20 dark:border-white/20 border-t-slate-900 dark:border-t-white rounded-full" /> : <Wifi className="w-4 h-4" />}
            Test Connection
          </button>
          {profiles.some(p => p.id === editingProfile.id) && (
            deleteConfirmationId === editingProfile.id ? (
                <div className="flex items-center gap-2 bg-red-500/10 px-2 rounded-lg border border-red-500/20">
                    <span className="text-xs text-red-600 dark:text-red-500 font-medium">Confirm?</span>
                    <button 
                        onClick={() => executeDelete(editingProfile.id)}
                        className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded"
                    >
                        Yes
                    </button>
                    <button 
                        onClick={() => setDeleteConfirmationId(null)}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1"
                    >
                        No
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setDeleteConfirmationId(editingProfile.id)}
                    className="px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-500 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    title="Delete Profile"
                >
                    <Trash2 className="w-4 h-4" /> Delete
                </button>
            )
          )}
        </div>
        {testResult && (
            <div className={`text-xs p-2 rounded ${testResult.success ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                {testResult.message}
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between text-slate-900 dark:text-white font-medium">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-purple-500 dark:text-purple-400" />
          <h2>FTP Profiles</h2>
        </div>
        <button onClick={handleAddNew} className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-white">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-sm">
          No profiles found. Create one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {profiles.map(profile => (
            <div 
              key={profile.id}
              className={`p-3 rounded-xl border flex items-center justify-between group transition-all cursor-pointer ${
                selectedProfileId === profile.id 
                  ? 'bg-purple-50 border-purple-500/50 dark:bg-purple-500/10' 
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              onClick={() => onSelectProfile(profile.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${selectedProfileId === profile.id ? 'bg-purple-500' : 'bg-slate-400 dark:bg-slate-700'}`} />
                <div>
                  <div className={`text-sm font-medium ${selectedProfileId === profile.id ? 'text-purple-700 dark:text-white' : 'text-slate-700 dark:text-white'}`}>{profile.name}</div>
                  <div className="text-xs text-slate-500">{profile.host}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {deleteConfirmationId === profile.id ? (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded p-0.5" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); executeDelete(profile.id); }}
                            className="p-1 bg-red-500 hover:bg-red-600 text-white rounded text-[10px] font-bold px-2"
                        >
                            DEL
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(null); }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ) : (
                    <>
                        <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(profile); }}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                        >
                        <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(profile.id); }}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                        <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
