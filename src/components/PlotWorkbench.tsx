import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Compass, 
  Eye, 
  Sliders, 
  Loader2, 
  RefreshCw, 
  Copy, 
  Sparkles, 
  Check, 
  ShieldAlert, 
  ShieldCheck,
  Brain, 
  ListTree, 
  FileText,
  ChevronDown,
  Flame,
  Users,
  Film,
  Layers,
  Maximize2,
  SlidersHorizontal,
  GitBranch,
  Target,
  AlertTriangle
} from 'lucide-react';
import { useAutoCounters } from '../hooks/useAutoCounters';
import { Novel, ThinkingLevel, AIEngineTaskType } from '../types';
import { cn } from '../lib/utils';
import { getSupportedThinkingLevels, getValidThinkingLevel, GLOBAL_DEFAULTS } from '../constants';
import { PendingPlotProposal } from '../hooks/useAutoPlot';
import { FullScreenTextEditor } from './FullScreenTextEditor';

interface PlotWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  currentNovel: Novel | null;
  updateNovelContent: (id: string, data: Partial<Novel>, silent?: boolean, immediate?: boolean) => void;
  plotAIInstruction: string;
  setPlotAIInstruction: (val: string) => void;
  plotWorkbenchSettings: any;
  setPlotWorkbenchSettings: React.Dispatch<React.SetStateAction<any>>;
  isGeneratingPlot: boolean;
  handleGeneratePlot: (instruction: string, settings: any) => Promise<any>;
  pendingPlotProposal: PendingPlotProposal | null;
  clearPendingPlotProposal: () => void;
  setInspectionContext: (ctx: { type: 'novel' | 'codex' | 'memory' | 'autocodex' | 'consistency' | 'plot', entryId?: string }) => void;
  setShowPromptInspector: (show: boolean) => void;
  openAIEngineStudio?: (task?: AIEngineTaskType) => void;
}

