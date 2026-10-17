import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings, Key, ExternalLink, Database, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface GlobalSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  openRouterKey: string | null;
  updateOpenRouterKey: (key: string) => void;
  selectedServer: string;
  handleServerSwitch: (server: string) => void;
  debugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({
  isOpen,
  onClose,
  openRouterKey,
  updateOpenRouterKey,
  selectedServer,
  handleServerSwitch,
  debugMode,
  setDebugMode
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="global-settings-wrapper">
          <motion.div 
            key="global-settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[180]"
          />
          <motion.div 
            key="global-settings-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl z-[181] overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <Settings className="w-5 h-5 text-indigo-500" />
                </div>
                Global Settings
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* OpenRouter API Key */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-4 h-4 text-indigo-400" />
                    OpenRouter API Key
                  </label>
                  <a 
                    href="https://openrouter.ai/keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Get Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative group">
                  <input 
                    type="password"
                    value={openRouterKey || ''}
                    onChange={(e) => updateOpenRouterKey(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="sk-or-v1-..."
                  />
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  This API key is stored securely in your account and shared across all your novels. 
                  It is used when you select OpenRouter as your provider.
                </p>
              </div>

              {/* Server Selection */}
              <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Data Storage Server
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleServerSwitch('default')}
                    className={cn(
                      "p-4 rounded-2xl border transition-all text-left space-y-1",
                      selectedServer === 'default' 
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    )}
                  >
                    <div className="font-bold text-xs">Server 1</div>
                    <div className="text-[10px] opacity-60">Default Project</div>
                  </button>
                  <button 
                    onClick={() => handleServerSwitch('backup')}
                    className={cn(
                      "p-4 rounded-2xl border transition-all text-left space-y-1",
                      selectedServer === 'backup' 
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    )}
                  >
                    <div className="font-bold text-xs">Server 2</div>
                    <div className="text-[10px] opacity-60">Backup Project</div>
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Changing the server will reload the app. Novels are stored separately on each server.
                </p>
              </div>

              {/* Debug Mode */}
              <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Debug Mode
                    </label>
                    <p className="text-xs text-zinc-500">
                      Enable advanced debugging tools like the Prompt Inspector (Dry-Run) in the editor.
                    </p>
                  </div>
                  <button
                    onClick={() => setDebugMode(!debugMode)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      debugMode ? "bg-amber-500" : "bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        debugMode ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* More settings can be added here */}
              <div className="pt-4 border-t border-zinc-800/50">
                <div className="flex items-center gap-3 text-zinc-600">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-xs">Your settings are synced to the cloud.</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex justify-end">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
