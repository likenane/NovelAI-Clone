import React, { useState } from 'react';
import { LoreEntry } from '../types';
import { Sparkles, ChevronRight, ChevronDown, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface PendingProposalsListProps {
  proposals: LoreEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenInspector?: () => void;
}

export const PendingProposalsList: React.FC<PendingProposalsListProps> = ({ proposals, selectedId, onSelect, onOpenInspector }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (proposals.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="w-full px-4 py-2 flex items-center justify-between bg-amber-500/5 border-y border-amber-500/10 hover:bg-amber-500/10 transition-colors group">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest text-left"
        >
          <Sparkles className="w-3 h-3" />
          Pending Proposals ({proposals.length})
        </button>
        <div className="flex items-center gap-1.5">
          {onOpenInspector && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenInspector();
              }}
              title="Prompt Inspector에서 Auto-Codex 추론 과정 확인"
              className="p-1 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded transition-colors"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-amber-500/50 group-hover:text-amber-500 transition-colors" />
            ) : (
              <ChevronRight className="w-3 h-3 text-amber-500/50 group-hover:text-amber-500 transition-colors" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="proposals-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-1">
              {proposals.map(proposal => (
                <button
                  key={proposal.id}
                  onClick={() => onSelect(proposal.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors",
                    selectedId === proposal.id
                      ? "bg-amber-500/20 text-amber-300"
                      : "hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">{proposal.title || 'Untitled Proposal'}</span>
                    <span className="text-[10px] opacity-60 truncate">
                      {proposal.isProposalOnly ? 'New Entry' : 'Update'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
