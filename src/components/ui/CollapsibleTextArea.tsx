import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CollapsibleTextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultExpanded?: boolean;
  className?: string;
}

export const CollapsibleTextArea: React.FC<CollapsibleTextAreaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  defaultExpanded = false,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Local state for the textarea to prevent global re-renders
  const [localValue, setLocalValue] = useState(value);

  // Sync with prop value when it changes externally (e.g., entry switch)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced update to the parent state
  useEffect(() => {
    if (localValue === value) return;
    
    const handler = setTimeout(() => {
      onChange(localValue);
    }, 500);

    return () => clearTimeout(handler);
  }, [localValue, onChange, value]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{label}</label>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all border border-transparent"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Expand
            </>
          )}
        </button>
      </div>
      
      <AnimatePresence initial={false} mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <textarea 
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-400 text-xs leading-relaxed resize-none custom-scrollbar focus:ring-1 focus:ring-indigo-500/50"
              placeholder={placeholder}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(true)}
            className="w-full p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl text-[10px] text-zinc-600 italic cursor-pointer hover:bg-zinc-900/50 transition-colors truncate"
          >
            {value ? value : placeholder || "No content..."}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
