import React, { useState, useEffect } from 'react';
import { LoreEntry } from '../types';
import { Check, X, Sparkles, Copy, History } from 'lucide-react';

interface ProposalDiffViewProps {
  entry: LoreEntry;
  onAccept: (id: string, editedContent?: string) => void;
  onReject: (id: string) => void;
  onOpenInspector?: () => void;
}

export const ProposalDiffView: React.FC<ProposalDiffViewProps> = ({ entry, onAccept, onReject, onOpenInspector }) => {
  const [editedContent, setEditedContent] = useState(entry.proposedContent || '');

  useEffect(() => {
    setEditedContent(entry.proposedContent || '');
  }, [entry.proposedContent]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl sm:text-3xl font-bold text-zinc-100 flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-amber-400" />
          {entry.title || 'Untitled Proposal'}
          <span className="text-xs font-medium px-2 py-1 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">
            {entry.isProposalOnly ? 'New Entry Proposal' : 'Update Proposal'}
          </span>
        </h2>
        {onOpenInspector && (
          <button
            onClick={onOpenInspector}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs font-semibold rounded-xl transition-all border border-zinc-700/60"
            title="Auto-Codex 5단계 CoT 추론 과정 및 전체 프롬프트 보기"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>CoT 추론 보기</span>
          </button>
        )}
      </div>

      {entry.updateReason && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 items-start">
          <span className="text-amber-500 mt-0.5">💡</span>
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">AI's Reasoning</p>
            <p className="text-sm text-amber-200/80 leading-relaxed">{entry.updateReason}</p>
          </div>
        </div>
      )}

      {!entry.isProposalOnly && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Current Content</label>
            <button 
              onClick={() => navigator.clipboard.writeText(entry.content || '')}
              className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold rounded-md transition-all border border-transparent"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </div>
          <div className="w-full h-48 bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-4 sm:p-6 text-zinc-500 text-sm sm:text-base leading-relaxed overflow-y-auto custom-scrollbar whitespace-pre-wrap">
            {entry.content || <span className="italic opacity-50">No current content.</span>}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Proposed Content (Editable)</label>
          <button 
            onClick={() => navigator.clipboard.writeText(editedContent)}
            className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold rounded-md transition-all border border-transparent"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        </div>
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full h-64 sm:h-96 bg-zinc-950 border border-amber-500/30 rounded-2xl p-4 sm:p-6 text-zinc-300 text-sm sm:text-base leading-relaxed resize-none custom-scrollbar focus:ring-1 focus:ring-amber-500/50"
          placeholder="Proposed content..."
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
        <button
          onClick={() => onReject(entry.id)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 text-sm font-bold rounded-xl transition-colors border border-zinc-800 hover:border-red-500/30"
        >
          <X className="w-4 h-4" />
          Reject
        </button>
        <button
          onClick={() => onAccept(entry.id, editedContent)}
          className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20"
        >
          <Check className="w-4 h-4" />
          {editedContent !== entry.proposedContent ? 'Edit & Accept' : 'Accept'}
        </button>
      </div>
    </div>
  );
};
