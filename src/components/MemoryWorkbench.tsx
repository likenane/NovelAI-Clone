import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Sparkles, Eye, Loader2, RefreshCw, MessageSquarePlus, Copy, 
  ChevronDown, Maximize2, FileText, Check, SlidersHorizontal, 
  Archive, Search, Plus, Trash2, Edit3, Tag, Clock, ArrowRight,
  AlertTriangle, CheckCircle2, Filter
} from 'lucide-react';
import { 
  Novel, 
  ThinkingLevel, 
  AIEngineTaskType, 
  MemoryArchiveCard, 
  MemoryProposal, 
  MemoryCardType,
  MemoryArchiveEntryDraft 
} from '../types';
import { cn } from '../lib/utils';
import { GLOBAL_DEFAULTS } from '../constants';
import { FullScreenTextEditor } from './FullScreenTextEditor';
import { MEMORY_CHAR_BUDGET_TARGET } from '../services/memoryService';

interface MemoryWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  currentNovel: Novel | null;
  memoryAIInstruction: string;
  setMemoryAIInstruction: (val: string) => void;
  memoryWorkbenchSettings: any;
  setMemoryWorkbenchSettings: React.Dispatch<React.SetStateAction<any>>;
  isMemoryGenerating: boolean;
  handleGenerateMemory: (instruction: string, settings: any) => Promise<void>;
  memoryAISuggestion: string;
  setMemoryAISuggestion: (val: string) => void;
  memoryAIProposal?: MemoryProposal | null;
  setMemoryAIProposal?: (val: MemoryProposal | null) => void;
  memoryCards?: MemoryArchiveCard[];
  addMemoryCard?: (data: Omit<MemoryArchiveCard, 'id' | 'novelId' | 'order' | 'createdAt'>) => Promise<any>;
  updateMemoryCard?: (cardId: string, updates: Partial<MemoryArchiveCard>) => Promise<boolean>;
  deleteMemoryCard?: (cardId: string) => Promise<boolean>;
  commitMemoryProposal?: (finalMemoryText: string, newCards: MemoryArchiveEntryDraft[]) => Promise<boolean>;
  updateNovelContent: (id: string, data: Partial<Novel>, save?: boolean, silent?: boolean) => void;
  setInspectionContext: (ctx: { type: 'novel' | 'consistency' | 'codex' | 'memory' | 'autocodex' | 'plot', entryId?: string }) => void;
  setShowPromptInspector: (show: boolean) => void;
  isMemorySettingsExpanded: boolean;
  setIsMemorySettingsExpanded: (expanded: boolean) => void;
  memoryMobileTab: 'original' | 'suggestion' | 'instruction';
  setMemoryMobileTab: (tab: 'original' | 'suggestion' | 'instruction') => void;
  openAIEngineStudio?: (task?: AIEngineTaskType) => void;
}

