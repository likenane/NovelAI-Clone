import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, X, Send, Sparkles, RefreshCw, Settings, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { AIEngineTaskType } from '../types';
import { useAutoCounters } from '../hooks/useAutoCounters';

interface DirectiveScanPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (directive: string) => void;
  directive: string;
  onDirectiveChange: (directive: string) => void;
  isScanning: boolean;
  openAIEngineStudio?: (task?: AIEngineTaskType) => void;
  novelId?: string;
  triggerChars?: number;
}

/**
 * DirectiveScanPopover
 * 
 * 오토 코덱스 작가 지침(Directing) 및 빠른 스캔을 통합 관리하는 팝오버 컴포넌트입니다.
 * 모바일 화면에서 좌측 잘림을 방지하기 위해 뷰포트 반응형(fixed left/right bound)으로 정렬하며,
 * 타이핑 시 상위 컴포넌트 리렌더링을 차단하기 위해 로컬 상태(localText)를 독립 관리합니다.
 */
export const DirectiveScanPopover: React.FC<DirectiveScanPopoverProps> = React.memo(({
  isOpen,
  onClose,
  onScan,
  directive,
  onDirectiveChange,
  isScanning,
  openAIEngineStudio,
  novelId,
  triggerChars = 7500,
}) => {
  const [localText, setLocalText] = useState(directive);
  const { codexCount, resetCounter } = useAutoCounters(novelId);
  const targetChars = triggerChars || 7500;
  const progressPercent = Math.min(100, Math.round((codexCount / targetChars) * 100));

  // Sync with prop when opened or external directive changes
  useEffect(() => {
    if (isOpen) {
      setLocalText(directive);
    }
  }, [isOpen, directive]);

  const handleDirectiveScan = () => {
    const trimmed = localText.trim();
    onDirectiveChange(trimmed);
    onClose();
    onScan(trimmed);
  };

  const handleQuickScan = () => {
    onClose();
    onScan('');
  };

  const handleClear = () => {
    setLocalText("");
    onDirectiveChange("");
  };

  const handleClose = () => {
    onDirectiveChange(localText.trim());
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop to close on outside click */}
          <div 
            className="fixed inset-0 bg-black/40 z-40 sm:hidden backdrop-blur-xs" 
            onClick={handleClose} 
          />

          <motion.div
            key="directive-flyout"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-lg p-4 bg-zinc-900 border border-zinc-700/90 rounded-2xl shadow-2xl z-50 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>오토 코덱스 스캔 (Auto Codex)</span>
              </div>
              <div className="flex items-center gap-1">
                {openAIEngineStudio && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openAIEngineStudio('autoCodex');
                    }}
                    className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 rounded-lg transition-colors"
                    title="오토 코덱스 AI 엔진 설정 (AI Engine Studio)"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                )}
                <button 
                  onClick={handleClose}
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors"
                  title="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Auto-Codex Character Counter Status Card */}
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">자동 스캔 누적 글자수</span>
                <span className="font-mono text-amber-400 font-bold">
                  {codexCount.toLocaleString()} / {targetChars.toLocaleString()}자 ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>{progressPercent >= 100 ? "스캔 발동 대기 중" : `다음 스캔까지 ${(Math.max(0, targetChars - codexCount)).toLocaleString()}자 남음`}</span>
                {codexCount > 0 && (
                  <button 
                    type="button"
                    onClick={() => resetCounter('autocodex')}
                    className="text-zinc-400 hover:text-amber-300 underline transition-colors"
                  >
                    카운터 0으로 초기화
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              placeholder="선택 사항: 지시 입력 (예: 이번 화에서 드러난 '심연의 눈'을 마도구로 독립 분할하고, 아르민과 카엘의 관계를 적대적으로 갱신해줘.)"
              rows={3}
              className="w-full text-xs bg-zinc-950/90 border border-zinc-700/70 rounded-xl p-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 resize-none custom-scrollbar"
              autoFocus
            />

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800">
              {localText.trim() ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 underline"
                >
                  지침 지우기
                </button>
              ) : (
                <span className="text-[10px] text-zinc-500">지시 없이 빠른 스캔 가능</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleQuickScan}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 hover:text-white text-xs font-semibold rounded-lg transition-all active:scale-95 border border-zinc-700/50"
                  title="지시 없이 본문 전체를 표준 기준으로 스캔합니다"
                >
                  <RefreshCw className={cn("w-3 h-3 text-zinc-400", isScanning && "animate-spin")} />
                  <span>일반 스캔</span>
                </button>

                <button
                  type="button"
                  onClick={handleDirectiveScan}
                  disabled={isScanning || !localText.trim()}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95",
                    localText.trim()
                      ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                      : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  )}
                  title="입력한 지침을 반영하여 스캔합니다"
                >
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  <span>지시 반영 스캔</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

DirectiveScanPopover.displayName = 'DirectiveScanPopover';
