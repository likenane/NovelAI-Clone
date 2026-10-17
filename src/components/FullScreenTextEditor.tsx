import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface FullScreenTextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (val: string) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  /* 
    'manual': Shows Cancel and Apply (does not save until Apply is clicked).
    'auto': Shows Done (auto-saves on change, so no Cancel).
  */
  saveMode: 'manual' | 'auto';
  onApply?: () => void; // Required if saveMode is manual
  zIndex?: string; // e.g. "z-[120]"
  placeholder?: string;
}

export const FullScreenTextEditor: React.FC<FullScreenTextEditorProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  title,
  description,
  icon,
  saveMode,
  onApply,
  zIndex = "z-[120]",
  placeholder = "Enter your text here..."
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="full-screen-editor-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn("fixed inset-0 flex items-center justify-center p-0 sm:p-8 bg-zinc-950/90 backdrop-blur-sm", zIndex)}
        >
          <motion.div 
            key="full-screen-editor-content"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full h-[100dvh] sm:h-full max-w-6xl sm:max-h-[90vh] bg-zinc-900 border-x-0 sm:border border-zinc-800 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
                    {icon}
                  </div>
                )}
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-100 line-clamp-1">
                    {title}
                  </h2>
                  {description && (
                    <p className="text-[10px] sm:text-xs text-zinc-500 hidden sm:block">{description}</p>
                  )}
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="flex-1 p-4 sm:p-6 bg-zinc-950/30">
              <textarea 
                autoFocus
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (saveMode === 'manual' && onApply) {
                      onApply();
                    } else if (saveMode === 'auto') {
                      onClose();
                    }
                  }
                }}
                className="w-full h-full bg-transparent border-none focus:ring-0 text-zinc-300 font-mono text-sm sm:text-base leading-relaxed resize-none custom-scrollbar"
                placeholder={placeholder}
              />
            </div>

            <div className="p-4 sm:p-6 border-t border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest hidden sm:block">
                Tip: Press <span className="text-indigo-400">Ctrl + Enter</span> to {saveMode === 'manual' ? 'apply changes' : 'close'}
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {saveMode === 'manual' ? (
                  <>
                    <button 
                      onClick={onClose}
                      className="px-6 py-2.5 text-sm font-bold text-zinc-400 hover:text-zinc-200 transition-colors flex-1 sm:flex-none"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={onApply}
                      className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20 flex-1 sm:flex-none"
                    >
                      Apply Changes
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest sm:hidden">
                      Auto-saving...
                    </span>
                    <button 
                      onClick={onClose}
                      className="px-8 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-bold rounded-xl transition-all active:scale-95 shadow-lg w-full sm:w-auto"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
