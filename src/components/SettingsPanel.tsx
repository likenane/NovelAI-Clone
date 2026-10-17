import React from 'react';
import { 
  X, 
  Settings, 
  ChevronRight, 
  Key, 
  Sparkles, 
  BookOpen, 
  Maximize2,
  Copy,
  Trash2,
  Compass,
  Scissors,
  ShieldCheck,
  Wand2,
  FileCode,
  Loader2,
  SlidersHorizontal,
  Book,
  RefreshCw,
  Play,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Novel, NovelSettings, ThinkingLevel, DuplicateNovelOptions, AIEngineTaskType } from '../types';
import { cn } from '../lib/utils';
import { 
  GLOBAL_DEFAULTS, 
  AVAILABLE_MODELS, 
  ALL_THINKING_LEVELS, 
  getSupportedThinkingLevels, 
  getValidThinkingLevel, 
  DEFAULT_STYLE_DIRECTIVES_TEMPLATE,
  sanitizeModelForProvider 
} from '../constants';
import { generateStyleDirectivesAI } from '../services/aiService';

import { PromptPresetManager } from './PromptPresetManager';
import { PromptPreset } from '../types';
import { FullScreenTextEditor } from './FullScreenTextEditor';
import { useAutoCounters } from '../hooks/useAutoCounters';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentNovel: Novel | null;
  setCurrentNovel: (novel: Novel | null) => void;
  updateNovel: (id: string, data: Partial<Novel>) => void;
  openSections: string[];
  toggleSection: (id: string) => void;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  openRouterKey: string | null;
  setIsGlobalSettingsOpen: (open: boolean) => void;
  openFullScreenEditor: (type: string) => void;
  resetPromptsToDefaults: () => void;
  resetParamsToDefaults: () => void;
  saveParamsAsDefaults: () => void;
  setMemoryAIInstruction: (val: string) => void;
  setMemoryAISuggestion: (val: string) => void;
  setMemoryWorkbenchSettings: (val: any) => void;
  setIsMemoryWorkbenchOpen: (open: boolean) => void;
  setIsPlotWorkbenchOpen?: (open: boolean) => void;
  setPlotAIInstruction?: (val: string) => void;
  setPlotWorkbenchSettings?: (val: any) => void;
  duplicateNovel: (options: DuplicateNovelOptions | boolean) => void;
  onDelete: (id: string) => void;
  saveNovel: () => void;
  promptPresets: PromptPreset[];
  savePromptPreset: (name: string, prompts: PromptPreset['prompts']) => Promise<boolean>;
  deletePromptPreset: (id: string) => Promise<boolean>;
  isPresetsLoading: boolean;
  openAIEngineStudio?: (task?: AIEngineTaskType) => void;
  scanForProposals?: (options: { isManual?: boolean; userDirective?: string }) => void;
  isAutoCodexScanning?: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  currentNovel,
  setCurrentNovel,
  updateNovel,
  openSections,
  toggleSection,
  isLocked,
  setIsLocked,
  openRouterKey,
  setIsGlobalSettingsOpen,
  openFullScreenEditor,
  resetPromptsToDefaults,
  resetParamsToDefaults,
  saveParamsAsDefaults,
  setMemoryAIInstruction,
  setMemoryAISuggestion,
  setMemoryWorkbenchSettings,
  setIsMemoryWorkbenchOpen,
  setIsPlotWorkbenchOpen,
  setPlotAIInstruction,
  setPlotWorkbenchSettings,
  duplicateNovel,
  onDelete,
  saveNovel,
  promptPresets,
  savePromptPreset,
  deletePromptPreset,
  isPresetsLoading,
  openAIEngineStudio,
  scanForProposals,
  isAutoCodexScanning = false
}) => {
  const [showDuplicateMenu, setShowDuplicateMenu] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [showTailDuplicateModal, setShowTailDuplicateModal] = React.useState(false);
  const [tailCharCount, setTailCharCount] = React.useState<number>(2000);

  // AI 맞춤 문체 생성 상태
  const [showStyleGenModal, setShowStyleGenModal] = React.useState(false);
  const [styleGenPrompt, setStyleGenPrompt] = React.useState("");
  const [isGeneratingStyle, setIsGeneratingStyle] = React.useState(false);
  const [styleGenError, setStyleGenError] = React.useState<string | null>(null);

  // 서술 지침 & 플롯 청사진 & 스토리 메모리 전체화면 집중 편집 상태
  const [isFullScreenStyle, setIsFullScreenStyle] = React.useState(false);
  const [isFullScreenPlot, setIsFullScreenPlot] = React.useState(false);
  const [isFullScreenMemory, setIsFullScreenMemory] = React.useState(false);

  // Auto-Codex & Auto-Plot Real-time Character Counter
  const { codexCount, plotCount, resetCounter } = useAutoCounters(currentNovel?.id);

  // Auto-Codex Directive Scan 로컬 지침 입력 상태
  const [localDirective, setLocalDirective] = React.useState("");

  // =========================================================================
  // Zero-Lag Keystroke Isolation for Style Directives
  // =========================================================================
  const [localStyleText, setLocalStyleText] = React.useState<string>(() => currentNovel?.settings?.styleDirectives || "");
  const pendingStyleUpdatesRef = React.useRef<string | null>(null);
  const styleDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // =========================================================================
  // Zero-Lag Keystroke Isolation for Plot Blueprint
  // =========================================================================
  const [localPlotText, setLocalPlotText] = React.useState<string>(() => currentNovel?.plot || "");
  const pendingPlotUpdatesRef = React.useRef<string | null>(null);
  const plotDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // =========================================================================
  // Zero-Lag Keystroke Isolation for Story Memory
  // =========================================================================
  const [localMemoryText, setLocalMemoryText] = React.useState<string>(() => currentNovel?.storyMemory || "");
  const pendingMemoryUpdatesRef = React.useRef<string | null>(null);
  const memoryDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const currentNovelRef = React.useRef(currentNovel);
  currentNovelRef.current = currentNovel;
  const prevNovelIdRef = React.useRef<string | undefined>(currentNovel?.id);

  // 외부(다른 novel 전환 등)에서 데이터가 변경되었을 때 로컬 상태 동기화
  React.useEffect(() => {
    const novelId = currentNovel?.id;
    // 소설 전환 시: 타이머 해제, pending 리셋, 신규 소설 데이터로 즉시 동기화
    if (prevNovelIdRef.current !== novelId) {
      if (styleDebounceTimerRef.current) {
        clearTimeout(styleDebounceTimerRef.current);
        styleDebounceTimerRef.current = null;
      }
      if (plotDebounceTimerRef.current) {
        clearTimeout(plotDebounceTimerRef.current);
        plotDebounceTimerRef.current = null;
      }
      if (memoryDebounceTimerRef.current) {
        clearTimeout(memoryDebounceTimerRef.current);
        memoryDebounceTimerRef.current = null;
      }
      pendingStyleUpdatesRef.current = null;
      pendingPlotUpdatesRef.current = null;
      pendingMemoryUpdatesRef.current = null;
      prevNovelIdRef.current = novelId;
      setLocalStyleText(currentNovel?.settings?.styleDirectives || "");
      setLocalPlotText(currentNovel?.plot || "");
      setLocalMemoryText(currentNovel?.storyMemory || "");
      setLocalDirective("");
      return;
    }

    // 동일 소설 내에서 외부 업데이트 발생 시 (타이핑 중이 아닐 때만)
    if (pendingStyleUpdatesRef.current === null) {
      setLocalStyleText(currentNovel?.settings?.styleDirectives || "");
    }
    if (pendingPlotUpdatesRef.current === null) {
      setLocalPlotText(currentNovel?.plot || "");
    }
    if (pendingMemoryUpdatesRef.current === null) {
      setLocalMemoryText(currentNovel?.storyMemory || "");
    }
  }, [currentNovel?.id, currentNovel?.settings?.styleDirectives, currentNovel?.plot, currentNovel?.storyMemory]);

  // 즉시 안전 플러시 함수: Style Directives
  const flushPendingStyle = React.useCallback(() => {
    if (styleDebounceTimerRef.current) {
      clearTimeout(styleDebounceTimerRef.current);
      styleDebounceTimerRef.current = null;
    }
    if (pendingStyleUpdatesRef.current !== null && currentNovelRef.current) {
      const textToSave = pendingStyleUpdatesRef.current;
      pendingStyleUpdatesRef.current = null;
      const updatedSettings = {
        ...currentNovelRef.current.settings,
        styleDirectives: textToSave
      };
      setCurrentNovel({
        ...currentNovelRef.current,
        settings: updatedSettings
      });
      updateNovel(currentNovelRef.current.id, {
        settings: updatedSettings
      });
    }
  }, [setCurrentNovel, updateNovel]);

  // 즉시 안전 플러시 함수: Plot Blueprint
  const flushPendingPlot = React.useCallback(() => {
    if (plotDebounceTimerRef.current) {
      clearTimeout(plotDebounceTimerRef.current);
      plotDebounceTimerRef.current = null;
    }
    if (pendingPlotUpdatesRef.current !== null && currentNovelRef.current) {
      const textToSave = pendingPlotUpdatesRef.current;
      pendingPlotUpdatesRef.current = null;
      setCurrentNovel({
        ...currentNovelRef.current,
        plot: textToSave
      });
      updateNovel(currentNovelRef.current.id, {
        plot: textToSave
      });
    }
  }, [setCurrentNovel, updateNovel]);

  // 즉시 안전 플러시 함수: Story Memory
  const flushPendingMemory = React.useCallback(() => {
    if (memoryDebounceTimerRef.current) {
      clearTimeout(memoryDebounceTimerRef.current);
      memoryDebounceTimerRef.current = null;
    }
    if (pendingMemoryUpdatesRef.current !== null && currentNovelRef.current) {
      const textToSave = pendingMemoryUpdatesRef.current;
      pendingMemoryUpdatesRef.current = null;
      setCurrentNovel({
        ...currentNovelRef.current,
        storyMemory: textToSave
      });
      updateNovel(currentNovelRef.current.id, {
        storyMemory: textToSave
      });
    }
  }, [setCurrentNovel, updateNovel]);

  // 패널이 닫히거나 언마운트될 때 보류 중인 모든 입력 플러시
  React.useEffect(() => {
    return () => {
      flushPendingStyle();
      flushPendingPlot();
      flushPendingMemory();
    };
  }, [flushPendingStyle, flushPendingPlot, flushPendingMemory]);

  // Zero-Lag 서술 지침 변경 핸들러
  const handleStyleChange = (newText: string) => {
    setLocalStyleText(newText);
    pendingStyleUpdatesRef.current = newText;

    if (styleDebounceTimerRef.current) {
      clearTimeout(styleDebounceTimerRef.current);
    }

    styleDebounceTimerRef.current = setTimeout(() => {
      if (pendingStyleUpdatesRef.current !== null && currentNovelRef.current) {
        const textToSave = pendingStyleUpdatesRef.current;
        pendingStyleUpdatesRef.current = null;
        const updatedSettings = {
          ...currentNovelRef.current.settings,
          styleDirectives: textToSave
        };
        setCurrentNovel({
          ...currentNovelRef.current,
          settings: updatedSettings
        });
        updateNovel(currentNovelRef.current.id, {
          settings: updatedSettings
        });
      }
    }, 800);
  };

  // Zero-Lag 플롯 청사진 변경 핸들러
  const handlePlotChange = (newText: string) => {
    setLocalPlotText(newText);
    pendingPlotUpdatesRef.current = newText;

    if (plotDebounceTimerRef.current) {
      clearTimeout(plotDebounceTimerRef.current);
    }

    plotDebounceTimerRef.current = setTimeout(() => {
      if (pendingPlotUpdatesRef.current !== null && currentNovelRef.current) {
        const textToSave = pendingPlotUpdatesRef.current;
        pendingPlotUpdatesRef.current = null;
        setCurrentNovel({
          ...currentNovelRef.current,
          plot: textToSave
        });
        updateNovel(currentNovelRef.current.id, {
          plot: textToSave
        });
      }
    }, 800);
  };

  // Zero-Lag 스토리 메모리 변경 핸들러
  const handleMemoryChange = (newText: string) => {
    setLocalMemoryText(newText);
    pendingMemoryUpdatesRef.current = newText;

    if (memoryDebounceTimerRef.current) {
      clearTimeout(memoryDebounceTimerRef.current);
    }

    memoryDebounceTimerRef.current = setTimeout(() => {
      if (pendingMemoryUpdatesRef.current !== null && currentNovelRef.current) {
        const textToSave = pendingMemoryUpdatesRef.current;
        pendingMemoryUpdatesRef.current = null;
        setCurrentNovel({
          ...currentNovelRef.current,
          storyMemory: textToSave
        });
        updateNovel(currentNovelRef.current.id, {
          storyMemory: textToSave
        });
      }
    }, 800);
  };

  // 워크벤치 전환 핸들러 (입력 플러시 후 즉시 패널 닫기 및 워크벤치 오픈)
  const handleOpenMemoryWorkbench = () => {
    flushPendingStyle();
    flushPendingPlot();
    flushPendingMemory();
    onClose();
    setMemoryAIInstruction("");
    setMemoryAISuggestion("");
    setMemoryWorkbenchSettings(currentNovel?.settings?.memory || GLOBAL_DEFAULTS.memory);
    setIsMemoryWorkbenchOpen(true);
  };

  const handleOpenPlotWorkbench = () => {
    flushPendingStyle();
    flushPendingPlot();
    flushPendingMemory();
    onClose();
    setPlotAIInstruction?.("");
    setPlotWorkbenchSettings?.(currentNovel?.settings?.plot || GLOBAL_DEFAULTS.plot);
    setIsPlotWorkbenchOpen?.(true);
  };

  // 오토 코덱스 스캔 실행 (지침 유무에 따라 유연 처리)
  const handleRunAutoCodexScan = () => {
    if (!scanForProposals || isAutoCodexScanning) return;
    const trimmed = localDirective.trim();
    scanForProposals({
      isManual: true,
      userDirective: trimmed || undefined
    });
  };

  const handleGenerateStyleDirectives = async () => {
    if (!currentNovel || isGeneratingStyle) return;
    setIsGeneratingStyle(true);
    setStyleGenError(null);
    try {
      const generatedDirectives = await generateStyleDirectivesAI({
        novel: currentNovel,
        userPrompt: styleGenPrompt,
        openRouterKey
      });
      if (generatedDirectives) {
        setLocalStyleText(generatedDirectives);
        pendingStyleUpdatesRef.current = null;
        setCurrentNovel({
          ...currentNovel,
          settings: {
            ...currentNovel.settings,
            styleDirectives: generatedDirectives
          }
        });
        updateNovel(currentNovel.id, {
          settings: {
            ...currentNovel.settings,
            styleDirectives: generatedDirectives
          }
        });
        setShowStyleGenModal(false);
        setStyleGenPrompt("");
      }
    } catch (err: any) {
      console.error("Failed to generate style directives:", err);
      setStyleGenError(err.message || "문체 지침 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingStyle(false);
    }
  };

  // Provider 일괄 전환 헬퍼 (소설 설정 전체에 동기화)
  const handleSwitchProvider = (newProvider: 'gemini' | 'openrouter') => {
    if (!currentNovel || newProvider === currentNovel.settings.model) return;
    const s = currentNovel.settings;
    const updatedSettings: NovelSettings = {
      ...s,
      model: newProvider,
      modelName: sanitizeModelForProvider(s.modelName, newProvider),
      auditor: {
        ...(s.auditor || GLOBAL_DEFAULTS.auditor),
        model: newProvider,
        modelName: sanitizeModelForProvider(s.auditor?.modelName, newProvider)
      },
      memory: {
        ...(s.memory || GLOBAL_DEFAULTS.memory),
        model: newProvider,
        modelName: sanitizeModelForProvider(s.memory?.modelName, newProvider)
      },
      plot: {
        ...(s.plot || GLOBAL_DEFAULTS.plot),
        model: newProvider,
        modelName: sanitizeModelForProvider(s.plot?.modelName, newProvider)
      },
      codex: {
        ...(s.codex || GLOBAL_DEFAULTS.codex),
        model: newProvider,
        modelName: sanitizeModelForProvider(s.codex?.modelName, newProvider)
      },
      autoCodex: {
        ...(s.autoCodex || GLOBAL_DEFAULTS.autoCodex),
        modelName: sanitizeModelForProvider(s.autoCodex?.modelName, newProvider)
      }
    };
    setCurrentNovel({
      ...currentNovel,
      settings: updatedSettings
    });
    updateNovel(currentNovel.id, {
      settings: updatedSettings
    });
  };

  if (!isOpen || !currentNovel) return null;

  const currentProvider: 'gemini' | 'openrouter' = currentNovel.settings.model || 'gemini';

  return (
    <AnimatePresence>
      {isOpen && currentNovel && (
        <motion.div key="settings-panel-wrapper">
          <motion.div 
            key="settings-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              flushPendingStyle();
              flushPendingPlot();
              flushPendingMemory();
              onClose();
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[139]"
          />
          <motion.div 
            key="settings-panel-content"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-0 bottom-0 w-[90%] sm:w-96 bg-zinc-900 border-l border-zinc-800 z-[140] p-5 sm:p-8 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" />
                Story Settings
              </h2>
              <button 
                onClick={() => {
                  flushPendingStyle();
                  flushPendingPlot();
                  flushPendingMemory();
                  onClose();
                }} 
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {/* Section 1: PROVIDER & AI ENGINE */}
              <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => toggleSection('model')}
                  className="w-full p-4 flex items-center justify-between bg-zinc-950 hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">PROVIDER & AI ENGINE</span>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 transition-transform text-zinc-500", openSections.includes('model') && "rotate-90")} />
                </button>
                <AnimatePresence>
                  {openSections.includes('model') && (
                    <motion.div 
                      key="section-model"
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-zinc-900/50"
                    >
                      <div className="p-4 space-y-3">
                        {/* 1-Click Provider Segment Bar */}
                        <div className="grid grid-cols-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl gap-1">
                          <button
                            type="button"
                            onClick={() => handleSwitchProvider('gemini')}
                            className={cn(
                              "py-1.5 text-xs font-semibold rounded-lg transition-all text-center",
                              currentProvider === 'gemini'
                                ? "bg-indigo-600 text-white shadow-sm font-bold"
                                : "text-zinc-400 hover:text-zinc-200"
                            )}
                          >
                            Google Direct
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSwitchProvider('openrouter')}
                            className={cn(
                              "py-1.5 text-xs font-semibold rounded-lg transition-all text-center",
                              currentProvider === 'openrouter'
                                ? "bg-purple-600 text-white shadow-sm font-bold"
                                : "text-zinc-400 hover:text-zinc-200"
                            )}
                          >
                            OpenRouter
                          </button>
                        </div>

                        {/* Direct Studio Launcher Button */}
                        <button
                          type="button"
                          onClick={() => openAIEngineStudio?.('novel')}
                          className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                          <span>AI Engine Studio</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Section 2: NOVEL STYLE */}
              <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="w-full p-4 flex items-center justify-between bg-zinc-950">
                  <button 
                    onClick={() => toggleSection('style')}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">NOVEL STYLE</span>
                    <ChevronRight className={cn("w-4 h-4 transition-transform text-zinc-500", openSections.includes('style') && "rotate-90")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openAIEngineStudio?.('novel')}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 border border-zinc-800 transition-colors"
                    title="소설 본문 집필 AI 설정 (AI Engine Studio)"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
                <AnimatePresence>
                  {openSections.includes('style') && (
                    <motion.div 
                      key="section-style"
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-zinc-900/50"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {localStyleText.length.toLocaleString()} 글자
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsFullScreenStyle(true)}
                            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-indigo-300 transition-colors flex items-center gap-1 text-[11px]"
                            title="넓은 전체화면 에디터에서 서술 지침을 집중 편집합니다"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span className="font-medium">전체화면 편집</span>
                          </button>
                        </div>

                        {/* Zero-Lag Textarea */}
                        <textarea 
                          value={localStyleText}
                          onChange={(e) => handleStyleChange(e.target.value)}
                          className="w-full h-44 bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 resize-none custom-scrollbar focus:ring-1 focus:ring-indigo-500/50 font-sans leading-relaxed placeholder-zinc-700"
                          placeholder="<시점 및 서술 어조>&#10;- 1인칭 주인공 시점 ('나'의 냉소적인 내면 독백과 통찰 중심)&#10;- 긴장감 높은 단문 위주의 호흡과 감정 과잉 배제&#10;&#10;<장르 및 묘사 규칙>&#10;- 피카레스크 다크 판타지: 폭력과 마법은 시각적·물리적 충격 위주로 건조하게 묘사&#10;- 클리셰적인 과장된 감탄사 및 만화적 연출 지양"
                        />

                        {/* Bottom Action Toolbar */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => {
                              setStyleGenPrompt("");
                              setStyleGenError(null);
                              setShowStyleGenModal(true);
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                              "bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 shadow-sm active:scale-95"
                            )}
                            title="소설 전체 맥락을 분석하여 어울리는 문체를 자동 생성합니다"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>AI 생성</span>
                          </button>
                          <button
                            onClick={() => {
                              const updated = localStyleText.trim() 
                                ? `${localStyleText}\n\n${DEFAULT_STYLE_DIRECTIVES_TEMPLATE}` 
                                : DEFAULT_STYLE_DIRECTIVES_TEMPLATE;
                              handleStyleChange(updated);
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                              "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700 active:scale-95"
                            )}
                            title="기본 권장 서식 양식을 입력창에 추가합니다"
                          >
                            <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                            <span>기본 서식 적용</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Section 3: STORY MEMORY */}
              <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="w-full p-4 flex items-center justify-between bg-zinc-950">
                  <button 
                    onClick={() => toggleSection('memory')}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">STORY MEMORY</span>
                    <ChevronRight className={cn("w-4 h-4 transition-transform text-zinc-600", openSections.includes('memory') && "rotate-90")} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openAIEngineStudio?.('memory')}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border border-zinc-800 transition-colors"
                      title="스토리 메모리 AI 파라미터 설정 (AI Engine Studio)"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={handleOpenMemoryWorkbench}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border border-zinc-800 transition-colors"
                      title="Story Memory AI Workbench (전체화면)"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {openSections.includes('memory') && (
                    <motion.div 
                      key="section-memory"
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-zinc-900/50"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {localMemoryText.length.toLocaleString()} 글자
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsFullScreenMemory(true)}
                            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-emerald-300 transition-colors flex items-center gap-1 text-[11px]"
                            title="넓은 전체화면 에디터에서 스토리 메모리를 집중 편집합니다"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span className="font-medium">전체화면 편집</span>
                          </button>
                        </div>

                        {/* Zero-Lag Story Memory Textarea */}
                        <textarea 
                          value={localMemoryText}
                          onChange={(e) => handleMemoryChange(e.target.value)}
                          className="w-full h-44 bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 resize-none custom-scrollbar focus:ring-1 focus:ring-emerald-500/50 font-sans leading-relaxed placeholder-zinc-700"
                          placeholder="[1. 핵심 인물 및 동적 상태]&#10;- 인물들의 최신 심리, 부상, 능력치 변동, 비밀, 소지품&#10;&#10;[2. 진행 중인 핵심 사건 & 복선]&#10;- 미해결 사건, 현재 국면, 회수 대기 복선&#10;&#10;[3. 관계 및 세력 구도]&#10;- 인물/세력 간의 갈등 및 동맹 상태"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Section 4: PLOT BLUEPRINT */}
              <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="w-full p-4 flex items-center justify-between bg-zinc-950">
                  <button 
                    onClick={() => toggleSection('plot')}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <Compass className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">PLOT BLUEPRINT</span>
                    <ChevronRight className={cn("w-4 h-4 transition-transform text-zinc-600", openSections.includes('plot') && "rotate-90")} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openAIEngineStudio?.('plot')}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 border border-zinc-800 transition-colors"
                      title="플롯 청사진 AI 파라미터 설정 (AI Engine Studio)"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {setIsPlotWorkbenchOpen && (
                      <button 
                        onClick={handleOpenPlotWorkbench}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 border border-zinc-800 transition-colors"
                        title="Plot Workbench & Narrative Director (전체화면)"
                      >
                        <Compass className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {openSections.includes('plot') && (
                    <motion.div 
                      key="section-plot"
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-zinc-900/50"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {localPlotText.length.toLocaleString()} 글자
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsFullScreenPlot(true)}
                            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-purple-300 transition-colors flex items-center gap-1 text-[11px]"
                            title="넓은 전체화면 에디터에서 플롯 청사진을 집중 편집합니다"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span className="font-medium">전체화면 편집</span>
                          </button>
                        </div>

                        {/* Large Plot Textarea */}
                        <textarea 
                          value={localPlotText}
                          onChange={(e) => handlePlotChange(e.target.value)}
                          className="w-full h-56 bg-zinc-950 border-zinc-800 rounded-xl p-4 text-xs focus:ring-purple-500 focus:border-purple-500 resize-none placeholder-zinc-800 custom-scrollbar text-zinc-200 font-sans leading-relaxed"
                          placeholder="[작품의 테마 및 장르상 유의점]&#10;...&#10;&#10;[장기 플롯]&#10;...&#10;&#10;[진행중인 플롯]&#10;..."
                        />

                        {/* Live Auto-Plot Counter Card */}
                        {(() => {
                          const isAutoPlot = currentNovel.settings.automation?.autoPlot ?? false;
                          const target = currentNovel.settings.plot?.triggerChars ?? GLOBAL_DEFAULTS.plot.triggerChars;
                          const progress = Math.min(100, Math.round((plotCount / (target || 1)) * 100));
                          return (
                            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                                  <span className={cn("w-1.5 h-1.5 rounded-full", isAutoPlot ? "bg-purple-400 animate-pulse" : "bg-zinc-600")} />
                                  <span>플롯 자동 갱신 ({isAutoPlot ? "활성" : "비활성"})</span>
                                </span>
                                <span className="font-mono text-purple-400 font-bold">
                                  {plotCount.toLocaleString()} / {target.toLocaleString()}자 ({progress}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-purple-500 rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                                <span>{plotCount >= target ? "갱신 대기 중" : `다음 갱신까지 ${Math.max(0, target - plotCount).toLocaleString()}자 남음`}</span>
                                {plotCount > 0 && (
                                  <button 
                                    type="button"
                                    onClick={() => resetCounter('autoplot')}
                                    className="text-zinc-400 hover:text-purple-300 underline transition-colors"
                                  >
                                    카운터 0으로 초기화
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Section 5: AUTO-CODEX */}
              <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="w-full p-4 flex items-center justify-between bg-zinc-950">
                  <button 
                    onClick={() => toggleSection('autocodex')}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <RefreshCw className={cn("w-4 h-4 text-amber-400", isAutoCodexScanning && "animate-spin")} />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">AUTO-CODEX</span>
                    <ChevronRight className={cn("w-4 h-4 transition-transform text-zinc-600", openSections.includes('autocodex') && "rotate-90")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openAIEngineStudio?.('autoCodex')}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 border border-zinc-800 transition-colors"
                    title="오토 코덱스 AI 엔진 설정 (AI Engine Studio)"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
                <AnimatePresence>
                  {openSections.includes('autocodex') && (
                    <motion.div 
                      key="section-autocodex"
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-zinc-900/50"
                    >
                      <div className="p-4 space-y-3">
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          본문을 분석하여 코덱스 설정을 갱신합니다. 특별 지시를 작성하거나 비워둔 채 즉시 스캔할 수 있습니다.
                        </p>

                        {/* Live Auto-Codex Counter Card */}
                        {(() => {
                          const isAutoCodex = currentNovel.settings.automation?.autoCodex ?? false;
                          const target = currentNovel.settings.autoCodex?.triggerChars ?? currentNovel.settings.autoCodexTriggerChars ?? GLOBAL_DEFAULTS.autoCodex.triggerChars;
                          const progress = Math.min(100, Math.round((codexCount / (target || 1)) * 100));
                          return (
                            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                                  <span className={cn("w-1.5 h-1.5 rounded-full", isAutoCodex ? "bg-amber-400 animate-pulse" : "bg-zinc-600")} />
                                  <span>코덱스 자동 스캔 ({isAutoCodex ? "활성" : "비활성"})</span>
                                </span>
                                <span className="font-mono text-amber-400 font-bold">
                                  {codexCount.toLocaleString()} / {target.toLocaleString()}자 ({progress}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                                <span>{codexCount >= target ? "스캔 발동 대기 중" : `다음 스캔까지 ${Math.max(0, target - codexCount).toLocaleString()}자 남음`}</span>
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
                          );
                        })()}

                        <textarea
                          value={localDirective}
                          onChange={(e) => setLocalDirective(e.target.value)}
                          placeholder="선택 사항: 지시 입력 (예: 주인공의 신규 무기 '천마검'을 중점 분석하여 등록해줘. 미입력 시 표준 본문 스캔)"
                          rows={3}
                          className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 resize-none custom-scrollbar"
                        />

                        {/* Minimal Icon Action Toolbar */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          {localDirective.trim() && (
                            <button
                              type="button"
                              onClick={() => setLocalDirective("")}
                              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
                              title="지침 내용 비우기"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={handleRunAutoCodexScan}
                            disabled={isAutoCodexScanning}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95",
                              isAutoCodexScanning
                                ? "bg-amber-600/50 text-amber-200 cursor-not-allowed"
                                : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                            )}
                            title={localDirective.trim() ? "지침을 반영하여 스캔 실행" : "표준 본문 분석 스캔 실행"}
                          >
                            <Play className={cn("w-3.5 h-3.5 fill-current", isAutoCodexScanning && "animate-spin")} />
                            <span>{isAutoCodexScanning ? "스캔 분석 중..." : localDirective.trim() ? "지침 스캔" : "일반 스캔"}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800 space-y-3 pb-6 sm:pb-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <button 
                    onClick={() => setShowDuplicateMenu(!showDuplicateMenu)}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 py-2 rounded-xl text-xs font-medium transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicate
                  </button>
                  <AnimatePresence>
                    {showDuplicateMenu && (
                      <motion.div 
                        key="duplicate-menu"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-0 w-52 mb-2 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50"
                      >
                        <button 
                          onClick={() => { duplicateNovel({ mode: 'full' }); setShowDuplicateMenu(false); }}
                          className="w-full px-4 py-2.5 text-left text-[11px] text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors border-b border-zinc-800/80 flex items-center justify-between"
                        >
                          <span>Full Duplicate</span>
                          <span className="text-[9px] text-zinc-500">All Content</span>
                        </button>
                        <button 
                          onClick={() => { duplicateNovel({ mode: 'settings_only' }); setShowDuplicateMenu(false); }}
                          className="w-full px-4 py-2.5 text-left text-[11px] text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors border-b border-zinc-800/80 flex items-center justify-between"
                        >
                          <span>Settings Only</span>
                          <span className="text-[9px] text-zinc-500">No Content</span>
                        </button>
                        <button 
                          onClick={() => { 
                            setShowDuplicateMenu(false); 
                            setShowTailDuplicateModal(true); 
                          }}
                          className="w-full px-4 py-2.5 text-left text-[11px] text-indigo-300 hover:bg-zinc-900 hover:text-indigo-200 transition-colors flex items-center justify-between"
                        >
                          <span>Recent Text Only</span>
                          <span className="text-[9px] text-indigo-400/80">Tail Cut</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button 
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this novel? This action cannot be undone.")) {
                      onDelete(currentNovel.id);
                      onClose();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/5 hover:bg-red-500/10 text-red-400/60 hover:text-red-400 py-2 rounded-xl text-xs font-medium transition-all border border-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              <button 
                onClick={() => {
                  flushPendingStyle();
                  flushPendingPlot();
                  flushPendingMemory();
                  saveNovel();
                  onClose();
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
              >
                Apply & Save
              </button>
            </div>
          </motion.div>

          {/* Tail Duplicate Confirmation Modal */}
          <AnimatePresence>
            {showTailDuplicateModal && (
              <motion.div 
                key="tail-duplicate-modal-overlay"
                className="fixed inset-0 z-[155] flex items-center justify-center p-4"
              >
                <motion.div 
                  key="tail-duplicate-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowTailDuplicateModal(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div 
                  key="tail-duplicate-content"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full space-y-5"
                >
                  <div className="space-y-2 text-center">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Scissors className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-100">Duplicate Recent Text</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Copies novel settings, lore, and the trailing characters of the story text while discarding older paragraphs.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-medium">Keep Recent Characters:</span>
                      <span className="text-indigo-400 font-mono font-bold">{tailCharCount.toLocaleString()} chars</span>
                    </div>

                    <div className="relative">
                      <input 
                        type="number"
                        min={100}
                        max={500000}
                        step={100}
                        value={tailCharCount || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setTailCharCount(isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-zinc-100 text-sm font-mono text-center outline-none transition-colors"
                        placeholder="2000"
                      />
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {[2000, 5000, 10000, 20000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTailCharCount(preset)}
                          className={cn(
                            "py-1.5 text-[10px] font-medium rounded-lg transition-all border",
                            tailCharCount === preset
                              ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-bold"
                              : "bg-zinc-800/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          )}
                        >
                          {preset.toLocaleString()}자
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowTailDuplicateModal(false)}
                      className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const count = tailCharCount > 0 ? tailCharCount : 2000;
                        duplicateNovel({ mode: 'tail', tailChars: count });
                        setShowTailDuplicateModal(false);
                      }}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                    >
                      Duplicate
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Custom Style Generation Modal */}
          <AnimatePresence>
            {showStyleGenModal && (
              <motion.div 
                key="style-gen-modal-overlay"
                className="fixed inset-0 z-[155] flex items-center justify-center p-4"
              >
                <motion.div 
                  key="style-gen-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !isGeneratingStyle && setShowStyleGenModal(false)}
                  className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                />
                <motion.div 
                  key="style-gen-content"
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="relative bg-zinc-900 border border-zinc-800 p-5 sm:p-6 rounded-2xl shadow-2xl max-w-md w-full space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100">AI 소설 맞춤 문체 생성</h3>
                        <p className="text-[10px] text-zinc-500">소설 본문, 코덱스, 스토리 메모리를 분석하여 문체 지침을 도출합니다.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => !isGeneratingStyle && setShowStyleGenModal(false)}
                      disabled={isGeneratingStyle}
                      className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">
                      추가 희망 사항 (선택)
                    </label>
                    <textarea 
                      value={styleGenPrompt}
                      onChange={(e) => setStyleGenPrompt(e.target.value)}
                      disabled={isGeneratingStyle}
                      placeholder="예: 1인칭 냉소적인 어조 위주로 구성해줘, 마법 묘사는 서정적으로 하지 말고 물리적 충격 위주로 해줘, 하드보일드 느와르풍 문체..."
                      rows={3}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none custom-scrollbar"
                    />
                    <p className="text-[10px] text-zinc-500">
                      ※ 공란으로 두셔도 AI가 현재 작성된 소설 전체 맥락을 스스로 분석하여 가장 어울리는 문체를 완성합니다.
                    </p>
                  </div>

                  {styleGenError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                      {styleGenError}
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-2">
                    <button 
                      onClick={() => setShowStyleGenModal(false)}
                      disabled={isGeneratingStyle}
                      className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleGenerateStyleDirectives}
                      disabled={isGeneratingStyle}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                      {isGeneratingStyle ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          문체 분석 및 생성 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          맞춤 문체 생성하기
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Full Screen Text Editor for 서술 지침 */}
          <FullScreenTextEditor
            isOpen={isFullScreenStyle}
            onClose={() => setIsFullScreenStyle(false)}
            value={localStyleText}
            onChange={handleStyleChange}
            title="서술 지침 (Novel Style Directives)"
            description="작품 전체에 일관되게 적용할 시점, 문체, 어조, 연출 규칙을 넓은 화면에서 작성하고 점검합니다."
            icon={<BookOpen className="w-5 h-5 text-indigo-400" />}
            saveMode="auto"
            zIndex="z-[155]"
            placeholder="<시점 및 서술 어조>&#10;- 1인칭 주인공 시점 ('나'의 냉소적인 내면 독백과 통찰 중심)&#10;- 긴장감 높은 단문 위주의 호흡과 감정 과잉 배제&#10;&#10;<장르 및 묘사 규칙>&#10;- 피카레스크 다크 판타지: 폭력과 마법은 시각적·물리적 충격 위주로 건조하게 묘사&#10;- 클리셰적인 과장된 감탄사 및 만화적 연출 지양"
          />

          {/* Full Screen Text Editor for 스토리 메모리 */}
          <FullScreenTextEditor
            isOpen={isFullScreenMemory}
            onClose={() => setIsFullScreenMemory(false)}
            value={localMemoryText}
            onChange={handleMemoryChange}
            title="스토리 메모리 (Story Memory)"
            description="작품의 장기 기억(핵심 인물 상태, 미해결 사건, 세계관 규칙 및 복선)을 넓은 화면에서 집중 편집합니다."
            icon={<Sparkles className="w-5 h-5 text-emerald-400" />}
            saveMode="auto"
            zIndex="z-[155]"
            placeholder="[1. 핵심 인물 및 동적 상태]&#10;- 인물들의 최신 심리, 부상, 능력치 변동, 비밀, 소지품&#10;&#10;[2. 진행 중인 핵심 사건 & 복선]&#10;- 미해결 사건, 현재 국면, 회수 대기 복선&#10;&#10;[3. 관계 및 세력 구도]&#10;- 인물/세력 간의 갈등 및 동맹 상태"
          />

          {/* Full Screen Text Editor for 플롯 청사진 */}
          <FullScreenTextEditor
            isOpen={isFullScreenPlot}
            onClose={() => setIsFullScreenPlot(false)}
            value={localPlotText}
            onChange={handlePlotChange}
            title="플롯 청사진 (Plot Blueprint)"
            description="작품의 4계층 플롯 구조(테마, 장기 플롯, 진행중인 플롯, 향후 전개)를 넓은 화면에서 작성하고 편집합니다."
            icon={<Compass className="w-5 h-5 text-purple-400" />}
            saveMode="auto"
            zIndex="z-[155]"
            placeholder="[작품의 테마 및 장르상 유의점]&#10;...&#10;&#10;[장기 플롯]&#10;...&#10;&#10;[진행중인 플롯]&#10;..."
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsPanel;