export const MemoryWorkbench: React.FC<MemoryWorkbenchProps> = ({
  isOpen,
  onClose,
  currentNovel,
  memoryAIInstruction,
  setMemoryAIInstruction,
  memoryWorkbenchSettings,
  setMemoryWorkbenchSettings,
  isMemoryGenerating,
  handleGenerateMemory,
  memoryAISuggestion,
  setMemoryAISuggestion,
  memoryAIProposal,
  setMemoryAIProposal,
  memoryCards = [],
  addMemoryCard,
  updateMemoryCard,
  deleteMemoryCard,
  commitMemoryProposal,
  updateNovelContent,
  setInspectionContext,
  setShowPromptInspector,
  isMemorySettingsExpanded,
  setIsMemorySettingsExpanded,
  memoryMobileTab,
  setMemoryMobileTab,
  openAIEngineStudio
}) => {
  // Mode: 'core' (핵심 기억) vs 'archive' (보관소 서고)
  const [workbenchViewMode, setWorkbenchViewMode] = useState<'core' | 'archive'>('core');

  const [isFullScreenMemory, setIsFullScreenMemory] = useState(false);
  const [localMemoryText, setLocalMemoryText] = useState(currentNovel?.storyMemory || '');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Archive Cards filtering & editing state
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<'ALL' | MemoryCardType>('ALL');
  const [editingCard, setEditingCard] = useState<MemoryArchiveCard | null>(null);
  const [isCreatingCard, setIsCreatingCard] = useState(false);

  // Form state for creating / editing archive cards
  const [cardFormType, setCardFormType] = useState<MemoryCardType>('사건');
  const [cardFormTime, setCardFormTime] = useState('');
  const [cardFormTags, setCardFormTags] = useState('');
  const [cardFormContent, setCardFormContent] = useState('');
  const [cardFormLasting, setCardFormLasting] = useState('없음');

  const pendingMemoryUpdatesRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentNovelRef = useRef(currentNovel);

  useEffect(() => {
    currentNovelRef.current = currentNovel;
  }, [currentNovel]);

  // Synchronize local memory ONLY when novel changes to avoid cursor jumping
  useEffect(() => {
    if (currentNovel) {
      setLocalMemoryText(currentNovel.storyMemory || '');
      pendingMemoryUpdatesRef.current = null;
    }
  }, [currentNovel?.id]);

  const flushPendingMemory = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingMemoryUpdatesRef.current !== null && currentNovelRef.current) {
      const textToSave = pendingMemoryUpdatesRef.current;
      pendingMemoryUpdatesRef.current = null;
      updateNovelContent(currentNovelRef.current.id, { storyMemory: textToSave }, true, true);
    }
  }, [updateNovelContent]);

  // Clean up and flush on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (pendingMemoryUpdatesRef.current !== null && currentNovelRef.current) {
        updateNovelContent(currentNovelRef.current.id, { storyMemory: pendingMemoryUpdatesRef.current }, true, true);
      }
    };
  }, [updateNovelContent]);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleMemoryChange = (newText: string) => {
    setLocalMemoryText(newText);
    pendingMemoryUpdatesRef.current = newText;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (pendingMemoryUpdatesRef.current !== null && currentNovelRef.current) {
        const textToSave = pendingMemoryUpdatesRef.current;
        pendingMemoryUpdatesRef.current = null;
        updateNovelContent(currentNovelRef.current.id, { storyMemory: textToSave }, true, false);
      }
    }, 1000);
  };

  const handleClose = () => {
    flushPendingMemory();
    onClose();
  };

  const handleApplyProposal = async () => {
    if (!memoryAISuggestion) return;
    flushPendingMemory();
    const newCards = memoryAIProposal?.archiveEntries || [];

    if (commitMemoryProposal) {
      await commitMemoryProposal(memoryAISuggestion, newCards);
    } else {
      updateNovelContent(currentNovel!.id, { storyMemory: memoryAISuggestion }, true, true);
    }

    setLocalMemoryText(memoryAISuggestion);
    if (setMemoryAIProposal) setMemoryAIProposal(null);
    setMemoryAISuggestion('');
    onClose();
  };

  const handleGenerate = () => {
    flushPendingMemory();
    setMemoryMobileTab('suggestion');
    handleGenerateMemory(memoryAIInstruction, memoryWorkbenchSettings);
  };

  // Card Modal Handlers
  const openNewCardForm = () => {
    setCardFormType('사건');
    setCardFormTime('');
    setCardFormTags('');
    setCardFormContent('');
    setCardFormLasting('없음');
    setEditingCard(null);
    setIsCreatingCard(true);
  };

  const openEditCardForm = (card: MemoryArchiveCard) => {
    setCardFormType(card.type);
    setCardFormTime(card.time);
    setCardFormTags(Array.isArray(card.tags) ? card.tags.join(', ') : '');
    setCardFormContent(card.content);
    setCardFormLasting(card.lasting || '없음');
    setEditingCard(card);
    setIsCreatingCard(true);
  };

  const handleSaveCard = async () => {
    if (!cardFormContent.trim()) return;

    const parsedTags = cardFormTags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    if (editingCard) {
      if (updateMemoryCard) {
        await updateMemoryCard(editingCard.id, {
          type: cardFormType,
          time: cardFormTime.trim() || '해당 시점',
          tags: parsedTags.length > 0 ? parsedTags : ['기타'],
          content: cardFormContent.trim(),
          lasting: cardFormLasting.trim() || '없음'
        });
      }
    } else {
      if (addMemoryCard) {
        await addMemoryCard({
          type: cardFormType,
          time: cardFormTime.trim() || '해당 시점',
          tags: parsedTags.length > 0 ? parsedTags : ['기타'],
          content: cardFormContent.trim(),
          lasting: cardFormLasting.trim() || '없음'
        });
      }
    }

    setIsCreatingCard(false);
    setEditingCard(null);
  };

  const handleDeleteCard = async (cardId: string) => {
    if (deleteMemoryCard) {
      await deleteMemoryCard(cardId);
    }
  };

  // Filtered Archive Cards
  const filteredArchiveCards = useMemo(() => {
    return memoryCards.filter(card => {
      if (archiveTypeFilter !== 'ALL' && card.type !== archiveTypeFilter) {
        return false;
      }
      if (!archiveSearchQuery.trim()) return true;

      const q = archiveSearchQuery.toLowerCase();
      const matchContent = card.content.toLowerCase().includes(q);
      const matchTime = card.time.toLowerCase().includes(q);
      const matchLasting = card.lasting.toLowerCase().includes(q);
      const matchTags = Array.isArray(card.tags) && card.tags.some(t => t.toLowerCase().includes(q));

      return matchContent || matchTime || matchLasting || matchTags;
    });
  }, [memoryCards, archiveTypeFilter, archiveSearchQuery]);

  if (!currentNovel) return null;

  const currentChars = localMemoryText.length;
  const isBudgetExceeded = currentChars > MEMORY_CHAR_BUDGET_TARGET;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="memory-workbench-overlay"
          className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-6 lg:p-12"
        >
          <motion.div 
            key="memory-workbench-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div 
            key="memory-workbench-content"
            initial={{ scale: 1, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1, opacity: 0, y: 20 }}
            className="relative w-full max-w-6xl h-[100dvh] sm:h-[85vh] bg-zinc-900 border-x sm:border border-zinc-800 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 shrink-0 z-20">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 text-zinc-100">
                    Story Memory AI Workbench
                  </h2>
                  <p className="hidden sm:block text-[11px] text-zinc-500">
                    2-Tier 계층형 스토리 메모리 (핵심 기억 4,000자 + 무제한 결정론적 보관소)
                  </p>
                </div>
              </div>

              {/* View Mode Toggle: [핵심 기억] vs [보관소 서고] */}
              <div className="hidden sm:flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setWorkbenchViewMode('core')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                    workbenchViewMode === 'core'
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>핵심 기억</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                    {currentChars.toLocaleString()}자
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkbenchViewMode('archive')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                    workbenchViewMode === 'archive'
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>보관소 서고</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                    {memoryCards.length}장
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3">
                <button 
                  onClick={() => openAIEngineStudio?.('memory')}
                  className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all border border-zinc-700 shadow-sm"
                  title="스토리 메모리 AI 파라미터 설정 (AI Engine Studio)"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xs:inline">엔진 설정</span>
                </button>
                <button 
                  onClick={() => {
                    setInspectionContext({ type: 'memory' });
                    setShowPromptInspector(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all border border-zinc-700"
                  title="프롬프트 검사기 열기"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Prompt</span>
                </button>
                <button 
                  onClick={handleClose} 
                  className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex sm:hidden border-b border-zinc-800 bg-zinc-950/80 p-1.5 shrink-0 gap-1.5 z-10 overflow-x-auto">
              <button 
                onClick={() => { setWorkbenchViewMode('core'); setMemoryMobileTab('original'); }}
                className={cn(
                  "flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 shrink-0",
                  workbenchViewMode === 'core' && memoryMobileTab === 'original'
                    ? "bg-zinc-800 text-white shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>현재 메모리</span>
              </button>
              <button 
                onClick={() => { setWorkbenchViewMode('core'); setMemoryMobileTab('suggestion'); }}
                className={cn(
                  "flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 shrink-0",
                  workbenchViewMode === 'core' && memoryMobileTab === 'suggestion'
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>AI 제안</span>
                {memoryAISuggestion && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
              <button 
                onClick={() => setWorkbenchViewMode('archive')}
                className={cn(
                  "flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 shrink-0",
                  workbenchViewMode === 'archive'
                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Archive className="w-3.5 h-3.5 text-purple-400" />
                <span>서고 ({memoryCards.length})</span>
              </button>
              <button 
                onClick={() => { setWorkbenchViewMode('core'); setMemoryMobileTab('instruction'); }}
                className={cn(
                  "flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 shrink-0",
                  workbenchViewMode === 'core' && memoryMobileTab === 'instruction'
                    ? "bg-zinc-800 text-white shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>생성</span>
              </button>
            </div>

            {/* Main Content Area */}
            {workbenchViewMode === 'core' ? (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left Panel: Instructions & Model Controls */}
                <div className={cn(
                  "w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col bg-zinc-950/30 shrink-0",
                  memoryMobileTab !== 'instruction' && "hidden lg:flex"
                )}>
                  <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                    {/* Active Engine Card */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          Active Memory Engine
                        </span>
                        <button
                          type="button"
                          onClick={() => openAIEngineStudio?.('memory')}
                          className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          설정 변경
                        </button>
                      </div>
                      <div 
                        onClick={() => openAIEngineStudio?.('memory')}
                        className="p-2.5 bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer transition-colors group flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-bold text-zinc-200 group-hover:text-emerald-300 transition-colors truncate">
                            {(memoryWorkbenchSettings.modelName || currentNovel.settings.memory?.modelName || GLOBAL_DEFAULTS.memory.modelName).replace('google/', '')}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            Thinking: {memoryWorkbenchSettings.thinkingLevel || currentNovel.settings.memory?.thinkingLevel || 'DEFAULT'} · Temp: {memoryWorkbenchSettings.temperature ?? GLOBAL_DEFAULTS.memory.temperature}
                          </div>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 -rotate-90 transition-transform shrink-0" />
                      </div>
                    </div>

                    {/* Custom Instructions */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        <MessageSquarePlus className="w-3.5 h-3.5 text-emerald-400" />
                        Custom Instructions (요약 지침)
                      </div>
                      <textarea 
                        value={memoryAIInstruction}
                        onChange={(e) => setMemoryAIInstruction(e.target.value)}
                        placeholder="e.g. 주인공과 조력자의 관계 변화, 단서 해소 여부에 집중하여 갱신해주세요..."
                        className="w-full h-32 sm:h-44 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed custom-scrollbar placeholder-zinc-700"
                      />
                      <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-[11px] text-zinc-400 space-y-1">
                        <div className="font-bold text-zinc-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          5대 필수 계층 헤더
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-tight">
                          1. 이야기의 뿌리 / 2. 지난 경과 / 3. 미해결 단서 / 4. 인물 상태와 관계 / 5. 직전 장면 이음새
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 sm:p-5 bg-zinc-900/60 border-t border-zinc-800">
                    <button 
                      onClick={handleGenerate}
                      disabled={isMemoryGenerating}
                      className={cn(
                        "w-full py-2.5 sm:py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all shadow-lg",
                        isMemoryGenerating 
                          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                          : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20 active:scale-[0.98]"
                      )}
                    >
                      {isMemoryGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          스토리 분석 및 2-Tier 갱신 중...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Generate Memory (메모리 갱신)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Panel: Core Memory Comparison & AI Proposal */}
                <div className={cn(
                  "flex-1 flex flex-col bg-zinc-900/50 overflow-hidden",
                  memoryMobileTab === 'instruction' && "hidden lg:flex"
                )}>
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800 overflow-hidden">
                    {/* Current Core Memory */}
                    <div className={cn(
                      "flex flex-col overflow-hidden bg-zinc-950/20",
                      memoryMobileTab !== 'original' && "hidden lg:flex"
                    )}>
                      <div className="p-2.5 sm:p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                            Current Core Memory
                          </span>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1",
                            isBudgetExceeded 
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" 
                              : "bg-zinc-800 text-zinc-400"
                          )}>
                            {isBudgetExceeded && <AlertTriangle className="w-2.5 h-2.5" />}
                            {currentChars.toLocaleString()} / {MEMORY_CHAR_BUDGET_TARGET.toLocaleString()}자
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setIsFullScreenMemory(true)}
                            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 rounded transition-colors"
                            title="전체화면 집중 편집 (Fullscreen)"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleCopy(localMemoryText, 'original')}
                            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 rounded transition-colors"
                            title="스토리 메모리 복사"
                          >
                            {copiedSection === 'original' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Over-budget soft warning banner */}
                      {isBudgetExceeded && (
                        <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2 shrink-0">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>권장 분량({MEMORY_CHAR_BUDGET_TARGET.toLocaleString()}자)을 초과했습니다. 다음 갱신 시 오래된 사건을 막 요약으로 접어 보관소로 내보내세요.</span>
                        </div>
                      )}

                      <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                        <textarea 
                          value={localMemoryText}
                          onChange={(e) => handleMemoryChange(e.target.value)}
                          className="w-full h-full bg-transparent border-none p-0 text-xs sm:text-sm text-zinc-200 focus:outline-none resize-none leading-relaxed font-sans placeholder-zinc-700"
                          placeholder="현재 등록된 스토리 메모리가 없습니다..."
                        />
                      </div>
                    </div>

                    {/* AI Suggestion */}
                    <div className={cn(
                      "flex flex-col overflow-hidden bg-emerald-500/[0.015]",
                      memoryMobileTab !== 'suggestion' && "hidden lg:flex"
                    )}>
                      <div className="p-2.5 sm:p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                            AI Suggestion & Archive Drafts
                          </span>
                          {memoryAISuggestion && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                              {memoryAISuggestion.length.toLocaleString()}자
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {memoryAISuggestion && (
                            <button 
                              onClick={() => {
                                setInspectionContext({ type: 'memory' });
                                setShowPromptInspector(true);
                              }}
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold transition-all border border-emerald-500/30"
                              title="Thought Process 및 프롬프트 상세 보기"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Thought Process</span>
                            </button>
                          )}
                          {memoryAISuggestion && (
                            <button 
                              onClick={() => handleCopy(memoryAISuggestion, 'suggestion')}
                              className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                              title="제안 내용 복사"
                            >
                              {copiedSection === 'suggestion' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {isMemoryGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
                        </div>
                      </div>

                      <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5">
                        {isMemoryGenerating ? (
                          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3 py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                            <p className="text-xs sm:text-sm font-medium text-zinc-300">스토리 분석, 핵심 기억 갱신 및 보관소 카드 추출 중...</p>
                          </div>
                        ) : memoryAISuggestion ? (
                          <>
                            {/* Core Memory Editor */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                갱신될 핵심 기억 (Core Memory Text)
                              </span>
                              <textarea 
                                value={memoryAISuggestion}
                                onChange={(e) => setMemoryAISuggestion(e.target.value)}
                                className="w-full min-h-[300px] bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 resize-y leading-relaxed font-sans"
                                placeholder="AI suggestion will appear here..."
                              />
                            </div>

                            {/* New Archive Entries Preview */}
                            {memoryAIProposal?.archiveEntries && memoryAIProposal.archiveEntries.length > 0 && (
                              <div className="space-y-3 p-3.5 bg-zinc-950/70 border border-purple-500/30 rounded-2xl">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Archive className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs font-bold text-purple-300">
                                      이번 갱신에서 신규 발행될 보관소 카드 ({memoryAIProposal.archiveEntries.length}장)
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500">
                                    적용 시 서고에 자동 추가됩니다
                                  </span>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                  {memoryAIProposal.archiveEntries.map((card, idx) => (
                                    <div 
                                      key={idx}
                                      className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5 text-xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                            card.type === '막요약' ? "bg-purple-500/20 text-purple-300" :
                                            card.type === '정정' ? "bg-amber-500/20 text-amber-300" :
                                            "bg-sky-500/20 text-sky-300"
                                          )}>
                                            {card.type}
                                          </span>
                                          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {card.time}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                          {card.tags.map((t, tIdx) => (
                                            <span key={tIdx} className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                                              #{t}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      <p className="text-zinc-200 text-xs leading-relaxed">
                                        {card.content}
                                      </p>
                                      {card.lasting && card.lasting !== '없음' && (
                                        <p className="text-[10px] text-zinc-400">
                                          <span className="text-zinc-500">잔존 영향:</span> {card.lasting}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-3 py-12">
                            <Sparkles className="w-10 h-10 opacity-20 text-emerald-400" />
                            <p className="text-xs sm:text-sm text-zinc-400 font-medium text-center px-4">
                              아직 생성된 AI 메모리 제안이 없습니다.
                            </p>
                            <button
                              type="button"
                              onClick={() => setMemoryMobileTab('instruction')}
                              className="lg:hidden px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold"
                            >
                              지침 입력 및 요약 생성으로 이동
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-3 sm:px-6 sm:py-4 border-t border-zinc-800 bg-zinc-950/90 shrink-0 flex items-center justify-between gap-3 z-10">
                    <button 
                      onClick={() => {
                        setMemoryAISuggestion('');
                        if (setMemoryAIProposal) setMemoryAIProposal(null);
                      }}
                      disabled={!memoryAISuggestion}
                      className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-40 font-medium transition-colors"
                    >
                      제안 비우기 (Discard)
                    </button>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleApplyProposal}
                        disabled={!memoryAISuggestion}
                        className={cn(
                          "px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5",
                          !memoryAISuggestion 
                            ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" 
                            : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20 active:scale-[0.98]"
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {memoryAIProposal?.archiveEntries && memoryAIProposal.archiveEntries.length > 0
                            ? `핵심 기억 및 보관소 카드(${memoryAIProposal.archiveEntries.length}장) 일괄 적용`
                            : "핵심 기억에 적용 (Apply)"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Archive Library (보관소 서고 탭) */
              <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950/40">
                {/* Search & Filter Toolbar */}
                <div className="p-3 sm:px-6 sm:py-4 border-b border-zinc-800 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        value={archiveSearchQuery}
                        onChange={(e) => setArchiveSearchQuery(e.target.value)}
                        placeholder="태그(#인물, 사물) 또는 카드 내용 검색..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    {/* Type Filter Buttons */}
                    <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px]">
                      {(['ALL', '사건', '막요약', '정정'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setArchiveTypeFilter(type)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg font-bold transition-colors",
                            archiveTypeFilter === type 
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {type === 'ALL' ? '전체' : type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openNewCardForm}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>새 카드 작성</span>
                    </button>
                  </div>
                </div>

                {/* Cards Grid List */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                  {filteredArchiveCards.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-3 py-16">
                      <Archive className="w-12 h-12 opacity-20 text-purple-400" />
                      <p className="text-sm font-medium text-zinc-400 text-center">
                        {archiveSearchQuery ? "검색 조건에 맞는 보관소 카드가 없습니다." : "아직 보관소에 저장된 카드가 없습니다."}
                      </p>
                      <p className="text-xs text-zinc-500 text-center max-w-md">
                        핵심 기억이 4,000자 상한에 도달하거나 막이 일단락되어 접힐 때, 과거의 세부 사실들이 보관소 카드로 자동 추출되어 영구 보존됩니다.
                      </p>
                      <button
                        type="button"
                        onClick={openNewCardForm}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold mt-2"
                      >
                        직접 카드 추가하기
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredArchiveCards.map(card => (
                        <div 
                          key={card.id}
                          className="p-4 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl flex flex-col justify-between space-y-3 transition-all group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                  card.type === '막요약' ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                                  card.type === '정정' ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                                  "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                )}>
                                  {card.type}
                                </span>
                                <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-zinc-500" />
                                  {card.time}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => openEditCardForm(card)}
                                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                                  title="카드 수정"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCard(card.id)}
                                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded transition-colors"
                                  title="카드 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                              {card.content}
                            </p>

                            {card.lasting && card.lasting !== '없음' && (
                              <div className="p-2 bg-zinc-950/50 rounded-xl text-[11px] text-zinc-400">
                                <span className="text-zinc-500 font-semibold">잔존 영향:</span> {card.lasting}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1 pt-2 border-t border-zinc-800/60">
                            {Array.isArray(card.tags) && card.tags.map((tag, tIdx) => (
                              <button
                                key={tIdx}
                                type="button"
                                onClick={() => setArchiveSearchQuery(tag)}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Card Add / Edit Modal */}
          {isCreatingCard && (
            <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsCreatingCard(false)}
              />
              <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Archive className="w-4 h-4 text-purple-400" />
                    <span>{editingCard ? "보관소 카드 수정" : "새 보관소 카드 작성"}</span>
                  </h3>
                  <button 
                    onClick={() => setIsCreatingCard(false)}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400">카드 유형</label>
                      <select
                        value={cardFormType}
                        onChange={(e) => setCardFormType(e.target.value as MemoryCardType)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-purple-500/50"
                      >
                        <option value="사건">사건 (개별 사건과 결과)</option>
                        <option value="막요약">막요약 (접힌 막의 결말)</option>
                        <option value="정정">정정 (과거 사실 변경)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-400">시점 표현 (Time)</label>
                      <input 
                        type="text"
                        value={cardFormTime}
                        onChange={(e) => setCardFormTime(e.target.value)}
                        placeholder="예: 수로 잠입 당일 밤"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400">검색 태그 (쉼표로 구분)</label>
                    <input 
                      type="text"
                      value={cardFormTags}
                      onChange={(e) => setCardFormTags(e.target.value)}
                      placeholder="카일, 레일라, 비밀 수로, 해독제"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-purple-500/50"
                    />
                    <p className="text-[10px] text-zinc-500">설정집의 인물, 사물, 장소 표제어 및 별칭을 적으세요.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400">카드 내용 (독립 완결 문장)</label>
                    <textarea 
                      value={cardFormContent}
                      onChange={(e) => setCardFormContent(e.target.value)}
                      placeholder="그 카드만 읽어도 상황과 결과를 알 수 있는 완결된 문장으로 작성하세요."
                      rows={4}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 focus:outline-none focus:border-purple-500/50 resize-none leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-400">잔존 영향 (Lasting Impact)</label>
                    <input 
                      type="text"
                      value={cardFormLasting}
                      onChange={(e) => setCardFormLasting(e.target.value)}
                      placeholder="관계 변화, 맺은 약속, 소모된 자원 등 (없으면 '없음')"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsCreatingCard(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCard}
                    disabled={!cardFormContent.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-900/20"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Full Screen Text Editor for Core Memory */}
          <FullScreenTextEditor 
            isOpen={isFullScreenMemory}
            onClose={() => setIsFullScreenMemory(false)}
            value={localMemoryText}
            onChange={handleMemoryChange}
            title="Core Story Memory (핵심 기억)"
            description="사건 연표, 미해결 단서, 인물 상태 및 직전 장면 이음새를 전체 화면에서 집중 편집합니다."
            icon={<Sparkles className="w-5 h-5 text-emerald-400" />}
            saveMode="auto"
            placeholder="핵심 기억을 작성하세요..."
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
