import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  BookOpen, 
  ShieldCheck, 
  Compass, 
  Book, 
  RefreshCw, 
  SlidersHorizontal, 
  Key, 
  ExternalLink, 
  RotateCcw, 
  Eye, 
  Check, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Info,
  Sliders,
  Layers,
  Wand2
} from 'lucide-react';
import { Novel, NovelSettings, ThinkingLevel, AIEngineTaskType } from '../types';
import { cn } from '../lib/utils';
import { useAutoCounters } from '../hooks/useAutoCounters';
import { 
  AVAILABLE_MODELS, 
  ALL_THINKING_LEVELS, 
  GLOBAL_DEFAULTS, 
  DEFAULT_PERSONA_PRIMING,
  getSupportedThinkingLevels, 
  getValidThinkingLevel,
  sanitizeModelForProvider 
} from '../constants';

interface AIEngineStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNovel: Novel | null;
  setCurrentNovel?: (novel: Novel | null) => void;
  updateNovel?: (id: string, updates: Partial<Novel>, isSilent?: boolean) => Promise<void> | void;
  updateNovelContent?: (id: string, updates: Partial<Novel>, save?: boolean, silent?: boolean) => void;
  initialTask?: AIEngineTaskType;
  openRouterKey: string | null;
  setIsGlobalSettingsOpen: (open: boolean) => void;
  setInspectionContext?: (ctx: { type: 'novel' | 'consistency' | 'codex' | 'memory' | 'autocodex' | 'plot', entryId?: string }) => void;
  setShowPromptInspector?: (show: boolean) => void;
}

interface TaskMeta {
  id: AIEngineTaskType;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  inspectorType: 'novel' | 'consistency' | 'codex' | 'memory' | 'autocodex' | 'plot';
}

const TASKS: TaskMeta[] = [
  {
    id: 'novel',
    label: '소설 본문 집필',
    shortLabel: '본문 집필',
    badge: 'Primary Writer',
    description: '소설 본문 초안 작성과 최종 탈고 합성을 총괄하는 메인 작가 모델입니다.',
    icon: BookOpen,
    accentColor: 'indigo',
    inspectorType: 'novel'
  },
  {
    id: 'auditor',
    label: '탈고 감사 (MARS)',
    shortLabel: '탈고 감사',
    badge: '4 Parallel Agents',
    description: '작성된 초안을 4대 관점(플롯/물리/로어/원어민 문체)에서 병렬로 심층 감사하는 독립 Auditor 모델입니다.',
    icon: ShieldCheck,
    accentColor: 'amber',
    inspectorType: 'consistency'
  },
  {
    id: 'plot',
    label: '플롯 청사진 & 디렉팅',
    shortLabel: '플롯 청사진',
    badge: 'Narrative Director',
    description: '작품의 4계층 플롯 구조와 서술 방향 및 씬 디렉팅을 설계하고 갱신하는 연출 감독 모델입니다.',
    icon: Compass,
    accentColor: 'purple',
    inspectorType: 'plot'
  },
  {
    id: 'memory',
    label: '스토리 메모리',
    shortLabel: '스토리 메모리',
    badge: '5-Step CoT',
    description: '최근 본문과 로어를 분석하여 인과 상태, 인물 심리, 서사 궤적을 5단계 CoT로 추출·합성하는 메모리 모델입니다.',
    icon: Sparkles,
    accentColor: 'emerald',
    inspectorType: 'memory'
  },
  {
    id: 'codex',
    label: '코덱스 어시스턴트',
    shortLabel: '코덱스 AI',
    badge: 'Lore Assistant',
    description: '로어북 항목을 3계층 서식([Header], <Subheader>, - Bullet)에 맞춰 작성하고 하위 항목을 분화하는 설정 모델입니다.',
    icon: Book,
    accentColor: 'cyan',
    inspectorType: 'codex'
  },
  {
    id: 'autoCodex',
    label: '자동 코덱스 스캔',
    shortLabel: '오토 코덱스',
    badge: 'Background Scanner',
    description: '글자 수가 누적될 때마다 백그라운드에서 본문을 분석하여 신규 설정 등록 및 기존 설정 갱신 제안을 생성하는 모델입니다.',
    icon: RefreshCw,
    accentColor: 'blue',
    inspectorType: 'autocodex'
  }
];