export const PlotWorkbench: React.FC<PlotWorkbenchProps> = ({
  isOpen,
  onClose,
  currentNovel,
  updateNovelContent,
  plotAIInstruction,
  setPlotAIInstruction,
  plotWorkbenchSettings,
  setPlotWorkbenchSettings,
  isGeneratingPlot,
  handleGeneratePlot,
  pendingPlotProposal,
  clearPendingPlotProposal,
  setInspectionContext,
  setShowPromptInspector,
  openAIEngineStudio
}) => {
  const [activeRightTab, setActiveRightTab] = useState<'proposal' | 'thoughts'>('proposal');
  const [mobileViewTab, setMobileViewTab] = useState<'current' | 'ai'>('current');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isFullScreenPlot, setIsFullScreenPlot] = useState(false);

  // Auto-Plot Real-time Character Counter (Must be called unconditionally at top of component)
  const { plotCount, resetCounter } = useAutoCounters(currentNovel?.id);

  // Local state for Active Plot to avoid race conditions and cursor jumping
  const [localPlotText, setLocalPlotText] = useState(currentNovel?.plot || '');
  const pendingPlotUpdatesRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentNovelRef = useRef(currentNovel);

  useEffect(() => {
    currentNovelRef.current = currentNovel;
  }, [currentNovel]);

  // Synchronize local plot text ONLY when novel changes to avoid cursor jumping
  useEffect(() => {
    if (currentNovel) {
      setLocalPlotText(currentNovel.plot || '');
      pendingPlotUpdatesRef.current = null;
    }
  }, [currentNovel?.id]);

  const flushPendingPlot = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingPlotUpdatesRef.current !== null && currentNovelRef.current) {
      const textToSave = pendingPlotUpdatesRef.current;
      pendingPlotUpdatesRef.current = null;
      updateNovelContent(currentNovelRef.current.id, { plot: textToSave }, true, true);
    }
  }, [updateNovelContent]);

  // Clean up and flush on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (pendingPlotUpdatesRef.current !== null && currentNovelRef.current) {
        updateNovelContent(currentNovelRef.current.id, { plot: pendingPlotUpdatesRef.current }, true, true);
      }
    };
  }, [updateNovelContent]);

  if (!currentNovel) return null;

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Immediate save on apply proposal
  const handleApplyPlot = () => {
    if (!pendingPlotProposal) return;
    flushPendingPlot();
    const appliedText = pendingPlotProposal.finalPlotText;
    setLocalPlotText(appliedText);

    // 완전 분리: 플롯 적용 시 소설 설정(Novel Style / styleDirectives)을 오염시키지 않고 순수하게 plot만 갱신
    updateNovelContent(currentNovel.id, { plot: appliedText }, false, true);
    clearPendingPlotProposal();
  };

  const handlePlotChange = (newText: string) => {
    setLocalPlotText(newText);
    pendingPlotUpdatesRef.current = newText;
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (pendingPlotUpdatesRef.current !== null && currentNovelRef.current) {
        const textToSave = pendingPlotUpdatesRef.current;
        pendingPlotUpdatesRef.current = null;
        updateNovelContent(currentNovelRef.current.id, { plot: textToSave }, true, false);
      }
    }, 1000);
  };

  const handleClose = () => {
    flushPendingPlot();
    onClose();
  };

  const handleUpdatePlotSettings = (updater: (prev: any) => any) => {
    setPlotWorkbenchSettings((prev: any) => {
      const base = prev || currentNovel.settings.plot || GLOBAL_DEFAULTS.plot;
      const nextSettings = updater(base);
      updateNovelContent(
        currentNovel.id,
        {
          settings: {
            ...currentNovel.settings,
            plot: nextSettings
          }
        },
        true,
        false
      );
      return nextSettings;
    });
  };

  const currentModel = plotWorkbenchSettings.modelName || GLOBAL_DEFAULTS.plot.modelName;
  const supportedThinkingLevels = getSupportedThinkingLevels(currentModel);

  const isAutoPlotEnabled = currentNovel.settings.automation?.autoPlot ?? false;
  const isIncludeInPrompt = currentNovel.settings.plot?.includeInPrompt ?? true;
  const triggerChars = currentNovel.settings.plot?.triggerChars ?? GLOBAL_DEFAULTS.plot.triggerChars;
  const plotProgress = Math.min(100, Math.round((plotCount / (triggerChars || 1)) * 100));

  const toggleAutoPlot = () => {
    const nextState = !isAutoPlotEnabled;
    updateNovelContent(currentNovel.id, {
      settings: {
        ...currentNovel.settings,
        automation: {
          ...(currentNovel.settings.automation || GLOBAL_DEFAULTS.automation),
          autoPlot: nextState
        }
      }
    });
  };

  const toggleIncludeInPrompt = () => {
    const nextState = !isIncludeInPrompt;
    updateNovelContent(currentNovel.id, {
      settings: {
        ...currentNovel.settings,
        plot: {
          ...(currentNovel.settings.plot || GLOBAL_DEFAULTS.plot),
          includeInPrompt: nextState
        }
      }
    });
  };

  const handleKeyDownDirective = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isGeneratingPlot) {
        flushPendingPlot();
        handleGeneratePlot(plotAIInstruction, plotWorkbenchSettings);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="plot-workbench-overlay"
          className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-6 lg:p-10"
        >
          <motion.div 
            key="plot-workbench-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div 
            key="plot-workbench-content"
            initial={{ scale: 0.98, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 20 }}
            className="relative w-full max-w-6xl h-full sm:h-[90vh] bg-zinc-900 border-x sm:border border-zinc-800 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* 1. Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 z-20">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 text-zinc-100">
                    Plot Workbench & Narrative Director
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium hidden sm:inline-block border border-purple-500/30">
                      4-Tier Architecture
                    </span>
                  </h2>
                  <p className="hidden sm:block text-[11px] text-zinc-500">
                    서술 디렉팅 · 5단계 장기 대서사 · 5000자 씬 시퀀스 · 장기 복선 프레임워크를 총괄 기획합니다
                  </p>
                </div>
              </div>

              {/* Quick Status Badges & Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Include in Prompt Quick Pill */}
                <button
                  onClick={toggleIncludeInPrompt}
                  className={cn(
                    "hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border",
                    isIncludeInPrompt 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                      : "bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-zinc-300"
                  )}
                  title="본문 생성 시 플롯 주입 토글"
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", isIncludeInPrompt ? "bg-emerald-400" : "bg-zinc-500")} />
                  {isIncludeInPrompt ? "본문 주입 켬" : "본문 주입 끔"}
                </button>

                {/* Auto-Plot Quick Pill & Live Counter */}
                <div className="hidden md:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-sm">
                  <button
                    onClick={toggleAutoPlot}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                      isAutoPlotEnabled 
                        ? "bg-purple-500/20 text-purple-300 font-bold" 
                        : "text-zinc-400 hover:text-zinc-300"
                    )}
                    title={`플롯 자동 갱신 토글 (설정치: ${triggerChars.toLocaleString()}자)`}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", isAutoPlotEnabled ? "bg-purple-400 animate-pulse" : "bg-zinc-500")} />
                    {isAutoPlotEnabled ? "자동 갱신 켬" : "자동 갱신 끔"}
                  </button>
                  {isAutoPlotEnabled && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono text-purple-300/90 border-l border-zinc-800">
                      <span>{plotCount.toLocaleString()}/{triggerChars.toLocaleString()}자 ({plotProgress}%)</span>
                      {plotCount > 0 && (
                        <button
                          type="button"
                          onClick={() => resetCounter('autoplot')}
                          className="text-zinc-500 hover:text-purple-300 underline"
                          title="누적 글자수를 0으로 리셋합니다"
                        >
                          초기화
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Engine Studio Direct Launcher */}
                <button
                  onClick={() => openAIEngineStudio?.('plot')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-purple-400 rounded-lg text-xs font-bold transition-all border border-zinc-700 shadow-sm"
                  title="플롯 AI 파라미터 설정 (AI Engine Studio)"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">엔진 설정</span>
                </button>

                {/* Prompt Inspector Button */}
                <button 
                  onClick={() => {
                    setInspectionContext({ type: 'plot' });
                    setShowPromptInspector(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-all border border-zinc-700"
                  title="프롬프트 검사기 열기"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Prompt</span>
                </button>

                {/* Close Button */}
                <button 
                  onClick={handleClose} 
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2. Main Workspace: Split View */}
            <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/50">
              {/* Mobile Tab Switcher */}
              <div className="flex lg:hidden border-b border-zinc-800 bg-zinc-950/50 p-1">
                <button 
                  onClick={() => setMobileViewTab('current')}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                    mobileViewTab === 'current' ? "bg-zinc-800 text-white" : "text-zinc-500"
                  )}
                >
                  Active Plot ({localPlotText.length} chars)
                </button>
                <button 
                  onClick={() => setMobileViewTab('ai')}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                    mobileViewTab === 'ai' ? "bg-purple-500/10 text-purple-400" : "text-zinc-500"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  AI Proposal {pendingPlotProposal && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                </button>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800 overflow-hidden">
                {/* Left Column: Active Plot Blueprint */}
                <div className={cn("flex flex-col overflow-hidden bg-zinc-950/30", mobileViewTab !== 'current' && "hidden lg:flex")}>
                  <div className="p-3 sm:px-4 sm:py-3 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                        Active Plot Blueprint (현재 적용된 플롯)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {localPlotText.length.toLocaleString()} chars
                      </span>
                      <button 
                        onClick={() => setIsFullScreenPlot(true)}
                        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 rounded transition-colors"
                        title="전체화면 집중 편집 (Fullscreen)"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleCopy(localPlotText, 'current')}
                        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 rounded transition-colors"
                        title="플롯 복사"
                      >
                        {copiedSection === 'current' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 p-4 sm:p-5 overflow-y-auto custom-scrollbar">
                    <textarea 
                      value={localPlotText}
                      onChange={(e) => handlePlotChange(e.target.value)}
                      placeholder="[1. 서술 방향 및 연출 디렉팅]&#10;&#10;### 작품 전역 지침&#10;- 시점 운용, 기본 문체, 서술 톤, 절대 금기 등 불변의 헌법적 지침&#10;&#10;### 현재 아크 지침&#10;- 이번 5단계 로드맵 및 시퀀스 집필 시 집중할 연출 주안점, 서술 템포, 인물 간 거리감 등&#10;&#10;[2. 장기 대서사 플롯 (아크 완결성 및 5단계 로드맵)]&#10;- 이번 권(아크)의 종착지 및 완결성, 5대 핵심 마일스톤 (각 약 20,000자)&#10;&#10;[3. 현재 진행 중인 사건 플롯]&#10;■ 사건 타이틀 및 쟁점 (Episode Incident, 약 20,000-25,000자 스케일)&#10;■ 사건을 통한 인물 관계의 변곡점 (Relationship Delta)&#10;■ 중량감 있는 4~5단계 씬 시퀀스 전개 및 연출 작법&#10;- 시퀀스 1 [도입/탐색] (약 5,000자)&#10;- 시퀀스 2 [전개/돌발 위기] (약 5,000자)&#10;- 시퀀스 3 [절정/진면목 폭발] (약 5,000자)&#10;- 시퀀스 4 [수습/여운/다음 불씨] (약 5,000자)&#10;&#10;[4. 장기 복선 및 고정 논리 프레임워크]&#10;(여러 플롯에 걸쳐 지속적으로 영향을 미치는 장기 복선, 인과적 불변 제약, 파티의 다단계 실행 계획 등을 자유롭고 유연하게 기록)"
                      className="w-full h-full bg-transparent border-none p-0 text-xs sm:text-sm text-zinc-200 focus:outline-none resize-none leading-relaxed font-sans placeholder-zinc-700 custom-scrollbar"
                    />
                  </div>

                  <div className="px-4 py-2 bg-zinc-950/60 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1.5 text-emerald-500/90 font-medium">
                      <Check className="w-3 h-3" />
                      직접 편집 시 실시간 안전 저장
                    </span>
                    <span className={cn(
                      "font-medium",
                      isIncludeInPrompt ? "text-emerald-500/80" : "text-zinc-500"
                    )}>
                      {isIncludeInPrompt ? "● 본문 생성 시 주입 중" : "○ 본문 주입 비활성"}
                    </span>
                  </div>
                </div>

                {/* Right Column: AI Proposal & Inspection */}
                <div className={cn("flex flex-col overflow-hidden bg-purple-500/[0.015]", mobileViewTab !== 'ai' && "hidden lg:flex")}>
                  {/* Sub-Tabs (2-Tab Streamlined Architecture) */}
                  <div className="p-2 sm:px-4 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setActiveRightTab('proposal')}
                        className={cn(
                          "px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5",
                          activeRightTab === 'proposal' ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        <Sparkles className="w-3 h-3" />
                        제안된 플롯
                      </button>
                      <button 
                        onClick={() => setActiveRightTab('thoughts')}
                        className={cn(
                          "px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5",
                          activeRightTab === 'thoughts' ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                        )}
                      >
                        <Brain className="w-3 h-3" />
                        사고 분석 (CoT)
                      </button>
                    </div>

                    {pendingPlotProposal && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleCopy(pendingPlotProposal.finalPlotText, 'proposal')}
                          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 rounded transition-colors"
                          title="제안 복사"
                        >
                          {copiedSection === 'proposal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tab Content Area */}
                  <div className="flex-1 p-4 sm:p-5 overflow-y-auto custom-scrollbar">
                    {pendingPlotProposal ? (
                      activeRightTab === 'proposal' ? (
                        <div className="space-y-4">
                          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300 flex items-center justify-between">
                            <span>AI 디렉터가 3대 필수 요소를 완비한 플롯 청사진을 제안했습니다.</span>
                            <span className="text-[10px] font-mono text-purple-400">
                              {pendingPlotProposal.finalPlotText.length.toLocaleString()} chars
                            </span>
                          </div>
                          <pre className="whitespace-pre-wrap text-xs sm:text-sm text-zinc-200 font-sans leading-relaxed bg-zinc-950/40 p-4 rounded-xl border border-zinc-800">
                            {pendingPlotProposal.finalPlotText}
                          </pre>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(pendingPlotProposal.thoughtProcess.diagnosis || pendingPlotProposal.thoughtProcess.readerAnalysis || pendingPlotProposal.thoughtProcess.candidates) ? (
                            /* New 5-Tier Reader-Driven CoT Architecture */
                            <>
                              {/* 1. 상황 및 불일치 진단 (Diagnosis & Mismatches) */}
                              {pendingPlotProposal.thoughtProcess.diagnosis && (
                                <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                                      <Sparkles className="w-3.5 h-3.5" />
                                      1단계: 상황 및 불일치 진단 (Diagnosis & Mismatches)
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {pendingPlotProposal.thoughtProcess.diagnosis.plotType && (
                                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                                          {pendingPlotProposal.thoughtProcess.diagnosis.plotType}
                                        </span>
                                      )}
                                      {pendingPlotProposal.thoughtProcess.diagnosis.milestonePhase && (
                                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-mono border border-zinc-700">
                                          {pendingPlotProposal.thoughtProcess.diagnosis.milestonePhase}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2.5">
                                    {pendingPlotProposal.thoughtProcess.diagnosis.contextAnalysis && (
                                      <div className="space-y-1">
                                        <p className="text-[11px] font-bold text-zinc-400">진행 상태 및 작가 요구 분석</p>
                                        <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-purple-500/40 bg-zinc-900/40 p-2.5 rounded-r-lg">
                                          {pendingPlotProposal.thoughtProcess.diagnosis.contextAnalysis}
                                        </p>
                                      </div>
                                    )}

                                    {pendingPlotProposal.thoughtProcess.diagnosis.mismatches && pendingPlotProposal.thoughtProcess.diagnosis.mismatches.length > 0 && (
                                      <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                          발견된 서사·플롯 어긋남 및 대응 (Mismatches)
                                        </div>
                                        <ul className="list-disc list-inside space-y-1 text-xs text-zinc-300">
                                          {pendingPlotProposal.thoughtProcess.diagnosis.mismatches.map((m, idx) => (
                                            <li key={idx} className="leading-relaxed">{m}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                      {pendingPlotProposal.thoughtProcess.diagnosis.currentMilestone && (
                                        <div className="p-2.5 bg-zinc-900/70 rounded-xl border border-zinc-800">
                                          <span className="text-[10px] text-zinc-400 font-bold block">타겟 마일스톤</span>
                                          <span className="text-zinc-200 font-medium">{pendingPlotProposal.thoughtProcess.diagnosis.currentMilestone}</span>
                                        </div>
                                      )}
                                      {pendingPlotProposal.thoughtProcess.diagnosis.roadmapDecision && (
                                        <div className="p-2.5 bg-zinc-900/70 rounded-xl border border-zinc-800">
                                          <span className="text-[10px] text-zinc-400 font-bold block">로드맵 결정 (유지/수정)</span>
                                          <span className="text-zinc-200 font-medium">{pendingPlotProposal.thoughtProcess.diagnosis.roadmapDecision}</span>
                                        </div>
                                      )}
                                    </div>

                                    {pendingPlotProposal.thoughtProcess.diagnosis.section1Handling && (
                                      <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800/80 text-xs">
                                        <span className="text-[10px] text-indigo-400 font-bold block">1번 구역 (작품 전역 / 현재 아크) 처리 방침</span>
                                        <p className="text-zinc-300 mt-0.5 leading-relaxed">{pendingPlotProposal.thoughtProcess.diagnosis.section1Handling}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 2. 독자 재미 분석 & 코덱스 갈등 재료 (Reader & Conflict) */}
                              {(pendingPlotProposal.thoughtProcess.readerAnalysis || (pendingPlotProposal.thoughtProcess.codexMaterial && pendingPlotProposal.thoughtProcess.codexMaterial.length > 0)) && (
                                <div className="p-4 bg-zinc-950/60 border border-amber-900/30 rounded-2xl space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                                    <Target className="w-3.5 h-3.5" />
                                    2단계: 독자 재미 분석 및 갈등 재료 (Reader & Conflict)
                                  </div>

                                  <div className="space-y-2.5 text-xs">
                                    {pendingPlotProposal.thoughtProcess.readerAnalysis?.enjoymentDirection && (
                                      <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl space-y-1">
                                        <span className="font-bold text-amber-300 block text-[11px]">이 작품의 독자가 즐기는 재미의 방향</span>
                                        <p className="text-zinc-200 leading-relaxed">{pendingPlotProposal.thoughtProcess.readerAnalysis.enjoymentDirection}</p>
                                      </div>
                                    )}

                                    {pendingPlotProposal.thoughtProcess.readerAnalysis?.currentExpectations && pendingPlotProposal.thoughtProcess.readerAnalysis.currentExpectations.length > 0 && (
                                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1">
                                        <span className="font-bold text-zinc-300 block text-[11px]">독자의 실시간 질문 · 기다리는 보상 · 예상 전개</span>
                                        <ul className="list-disc list-inside space-y-0.5 text-zinc-300 text-[11px]">
                                          {pendingPlotProposal.thoughtProcess.readerAnalysis.currentExpectations.map((exp, idx) => (
                                            <li key={idx}>{exp}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {pendingPlotProposal.thoughtProcess.readerAnalysis?.openClues && pendingPlotProposal.thoughtProcess.readerAnalysis.openClues.length > 0 && (
                                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1">
                                        <span className="font-bold text-cyan-300 block text-[11px]">깔려있는 미회수 복선 및 단서</span>
                                        <ul className="list-disc list-inside space-y-0.5 text-zinc-300 text-[11px]">
                                          {pendingPlotProposal.thoughtProcess.readerAnalysis.openClues.map((clue, idx) => (
                                            <li key={idx}>{clue}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {pendingPlotProposal.thoughtProcess.codexMaterial && pendingPlotProposal.thoughtProcess.codexMaterial.length > 0 && (
                                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1">
                                        <span className="font-bold text-purple-300 block text-[11px]">설정집 갈등 재료 (약점, 세력 이해관계, 숨은 여지)</span>
                                        <ul className="list-disc list-inside space-y-0.5 text-zinc-300 text-[11px]">
                                          {pendingPlotProposal.thoughtProcess.codexMaterial.map((mat, idx) => (
                                            <li key={idx}>{mat}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 3. 전개 후보군 다방향 도출 & 역순 검토 (Candidates & Reverse Review) */}
                              {((pendingPlotProposal.thoughtProcess.candidates && pendingPlotProposal.thoughtProcess.candidates.length > 0) || (pendingPlotProposal.thoughtProcess.reverseReview && pendingPlotProposal.thoughtProcess.reverseReview.length > 0)) && (
                                <div className="p-4 bg-zinc-950/60 border border-purple-900/30 rounded-2xl space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                                    <GitBranch className="w-3.5 h-3.5" />
                                    3단계: 전개 후보군 다방향 도출 & 역순 검토 (Candidates & Reverse Review)
                                  </div>

                                  {/* 후보군 목록 (평가 없는 순수 방향·핵심 사건) */}
                                  {pendingPlotProposal.thoughtProcess.candidates && pendingPlotProposal.thoughtProcess.candidates.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-[11px] font-bold text-zinc-400">도출된 전개 후보군</p>
                                      <div className="grid grid-cols-1 gap-2">
                                        {pendingPlotProposal.thoughtProcess.candidates.map((c, idx) => (
                                          <div key={idx} className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1 text-xs">
                                            <div className="flex items-center justify-between">
                                              <span className="font-bold text-purple-300 font-mono text-[11px]">{c.id}</span>
                                            </div>
                                            <p className="text-zinc-200 leading-relaxed">{c.direction}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* 역순 검토 결과 */}
                                  {pendingPlotProposal.thoughtProcess.reverseReview && pendingPlotProposal.thoughtProcess.reverseReview.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                                      <p className="text-[11px] font-bold text-zinc-400">역순(마지막 후보 → C1) 다차원 검토</p>
                                      <div className="grid grid-cols-1 gap-2.5">
                                        {pendingPlotProposal.thoughtProcess.reverseReview.map((rev, idx) => {
                                          const relation = rev.expectationRelation || rev.predictability;
                                          return (
                                            <div key={idx} className="p-3 bg-zinc-900/60 border border-zinc-800/90 rounded-xl space-y-2 text-xs">
                                              <div className="flex items-center justify-between">
                                                <span className="font-bold text-zinc-200 font-mono text-[11px]">{rev.id}</span>
                                                {relation && (
                                                  <span className={cn(
                                                    "px-2 py-0.5 rounded text-[10px] font-bold border",
                                                    relation.includes('비틀') ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
                                                    relation.includes('뒤집') ? "bg-rose-500/20 text-rose-300 border-rose-500/30" :
                                                    relation.includes('지연') ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" :
                                                    relation.includes('충족') ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                                                    "bg-zinc-800 text-zinc-300 border-zinc-700"
                                                  )}>
                                                    {relation}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
                                                {rev.characterFit && <div><span className="text-zinc-500 block">인물 부합:</span><span className="text-zinc-300">{rev.characterFit}</span></div>}
                                                {rev.codexAndStoryFit && <div><span className="text-zinc-500 block">설정 및 본문 정합:</span><span className="text-zinc-300">{rev.codexAndStoryFit}</span></div>}
                                              </div>
                                              {(rev.strengths || rev.weaknesses) && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-800/60 text-[11px]">
                                                  {rev.strengths && (
                                                    <div className="p-2 bg-emerald-950/20 border border-emerald-900/30 rounded-lg space-y-0.5">
                                                      <span className="text-emerald-400 font-bold block text-[10px]">장점 (독자 경험)</span>
                                                      <p className="text-emerald-200/90 leading-relaxed">{rev.strengths}</p>
                                                    </div>
                                                  )}
                                                  {rev.weaknesses && (
                                                    <div className="p-2 bg-rose-950/20 border border-rose-900/30 rounded-lg space-y-0.5">
                                                      <span className="text-rose-400 font-bold block text-[10px]">약점 및 위험</span>
                                                      <p className="text-rose-200/90 leading-relaxed">{rev.weaknesses}</p>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 4. 최종 선택 및 반전/신규 설정 (Selection & Twists) */}
                              {pendingPlotProposal.thoughtProcess.selection && (
                                <div className="p-4 bg-zinc-950/60 border border-cyan-900/30 rounded-2xl space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                                    <Compass className="w-3.5 h-3.5" />
                                    4단계: 최종 전개 채택 및 반전·신규 설정 (Selection & Twists)
                                  </div>

                                  <div className="space-y-3 text-xs">
                                    {/* 4-A. 후보 상호 비교 분석 (Comparison) */}
                                    {pendingPlotProposal.thoughtProcess.selection.comparison && (
                                      <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
                                        <span className="font-bold text-indigo-300 block text-[11px]">후보 상호 비교 분석 (Comparison)</span>
                                        <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">{pendingPlotProposal.thoughtProcess.selection.comparison}</p>
                                      </div>
                                    )}

                                    {/* 4-B. 후보별 최종 결정 (Decisions) */}
                                    {pendingPlotProposal.thoughtProcess.selection.decisions && pendingPlotProposal.thoughtProcess.selection.decisions.length > 0 && (
                                      <div className="space-y-1.5">
                                        <span className="font-bold text-zinc-300 block text-[11px]">후보별 최종 결정 (Decisions)</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {pendingPlotProposal.thoughtProcess.selection.decisions.map((dec, idx) => (
                                            <div key={idx} className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1 text-xs">
                                              <div className="flex items-center justify-between">
                                                <span className="font-mono font-bold text-zinc-200">{dec.id}</span>
                                                <span className={cn(
                                                  "px-2 py-0.5 rounded text-[10px] font-bold border",
                                                  dec.decision === '채택' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                                                  dec.decision === '조합' ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" :
                                                  "bg-zinc-800 text-zinc-400 border-zinc-700"
                                                )}>
                                                  {dec.decision}
                                                </span>
                                              </div>
                                              <p className="text-[11px] text-zinc-400 leading-relaxed">{dec.reason}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* 4-C. 최종 선택된 전개 및 독자 경험 근거 (Chosen) */}
                                    {pendingPlotProposal.thoughtProcess.selection.chosen && (
                                      <div className="p-3 bg-cyan-950/20 border border-cyan-900/30 rounded-xl space-y-1">
                                        <span className="font-bold text-cyan-300 block text-[11px]">채택된 전개 및 독자 경험 근거</span>
                                        <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">{pendingPlotProposal.thoughtProcess.selection.chosen}</p>
                                      </div>
                                    )}

                                    {/* 4-D. 설계된 반전 및 신규 설정 (twistAndNewSettings) */}
                                    {pendingPlotProposal.thoughtProcess.selection.twistAndNewSettings && pendingPlotProposal.thoughtProcess.selection.twistAndNewSettings.length > 0 && (
                                      <div className="space-y-1.5">
                                        <span className="font-bold text-zinc-300 block text-[11px]">설계된 반전 및 신규 설정</span>
                                        <div className="grid grid-cols-1 gap-2">
                                          {pendingPlotProposal.thoughtProcess.selection.twistAndNewSettings.map((t, idx) => (
                                            <div key={idx} className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
                                              <div className="flex items-center justify-between">
                                                <span className="font-bold text-zinc-200 text-xs">{t.name}</span>
                                                <span className={cn(
                                                  "px-2 py-0.5 rounded text-[10px] font-bold border",
                                                  t.kind.includes('반전') ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                                                )}>
                                                  {t.kind}
                                                </span>
                                              </div>
                                              {t.relationToCodex && <p className="text-[11px] text-zinc-400"><strong className="text-zinc-300">설정집 대비:</strong> {t.relationToCodex}</p>}
                                              {t.cluesAndPayoff && <p className="text-[11px] text-zinc-400"><strong className="text-zinc-300">단서 및 회수:</strong> {t.cluesAndPayoff}</p>}
                                              {t.readerKnownFactRisk && <p className="text-[11px] text-amber-300/90"><strong className="text-amber-400">기지 사실 리스크:</strong> {t.readerKnownFactRisk}</p>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 5. 사전 품질 검증 & 시퀀스/4번 구역 로드맵 (Verification & Sequences) */}
                              {(pendingPlotProposal.thoughtProcess.verification || (pendingPlotProposal.thoughtProcess.sequencePlan && pendingPlotProposal.thoughtProcess.sequencePlan.length > 0) || pendingPlotProposal.thoughtProcess.section4Plan) && (
                                <div className="p-4 bg-zinc-950/60 border border-emerald-900/30 rounded-2xl space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    5단계: 사전 품질 검증 및 시퀀스·복선 계획 (Verification & Roadmap)
                                  </div>

                                  <div className="space-y-2.5 text-xs">
                                    {/* 3대 품질 검증 */}
                                    {pendingPlotProposal.thoughtProcess.verification && (
                                      <div className="grid grid-cols-1 gap-1.5 p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl">
                                        <span className="font-bold text-emerald-300 text-[11px]">집필 전 3대 정합성 검증</span>
                                        {pendingPlotProposal.thoughtProcess.verification.characterCheck && (
                                          <p className="text-[11px] text-zinc-300"><strong className="text-zinc-400">인물 점검:</strong> {pendingPlotProposal.thoughtProcess.verification.characterCheck}</p>
                                        )}
                                        {pendingPlotProposal.thoughtProcess.verification.continuityCheck && (
                                          <p className="text-[11px] text-zinc-300"><strong className="text-zinc-400">서사 연속성:</strong> {pendingPlotProposal.thoughtProcess.verification.continuityCheck}</p>
                                        )}
                                        {pendingPlotProposal.thoughtProcess.verification.codexCheck && pendingPlotProposal.thoughtProcess.verification.codexCheck.length > 0 && (
                                          <div className="mt-1">
                                            <span className="text-[10px] text-zinc-500 block">코덱스 불변 점검:</span>
                                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-zinc-400">
                                              {pendingPlotProposal.thoughtProcess.verification.codexCheck.map((chk, idx) => (
                                                <li key={idx}>{chk}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* 6~8개 시퀀스 계획 */}
                                    {pendingPlotProposal.thoughtProcess.sequencePlan && pendingPlotProposal.thoughtProcess.sequencePlan.length > 0 && (
                                      <div className="space-y-1.5 p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl">
                                        <span className="font-bold text-purple-300 text-[11px]">6~8개 시퀀스 설계 로드맵 ({pendingPlotProposal.thoughtProcess.sequencePlan.length}개)</span>
                                        <ul className="space-y-1 text-[11px] text-zinc-300 font-sans">
                                          {pendingPlotProposal.thoughtProcess.sequencePlan.map((sPlan, idx) => (
                                            <li key={idx} className="p-1.5 bg-zinc-950/50 rounded border border-zinc-800/60 leading-relaxed">
                                              {sPlan}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* 4번 구역 갱신 계획 */}
                                    {pendingPlotProposal.thoughtProcess.section4Plan && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                        {pendingPlotProposal.thoughtProcess.section4Plan.keepOrAdd && pendingPlotProposal.thoughtProcess.section4Plan.keepOrAdd.length > 0 && (
                                          <div className="p-2 bg-zinc-900/60 rounded-lg border border-zinc-800">
                                            <span className="text-amber-300 font-bold block mb-1">유지/추가 항목</span>
                                            <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                                              {pendingPlotProposal.thoughtProcess.section4Plan.keepOrAdd.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {pendingPlotProposal.thoughtProcess.section4Plan.remove && pendingPlotProposal.thoughtProcess.section4Plan.remove.length > 0 && (
                                          <div className="p-2 bg-zinc-900/60 rounded-lg border border-zinc-800">
                                            <span className="text-rose-300 font-bold block mb-1">제거/졸업 항목</span>
                                            <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                                              {pendingPlotProposal.thoughtProcess.section4Plan.remove.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (pendingPlotProposal.thoughtProcess.updatePlan || pendingPlotProposal.thoughtProcess.preWriteCheck || pendingPlotProposal.thoughtProcess.contextAnalysis) ? (
                            /* New 3-Tier Streamlined CoT Rendering */
                            <>
                              {/* 1. 입력 및 맥락 분석 (Context Analysis) */}
                              {(pendingPlotProposal.thoughtProcess.contextAnalysis || pendingPlotProposal.thoughtProcess.step1_diagnosis) && (
                                <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                                      <Sparkles className="w-3.5 h-3.5" />
                                      1단계: 상황 및 입력 분석 (Context Analysis)
                                    </div>
                                    {pendingPlotProposal.thoughtProcess.step1_diagnosis?.plotType && (
                                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                                        {pendingPlotProposal.thoughtProcess.step1_diagnosis.plotType}
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-3">
                                    {(pendingPlotProposal.thoughtProcess.contextAnalysis || pendingPlotProposal.thoughtProcess.step1_diagnosis?.contextAnalysis) && (
                                      <div className="space-y-1">
                                        <p className="text-[11px] font-bold text-zinc-400">소설 맥락 종합 분석 (Context Analysis)</p>
                                        <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-zinc-700 bg-zinc-900/30 p-2 rounded-r-lg">
                                          {pendingPlotProposal.thoughtProcess.contextAnalysis || pendingPlotProposal.thoughtProcess.step1_diagnosis?.contextAnalysis}
                                        </p>
                                      </div>
                                    )}

                                    {pendingPlotProposal.thoughtProcess.step1_diagnosis?.plotDirection && (
                                      <div className="space-y-1">
                                        <p className="text-[11px] font-bold text-purple-300">서사 진화 및 갱신 방향 (Plot Direction)</p>
                                        <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-purple-500/40 bg-purple-950/20 p-2 rounded-r-lg">
                                          {pendingPlotProposal.thoughtProcess.step1_diagnosis.plotDirection}
                                        </p>
                                      </div>
                                    )}

                                    {/* 마일스톤 진행도 및 가교 시퀀스 판정 */}
                                    {pendingPlotProposal.thoughtProcess.step1_diagnosis?.milestoneProgressAnalysis && (
                                      <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <p className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                                            <Compass className="w-3 h-3" />
                                            마일스톤 진행 판정 및 가교 프로토콜
                                          </p>
                                          <div className="flex items-center gap-1.5">
                                            {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.milestonePhase && (
                                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                                                {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.milestonePhase}
                                              </span>
                                            )}
                                            <span className={cn(
                                              "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                                              pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.isTransitionBridgeRequired
                                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                                                : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                            )}>
                                              {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.isTransitionBridgeRequired ? "가교 시퀀스 가동 (BRIDGE)" : "단일 마일스톤 집중"}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                          {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.currentMilestone && (
                                            <div className="p-2 bg-zinc-950/50 rounded-lg border border-zinc-800/80">
                                              <span className="text-[10px] text-zinc-400 font-bold block">현재 타겟 마일스톤:</span>
                                              <span className="text-zinc-200 text-xs">{pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.currentMilestone}</span>
                                            </div>
                                          )}
                                          {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.bridgeTargetMilestone && (
                                            <div className="p-2 bg-zinc-950/50 rounded-lg border border-cyan-900/30">
                                              <span className="text-[10px] text-cyan-400 font-bold block">가교 목표 마일스톤:</span>
                                              <span className="text-cyan-200 text-xs">{pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.bridgeTargetMilestone}</span>
                                            </div>
                                          )}
                                        </div>

                                        {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.deductionReason && (
                                          <p className="text-[10px] text-zinc-400 leading-tight pl-1 border-l border-zinc-700">
                                            {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.deductionReason}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 2. 구역별 갱신 계획 (Update Plan) */}
                              {pendingPlotProposal.thoughtProcess.updatePlan && (
                                <div className="p-4 bg-zinc-950/60 border border-indigo-900/30 rounded-2xl space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                                    <Sliders className="w-3.5 h-3.5" />
                                    2단계: 플롯 구역별 갱신 계획 (Update Plan)
                                  </div>
                                  <div className="grid grid-cols-1 gap-2.5 text-xs">
                                    {pendingPlotProposal.thoughtProcess.updatePlan.section1 && (
                                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1">
                                        <span className="font-bold text-indigo-300 block text-[11px]">[1번 구역] 서술 방향 및 연출 디렉팅</span>
                                        <p className="text-zinc-300 leading-relaxed">{pendingPlotProposal.thoughtProcess.updatePlan.section1}</p>
                                      </div>
                                    )}
                                    {pendingPlotProposal.thoughtProcess.updatePlan.section2 && (
                                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1">
                                        <span className="font-bold text-purple-300 block text-[11px]">[2번 구역] 장기 대서사 로드맵</span>
                                        <p className="text-zinc-300 leading-relaxed">{pendingPlotProposal.thoughtProcess.updatePlan.section2}</p>
                                      </div>
                                    )}
                                    {pendingPlotProposal.thoughtProcess.updatePlan.section4 && (
                                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1">
                                        <span className="font-bold text-amber-300 block text-[11px]">[4번 구역] 장기 복선 및 고정 논리 프레임워크</span>
                                        <p className="text-zinc-300 leading-relaxed">{pendingPlotProposal.thoughtProcess.updatePlan.section4}</p>
                                      </div>
                                    )}
                                    {pendingPlotProposal.thoughtProcess.updatePlan.prunedItems && pendingPlotProposal.thoughtProcess.updatePlan.prunedItems.length > 0 && (
                                      <div className="p-2.5 bg-rose-950/20 border border-rose-900/30 rounded-xl space-y-1.5">
                                        <span className="font-bold text-rose-300 block text-[11px]">제거 및 졸업 항목 (Pruned Items)</span>
                                        <ul className="list-disc list-inside space-y-0.5 text-zinc-300 text-[11px]">
                                          {pendingPlotProposal.thoughtProcess.updatePlan.prunedItems.map((item, idx) => (
                                            <li key={idx}>{item}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 3. 집필 전 4대 핵심 점검 (Pre-Write Check) */}
                              {pendingPlotProposal.thoughtProcess.preWriteCheck && (
                                <div className="p-4 bg-zinc-950/60 border border-emerald-900/30 rounded-2xl space-y-3">
                                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    3단계: 집필 전 4대 핵심 품질 점검 (Pre-Write Check)
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    {pendingPlotProposal.thoughtProcess.preWriteCheck.consistency && (
                                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1">
                                        <span className="font-bold text-emerald-300 block text-[11px]">1. 정합성 점검 (Consistency)</span>
                                        <p className="text-zinc-300 leading-relaxed text-[11px]">{pendingPlotProposal.thoughtProcess.preWriteCheck.consistency}</p>
                                      </div>
                                    )}
                                    {pendingPlotProposal.thoughtProcess.preWriteCheck.character && (
                                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1">
                                        <span className="font-bold text-indigo-300 block text-[11px]">2. 인물 및 관계 점검 (Character)</span>
                                        <p className="text-zinc-300 leading-relaxed text-[11px]">{pendingPlotProposal.thoughtProcess.preWriteCheck.character}</p>
                                      </div>
                                    )}
                                    {pendingPlotProposal.thoughtProcess.preWriteCheck.logic && (
                                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1">
                                        <span className="font-bold text-amber-300 block text-[11px]">3. 논리 및 인과 점검 (Logic)</span>
                                        <p className="text-zinc-300 leading-relaxed text-[11px]">{pendingPlotProposal.thoughtProcess.preWriteCheck.logic}</p>
                                      </div>
                                    )}
                                    {pendingPlotProposal.thoughtProcess.preWriteCheck.densityAndPayoff && (
                                      <div className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1">
                                        <span className="font-bold text-purple-300 block text-[11px]">4. 밀도 및 재미 점검 (Density & Payoff)</span>
                                        <p className="text-zinc-300 leading-relaxed text-[11px]">{pendingPlotProposal.thoughtProcess.preWriteCheck.densityAndPayoff}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : pendingPlotProposal.thoughtProcess.step1_diagnosis ? (
                            /* Legacy 8-Step Algorithmic Plot Rendering */
                            <>
                              {/* Step 1: Diagnosis */}
                              <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    1단계: 연역적 플롯 진단 및 스텝 실행 계획
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                                    {pendingPlotProposal.thoughtProcess.step1_diagnosis.plotType}
                                  </span>
                                </div>
                                
                                <div className="space-y-3">
                                  {pendingPlotProposal.thoughtProcess.step1_diagnosis.contextAnalysis && (
                                    <div className="space-y-1">
                                      <p className="text-[11px] font-bold text-zinc-400">소설 맥락 종합 분석 (Context Analysis)</p>
                                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-zinc-700 bg-zinc-900/30 p-2 rounded-r-lg">
                                        {pendingPlotProposal.thoughtProcess.step1_diagnosis.contextAnalysis}
                                      </p>
                                    </div>
                                  )}

                                  <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-purple-300">서사 진화 및 갱신 방향 (Plot Direction)</p>
                                    <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-purple-500/40 bg-purple-950/20 p-2 rounded-r-lg">
                                      {pendingPlotProposal.thoughtProcess.step1_diagnosis.plotDirection}
                                    </p>
                                  </div>

                                  {pendingPlotProposal.thoughtProcess.step1_diagnosis.reasoning && (
                                    <div className="space-y-1">
                                      <p className="text-[11px] font-bold text-zinc-400">추론 근거 (Reasoning)</p>
                                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-zinc-700">
                                        {pendingPlotProposal.thoughtProcess.step1_diagnosis.reasoning}
                                      </p>
                                    </div>
                                  )}

                                  {/* 마일스톤 진행도 및 가교 시퀀스 판정 (Milestone Progress Analysis) */}
                                  {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis && (
                                    <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                                          <Compass className="w-3 h-3" />
                                          단일 마일스톤 진행 판정 및 가교 프로토콜
                                        </p>
                                        <div className="flex items-center gap-1.5">
                                          {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.milestonePhase && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                                              {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.milestonePhase}
                                            </span>
                                          )}
                                          <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                                            pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.isTransitionBridgeRequired
                                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                                              : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                          )}>
                                            {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.isTransitionBridgeRequired ? "가교 시퀀스 가동 (BRIDGE)" : "단일 마일스톤 집중"}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.currentMilestone && (
                                          <div className="p-2 bg-zinc-950/50 rounded-lg border border-zinc-800/80">
                                            <span className="text-[10px] text-zinc-400 font-bold block">현재 타겟 마일스톤:</span>
                                            <span className="text-zinc-200 text-xs">{pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.currentMilestone}</span>
                                          </div>
                                        )}
                                        {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.bridgeTargetMilestone && (
                                          <div className="p-2 bg-zinc-950/50 rounded-lg border border-cyan-900/30">
                                            <span className="text-[10px] text-cyan-400 font-bold block">가교 목표 마일스톤:</span>
                                            <span className="text-cyan-200 text-xs">{pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.bridgeTargetMilestone}</span>
                                          </div>
                                        )}
                                      </div>

                                      {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.deductionReason && (
                                        <p className="text-[10px] text-zinc-400 leading-tight pl-1 border-l border-zinc-700">
                                          {pendingPlotProposal.thoughtProcess.step1_diagnosis.milestoneProgressAnalysis.deductionReason}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Step Execution Plan Matrix */}
                                  {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan && (
                                    <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                                      <p className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                                        <Sliders className="w-3 h-3 text-purple-400" />
                                        스텝별 실행 판정 매트릭스 (Step Execution Plan)
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {/* Step 2 */}
                                        {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing && (
                                          <div className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <span className="text-[11px] font-bold text-zinc-300">Step 2 (연출 헌법)</span>
                                              <span className={cn(
                                                "px-1.5 py-0.5 rounded text-[9px] font-bold",
                                                pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.execute
                                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                              )}>
                                                {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.execute ? "EXECUTE" : "BYPASS"}
                                              </span>
                                            </div>
                                            
                                            {/* Step 2 Condition Chips */}
                                            <div className="flex flex-wrap gap-1 text-[9px]">
                                              {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.isInitialCreation !== undefined && (
                                                <span className={cn("px-1.5 py-0.2 rounded border", pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.isInitialCreation ? "bg-purple-950/40 text-purple-300 border-purple-800/50" : "bg-zinc-950/40 text-zinc-500 border-zinc-800")}>
                                                  최초생성: {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.isInitialCreation ? "예" : "아니오"}
                                                </span>
                                              )}
                                              {(pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.hasGlobalDirectingChangeRequest !== undefined || pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.hasDirectingChangeRequest !== undefined) && (
                                                <span className={cn("px-1.5 py-0.2 rounded border", (pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.hasGlobalDirectingChangeRequest ?? pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.hasDirectingChangeRequest) ? "bg-purple-950/40 text-purple-300 border-purple-800/50" : "bg-zinc-950/40 text-zinc-500 border-zinc-800")}>
                                                  전역지침수정: {(pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.hasGlobalDirectingChangeRequest ?? pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.hasDirectingChangeRequest) ? "있음" : "없음"}
                                                </span>
                                              )}
                                              {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.hasArcDirectingUpdate !== undefined && (
                                                <span className={cn("px-1.5 py-0.2 rounded border", pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.hasArcDirectingUpdate ? "bg-indigo-950/40 text-indigo-300 border-indigo-800/50" : "bg-zinc-950/40 text-zinc-500 border-zinc-800")}>
                                                  아크지침갱신: {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.hasArcDirectingUpdate ? "필요" : "유지"}
                                                </span>
                                              )}
                                              {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.needsLegacyMigration && (
                                                <span className="px-1.5 py-0.2 rounded border bg-amber-950/40 text-amber-300 border-amber-800/50">
                                                  2-Tier마이그레이션: 대상
                                                </span>
                                              )}
                                              {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.currentRulesAdequate !== undefined && (
                                                <span className={cn("px-1.5 py-0.2 rounded border", pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.currentRulesAdequate ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/40" : "bg-rose-950/30 text-rose-400 border-rose-900/40")}>
                                                  기존규칙유효: {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.currentRulesAdequate ? "유효" : "부족"}
                                                </span>
                                              )}
                                            </div>

                                            <p className="text-[10px] text-zinc-400 leading-tight">
                                              {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.deductionReason || pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step2_directing.criteriaEvaluation}
                                            </p>
                                          </div>
                                        )}

                                        {/* Step 3-4 */}
                                        {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro && (
                                          <div className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <span className="text-[11px] font-bold text-zinc-300">Step 3-4 (대서사 로드맵)</span>
                                              <span className={cn(
                                                "px-1.5 py-0.5 rounded text-[9px] font-bold",
                                                pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.execute
                                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                              )}>
                                                {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.execute ? "EXECUTE" : "BYPASS"}
                                              </span>
                                            </div>

                                            {/* Step 3-4 Condition Chips */}
                                            <div className="flex flex-wrap gap-1 text-[9px]">
                                              {(pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.isArcCompletedOrNewArcRequired !== undefined || pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.isMilestoneCompletedOrNewArc !== undefined) && (
                                                <span className={cn("px-1.5 py-0.2 rounded border", (pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.isArcCompletedOrNewArcRequired || pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.isMilestoneCompletedOrNewArc) ? "bg-amber-950/40 text-amber-300 border-amber-800/50" : "bg-zinc-950/40 text-zinc-500 border-zinc-800")}>
                                                  새아크수립필요: {(pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.isArcCompletedOrNewArcRequired || pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.isMilestoneCompletedOrNewArc) ? "예" : "아니오"}
                                                </span>
                                              )}
                                              {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.hasMacroShiftRequest !== undefined && (
                                                <span className={cn("px-1.5 py-0.2 rounded border", pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.hasMacroShiftRequest ? "bg-purple-950/40 text-purple-300 border-purple-800/50" : "bg-zinc-950/40 text-zinc-500 border-zinc-800")}>
                                                  대서사수정요청: {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.hasMacroShiftRequest ? "있음" : "없음"}
                                                </span>
                                              )}
                                              {(pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.currentArcRoadmapValid !== undefined || pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.currentRoadmapValid !== undefined) && (
                                                <span className={cn("px-1.5 py-0.2 rounded border", (pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.currentArcRoadmapValid ?? pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.currentRoadmapValid) ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/40" : "bg-rose-950/30 text-rose-400 border-rose-900/40")}>
                                                  기존아크순항: {(pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.currentArcRoadmapValid ?? pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.currentRoadmapValid) ? "순항" : "재설계"}
                                                </span>
                                              )}
                                            </div>

                                            <p className="text-[10px] text-zinc-400 leading-tight">
                                              {pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.deductionReason || pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step3_4_macro.criteriaEvaluation}
                                            </p>
                                          </div>
                                        )}

                                        {/* Step 5 (Invariants & Foreshadowing) */}
                                        {(pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step5_invariants || pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step7_invariants) && (() => {
                                          const step5Plan = pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step5_invariants || pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step7_invariants;
                                          if (!step5Plan) return null;
                                          return (
                                            <div className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1.5">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-zinc-300">Step 5 (장기 복선/논리 사전 구축)</span>
                                                <span className={cn(
                                                  "px-1.5 py-0.5 rounded text-[9px] font-bold",
                                                  step5Plan.execute
                                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                                )}>
                                                  {step5Plan.execute ? "EXECUTE" : "BYPASS"}
                                                </span>
                                              </div>

                                              {/* Step 5 Condition Chips */}
                                              <div className="flex flex-wrap gap-1 text-[9px]">
                                                {step5Plan.hasNewForeshadowingOrLogicRules !== undefined && (
                                                  <span className={cn("px-1.5 py-0.2 rounded border", step5Plan.hasNewForeshadowingOrLogicRules ? "bg-purple-950/40 text-purple-300 border-purple-800/50" : "bg-zinc-950/40 text-zinc-500 border-zinc-800")}>
                                                    신규복선/규칙: {step5Plan.hasNewForeshadowingOrLogicRules ? "있음" : "없음"}
                                                  </span>
                                                )}
                                                {step5Plan.existingFrameworkSufficient !== undefined && (
                                                  <span className={cn("px-1.5 py-0.2 rounded border", step5Plan.existingFrameworkSufficient ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/40" : "bg-rose-950/30 text-rose-400 border-rose-900/40")}>
                                                    기존내용충분: {step5Plan.existingFrameworkSufficient ? "충분" : "부족"}
                                                  </span>
                                                )}
                                                {step5Plan.hasPrunableOrGraduatedItems !== undefined && (
                                                  <span className={cn("px-1.5 py-0.2 rounded border", step5Plan.hasPrunableOrGraduatedItems ? "bg-amber-950/30 text-amber-400 border-amber-900/40" : "bg-zinc-950/40 text-zinc-500 border-zinc-800")}>
                                                    졸업/소거대상: {step5Plan.hasPrunableOrGraduatedItems ? "있음" : "없음"}
                                                  </span>
                                                )}
                                              </div>

                                              <p className="text-[10px] text-zinc-400 leading-tight">
                                                {step5Plan.deductionReason || step5Plan.criteriaEvaluation}
                                              </p>

                                              {Array.isArray(step5Plan.prunableItemsAudit) && 
                                               step5Plan.prunableItemsAudit.length > 0 && (
                                                <div className="bg-amber-950/20 p-1.5 rounded border border-amber-900/30 text-[9px] space-y-0.5">
                                                  <span className="text-amber-400 font-bold block">소거/졸업 대상 사전 식별 ({step5Plan.prunableItemsAudit.length}건):</span>
                                                  <ul className="text-zinc-300 list-disc list-inside space-y-0.5">
                                                    {step5Plan.prunableItemsAudit.map((pItem: string, pIdx: number) => (
                                                      <li key={pIdx}>{pItem}</li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })()}

                                        {/* Step 6-7 (Sequences) */}
                                        {(pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step6_7_activeSequences || pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step5_6_activeSequences) && (() => {
                                          const step67Plan = pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step6_7_activeSequences || pendingPlotProposal.thoughtProcess.step1_diagnosis.stepExecutionPlan.step5_6_activeSequences;
                                          if (!step67Plan) return null;
                                          return (
                                            <div className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1.5">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-zinc-300">Step 6-7 (씬 시퀀스 설계 및 비판)</span>
                                                <span className={cn(
                                                  "px-1.5 py-0.5 rounded text-[9px] font-bold",
                                                  step67Plan.execute
                                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                                )}>
                                                  {step67Plan.execute ? "EXECUTE" : "BYPASS"}
                                                </span>
                                              </div>

                                              {/* Step 6-7 Condition Chips */}
                                              <div className="flex flex-wrap gap-1 text-[9px]">
                                                {step67Plan.isSection1OnlyRevision !== undefined && (
                                                  <span className={cn("px-1.5 py-0.2 rounded border", step67Plan.isSection1OnlyRevision ? "bg-amber-950/40 text-amber-300 border-amber-800/50" : "bg-zinc-950/40 text-zinc-500 border-zinc-800")}>
                                                    디렉팅단독수정: {step67Plan.isSection1OnlyRevision ? "예" : "아니오"}
                                                  </span>
                                                )}
                                                {step67Plan.needsProseDraftingSequences !== undefined && (
                                                  <span className={cn("px-1.5 py-0.2 rounded border", step67Plan.needsProseDraftingSequences ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/40" : "bg-zinc-950/40 text-zinc-500 border-zinc-800")}>
                                                    시퀀스구상필요: {step67Plan.needsProseDraftingSequences ? "필요" : "불필요"}
                                                  </span>
                                                )}
                                              </div>

                                              <p className="text-[10px] text-zinc-400 leading-tight">
                                                {step67Plan.deductionReason || step67Plan.criteriaEvaluation}
                                              </p>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Step 2: Directing Constitution */}
                              {pendingPlotProposal.thoughtProcess.step2_directingConstitution?.isBypassed ? (
                                <div className="p-3 bg-zinc-950/60 border border-zinc-800/50 rounded-2xl flex items-center justify-between opacity-60">
                                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                                    <Check className="w-3.5 h-3.5" />
                                    2단계: 연출 헌법 (BYPASS - 기존 디렉팅 규칙 유지)
                                  </div>
                                  {pendingPlotProposal.thoughtProcess.step2_directingConstitution.bypassReason && (
                                    <span className="text-[11px] text-zinc-500">{pendingPlotProposal.thoughtProcess.step2_directingConstitution.bypassReason}</span>
                                  )}
                                </div>
                              ) : (
                                <div className="p-4 bg-zinc-950/60 border border-cyan-900/30 rounded-2xl space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                                    <Film className="w-3.5 h-3.5" />
                                    2단계: 연출 헌법 재정립
                                  </div>
                                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                    {pendingPlotProposal.thoughtProcess.step2_directingConstitution?.directingRules}
                                  </p>
                                </div>
                              )}

                              {/* Step 3-4: Macro Roadmap */}
                              {pendingPlotProposal.thoughtProcess.step3_4_macro?.isBypassed ? (
                                <div className="p-3 bg-zinc-950/60 border border-zinc-800/50 rounded-2xl flex items-center justify-between opacity-60">
                                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                                    <Check className="w-3.5 h-3.5" />
                                    3~4단계: 거시 로드맵 (BYPASS - 기존 5단계 로드맵 순항)
                                  </div>
                                  {pendingPlotProposal.thoughtProcess.step3_4_macro.bypassReason && (
                                    <span className="text-[11px] text-zinc-500">{pendingPlotProposal.thoughtProcess.step3_4_macro.bypassReason}</span>
                                  )}
                                </div>
                              ) : (
                                <div className="p-4 bg-zinc-950/60 border border-indigo-900/30 rounded-2xl space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                                    <Compass className="w-3.5 h-3.5" />
                                    3~4단계: 거시 로드맵 및 비판
                                  </div>
                                  <div className="space-y-4">
                                    {pendingPlotProposal.thoughtProcess.step3_4_macro?.preliminaryIdeation && (
                                      <div className="space-y-2">
                                        <p className="text-[11px] font-bold text-violet-400/80 flex items-center gap-1.5"><Brain className="w-3 h-3" /> 사전 구상 (Preliminary Ideation)</p>
                                        <ul className="space-y-2">
                                          <li className="text-xs pl-2 border-l-2 border-violet-500/30">
                                            <span className="font-bold text-zinc-300 block">서사적 의도 및 목적:</span>
                                            <span className="text-zinc-400">{pendingPlotProposal.thoughtProcess.step3_4_macro.preliminaryIdeation.narrativeIntent}</span>
                                          </li>
                                          <li className="text-xs pl-2 border-l-2 border-violet-500/30">
                                            <span className="font-bold text-zinc-300 block">캐릭터 심리 관성:</span>
                                            <span className="text-zinc-400">{pendingPlotProposal.thoughtProcess.step3_4_macro.preliminaryIdeation.characterInertia}</span>
                                          </li>
                                          <li className="text-xs pl-2 border-l-2 border-violet-500/30">
                                            <span className="font-bold text-zinc-300 block">개연적 변화 궤적 (Delta):</span>
                                            <span className="text-zinc-400">{pendingPlotProposal.thoughtProcess.step3_4_macro.preliminaryIdeation.plausibleDelta}</span>
                                          </li>
                                        </ul>
                                      </div>
                                    )}
                                    <div className="space-y-2">
                                      <p className="text-[11px] font-bold text-zinc-400">거시 로드맵 초안</p>
                                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-indigo-500/30">
                                        {pendingPlotProposal.thoughtProcess.step3_4_macro?.macroRoadmap}
                                      </p>
                                    </div>
                                    {pendingPlotProposal.thoughtProcess.step3_4_macro?.macroCritiqueAndPatch && (
                                      <div className="space-y-2">
                                        <p className="text-[11px] font-bold text-amber-400/80 flex items-center gap-1.5"><ShieldAlert className="w-3 h-3" /> 거시 자가 비판 및 패치</p>
                                        {typeof pendingPlotProposal.thoughtProcess.step3_4_macro.macroCritiqueAndPatch === 'object' ? (
                                          <ul className="space-y-2">
                                            <li className="text-xs pl-2 border-l-2 border-amber-500/30">
                                              <span className="font-bold text-zinc-300 block">거시적 논리 흐름:</span>
                                              <span className="text-zinc-400">{pendingPlotProposal.thoughtProcess.step3_4_macro.macroCritiqueAndPatch.logicalFlow}</span>
                                            </li>
                                            <li className="text-xs pl-2 border-l-2 border-amber-500/30">
                                              <span className="font-bold text-zinc-300 block">페이스 및 카타르시스:</span>
                                              <span className="text-zinc-400">{pendingPlotProposal.thoughtProcess.step3_4_macro.macroCritiqueAndPatch.pacingAndPayoff}</span>
                                            </li>
                                            {pendingPlotProposal.thoughtProcess.step3_4_macro.macroCritiqueAndPatch.characterInertiaAndDelta && (
                                              <li className="text-xs pl-2 border-l-2 border-rose-500/30">
                                                <span className="font-bold text-rose-300 block">캐릭터 관성 및 점진성:</span>
                                                <span className="text-rose-400/80">{pendingPlotProposal.thoughtProcess.step3_4_macro.macroCritiqueAndPatch.characterInertiaAndDelta}</span>
                                              </li>
                                            )}
                                            {pendingPlotProposal.thoughtProcess.step3_4_macro.macroCritiqueAndPatch.timelineAndCanonConsistency && (
                                              <li className="text-xs pl-2 border-l-2 border-cyan-500/40">
                                                <span className="font-bold text-cyan-300 block">기서술 타임라인 및 설정 정합성 (Timeline & Canon):</span>
                                                <span className="text-cyan-400/90">{pendingPlotProposal.thoughtProcess.step3_4_macro.macroCritiqueAndPatch.timelineAndCanonConsistency}</span>
                                              </li>
                                            )}
                                            {pendingPlotProposal.thoughtProcess.step3_4_macro.macroCritiqueAndPatch.customVectors?.map((cv: any, i: number) => (
                                              <li key={i} className="text-xs pl-2 border-l-2 border-amber-500/30">
                                                <span className="font-bold text-zinc-300 flex items-center gap-1"><Sparkles className="w-3 h-3 text-emerald-400" /> 동적 거시 비판 ({cv.vectorName}):</span>
                                                <span className="text-zinc-400">{cv.flaw}</span>
                                              </li>
                                            ))}
                                            <li className="text-xs pl-2 border-l-2 border-emerald-500/30 mt-2">
                                              <span className="font-bold text-zinc-300 flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> 보완 패치:</span>
                                              <span className="text-zinc-400 leading-relaxed whitespace-pre-wrap">{pendingPlotProposal.thoughtProcess.step3_4_macro.macroCritiqueAndPatch.patchedSolutions}</span>
                                            </li>
                                          </ul>
                                        ) : (
                                          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-amber-500/30">
                                            {pendingPlotProposal.thoughtProcess.step3_4_macro.macroCritiqueAndPatch}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Step 5: Invariants & Foreshadowing (Pre-Inference Causal Step) */}
                              {(() => {
                                const step5Invariants = pendingPlotProposal.thoughtProcess.step5_invariantsAndForeshadowing || pendingPlotProposal.thoughtProcess.step7_invariantsAndForeshadowing;
                                if (!step5Invariants) return null;
                                return step5Invariants.isBypassed ? (
                                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/50 rounded-2xl flex items-center justify-between opacity-60">
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                                      <Check className="w-3.5 h-3.5" />
                                      5단계: 장기 복선 및 사전 고정 논리 (BYPASS - 기존 프레임워크 유지)
                                    </div>
                                    {step5Invariants.bypassReason && (
                                      <span className="text-[11px] text-zinc-500">{step5Invariants.bypassReason}</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-4 bg-zinc-950/60 border border-amber-900/30 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                                        <Layers className="w-3.5 h-3.5" />
                                        5단계: 하드 로직 전술 설계 및 자체 무자비 자가검증 (Hard-Logic Engine)
                                      </div>
                                      <span className="text-[10px] text-amber-500/80 font-mono">
                                        시퀀스 진입 전 완결 검증
                                      </span>
                                    </div>

                                    {/* Draft Operational Blueprints (5-Step Causal Chain) */}
                                    {step5Invariants.draftOperationalLogicAndInvariants?.operationalBlueprints && step5Invariants.draftOperationalLogicAndInvariants.operationalBlueprints.length > 0 && (
                                      <div className="bg-amber-950/25 p-3.5 rounded-xl border border-amber-900/40 space-y-2.5">
                                        <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                                          <Brain className="w-3 h-3 text-amber-400" />
                                          논리적 실행 5단계 인과 설계도 (Operational Blueprints)
                                        </p>
                                        <div className="space-y-3">
                                          {step5Invariants.draftOperationalLogicAndInvariants.operationalBlueprints.map((bp, bpIdx) => (
                                            <div key={bpIdx} className="bg-zinc-900/80 p-3 rounded-lg border border-amber-900/30 space-y-1.5 text-xs">
                                              <div className="font-bold text-amber-400 text-[11px] flex items-center gap-1.5">
                                                <Sparkles className="w-3 h-3" />
                                                {bp.blueprintTitle || `실행 설계도 ${bpIdx + 1}`}
                                              </div>
                                              {(bp.coreChallengeAndConstraints || bp.threatAndConstraint) && (
                                                <div className="pl-2 border-l-2 border-rose-500/40">
                                                  <span className="text-zinc-400 font-semibold block text-[10px]">1. 직면한 과제 및 상황적 제약:</span>
                                                  <span className="text-zinc-300">{bp.coreChallengeAndConstraints || bp.threatAndConstraint}</span>
                                                </div>
                                              )}
                                              {(bp.keyLeverageAndAdvantage || bp.informationAsymmetry) && (
                                                <div className="pl-2 border-l-2 border-indigo-500/40">
                                                  <span className="text-zinc-400 font-semibold block text-[10px]">2. 핵심 지렛대 및 비교 우위:</span>
                                                  <span className="text-zinc-300">{bp.keyLeverageAndAdvantage || bp.informationAsymmetry}</span>
                                                </div>
                                              )}
                                              {(bp.stepByStepProgression || bp.preparatoryInductionSteps) && (
                                                <div className="pl-2 border-l-2 border-amber-500/40">
                                                  <span className="text-zinc-400 font-semibold block text-[10px]">3. 단계별 실행 프로세스 / 동적 인과:</span>
                                                  <span className="text-zinc-300">{bp.stepByStepProgression || bp.preparatoryInductionSteps}</span>
                                                </div>
                                              )}
                                              {(bp.decisiveMechanism || bp.executionMechanism) && (
                                                <div className="pl-2 border-l-2 border-emerald-500/40 bg-emerald-950/20 p-1.5 rounded-r">
                                                  <span className="text-emerald-300 font-semibold block text-[10px]">4. 인과적 결착 메커니즘:</span>
                                                  <span className="text-zinc-200">{bp.decisiveMechanism || bp.executionMechanism}</span>
                                                </div>
                                              )}
                                              {(bp.costsAndAftermath || bp.costAndCounteraction) && (
                                                <div className="pl-2 border-l-2 border-purple-500/40">
                                                  <span className="text-zinc-400 font-semibold block text-[10px]">5. 수반되는 대가, 소모 및 사후 영향:</span>
                                                  <span className="text-zinc-300">{bp.costsAndAftermath || bp.costAndCounteraction}</span>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Diegetic Constraints & Invariants */}
                                    {step5Invariants.draftOperationalLogicAndInvariants?.diegeticConstraintsAndInvariants && step5Invariants.draftOperationalLogicAndInvariants.diegeticConstraintsAndInvariants.length > 0 && (
                                      <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80 space-y-1 text-xs">
                                        <span className="text-[11px] font-bold text-amber-300/90 block">물리적/상황적 불변식 및 절대 제약 (Diegetic Invariants):</span>
                                        <ul className="text-zinc-300 list-disc list-inside space-y-1">
                                          {step5Invariants.draftOperationalLogicAndInvariants.diegeticConstraintsAndInvariants.map((c, cIdx) => (
                                            <li key={cIdx} className="text-[11px]">{c}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Hard-Logic Self-Critique Card */}
                                    {step5Invariants.hardLogicSelfCritique && (
                                      <div className="bg-rose-950/20 p-3.5 rounded-xl border border-rose-900/30 space-y-2 text-xs">
                                        <p className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                                          하드 로직 무자비 자체 비판 (Hard-Logic Self-Critique)
                                        </p>
                                        <div className="space-y-1.5">
                                          {(step5Invariants.hardLogicSelfCritique.antiConvenienceAndPlausibility || step5Invariants.hardLogicSelfCritique.antiConvenienceAndFakeTactics) && (
                                            <div className="pl-2 border-l-2 border-rose-500/40">
                                              <span className="font-bold text-zinc-300 block text-[10px]">편의주의 및 개연성 검증:</span>
                                              <span className="text-zinc-400">{step5Invariants.hardLogicSelfCritique.antiConvenienceAndPlausibility || step5Invariants.hardLogicSelfCritique.antiConvenienceAndFakeTactics}</span>
                                            </div>
                                          )}
                                          {(step5Invariants.hardLogicSelfCritique.causalFeasibility || step5Invariants.hardLogicSelfCritique.causalInevitabilityAndPhysics) && (
                                            <div className="pl-2 border-l-2 border-rose-500/40">
                                              <span className="font-bold text-zinc-300 block text-[10px]">인과적 실현 가능성:</span>
                                              <span className="text-zinc-400">{step5Invariants.hardLogicSelfCritique.causalFeasibility || step5Invariants.hardLogicSelfCritique.causalInevitabilityAndPhysics}</span>
                                            </div>
                                          )}
                                          {(step5Invariants.hardLogicSelfCritique.processDensity || step5Invariants.hardLogicSelfCritique.maneuveringDensity) && (
                                            <div className="pl-2 border-l-2 border-rose-500/40">
                                              <span className="font-bold text-zinc-300 block text-[10px]">전개 밀도 및 단계성:</span>
                                              <span className="text-zinc-400">{step5Invariants.hardLogicSelfCritique.processDensity || step5Invariants.hardLogicSelfCritique.maneuveringDensity}</span>
                                            </div>
                                          )}
                                          {(step5Invariants.hardLogicSelfCritique.consequenceAndConsistency || step5Invariants.hardLogicSelfCritique.costAndCounteraction) && (
                                            <div className="pl-2 border-l-2 border-rose-500/40">
                                              <span className="font-bold text-zinc-300 block text-[10px]">대가, 소모 및 장기 정합성:</span>
                                              <span className="text-zinc-400">{step5Invariants.hardLogicSelfCritique.consequenceAndConsistency || step5Invariants.hardLogicSelfCritique.costAndCounteraction}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Patched Solutions Preview */}
                                    {step5Invariants.patchedOperationalLogic?.patchedBlueprintsAndInvariants && (
                                      <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/30 space-y-1 text-xs">
                                        <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                                          <Check className="w-3 h-3" />
                                          보완 확정된 하드 로직 청사진 (Patched Operational Logic)
                                        </p>
                                        <p className="text-zinc-300 leading-relaxed text-[11px] whitespace-pre-wrap pl-2 border-l-2 border-emerald-500/40">
                                          {step5Invariants.patchedOperationalLogic.patchedBlueprintsAndInvariants}
                                        </p>
                                      </div>
                                    )}

                                    {/* Prior Logic & Foreshadowing Strategy Card */}
                                    {step5Invariants.priorLogicAndForeshadowingStrategy && (
                                      <div className="bg-amber-950/25 p-3.5 rounded-xl border border-amber-900/40 space-y-2.5">
                                        <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                                          <Brain className="w-3 h-3 text-amber-400" />
                                          시퀀스 진입 전 사전 논리 및 복선 전략 (Prior Logic Strategy)
                                        </p>
                                        <div className="space-y-2 text-xs">
                                          {step5Invariants.priorLogicAndForeshadowingStrategy.recalledForeshadowing && (
                                            <div className="pl-2 border-l-2 border-emerald-500/50">
                                              <span className="font-bold text-emerald-300 block text-[10px]">1. 회수 및 강화할 기배치 복선:</span>
                                              <span className="text-zinc-300">{step5Invariants.priorLogicAndForeshadowingStrategy.recalledForeshadowing}</span>
                                            </div>
                                          )}
                                          {step5Invariants.priorLogicAndForeshadowingStrategy.plantedForeshadowing && (
                                            <div className="pl-2 border-l-2 border-purple-500/50">
                                              <span className="font-bold text-purple-300 block text-[10px]">2. 신규 파종 및 암시할 복선:</span>
                                              <span className="text-zinc-300">{step5Invariants.priorLogicAndForeshadowingStrategy.plantedForeshadowing}</span>
                                            </div>
                                          )}
                                          {step5Invariants.priorLogicAndForeshadowingStrategy.diegeticLogicConstraints && (
                                            <div className="pl-2 border-l-2 border-amber-500/50 bg-amber-950/20 p-2 rounded-r-lg">
                                              <span className="font-bold text-amber-300 block text-[10px]">3. 씬 지배 논리 제약 (전투/위계/물리/자원):</span>
                                              <span className="text-zinc-200">{step5Invariants.priorLogicAndForeshadowingStrategy.diegeticLogicConstraints}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Anti-Duplication & Graduation Audit Card */}
                                    {step5Invariants.antiDuplicationAndGraduationAudit && (
                                      <div className="bg-amber-950/20 p-3 rounded-xl border border-amber-900/30 space-y-2 text-xs">
                                        <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                                          <ShieldCheck className="w-3 h-3 text-amber-400" />
                                          도메인 순도 및 중복 배제 감사 (Anti-Duplication Audit)
                                        </p>
                                        <div className="space-y-1.5 text-[11px] font-sans">
                                          {step5Invariants.antiDuplicationAndGraduationAudit.section1DirectingLeakCheck && (
                                            <div className="pl-2 border-l-2 border-amber-500/40">
                                              <span className="text-zinc-400 font-semibold block text-[10px]">1번 연출 헌법 유입 검증:</span>
                                              <span className="text-zinc-300">{step5Invariants.antiDuplicationAndGraduationAudit.section1DirectingLeakCheck}</span>
                                            </div>
                                          )}
                                          {step5Invariants.antiDuplicationAndGraduationAudit.codexOverlapFilter && (
                                            <div className="pl-2 border-l-2 border-amber-500/40">
                                              <span className="text-zinc-400 font-semibold block text-[10px]">코덱스 중복 필터링:</span>
                                              <span className="text-zinc-300">{step5Invariants.antiDuplicationAndGraduationAudit.codexOverlapFilter}</span>
                                            </div>
                                          )}
                                          {Array.isArray(step5Invariants.antiDuplicationAndGraduationAudit.graduationPruningList) && 
                                           step5Invariants.antiDuplicationAndGraduationAudit.graduationPruningList.length > 0 && (
                                            <div className="pl-2 border-l-2 border-emerald-500/40 bg-emerald-950/20 p-1.5 rounded-r">
                                              <span className="text-emerald-400 font-bold block text-[10px]">본문 실현/승격으로 4번에서 졸업(제거)된 항목:</span>
                                              <ul className="text-zinc-300 list-disc list-inside space-y-0.5">
                                                {step5Invariants.antiDuplicationAndGraduationAudit.graduationPruningList.map((item: string, pIdx: number) => (
                                                  <li key={pIdx}>{item}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {step5Invariants.scratchpads && step5Invariants.scratchpads.length > 0 ? (
                                      <div className="space-y-3">
                                        {step5Invariants.scratchpads.map((sp, idx) => (
                                          <div key={idx} className="bg-amber-950/10 p-3 rounded-xl border border-amber-900/20 space-y-1.5">
                                            <div className="inline-block px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                                              {sp.category}
                                            </div>
                                            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap pl-1">
                                              {sp.content}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                        {step5Invariants.scratchpad || "(추가된 복선 없음)"}
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Step 6-7: Active Sequences & Episode Ideation */}
                              {(() => {
                                const step67Sequences = pendingPlotProposal.thoughtProcess.step6_7_activeSequences || pendingPlotProposal.thoughtProcess.step5_6_activeSequences;
                                if (!step67Sequences) return null;
                                return step67Sequences.isBypassed ? (
                                  <div className="p-3 bg-zinc-950/60 border border-zinc-800/50 rounded-2xl flex items-center justify-between opacity-60">
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                                      <Check className="w-3.5 h-3.5" />
                                      6~7단계: 씬 시퀀스 (BYPASS)
                                    </div>
                                    {step67Sequences.bypassReason && (
                                      <span className="text-[11px] text-zinc-500">{step67Sequences.bypassReason}</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-4 bg-zinc-950/60 border border-rose-900/30 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                                        <Flame className="w-3.5 h-3.5" />
                                        6~7단계: 에피소드 사건 연역 구상 및 심층 비판
                                      </div>
                                      {step67Sequences.sequences && (
                                        <span className="text-[10px] text-zinc-400 font-mono">
                                          {step67Sequences.sequences.length} Sequences
                                        </span>
                                      )}
                                    </div>

                                    {/* Episode Ideation 5-Step Deduction */}
                                    {step67Sequences.episodeIdeation ? (
                                      <div className="bg-rose-950/20 p-3.5 rounded-xl border border-rose-900/30 space-y-2.5">
                                        <p className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                                          <Brain className="w-3 h-3" />
                                          에피소드 인과 연역 구상 (Episode Ideation)
                                        </p>
                                        <div className="space-y-2 text-xs">
                                          <div className="pl-2 border-l-2 border-rose-500/40">
                                            <span className="font-bold text-zinc-300 block text-[11px]">1. 서사적 의도 및 목적:</span>
                                            <span className="text-zinc-300">{step67Sequences.episodeIdeation.narrativeIntent}</span>
                                          </div>
                                          <div className="pl-2 border-l-2 border-rose-500/40">
                                            <span className="font-bold text-zinc-300 block text-[11px]">2. 인물 심리 관성 & 방어 기제:</span>
                                            <span className="text-zinc-300">{step67Sequences.episodeIdeation.characterInertia}</span>
                                          </div>
                                          <div className="pl-2 border-l-2 border-rose-500/40">
                                            <span className="font-bold text-zinc-300 block text-[11px]">3. 개연적 변화 궤적 (Relationship Delta):</span>
                                            <span className="text-zinc-300">{step67Sequences.episodeIdeation.plausibleDelta}</span>
                                          </div>
                                          <div className="pl-2 border-l-2 border-rose-500/40">
                                            <span className="font-bold text-zinc-300 block text-[11px]">4. 에피소드 구조적 종착지:</span>
                                            <span className="text-zinc-300">{step67Sequences.episodeIdeation.structuralDestination}</span>
                                          </div>
                                          <div className="pl-2 border-l-2 border-amber-500/50 bg-amber-950/20 p-2 rounded-r-lg">
                                            <span className="font-bold text-amber-300 block text-[11px]">5. 최종 도출된 사건 타이틀 및 핵심 쟁점:</span>
                                            <span className="text-zinc-200 font-semibold">{step67Sequences.episodeIdeation.episodeIncident}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="bg-rose-950/20 p-3 rounded-xl border border-rose-900/20">
                                        <p className="text-[11px] font-bold text-rose-300">목표 에피소드 사건</p>
                                        <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap mt-1">
                                          {step67Sequences.episodeIncident}
                                        </p>
                                      </div>
                                    )}
                                    
                                    <div className="space-y-2">
                                      <p className="text-[11px] font-bold text-amber-400/80 flex items-center gap-1.5"><Brain className="w-3 h-3" /> 무자비한 자가 비판 (Self-Critique Flaws)</p>
                                      <ul className="space-y-2">
                                        <li className="text-xs pl-2 border-l-2 border-amber-500/30">
                                          <span className="font-bold text-zinc-300 block">개연성 결함 (Causality):</span>
                                          <span className="text-zinc-400">{step67Sequences.selfCritiqueFlaws?.causality}</span>
                                        </li>
                                        <li className="text-xs pl-2 border-l-2 border-amber-500/30">
                                          <span className="font-bold text-zinc-300 block">캐릭터 붕괴/거리 (OOC):</span>
                                          <span className="text-zinc-400">{step67Sequences.selfCritiqueFlaws?.characterOOC}</span>
                                        </li>
                                        <li className="text-xs pl-2 border-l-2 border-amber-500/30">
                                          <span className="font-bold text-zinc-300 block">흥미/도파민 (Entertainment):</span>
                                          <span className="text-zinc-400">{step67Sequences.selfCritiqueFlaws?.entertainment}</span>
                                        </li>
                                        <li className="text-xs pl-2 border-l-2 border-amber-500/30">
                                          <span className="font-bold text-zinc-300 block">서사 밀도 (Pacing Density):</span>
                                          <span className="text-zinc-400">{step67Sequences.selfCritiqueFlaws?.pacingDensity}</span>
                                        </li>
                                        {step67Sequences.selfCritiqueFlaws?.historicalFactAndTimeline && (
                                          <li className="text-xs pl-2 border-l-2 border-cyan-500/40">
                                            <span className="font-bold text-cyan-300 block">기서술 팩트 및 시계열 검증 (Historical Ground Truth):</span>
                                            <span className="text-cyan-400/90">{step67Sequences.selfCritiqueFlaws.historicalFactAndTimeline}</span>
                                          </li>
                                        )}
                                        {step67Sequences.selfCritiqueFlaws?.foreshadowingAndLogicFulfillment && (
                                          <li className="text-xs pl-2 border-l-2 border-purple-500/50">
                                            <span className="font-bold text-purple-300 block">5단계 복선 및 논리 제약 이행률 검증 (Foreshadowing & Logic Fulfillment):</span>
                                            <span className="text-purple-300/90">{step67Sequences.selfCritiqueFlaws.foreshadowingAndLogicFulfillment}</span>
                                          </li>
                                        )}
                                        {/* Custom Vectors */}
                                        {step67Sequences.selfCritiqueFlaws?.customVectors?.map((cv, i) => (
                                          <li key={i} className="text-xs pl-2 border-l-2 border-amber-500/30">
                                            <span className="font-bold text-zinc-300 flex items-center gap-1"><Sparkles className="w-3 h-3 text-emerald-400" /> 동적 비판 ({cv.vectorName}):</span>
                                            <span className="text-zinc-400">{cv.flaw}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[11px] font-bold text-emerald-400/80 flex items-center gap-1.5"><Check className="w-3 h-3" /> 보완 패치 (Patched Solutions)</p>
                                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-emerald-500/30">
                                        {step67Sequences.patchedSolutions}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          ) : (
                            /* Legacy Plot Rendering Fallback */
                            <>
                              {/* Reader Payoff Dynamics */}
                              <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  독자 보상 및 도파민 훅 (Reader Payoff Dynamics)
                                </div>
                                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                  {pendingPlotProposal.thoughtProcess.readerPayoffDynamics || 
                                   (pendingPlotProposal.thoughtProcess as any).narrativeState || 
                                   "(분석 내용 없음)"}
                                </p>
                              </div>

                              {/* Long-Term Narrative Inertia Baseline */}
                              {pendingPlotProposal.thoughtProcess.longTermInertiaBaseline ? (
                                <div className="p-4 bg-zinc-950/60 border border-cyan-900/30 rounded-2xl space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                                    <Compass className="w-3.5 h-3.5" />
                                    장기 서사 관성 및 캐릭터 본질 기저선 (Long-term Inertia Baseline)
                                  </div>
                                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                    {pendingPlotProposal.thoughtProcess.longTermInertiaBaseline}
                                  </p>
                                </div>
                              ) : pendingPlotProposal.thoughtProcess.narrativeInertiaAssessment ? (
                                <div className="p-4 bg-zinc-950/60 border border-cyan-900/30 rounded-2xl space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                                    <Compass className="w-3.5 h-3.5" />
                                    서사적 관성 및 심리 기저선 평가 (Narrative Inertia)
                                  </div>
                                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                    {pendingPlotProposal.thoughtProcess.narrativeInertiaAssessment}
                                  </p>
                                </div>
                              ) : null}

                              {/* Short-Term Situational Dynamics */}
                              {pendingPlotProposal.thoughtProcess.shortTermSituationalDynamics && (
                                <div className="p-4 bg-zinc-950/60 border border-rose-900/30 rounded-2xl space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                                    <Flame className="w-3.5 h-3.5" />
                                    단기 사건 반응 및 상황적 심리 마찰 (Short-term Situational Dynamics)
                                  </div>
                                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                    {pendingPlotProposal.thoughtProcess.shortTermSituationalDynamics}
                                  </p>
                                </div>
                              )}

                              {/* Incremental Relational Shift Analysis */}
                              <div className="p-4 bg-zinc-950/60 border border-indigo-900/30 rounded-2xl space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                                  <Users className="w-3.5 h-3.5" />
                                  미세한 심리 변화 및 대인 역학 (Incremental Relational Shift)
                                </div>
                                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                  {pendingPlotProposal.thoughtProcess.incrementalRelationalShiftAnalysis || 
                                   (pendingPlotProposal.thoughtProcess as any).relationshipDeltaAnalysis || 
                                   (pendingPlotProposal.thoughtProcess as any).characterDynamics || 
                                   "(분석 내용 없음)"}
                                </p>
                              </div>

                              {/* Cliche And Pacing Control */}
                              <div className="p-4 bg-zinc-950/60 border border-amber-900/30 rounded-2xl space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  완급 조절 및 클리셰 비틀기 (Pacing & Subversion)
                                </div>
                                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                  {pendingPlotProposal.thoughtProcess.clicheAndPacingControl || 
                                   (pendingPlotProposal.thoughtProcess as any).clicheTrapAnalysis || 
                                   "(분석 내용 없음)"}
                                </p>
                              </div>

                              {/* Directing Techniques */}
                              <div className="p-4 bg-zinc-950/60 border border-emerald-900/30 rounded-2xl space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                                  <Film className="w-3.5 h-3.5" />
                                  연출 작법 및 시점 운용 (Directing Craft)
                                </div>
                                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                  {pendingPlotProposal.thoughtProcess.directingTechniques || 
                                   (pendingPlotProposal.thoughtProcess as any).pacingAndTone || 
                                   "(분석 내용 없음)"}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 py-16">
                        <Compass className="w-12 h-12 text-zinc-700 animate-pulse" />
                        <div className="text-center px-6 max-w-md">
                          <p className="text-sm font-medium text-zinc-400">현재 대기 중인 AI 플롯 제안이 없습니다.</p>
                          <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                            하단의 <span className="text-purple-400 font-semibold">[Director Directive]</span>에 원하는 전개나 복선 회수 지침을 입력하고 <span className="text-purple-400 font-semibold">[플롯 제안받기]</span>를 클릭하세요.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Proposal Action Footer (Visible when proposal is available) */}
                  {pendingPlotProposal && (
                    <div className="p-3 sm:px-4 sm:py-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between gap-3">
                      <button 
                        onClick={clearPendingPlotProposal}
                        className="text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
                      >
                        제안 폐기 (Discard)
                      </button>
                      <button 
                        onClick={handleApplyPlot}
                        className="px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20 active:scale-[0.98]"
                      >
                        <Check className="w-4 h-4" />
                        이 플롯 적용 (Apply to Active Plot)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Bottom Dedicated Director Directive Console (Prominently Exposed) */}
            <div className="border-t border-zinc-800 bg-zinc-950 p-3 sm:p-4 z-20">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Director Directive (AI 서사 디렉터 지시문)
                    </label>
                    <div className="flex items-center gap-2">
                      {isAutoPlotEnabled && (
                        <span className="text-[10px] font-mono text-purple-300/90 flex items-center gap-1">
                          <span>자동 갱신: {plotCount.toLocaleString()}/{triggerChars.toLocaleString()}자 ({plotProgress}%)</span>
                          {plotCount > 0 && (
                            <button
                              type="button"
                              onClick={() => resetCounter('autoplot')}
                              className="text-zinc-500 hover:text-purple-300 underline ml-0.5"
                              title="누적 카운터 리셋"
                            >
                              초기화
                            </button>
                          )}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500 hidden sm:inline">
                        · Ctrl + Enter 즉시 생성
                      </span>
                    </div>
                  </div>
                  <textarea 
                    value={plotAIInstruction}
                    onChange={(e) => setPlotAIInstruction(e.target.value)}
                    onKeyDown={handleKeyDownDirective}
                    placeholder="AI 서사 디렉터에게 내릴 전개 지침을 입력하세요 (예: 특정 사건 전개, 복선 회수, 인물 갈등, 혹은 회피하고 싶은 전개)..."
                    rows={2}
                    className="w-full bg-zinc-900/90 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none custom-scrollbar shadow-inner leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-2 sm:self-end">
                  <button 
                    onClick={() => {
                      flushPendingPlot();
                      handleGeneratePlot(plotAIInstruction, plotWorkbenchSettings);
                    }}
                    disabled={isGeneratingPlot}
                    className={cn(
                      "w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 min-w-[150px]",
                      isGeneratingPlot 
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                        : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/25 active:scale-[0.98]"
                    )}
                  >
                    {isGeneratingPlot ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                        분석 및 생성 중...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        플롯 새로 제안받기
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          <FullScreenTextEditor 
            isOpen={isFullScreenPlot}
            onClose={() => setIsFullScreenPlot(false)}
            value={localPlotText}
            onChange={handlePlotChange}
            title="Active Plot Blueprint (플롯 청사진)"
            description="사건 시퀀스, 연출 디렉팅, 장기 대서사 및 복선을 방해 없이 전체 화면에서 집중 편집합니다."
            icon={<Compass className="w-5 h-5 text-purple-400" />}
            saveMode="auto"
            placeholder="플롯 청사진을 작성하세요..."
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
