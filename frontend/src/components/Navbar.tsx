'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Key, Check } from 'lucide-react';
import { Youtube } from './Icons';
import { getClientApiKey, setClientApiKey, removeClientApiKey } from '../services/api';


export default function Navbar() {
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Sync local API keys on load
  useEffect(() => {
    const savedKey = getClientApiKey();
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, [pathname]);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      setClientApiKey(apiKey.trim());
    } else {
      removeClientApiKey();
    }
    setApiKeySaved(true);
    setTimeout(() => {
      setApiKeySaved(false);
      setShowSettings(false);
    }, 1200);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-card-border/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-accent-purple to-accent-cyan shadow-md">
              <Youtube className="h-5.5 w-5.5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-accent-purple to-accent-cyan bg-clip-text text-transparent">
              TubeSense
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-xl border border-card-border bg-slate-900/40 text-slate-400 hover:text-white hover:border-accent-purple/50 transition-all cursor-pointer"
              title="API Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-panel p-6 rounded-2xl border border-card-border shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="h-5 w-5 text-accent-purple" />
                API Configurations
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                Close
              </button>
            </div>
            
            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Custom Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm"
                />
                <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                  Provide your own Google Gemini API key to avoid shared backend rate-limits. 
                  This key remains inside your browser and is only sent to the API to run operations. 
                  Leave blank to fall back to the server's default configuration.
                </p>
              </div>

              <div className="flex justify-end pt-3">
                <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                  Provide your own Google Gemini API key to avoid shared backend rate-limits. 
                  This key remains inside your browser and is only sent to the API to run operations. 
                  Leave blank to fall back to the server's default configuration.
                </p>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={apiKeySaved}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm cursor-pointer transition-all ${
                    apiKeySaved 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'glow-btn-purple text-white w-full'
                  }`}
                >
                  {apiKeySaved ? (
                    <>
                      <Check className="h-4 w-4" />
                      Saved Successfully
                    </>
                  ) : (
                    'Save Key'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