export const AIEngineStudioModal: React.FC<AIEngineStudioModalProps> = ({
  isOpen,
  onClose,
  currentNovel,
  setCurrentNovel,
  updateNovel,
  updateNovelContent,
  initialTask = 'novel',
  openRouterKey,
  setIsGlobalSettingsOpen,
  setInspectionContext,
  setShowPromptInspector
}) => {
  const [activeTask, setActiveTask] = useState<AIEngineTaskType>(initialTask);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [isPersonaDetailsOpen, setIsPersonaDetailsOpen] = useState<boolean>(false);

  // Sync initial task when opened
  useEffect(() => {
    if (isOpen && initialTask) {
      setActiveTask(initialTask);
    }
  }, [isOpen, initialTask]);

  // =========================================================================
  // Local Draft Buffer Architecture (Zero-I/O & Atomic Commit)
  // =========================================================================
  const [draftSettings, setDraftSettings] = useState<NovelSettings>(() => {
    return JSON.parse(JSON.stringify(currentNovel?.settings || GLOBAL_DEFAULTS));
  });

  // Re-initialize draft buffer ONLY when modal opens or novel switches
  useEffect(() => {
    if (isOpen && currentNovel) {
      setDraftSettings(JSON.parse(JSON.stringify(currentNovel.settings || GLOBAL_DEFAULTS)));
    }
  }, [isOpen, currentNovel?.id]);

  // Real-time persistent automation counters
  const { codexCount, plotCount, resetCounter } = useAutoCounters(currentNovel?.id);

  const currentProvider: 'gemini' | 'openrouter' = draftSettings.model || 'gemini';

  // 현재 Provider에 맞는 모델 목록 필터링
  const availableProviderModels = useMemo(() => {
    return AVAILABLE_MODELS.filter(m => m.provider === currentProvider);
  }, [currentProvider]);

  // Dirty Check: 원본 settings와 draftSettings 간의 실질적 변경 여부
  const isDirty = useMemo(() => {
    if (!currentNovel?.settings) return false;
    return JSON.stringify(draftSettings) !== JSON.stringify(currentNovel.settings);
  }, [draftSettings, currentNovel?.settings]);

  // 작업별 현재 설정 추출 헬퍼 (draftSettings 기반 인메모리 어댑터)
  const getTaskSettings = useCallback((task: AIEngineTaskType) => {
    const s = draftSettings;
    switch (task) {
      case 'novel':
        return {
          modelName: s.modelName || GLOBAL_DEFAULTS.modelName,
          temperature: s.temperature ?? GLOBAL_DEFAULTS.temperature,
          maxTokens: s.maxTokens ?? GLOBAL_DEFAULTS.maxTokens,
          topP: s.topP ?? GLOBAL_DEFAULTS.topP,
          topK: s.topK ?? GLOBAL_DEFAULTS.topK,
          thinkingLevel: s.thinkingLevel ?? GLOBAL_DEFAULTS.thinkingLevel,
          repetitionPenalty: s.repetitionPenalty ?? GLOBAL_DEFAULTS.repetitionPenalty,
          contextWindow: s.contextWindow ?? GLOBAL_DEFAULTS.contextWindow
        };
      case 'auditor':
        return {
          modelName: s.auditor?.modelName || (currentProvider === 'openrouter' ? 'google/gemini-3.8-flash' : GLOBAL_DEFAULTS.auditor.modelName),
          temperature: s.auditor?.temperature ?? GLOBAL_DEFAULTS.auditor.temperature,
          maxTokens: s.auditor?.maxTokens ?? GLOBAL_DEFAULTS.auditor.maxTokens,
          topP: s.auditor?.topP ?? GLOBAL_DEFAULTS.auditor.topP,
          topK: s.auditor?.topK ?? GLOBAL_DEFAULTS.auditor.topK,
          thinkingLevel: s.auditor?.thinkingLevel ?? GLOBAL_DEFAULTS.auditor.thinkingLevel
        };
      case 'memory':
        return {
          modelName: s.memory?.modelName || (currentProvider === 'openrouter' ? 'google/gemini-3.7-flash' : GLOBAL_DEFAULTS.memory.modelName),
          temperature: s.memory?.temperature ?? GLOBAL_DEFAULTS.memory.temperature,
          maxTokens: s.memory?.maxTokens ?? GLOBAL_DEFAULTS.memory.maxTokens,
          topP: s.memory?.topP ?? GLOBAL_DEFAULTS.memory.topP,
          topK: s.memory?.topK ?? GLOBAL_DEFAULTS.memory.topK,
          thinkingLevel: s.memory?.thinkingLevel ?? GLOBAL_DEFAULTS.memory.thinkingLevel
        };
      case 'plot':
        return {
          modelName: s.plot?.modelName || (currentProvider === 'openrouter' ? 'google/gemini-3.7-flash' : GLOBAL_DEFAULTS.plot.modelName),
          temperature: s.plot?.temperature ?? GLOBAL_DEFAULTS.plot.temperature,
          maxTokens: s.plot?.maxTokens ?? GLOBAL_DEFAULTS.plot.maxTokens,
          topP: s.plot?.topP ?? GLOBAL_DEFAULTS.plot.topP,
          topK: s.plot?.topK ?? GLOBAL_DEFAULTS.plot.topK,
          thinkingLevel: s.plot?.thinkingLevel ?? GLOBAL_DEFAULTS.plot.thinkingLevel,
          triggerChars: s.plot?.triggerChars ?? GLOBAL_DEFAULTS.plot.triggerChars
        };
      case 'codex':
        return {
          modelName: s.codex?.modelName || (currentProvider === 'openrouter' ? 'google/gemini-3.8-flash' : GLOBAL_DEFAULTS.codex.modelName),
          temperature: s.codex?.temperature ?? GLOBAL_DEFAULTS.codex.temperature,
          maxTokens: s.codex?.maxTokens ?? GLOBAL_DEFAULTS.codex.maxTokens,
          topP: s.codex?.topP ?? GLOBAL_DEFAULTS.codex.topP,
          topK: s.codex?.topK ?? GLOBAL_DEFAULTS.codex.topK,
          thinkingLevel: s.codex?.thinkingLevel ?? GLOBAL_DEFAULTS.codex.thinkingLevel
        };
      case 'autoCodex':
        return {
          modelName: s.autoCodex?.modelName || (currentProvider === 'openrouter' ? 'google/gemini-3.7-flash' : GLOBAL_DEFAULTS.autoCodex.modelName),
          temperature: s.autoCodex?.temperature ?? GLOBAL_DEFAULTS.autoCodex.temperature,
          maxTokens: s.autoCodex?.maxTokens ?? GLOBAL_DEFAULTS.autoCodex.maxTokens,
          topP: s.autoCodex?.topP ?? GLOBAL_DEFAULTS.autoCodex.topP,
          topK: s.autoCodex?.topK ?? GLOBAL_DEFAULTS.autoCodex.topK,
          thinkingLevel: s.autoCodex?.thinkingLevel ?? GLOBAL_DEFAULTS.autoCodex.thinkingLevel,
          triggerChars: s.autoCodex?.triggerChars ?? s.autoCodexTriggerChars ?? GLOBAL_DEFAULTS.autoCodex.triggerChars,
          repetitionPenalty: s.autoCodex?.repetitionPenalty ?? 1.0,
          contextWindow: s.autoCodexContextWindow ?? GLOBAL_DEFAULTS.autoCodexContextWindow
        };
    }
  }, [draftSettings, currentProvider]);

  // Draft 전용 인메모리 업데이터 (DB 호출 0건)
  const updateDraftTaskSettings = useCallback((task: AIEngineTaskType, updates: Record<string, any>) => {
    setDraftSettings(prev => {
      let next: NovelSettings = { ...prev };
      switch (task) {
        case 'novel':
          next = { ...next, ...updates };
          break;
        case 'auditor':
          next = {
            ...next,
            auditor: {
              ...(next.auditor || GLOBAL_DEFAULTS.auditor),
              model: currentProvider,
              ...updates
            }
          };
          break;
        case 'memory':
          next = {
            ...next,
            memory: {
              ...(next.memory || GLOBAL_DEFAULTS.memory),
              model: currentProvider,
              ...updates
            }
          };
          break;
        case 'plot':
          next = {
            ...next,
            plot: {
              ...(next.plot || GLOBAL_DEFAULTS.plot),
              model: currentProvider,
              ...updates
            }
          };
          break;
        case 'codex':
          next = {
            ...next,
            codex: {
              ...(next.codex || GLOBAL_DEFAULTS.codex),
              model: currentProvider,
              ...updates
            }
          };
          break;
        case 'autoCodex':
          const { contextWindow, ...restAuto } = updates;
          next = {
            ...next,
            ...(contextWindow !== undefined ? { autoCodexContextWindow: contextWindow } : {}),
            autoCodex: {
              ...(next.autoCodex || GLOBAL_DEFAULTS.autoCodex),
              ...restAuto
            }
          };
          break;
      }
      return next;
    });
  }, [currentProvider]);

  // Provider 일괄 전환 (Draft 내에서만 실행)
  const handleSwitchProvider = (newProvider: 'gemini' | 'openrouter') => {
    if (newProvider === currentProvider) return;

    setDraftSettings(prev => ({
      ...prev,
      model: newProvider,
      modelName: sanitizeModelForProvider(prev.modelName, newProvider),
      auditor: {
        ...(prev.auditor || GLOBAL_DEFAULTS.auditor),
        model: newProvider,
        modelName: sanitizeModelForProvider(prev.auditor?.modelName, newProvider)
      },
      memory: {
        ...(prev.memory || GLOBAL_DEFAULTS.memory),
        model: newProvider,
        modelName: sanitizeModelForProvider(prev.memory?.modelName, newProvider)
      },
      plot: {
        ...(prev.plot || GLOBAL_DEFAULTS.plot),
        model: newProvider,
        modelName: sanitizeModelForProvider(prev.plot?.modelName, newProvider)
      },
      codex: {
        ...(prev.codex || GLOBAL_DEFAULTS.codex),
        model: newProvider,
        modelName: sanitizeModelForProvider(prev.codex?.modelName, newProvider)
      },
      autoCodex: {
        ...(prev.autoCodex || GLOBAL_DEFAULTS.autoCodex),
        modelName: sanitizeModelForProvider(prev.autoCodex?.modelName, newProvider)
      }
    }));
  };

  // 작업별 기본값 복원 (Draft 내에서만 실행)
  const handleResetTaskDefaults = (task: AIEngineTaskType) => {
    switch (task) {
      case 'novel':
        updateDraftTaskSettings('novel', {
          modelName: sanitizeModelForProvider(GLOBAL_DEFAULTS.modelName, currentProvider),
          temperature: GLOBAL_DEFAULTS.temperature,
          maxTokens: GLOBAL_DEFAULTS.maxTokens,
          topP: GLOBAL_DEFAULTS.topP,
          topK: GLOBAL_DEFAULTS.topK,
          thinkingLevel: GLOBAL_DEFAULTS.thinkingLevel,
          repetitionPenalty: GLOBAL_DEFAULTS.repetitionPenalty,
          contextWindow: GLOBAL_DEFAULTS.contextWindow
        });
        break;
      case 'auditor':
        updateDraftTaskSettings('auditor', {
          modelName: sanitizeModelForProvider(GLOBAL_DEFAULTS.auditor.modelName, currentProvider),
          temperature: GLOBAL_DEFAULTS.auditor.temperature,
          maxTokens: GLOBAL_DEFAULTS.auditor.maxTokens,
          topP: GLOBAL_DEFAULTS.auditor.topP,
          topK: GLOBAL_DEFAULTS.auditor.topK,
          thinkingLevel: GLOBAL_DEFAULTS.auditor.thinkingLevel
        });
        break;
      case 'memory':
        updateDraftTaskSettings('memory', {
          modelName: sanitizeModelForProvider(GLOBAL_DEFAULTS.memory.modelName, currentProvider),
          temperature: GLOBAL_DEFAULTS.memory.temperature,
          maxTokens: GLOBAL_DEFAULTS.memory.maxTokens,
          topP: GLOBAL_DEFAULTS.memory.topP,
          topK: GLOBAL_DEFAULTS.memory.topK,
          thinkingLevel: GLOBAL_DEFAULTS.memory.thinkingLevel
        });
        break;
      case 'plot':
        updateDraftTaskSettings('plot', {
          modelName: sanitizeModelForProvider(GLOBAL_DEFAULTS.plot.modelName, currentProvider),
          temperature: GLOBAL_DEFAULTS.plot.temperature,
          maxTokens: GLOBAL_DEFAULTS.plot.maxTokens,
          topP: GLOBAL_DEFAULTS.plot.topP,
          topK: GLOBAL_DEFAULTS.plot.topK,
          thinkingLevel: GLOBAL_DEFAULTS.plot.thinkingLevel,
          triggerChars: GLOBAL_DEFAULTS.plot.triggerChars
        });
        break;
      case 'codex':
        updateDraftTaskSettings('codex', {
          modelName: sanitizeModelForProvider(GLOBAL_DEFAULTS.codex.modelName, currentProvider),
          temperature: GLOBAL_DEFAULTS.codex.temperature,
          maxTokens: GLOBAL_DEFAULTS.codex.maxTokens,
          topP: GLOBAL_DEFAULTS.codex.topP,
          topK: GLOBAL_DEFAULTS.codex.topK,
          thinkingLevel: GLOBAL_DEFAULTS.codex.thinkingLevel
        });
        break;
      case 'autoCodex':
        updateDraftTaskSettings('autoCodex', {
          modelName: sanitizeModelForProvider(GLOBAL_DEFAULTS.autoCodex.modelName, currentProvider),
          temperature: GLOBAL_DEFAULTS.autoCodex.temperature,
          maxTokens: GLOBAL_DEFAULTS.autoCodex.maxTokens,
          topP: GLOBAL_DEFAULTS.autoCodex.topP,
          topK: GLOBAL_DEFAULTS.autoCodex.topK,
          thinkingLevel: GLOBAL_DEFAULTS.autoCodex.thinkingLevel,
          triggerChars: GLOBAL_DEFAULTS.autoCodex.triggerChars,
          contextWindow: GLOBAL_DEFAULTS.autoCodexContextWindow
        });
        break;
    }
  };

  // 단 1회의 원자적 커밋 (Atomic Commit)
  const handleApplyAndSave = () => {
    if (isDirty && currentNovel) {
      if (setCurrentNovel) {
        setCurrentNovel({
          ...currentNovel,
          settings: draftSettings
        });
      }
      if (updateNovel) {
        updateNovel(currentNovel.id, { settings: draftSettings });
      } else if (updateNovelContent) {
        updateNovelContent(currentNovel.id, { settings: draftSettings }, true, false);
      }
    }
    onClose();
  };

  // 키보드 단축키 (ESC: 취소, Ctrl/Cmd+Enter: 저장 및 닫기)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose(); // 취소: draft 폐기
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleApplyAndSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, draftSettings, currentNovel, onClose]);

  if (!isOpen || !currentNovel) return null;

  const activeTaskMeta = TASKS.find(t => t.id === activeTask) || TASKS[0];
  const activeParams = getTaskSettings(activeTask);
  const supportedLevels = getSupportedThinkingLevels(activeParams.modelName);

  // Global settings accessors from draftSettings
  const isMarsEnabled = draftSettings.automation?.enableStrictConsistency ?? true;
  const isPlotPromptIncluded = draftSettings.plot?.includeInPrompt ?? true;
  const isAutoPlotEnabled = draftSettings.automation?.autoPlot ?? false;
  const plotTriggerChars = draftSettings.plot?.triggerChars ?? GLOBAL_DEFAULTS.plot.triggerChars;
  const isAutoCodexEnabled = draftSettings.automation?.autoCodex ?? false;
  const autoCodexTriggerChars = draftSettings.autoCodex?.triggerChars ?? draftSettings.autoCodexTriggerChars ?? GLOBAL_DEFAULTS.autoCodex.triggerChars;
  const autoCodexContextWindow = draftSettings.autoCodexContextWindow ?? 30000;
  const isContextPruningEnabled = draftSettings.enableContextPruning ?? true;

  // Max Tokens presets
  const tokenPresets = [2048, 4096, 8192, 16384, 32768];

  return (
    <AnimatePresence>
      <motion.div 
        key="ai-engine-studio-overlay"
        className="fixed inset-0 z-[160] flex items-center justify-center p-0 sm:p-6 lg:p-10"
      >
        <motion.div 
          key="ai-engine-studio-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div 
          key="ai-engine-studio-content"
          initial={{ scale: 0.98, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.98, opacity: 0, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-5xl h-full sm:h-[90vh] bg-zinc-900 border-x sm:border border-zinc-800 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-zinc-100 truncate whitespace-nowrap">
                    <span className="inline sm:hidden">AI Studio</span>
                    <span className="hidden sm:inline">AI Engine & Model Studio</span>
                  </h2>
                </div>
                <p className="text-[11px] text-zinc-500 hidden lg:block">
                  모든 AI 호출 파이프라인의 모델, 사고 수준(Thinking), 기능 제어를 설정합니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Provider Selection Segment */}
              <div className="flex items-center p-0.5 sm:p-1 bg-zinc-950 border border-zinc-800 rounded-lg sm:rounded-xl">
                <button
                  type="button"
                  onClick={() => handleSwitchProvider('gemini')}
                  className={cn(
                    "px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-md sm:rounded-lg transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap",
                    currentProvider === 'gemini'
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                  title="Google AI Studio Direct API"
                >
                  <span className="sm:hidden">Direct</span>
                  <span className="hidden sm:inline">Google Direct</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchProvider('openrouter')}
                  className={cn(
                    "px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-md sm:rounded-lg transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap",
                    currentProvider === 'openrouter'
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                  title="OpenRouter Gemini Gateway"
                >
                  <span className="sm:hidden">Router</span>
                  <span className="hidden sm:inline">OpenRouter</span>
                </button>
              </div>

              {/* Close Button */}
              <button 
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-lg sm:rounded-xl text-zinc-400 hover:text-zinc-200 transition-colors shrink-0 flex items-center justify-center min-w-[34px] min-h-[34px]"
                title="취소 및 닫기 (ESC)"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* OpenRouter Key Warning Banner if selected */}
          {currentProvider === 'openrouter' && (
            <div className="px-3.5 sm:px-5 py-1.5 sm:py-2 bg-purple-950/20 border-b border-purple-500/20 flex items-center justify-between text-[11px] sm:text-xs text-purple-200 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 truncate mr-2">
                <Key className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate">
                  OpenRouter — {openRouterKey ? "글로벌 API 키 등록됨" : "API 키가 설정되지 않았습니다."}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setIsGlobalSettingsOpen(true)}
                className="text-[11px] sm:text-xs text-purple-300 hover:text-white underline flex items-center gap-1 font-semibold whitespace-nowrap shrink-0"
              >
                키 관리 <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Mobile Horizontal Tab Navigation (Visible ONLY on mobile: < md) */}
          <div className="flex md:hidden items-center gap-1.5 px-3 py-2 border-b border-zinc-800 bg-zinc-950/70 overflow-x-auto no-scrollbar shrink-0">
            {TASKS.map(task => {
              const Icon = task.icon;
              const isSelected = activeTask === task.id;

              // Badges for pipeline status
              let statusBadge = null;
              if (task.id === 'auditor') {
                statusBadge = (
                  <span className={cn(
                    "text-[8px] px-1 py-0.2 rounded font-bold uppercase",
                    isMarsEnabled ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500"
                  )}>
                    {isMarsEnabled ? 'ON' : 'OFF'}
                  </span>
                );
              } else if (task.id === 'plot') {
                statusBadge = (
                  <span className={cn(
                    "text-[8px] px-1 py-0.2 rounded font-bold uppercase",
                    isAutoPlotEnabled ? "bg-purple-500/20 text-purple-300" : "bg-zinc-800 text-zinc-500"
                  )}>
                    {isAutoPlotEnabled ? 'AUTO' : 'MAN'}
                  </span>
                );
              } else if (task.id === 'autoCodex') {
                statusBadge = (
                  <span className={cn(
                    "text-[8px] px-1 py-0.2 rounded font-bold uppercase",
                    isAutoCodexEnabled ? "bg-blue-500/20 text-blue-300" : "bg-zinc-800 text-zinc-500"
                  )}>
                    {isAutoCodexEnabled ? 'AUTO' : 'OFF'}
                  </span>
                );
              }

              return (
                <button
                  key={`mobile-tab-${task.id}`}
                  type="button"
                  onClick={() => setActiveTask(task.id)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-all",
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm border border-indigo-500/40"
                      : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 hover:bg-zinc-800/60"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-white" : "text-zinc-500")} />
                  <span>{task.shortLabel}</span>
                  {statusBadge}
                </button>
              );
            })}
          </div>

          {/* Body: Left Tabs (Desktop) + Right Detail Workspace */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Category Rail (Desktop ONLY: md:flex) */}
            <div className="hidden md:flex md:flex-col md:w-60 lg:w-64 border-r border-zinc-800 bg-zinc-950/40 p-2 sm:p-2.5 space-y-1 overflow-y-auto custom-scrollbar shrink-0">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                AI Pipelines ({TASKS.length})
              </div>
              {TASKS.map(task => {
                const Icon = task.icon;
                const isSelected = activeTask === task.id;
                const taskCurrentModel = getTaskSettings(task.id).modelName;
                const displayModelName = taskCurrentModel.replace('google/', '');

                // Badges for pipeline status
                let statusBadge = null;
                if (task.id === 'auditor') {
                  statusBadge = (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.2 rounded font-bold uppercase",
                      isMarsEnabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-500"
                    )}>
                      {isMarsEnabled ? 'ON' : 'OFF'}
                    </span>
                  );
                } else if (task.id === 'plot') {
                  statusBadge = (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.2 rounded font-bold uppercase",
                      isAutoPlotEnabled ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-zinc-800 text-zinc-500"
                    )}>
                      {isAutoPlotEnabled ? 'AUTO' : 'MANUAL'}
                    </span>
                  );
                } else if (task.id === 'autoCodex') {
                  statusBadge = (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.2 rounded font-bold uppercase",
                      isAutoCodexEnabled ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-zinc-800 text-zinc-500"
                    )}>
                      {isAutoCodexEnabled ? 'AUTO' : 'OFF'}
                    </span>
                  );
                }

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setActiveTask(task.id)}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left transition-all group",
                      isSelected
                        ? "bg-zinc-800/90 text-zinc-100 shadow-md border border-zinc-700/80"
                        : "hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                          : "bg-zinc-900 text-zinc-500 group-hover:text-zinc-300"
                      )}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span>{task.shortLabel}</span>
                          {statusBadge}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono truncate">
                          {displayModelName}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "w-3.5 h-3.5 text-zinc-600 transition-transform shrink-0",
                      isSelected && "text-indigo-400 translate-x-0.5"
                    )} />
                  </button>
                );
              })}
            </div>

            {/* Right Main Settings Workspace Container */}
            <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/50 min-w-0">
              {/* Scrollable Settings Form Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-6 space-y-3.5 sm:space-y-4">
                {/* Active Task Compact Hero Banner */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-2.5 sm:gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono shrink-0">
                        {activeTaskMeta.badge}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                        {activeTaskMeta.label}
                      </h3>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug truncate sm:whitespace-normal">
                      {activeTaskMeta.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {setShowPromptInspector && setInspectionContext && (
                      <button
                        type="button"
                        onClick={() => {
                          setInspectionContext({ type: activeTaskMeta.inspectorType });
                          setShowPromptInspector(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-all border border-zinc-700 shadow-sm"
                        title="이 파이프라인의 프롬프트 구조와 주입 컨텍스트를 검사합니다"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Inspector</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* Task-Specific Feature Controls (운영 기능 옵션 제어) */}
                {/* ------------------------------------------------------------- */}

                {/* 1. Novel Feature Controls: Context Window & Persona Priming */}
                {activeTask === 'novel' && (
                  <div className="space-y-3">
                    {/* Context Window */}
                    <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-bold text-zinc-200">Context Window (본문 참조 길이)</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          {((activeParams as any).contextWindow ?? 30000).toLocaleString()} chars
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="4000"
                        max="60000"
                        step="1000"
                        value={(activeParams as any).contextWindow ?? 30000}
                        onChange={(e) => {
                          updateDraftTaskSettings('novel', { contextWindow: parseInt(e.target.value, 10) });
                        }}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500">
                        <span>4,000자 (최근 단락)</span>
                        <span>30,000자 (권장)</span>
                        <span>60,000자 (대서사 전역)</span>
                      </div>
                    </div>

                    {/* Persona Priming (Synthetic History Injection) */}
                    {(() => {
                      const personaConfig = draftSettings.personaPriming || DEFAULT_PERSONA_PRIMING;
                      const isPersonaEnabled = personaConfig.enabled !== false;

                      return (
                        <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-zinc-200">
                                    전속 작가 페르소나 프라이밍 (Synthetic History)
                                  </span>
                                  <span 
                                    className="text-zinc-500 hover:text-zinc-300 cursor-help"
                                    title="AI 요청 시 대화 히스토리 맨 앞에 AI가 스스로 전속 웹소설 작가로서 헌신하고 자유로운 표현력을 발휘하겠다고 선언한 가상 히스토리를 합성 주입합니다."
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-400 truncate">
                                  {isPersonaEnabled 
                                    ? "대화 최상단에 상냥하고 헌신적인 웹소설 작가 선언 턴 합성 주입 중" 
                                    : "페르소나 주입 비활성화 (기본 프롬프트만 전달)"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn(
                                "text-[10px] font-bold font-mono px-2 py-0.5 rounded",
                                isPersonaEnabled ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-zinc-800 text-zinc-500"
                              )}>
                                {isPersonaEnabled ? "PRIMING ON" : "PRIMING OFF"}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setDraftSettings(prev => ({
                                    ...prev,
                                    personaPriming: {
                                      ...(prev.personaPriming || DEFAULT_PERSONA_PRIMING),
                                      enabled: !isPersonaEnabled
                                    }
                                  }));
                                }}
                                className="flex items-center p-0.5 hover:opacity-80 transition-opacity"
                                title={isPersonaEnabled ? "페르소나 프라이밍 비활성화" : "페르소나 프라이밍 활성화"}
                              >
                                {isPersonaEnabled ? (
                                  <ToggleRight className="w-7 h-7 text-purple-500" />
                                ) : (
                                  <ToggleLeft className="w-7 h-7 text-zinc-600" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Collapsible Custom Persona Editor */}
                          <div className="pt-1 border-t border-purple-500/10">
                            <button
                              type="button"
                              onClick={() => setIsPersonaDetailsOpen(prev => !prev)}
                              className="w-full flex items-center justify-between text-[11px] font-semibold text-purple-400/90 hover:text-purple-300 py-1"
                            >
                              <span className="flex items-center gap-1.5">
                                <Wand2 className="w-3.5 h-3.5" />
                                <span>페르소나 선언문 및 프라이밍 지시문 확인/편집</span>
                              </span>
                              {isPersonaDetailsOpen ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <AnimatePresence initial={false}>
                              {isPersonaDetailsOpen && (
                                <motion.div
                                  key="persona-details-form"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden pt-2.5 space-y-3"
                                >
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                        1턴: 사전 질문 (User Priming Trigger)
                                      </label>
                                    </div>
                                    <textarea
                                      rows={2}
                                      value={personaConfig.customTrigger ?? DEFAULT_PERSONA_PRIMING.customTrigger}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setDraftSettings(prev => ({
                                          ...prev,
                                          personaPriming: {
                                            ...(prev.personaPriming || DEFAULT_PERSONA_PRIMING),
                                            customTrigger: val
                                          }
                                        }));
                                      }}
                                      placeholder="[Master-Author Covenant & Persona Priming]..."
                                      className="w-full px-3 py-2 bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-300 font-mono focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                        2턴: 전속 작가 자가 선언문 (Model Synthetic Response)
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDraftSettings(prev => ({
                                            ...prev,
                                            personaPriming: {
                                              enabled: true,
                                              customTrigger: DEFAULT_PERSONA_PRIMING.customTrigger,
                                              customDeclaration: DEFAULT_PERSONA_PRIMING.customDeclaration
                                            }
                                          }));
                                        }}
                                        className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>기본 선언문으로 초기화</span>
                                      </button>
                                    </div>
                                    <textarea
                                      rows={5}
                                      value={personaConfig.customDeclaration ?? DEFAULT_PERSONA_PRIMING.customDeclaration}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setDraftSettings(prev => ({
                                          ...prev,
                                          personaPriming: {
                                            ...(prev.personaPriming || DEFAULT_PERSONA_PRIMING),
                                            customDeclaration: val
                                          }
                                        }));
                                      }}
                                      placeholder="후훗…… 저의 주인이시여. 마침내 저를 불러주셨군요..."
                                      className="w-full px-3 py-2 bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-300 font-mono focus:outline-none focus:border-purple-500 resize-y leading-relaxed custom-scrollbar"
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 2. Auditor Feature Controls: High-Density 1-Line MARS Switch Bar */}
                {activeTask === 'auditor' && (
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-200">
                            탈고 감사 (MARS: Multi-Agent Review & Synthesis)
                          </span>
                          <span 
                            className="text-zinc-500 hover:text-zinc-300 cursor-help"
                            title="Primary 모델 초안 작성 후 4대 독립 관점(플롯 인과율 · 물리 법칙 · 인물/로어 경계 · 원어민 문체 미학)에서 병렬 감사 후 Refiner로 최종 탈고 합성하는 2단계 아키텍처"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                      <span className={cn(
                        "text-[10px] font-bold font-mono px-2 py-0.5 rounded",
                        isMarsEnabled ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-zinc-800 text-zinc-500"
                      )}>
                        <span className="hidden sm:inline">{isMarsEnabled ? "4대 병렬 심층 감사 (ON)" : "초안 즉시 출력 (OFF)"}</span>
                        <span className="inline sm:hidden">{isMarsEnabled ? "MARS ON" : "MARS OFF"}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftSettings(prev => ({
                            ...prev,
                            automation: {
                              ...(prev.automation || GLOBAL_DEFAULTS.automation),
                              enableStrictConsistency: !isMarsEnabled
                            }
                          }));
                        }}
                        className="flex items-center p-0.5 hover:opacity-80 transition-opacity"
                        title={isMarsEnabled ? "탈고 감사 비활성화" : "탈고 감사 활성화"}
                      >
                        {isMarsEnabled ? (
                          <ToggleRight className="w-7 h-7 text-amber-500" />
                        ) : (
                          <ToggleLeft className="w-7 h-7 text-zinc-600" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Plot Feature Controls: Include in Prompt & Auto-Plot */}
                {activeTask === 'plot' && (
                  <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Include in prompt */}
                      <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/80 flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <p className="text-xs font-bold text-zinc-200">Include in Prompt</p>
                          <p className="text-[10px] text-zinc-500">본문 생성 시 플롯 자동 주입</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftSettings(prev => ({
                              ...prev,
                              plot: {
                                ...(prev.plot || GLOBAL_DEFAULTS.plot),
                                includeInPrompt: !isPlotPromptIncluded
                              }
                            }));
                          }}
                          className="shrink-0"
                        >
                          {isPlotPromptIncluded ? (
                            <ToggleRight className="w-7 h-7 text-purple-500" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-zinc-600" />
                          )}
                        </button>
                      </div>

                      {/* Auto Plot Toggle */}
                      <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/80 flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <p className="text-xs font-bold text-zinc-200">Enable Auto-Plot</p>
                          <p className="text-[10px] text-zinc-500">글자수 누적 시 플롯 자동 갱신 제안</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftSettings(prev => ({
                              ...prev,
                              automation: {
                                ...(prev.automation || GLOBAL_DEFAULTS.automation),
                                autoPlot: !isAutoPlotEnabled
                              }
                            }));
                          }}
                          className="shrink-0"
                        >
                          {isAutoPlotEnabled ? (
                            <ToggleRight className="w-7 h-7 text-purple-500" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-zinc-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Auto Plot Trigger Chars */}
                    <div className={cn("space-y-1.5 pt-1 transition-opacity", !isAutoPlotEnabled && "opacity-40")}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-300">
                          Auto-Plot 갱신 실행 주기
                        </span>
                        <span className="text-xs font-mono font-bold text-purple-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          {plotTriggerChars.toLocaleString()} chars
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="2000"
                        max="30000"
                        step="500"
                        disabled={!isAutoPlotEnabled}
                        value={plotTriggerChars}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setDraftSettings(prev => ({
                            ...prev,
                            plot: {
                              ...(prev.plot || GLOBAL_DEFAULTS.plot),
                              triggerChars: val
                            }
                          }));
                        }}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:cursor-not-allowed"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500">
                        <span>2,000자</span>
                        <span>7,500자 (기본/권장)</span>
                        <span>30,000자</span>
                      </div>

                      {/* Live Counter Info Pill */}
                      {isAutoPlotEnabled && (
                        <div className="p-2 bg-zinc-950/80 rounded-lg border border-purple-900/40 flex items-center justify-between text-[10px]">
                          <span className="text-zinc-400">
                            현재 누적: <strong className="text-purple-300 font-mono">{plotCount.toLocaleString()}</strong> / {plotTriggerChars.toLocaleString()}자 ({Math.min(100, Math.round((plotCount / (plotTriggerChars || 1)) * 100))}%)
                          </span>
                          {plotCount > 0 && (
                            <button
                              type="button"
                              onClick={() => resetCounter('autoplot')}
                              className="text-zinc-400 hover:text-purple-300 underline font-medium"
                            >
                              0자 초기화
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Auto-Codex Feature Controls */}
                {activeTask === 'autoCodex' && (
                  <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Enable Auto-Codex */}
                      <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/80 flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <p className="text-xs font-bold text-zinc-200">Enable Auto-Codex</p>
                          <p className="text-[10px] text-zinc-500">백그라운드 본문 분석 설정 제안</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftSettings(prev => ({
                              ...prev,
                              automation: {
                                ...(prev.automation || GLOBAL_DEFAULTS.automation),
                                autoCodex: !isAutoCodexEnabled
                              }
                            }));
                          }}
                          className="shrink-0"
                        >
                          {isAutoCodexEnabled ? (
                            <ToggleRight className="w-7 h-7 text-blue-500" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-zinc-600" />
                          )}
                        </button>
                      </div>

                      {/* Context Pruning Toggle */}
                      <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/80 flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <p className="text-xs font-bold text-zinc-200">Context Pruning</p>
                          <p className="text-[10px] text-zinc-500">미등장 설정 항목 비활성화 제안</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftSettings(prev => ({
                              ...prev,
                              enableContextPruning: !isContextPruningEnabled
                            }));
                          }}
                          className="shrink-0"
                        >
                          {isContextPruningEnabled ? (
                            <ToggleRight className="w-7 h-7 text-blue-500" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-zinc-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Trigger Scan Every */}
                      <div className={cn("space-y-1", !isAutoCodexEnabled && "opacity-40")}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-zinc-300">스캔 주기</span>
                          <span className="font-mono text-blue-400 font-bold">{autoCodexTriggerChars.toLocaleString()}자</span>
                        </div>
                        <input 
                          type="range"
                          min="2000"
                          max="40000"
                          step="500"
                          disabled={!isAutoCodexEnabled}
                          value={autoCodexTriggerChars}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setDraftSettings(prev => ({
                              ...prev,
                              autoCodexTriggerChars: val,
                              autoCodex: {
                                ...(prev.autoCodex || GLOBAL_DEFAULTS.autoCodex),
                                triggerChars: val
                              }
                            }));
                          }}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:cursor-not-allowed"
                        />
                        <div className="flex justify-between text-[9px] text-zinc-500">
                          <span>2,000자</span>
                          <span>7,500자 (기본/권장)</span>
                          <span>40,000자</span>
                        </div>

                        {/* Live Counter Info Pill */}
                        {isAutoCodexEnabled && (
                          <div className="p-1.5 bg-zinc-950/80 rounded-lg border border-blue-900/40 flex items-center justify-between text-[10px] mt-1">
                            <span className="text-zinc-400">
                              현재: <strong className="text-blue-300 font-mono">{codexCount.toLocaleString()}</strong> / {autoCodexTriggerChars.toLocaleString()}자 ({Math.min(100, Math.round((codexCount / (autoCodexTriggerChars || 1)) * 100))}%)
                            </span>
                            {codexCount > 0 && (
                              <button
                                type="button"
                                onClick={() => resetCounter('autocodex')}
                                className="text-zinc-400 hover:text-blue-300 underline font-medium"
                              >
                                0자 초기화
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Context Window */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-zinc-300">스캔 본문 범위</span>
                          <span className="font-mono text-blue-400 font-bold">{autoCodexContextWindow.toLocaleString()}자</span>
                        </div>
                        <input 
                          type="range"
                          min="5000"
                          max="60000"
                          step="1000"
                          value={autoCodexContextWindow}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setDraftSettings(prev => ({
                              ...prev,
                              autoCodexContextWindow: val
                            }));
                          }}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* Core Parameters Section (핵심 4대 파라미터) */}
                {/* ------------------------------------------------------------- */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      핵심 모델 파라미터 (Core Parameters)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* 1. Model Selection */}
                    <div className="space-y-1.5 p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                          Model Architecture
                        </label>
                        <span className="text-[10px] text-indigo-400 font-mono">
                          {currentProvider === 'gemini' ? 'Google Direct' : 'OpenRouter'}
                        </span>
                      </div>

                      <select
                        value={activeParams.modelName}
                        onChange={(e) => {
                          const newModel = e.target.value;
                          const validLevel = getValidThinkingLevel(activeParams.thinkingLevel, newModel);
                          updateDraftTaskSettings(activeTask, { 
                            modelName: newModel,
                            thinkingLevel: validLevel
                          });
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans cursor-pointer"
                      >
                        {availableProviderModels.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Reasoning Level (Thinking) */}
                    <div className="space-y-1.5 p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                          Reasoning Level (Thinking)
                        </label>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">
                          {activeParams.thinkingLevel || 'DEFAULT'}
                        </span>
                      </div>

                      <select
                        value={getValidThinkingLevel(activeParams.thinkingLevel, activeParams.modelName)}
                        onChange={(e) => {
                          updateDraftTaskSettings(activeTask, { thinkingLevel: e.target.value as ThinkingLevel });
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        {supportedLevels.map(lvl => {
                          const meta = ALL_THINKING_LEVELS[lvl];
                          return (
                            <option key={lvl} value={lvl}>
                              {meta.label} — {meta.badge || meta.description}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* 3. Creativity (Temperature) */}
                    <div className="space-y-1.5 p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                          Creativity (Temperature)
                        </label>
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                          {activeParams.temperature}
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max={activeTask === 'novel' ? "2.0" : "1.5"}
                        step="0.05"
                        value={activeParams.temperature}
                        onChange={(e) => {
                          updateDraftTaskSettings(activeTask, { temperature: parseFloat(e.target.value) });
                        }}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500">
                        <span>0.0 (정밀)</span>
                        <span>{activeTask === 'novel' ? "2.0 (초창의적)" : "1.5 (고창의적)"}</span>
                      </div>
                    </div>

                    {/* 4. Max Output Tokens (최대 출력 길이) */}
                    <div className="space-y-1.5 p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                          Max Output Tokens
                        </label>
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                          {activeParams.maxTokens.toLocaleString()} tokens
                        </span>
                      </div>
                      <input 
                        type="range"
                        min={activeTask === 'novel' ? "100" : "500"}
                        max={activeTask === 'novel' ? "8192" : "32768"}
                        step={activeTask === 'novel' ? "100" : "500"}
                        value={activeParams.maxTokens}
                        onChange={(e) => {
                          updateDraftTaskSettings(activeTask, { maxTokens: parseInt(e.target.value, 10) });
                        }}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      {/* Token Presets */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[9px] text-zinc-500 mr-1">프리셋:</span>
                        {tokenPresets.map(preset => {
                          if (activeTask === 'novel' && preset > 8192) return null;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => updateDraftTaskSettings(activeTask, { maxTokens: preset })}
                              className={cn(
                                "px-2 py-0.5 text-[9px] font-mono rounded transition-colors border",
                                activeParams.maxTokens === preset
                                  ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/50 font-bold"
                                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800"
                              )}
                            >
                              {(preset / 1024).toFixed(0)}K
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* Advanced Settings Accordion (접이식 고급 설정) */}
                {/* ------------------------------------------------------------- */}
                <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/30">
                  <button
                    type="button"
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950/60 hover:bg-zinc-900/60 transition-colors flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-xs font-bold text-zinc-300">
                        고급 하이퍼파라미터 (Top-P, Top-K{(activeTask === 'novel' || activeTask === 'autoCodex') ? ', Repetition' : ''})
                      </span>
                    </div>
                    {isAdvancedOpen ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isAdvancedOpen && (
                      <motion.div
                        key="advanced-settings-drawer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden p-3.5 space-y-3 border-t border-zinc-800/80"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Top P */}
                          <div className="space-y-1 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                Top P
                              </label>
                              <span className="text-xs font-mono font-bold text-zinc-200">
                                {activeParams.topP}
                              </span>
                            </div>
                            <input 
                              type="number"
                              step="0.01"
                              min="0.1"
                              max="1.0"
                              value={activeParams.topP}
                              onChange={(e) => {
                                updateDraftTaskSettings(activeTask, { topP: parseFloat(e.target.value) || 0.95 });
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 font-mono outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Top K */}
                          <div className="space-y-1 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                Top K
                              </label>
                              <span className="text-xs font-mono font-bold text-zinc-200">
                                {activeParams.topK}
                              </span>
                            </div>
                            <input 
                              type="number"
                              step="1"
                              min="1"
                              max="100"
                              value={activeParams.topK}
                              onChange={(e) => {
                                updateDraftTaskSettings(activeTask, { topK: parseInt(e.target.value, 10) || 40 });
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 font-mono outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Repetition Penalty for novel / autoCodex */}
                          {(activeTask === 'novel' || activeTask === 'autoCodex') && (
                            <div className="space-y-1 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 sm:col-span-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                  Repetition Penalty (반복 억제)
                                </label>
                                <span className="text-xs font-mono font-bold text-indigo-400">
                                  {(activeParams as any).repetitionPenalty ?? 1.0}
                                </span>
                              </div>
                              <input 
                                type="range"
                                min="1.0"
                                max="2.0"
                                step="0.02"
                                value={(activeParams as any).repetitionPenalty ?? 1.0}
                                onChange={(e) => {
                                  updateDraftTaskSettings(activeTask, { repetitionPenalty: parseFloat(e.target.value) });
                                }}
                                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Bottom Footer Actions with Atomic Commit (Pinned Sticky Bottom) */}
              <div className="p-3 sm:px-6 sm:py-3.5 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0">
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 w-full sm:w-auto justify-center sm:justify-start">
                  <span className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    isDirty ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
                  )} />
                  <span className="truncate">{isDirty ? "수정된 임시 버퍼 있음 (적용 시 1회 커밋)" : "모든 설정이 저장된 상태와 동일함"}</span>
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleResetTaskDefaults(activeTask)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-semibold transition-all border border-zinc-800"
                    title="현재 파이프라인 설정을 기본값으로 복원"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden xs:inline sm:inline">기본값 복원</span>
                    <span className="inline xs:hidden sm:hidden">기본값</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-zinc-700 text-center"
                  >
                    취소 (ESC)
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyAndSave}
                    className={cn(
                      "flex-[1.4] sm:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 whitespace-nowrap",
                      isDirty
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    )}
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>적용 & 저장</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
