'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, ExternalLink, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  FirebaseConfigOptions,
  getActiveFirebaseConfig,
  saveLocalFirebaseConfig,
  clearLocalFirebaseConfig,
  isFirebaseConfigured,
} from '@/lib/firebase';

interface FirebaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FirebaseSetupModal({ isOpen, onClose }: FirebaseSetupModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const config = getActiveFirebaseConfig();
    if (config) {
      setApiKey(config.apiKey);
      setAuthDomain(config.authDomain);
      setProjectId(config.projectId);
      setStorageBucket(config.storageBucket);
      setMessagingSenderId(config.messagingSenderId);
      setAppId(config.appId);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !projectId) {
      alert('Please provide at least the API Key and Project ID.');
      return;
    }

    const config: FirebaseConfigOptions = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    saveLocalFirebaseConfig(config);
    setIsSaved(true);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear saved Firebase credentials?')) {
      clearLocalFirebaseConfig();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Firebase Configuration</h2>
            <p className="text-sm text-slate-400">
              Zero-cost real-time signaling & Google Auth for Sabha
            </p>
          </div>
        </div>

        {isFirebaseConfigured() ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm mb-5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Firebase is currently connected and active!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm mb-5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Running in local peer mode. Connect your free Firebase project for global multi-device meetings.</span>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-xl p-4 mb-5 text-xs text-slate-300 border border-slate-700/50 leading-relaxed">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-200">How to get your free credentials:</span>
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline flex items-center gap-1"
            >
              Firebase Console <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <ol className="list-decimal pl-4 space-y-1 text-slate-400">
            <li>Create a new project at Firebase Console (100% Free Spark plan).</li>
            <li>Enable <strong>Authentication</strong> &gt; <strong>Google Sign-in</strong>.</li>
            <li>Create a <strong>Firestore Database</strong> (Test mode or Production).</li>
            <li>Go to <strong>Project Settings &gt; General &gt; Your apps &gt; Web app (&lt;/&gt;)</strong> and copy the config.</li>
          </ol>
        </div>

        <form onSubmit={handleSave} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">API Key *</label>
            <input
              type="text"
              required
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Project ID *</label>
              <input
                type="text"
                required
                placeholder="sabha-app-123"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Auth Domain</label>
              <input
                type="text"
                placeholder="sabha-app-123.firebaseapp.com"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">App ID</label>
              <input
                type="text"
                placeholder="1:12345:web:abcdef"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Storage Bucket</label>
              <input
                type="text"
                placeholder="sabha-app-123.appspot.com"
                value={storageBucket}
                onChange={(e) => setStorageBucket(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Sender ID</label>
              <input
                type="text"
                placeholder="1234567890"
                value={messagingSenderId}
                onChange={(e) => setMessagingSenderId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-3 py-2 rounded-lg hover:bg-rose-500/10 transition"
            >
              <Trash2 className="w-4 h-4" /> Clear Saved Config
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-amber-500/20"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
