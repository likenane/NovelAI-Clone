import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, 
  Sparkles, 
  GitCompare, 
  Columns, 
  Copy, 
  Check, 
  ArrowRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { cn } from '../lib/utils';
import { computeWordDiff } from '../lib/diffUtils';

interface RefinerDiffViewerProps {
  rawDraft?: string;
  refinedText?: string;
  className?: string;
}

type ViewMode = 'diff' | 'split' | 'raw' | 'refined';

export const RefinerDiffViewer: React.FC<RefinerDiffViewerProps> = ({
  rawDraft = '',
  refinedText = '',
  className
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('diff');
  const [copiedTarget, setCopiedTarget] = useState<'raw' | 'refined' | null>(null);

  // Synchronized scrolling refs for split view
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  // Compute word-level LCS diff
  const { tokens, stats } = useMemo(() => {
    return computeWordDiff(rawDraft, refinedText);
  }, [rawDraft, refinedText]);

  const handleCopy = (text: string, target: 'raw' | 'refined') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTarget(target);
    setTimeout(() => {
      setCopiedTarget((curr) => (curr === target ? null : curr));
    }, 1800);
  };

  const handleScroll = (source: 'left' | 'right') => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;

    if (source === 'left' && leftColRef.current && rightColRef.current) {
      const percentage = leftColRef.current.scrollTop / (leftColRef.current.scrollHeight - leftColRef.current.clientHeight || 1);
      rightColRef.current.scrollTop = percentage * (rightColRef.current.scrollHeight - rightColRef.current.clientHeight);
    } else if (source === 'right' && leftColRef.current && rightColRef.current) {
      const percentage = rightColRef.current.scrollTop / (rightColRef.current.scrollHeight - rightColRef.current.clientHeight || 1);
      leftColRef.current.scrollTop = percentage * (leftColRef.current.scrollHeight - leftColRef.current.clientHeight);
    }

    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const hasDraft = Boolean(rawDraft && rawDraft.trim());
  const hasRefined = Boolean(refinedText && refinedText.trim());

  return (
    <div className={cn("space-y-3", className)}>
      {/* 3-Way Mode Segmented Control Bar & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-zinc-800/80">
        {/* Segmented Control Bar */}
        <div className="inline-flex items-center gap-1 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('diff')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0",
              viewMode === 'diff'
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            )}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>변경점 추적 (Diff)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0",
              viewMode === 'split'
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            )}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>나란히 비교 (Split)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('raw')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0",
              viewMode === 'raw'
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>초안 (Stage 1)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('refined')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0",
              viewMode === 'refined'
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>탈고본 (Stage 3)</span>
          </button>
        </div>

        {/* Revision Statistics (Clean unboxed typographic discipline) */}
        {hasDraft && hasRefined && (
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 flex-wrap">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              +{stats.addedTokens} 단어 추가
            </span>
            <span className="text-zinc-600" aria-hidden="true">·</span>
            <span className="text-rose-400 font-semibold flex items-center gap-1">
              -{stats.removedTokens} 단어 교정
            </span>
            <span className="text-zinc-600" aria-hidden="true">·</span>
            <span className="text-zinc-300 flex items-center gap-1">
              <Percent className="w-3 h-3 text-amber-400" />
              유사도 {stats.similarityRatio}%
            </span>
          </div>
        )}
      </div>

      {/* Main Viewport Container */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 overflow-hidden">
        {/* Mode 1: Inline Word-level Diff Tracking */}
        {viewMode === 'diff' && (
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500 border-b border-zinc-800/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-950/70 border border-rose-700/50" />
                <span className="text-zinc-400">초안에서 교정/삭제된 구절</span>
                <span className="mx-1 text-zinc-600">|</span>
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-950/70 border border-emerald-600/50" />
                <span className="text-zinc-400">탈고본에서 추가/수정된 구절</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopy(refinedText, 'refined')}
                  className="px-2 py-1 text-[11px] font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 rounded-md border border-zinc-800 transition-colors flex items-center gap-1"
                >
                  {copiedTarget === 'refined' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>탈고본 복사</span>
                </button>
              </div>
            </div>

            <div className="text-xs sm:text-sm font-sans leading-relaxed text-zinc-200 max-h-[500px] overflow-y-auto custom-scrollbar whitespace-pre-wrap select-text p-1">
              {tokens.length === 0 ? (
                <p className="text-zinc-500 italic">비교할 본문 데이터가 없습니다.</p>
              ) : (
                tokens.map((token, idx) => {
                  if (token.type === 'added') {
                    return (
                      <span
                        key={idx}
                        className="bg-emerald-950/50 text-emerald-300 border-b-2 border-emerald-500/60 font-medium px-0.5 rounded-xs inline"
                        title="추가 및 윤문된 표현"
                      >
                        {token.value}
                      </span>
                    );
                  }
                  if (token.type === 'removed') {
                    return (
                      <span
                        key={idx}
                        className="bg-rose-950/50 text-rose-300/80 line-through decoration-rose-500/70 opacity-75 font-mono text-[11px] sm:text-xs px-0.5 rounded-xs inline"
                        title="초안에서 삭제/대체된 표현"
                      >
                        {token.value}
                      </span>
                    );
                  }
                  return <span key={idx}>{token.value}</span>;
                })
              )}
            </div>
          </div>
        )}

        {/* Mode 2: Synchronized Side-by-Side Split View */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
            {/* Left Column: Stage 1 Raw Draft */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/60">
                <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                  <FileText className="w-3.5 h-3.5" />
                  <span>1단계 원시 초안 (Stage 1 Raw)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(rawDraft, 'raw')}
                  className="px-2 py-0.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 rounded border border-zinc-800 transition-colors flex items-center gap-1"
                >
                  {copiedTarget === 'raw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>복사</span>
                </button>
              </div>
              <div
                ref={leftColRef}
                onScroll={() => handleScroll('left')}
                className="text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap max-h-[480px] overflow-y-auto custom-scrollbar p-1 select-text"
              >
                {rawDraft || <span className="text-zinc-600 italic">(초안 없음)</span>}
              </div>
            </div>

            {/* Right Column: Stage 3 Master Refined Text */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/60">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>3단계 최종 탈고본 (Stage 3 Refined)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(refinedText, 'refined')}
                  className="px-2 py-0.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 rounded border border-zinc-800 transition-colors flex items-center gap-1"
                >
                  {copiedTarget === 'refined' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>복사</span>
                </button>
              </div>
              <div
                ref={rightColRef}
                onScroll={() => handleScroll('right')}
                className="text-xs text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap max-h-[480px] overflow-y-auto custom-scrollbar p-1 select-text"
              >
                {refinedText || <span className="text-zinc-600 italic">(탈고본 없음)</span>}
              </div>
            </div>
          </div>
        )}

        {/* Mode 3: Raw Draft Full Width */}
        {viewMode === 'raw' && (
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/60">
              <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Stage 1 소설 초안 원문 (Raw Draft)</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(rawDraft, 'raw')}
                className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 rounded-md border border-zinc-800 transition-colors flex items-center gap-1.5"
              >
                {copiedTarget === 'raw' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>초안 전체 복사</span>
              </button>
            </div>
            <pre className="text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto custom-scrollbar select-text p-1">
              {rawDraft || "(기록된 초안이 없습니다.)"}
            </pre>
          </div>
        )}

        {/* Mode 4: Master Refined Text Full Width */}
        {viewMode === 'refined' && (
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/60">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Stage 3 최종 탈고 소설 본문 (Master Novelist Refined Prose)</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(refinedText, 'refined')}
                className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 rounded-md border border-zinc-800 transition-colors flex items-center gap-1.5"
              >
                {copiedTarget === 'refined' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>탈고본 전체 복사</span>
              </button>
            </div>
            <pre className="text-xs text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto custom-scrollbar select-text p-1">
              {refinedText || "(기록된 탈고 본문이 없습니다.)"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
