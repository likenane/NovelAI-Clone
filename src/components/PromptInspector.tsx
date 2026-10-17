import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  History, 
  ChevronDown, 
  Languages, 
  Scale, 
  Users, 
  BookOpen, 
  Compass, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldCheck,
  Layers,
  Network,
  Boxes,
  Clock,
  Archive,
  Lock,
  Activity,
  MapPin,
  GraduationCap,
  FileText,
  Book,
  Sparkle,
  Sliders,
  ListOrdered
} from 'lucide-react';
import { Novel } from '../types';
import { cn } from '../lib/utils';
import { flattenSemanticCandidates } from '../lib/loreUtils';
import { resolveLiveStoryContent } from '../lib/contextProviders';
import { RefinerDiffViewer } from './RefinerDiffViewer';

interface PromptInspectorProps {
  showPromptInspector: boolean;
  setShowPromptInspector: (show: boolean) => void;
  inspectorTab: 'current' | 'last';
  setInspectorTab: (tab: 'current' | 'last') => void;
  inspectorExpanded: Record<string, boolean>;
  setInspectorExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  inspectionContext: { type: 'novel' | 'consistency' | 'codex' | 'memory' | 'autocodex' | 'plot', entryId?: string };
  setInspectionContext: (ctx: { type: 'novel' | 'consistency' | 'codex' | 'memory' | 'autocodex' | 'plot', entryId?: string }) => void;
  currentNovel: Novel | null;
  editingLoreId: string | null;
  codexAIInstruction: string;
  memoryAIInstruction: string;
  memoryWorkbenchSettings: any;
  plotAIInstruction?: string;
  plotWorkbenchSettings?: any;
  lastNovelPromptInfo: any;
  lastConsistencyPromptInfo: any;
  lastCodexPromptInfo: any;
  lastMemoryPromptInfo: any;
  lastAutoCodexPromptInfo: any;
  lastPlotPromptInfo?: any;
  generateTaskContext: (taskType: any, novel: Novel, extraData?: any) => any;
  getEditorContent?: () => string;
}

export const PromptInspector: React.FC<PromptInspectorProps> = ({
  showPromptInspector,
  setShowPromptInspector,
  inspectorTab,
  setInspectorTab,
  inspectorExpanded,
  setInspectorExpanded,
  inspectionContext,
  setInspectionContext,
  currentNovel,
  editingLoreId,
  codexAIInstruction,
  memoryAIInstruction,
  memoryWorkbenchSettings,
  plotAIInstruction,
  plotWorkbenchSettings,
  lastNovelPromptInfo,
  lastConsistencyPromptInfo,
  lastCodexPromptInfo,
  lastMemoryPromptInfo,
  lastAutoCodexPromptInfo,
  lastPlotPromptInfo,
  generateTaskContext,
  getEditorContent
}) => {
  const toggleSection = (section: string) => {
    setInspectorExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const [isContextDropdownOpen, setIsContextDropdownOpen] = useState(false);
  const [isEntryDropdownOpen, setIsEntryDropdownOpen] = useState(false);
  const [refinerSubTab, setRefinerSubTab] = useState<'synthesis' | 'plot' | 'physical' | 'lore' | 'stylistic'>('synthesis');

  // Memoize the prompt info calculation to avoid unnecessary re-renders when hidden
  const info = useMemo(() => {
    // CRITICAL: If the inspector is not visible, do NOT perform expensive context generation
    if (!showPromptInspector) return null;

    if (inspectorTab === 'current') {
      if (currentNovel) {
        const latestContent = resolveLiveStoryContent(currentNovel, getEditorContent, { allowSavedFallback: true, strict: false });
        if (inspectionContext.type === 'novel') {
          return generateTaskContext('novel', currentNovel, { overrideContent: latestContent });
        } else if (inspectionContext.type === 'consistency') {
          // Stage 2 context requires a rawDraft which only exists after Stage 1. 
          // We pass a placeholder string for the dry-run view.
          return generateTaskContext('consistency', currentNovel, { 
            rawDraft: "[This is a placeholder for the Stage 1 output (rawDraft). In reality, this will be dynamically populated during generation.]",
            overrideContent: latestContent 
          });
        } else if (inspectionContext.type === 'codex') {
          const entry = currentNovel.loreEntries?.find(e => e.id === inspectionContext.entryId) || 
                       (editingLoreId ? currentNovel.loreEntries?.find(e => e.id === editingLoreId) : null) ||
                       (currentNovel.loreEntries && currentNovel.loreEntries.length > 0 ? currentNovel.loreEntries[0] : null);
          if (entry) {
            return generateTaskContext('codex', currentNovel, { entry, codexAIInstruction, overrideContent: latestContent });
          }
        } else if (inspectionContext.type === 'memory') {
          return generateTaskContext('memory', currentNovel, { memoryAIInstruction, memoryWorkbenchSettings, overrideContent: latestContent });
        } else if (inspectionContext.type === 'plot') {
          return generateTaskContext('plot', currentNovel, { plotAIInstruction, plotWorkbenchSettings, overrideContent: latestContent });
        } else {
          return generateTaskContext('autocodex', currentNovel, { enablePruning: currentNovel.settings.enableContextPruning, overrideContent: latestContent });
        }
      }
    } else {
      if (inspectionContext.type === 'novel') return lastNovelPromptInfo;
      else if (inspectionContext.type === 'consistency') return lastConsistencyPromptInfo;
      else if (inspectionContext.type === 'codex') return lastCodexPromptInfo;
      else if (inspectionContext.type === 'memory') return lastMemoryPromptInfo;
      else if (inspectionContext.type === 'plot') return lastPlotPromptInfo;
      else return lastAutoCodexPromptInfo;
    }
    return null;
  }, [
    showPromptInspector, 
    inspectorTab, 
    currentNovel, 
    inspectionContext, 
    editingLoreId, 
    codexAIInstruction, 
    memoryAIInstruction, 
    memoryWorkbenchSettings,
    plotAIInstruction,
    plotWorkbenchSettings,
    lastNovelPromptInfo,
    lastConsistencyPromptInfo,
    lastCodexPromptInfo,
    lastMemoryPromptInfo,
    lastAutoCodexPromptInfo,
    lastPlotPromptInfo,
    generateTaskContext,
    getEditorContent
  ]);

  // Compute active displayed info (sub-agent aware for consistency)
  const displayInfo = useMemo(() => {
    if (!info) return null;
    if (inspectionContext.type !== 'consistency' || refinerSubTab === 'synthesis') {
      return info;
    }
    const auditItem = info.stage2Audits?.[refinerSubTab];
    if (!auditItem) return info;
    return {
      ...info,
      modelName: auditItem.modelName || info.modelName,
      system: auditItem.system,
      messages: [{ role: 'user', content: auditItem.user }],
      output: auditItem.output,
      isSubAgent: true,
      subAgentName: auditItem.name
    };
  }, [info, inspectionContext.type, refinerSubTab]);

  const contextItems: Array<{
    type: 'novel' | 'consistency' | 'codex' | 'memory' | 'autocodex' | 'plot';
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    activeBg: string;
    badgeBg: string;
  }> = [
    {
      type: 'novel',
      label: 'Novel Generation (Stage 1)',
      shortLabel: 'Novel Stage 1',
      icon: FileText,
      color: 'text-indigo-400',
      activeBg: 'bg-indigo-600 text-white shadow-indigo-600/30',
      badgeBg: 'bg-indigo-500/20 text-indigo-400'
    },
    {
      type: 'consistency',
      label: 'Consistency Refiner (MARS)',
      shortLabel: 'Refiner (MARS)',
      icon: ShieldCheck,
      color: 'text-amber-400',
      activeBg: 'bg-amber-600 text-white shadow-amber-600/30',
      badgeBg: 'bg-amber-500/20 text-amber-400'
    },
    {
      type: 'codex',
      label: 'Codex Assistant',
      shortLabel: 'Codex AI',
      icon: Book,
      color: 'text-amber-300',
      activeBg: 'bg-amber-600 text-white shadow-amber-600/30',
      badgeBg: 'bg-amber-500/20 text-amber-300'
    },
    {
      type: 'memory',
      label: 'Story Memory',
      shortLabel: 'Memory',
      icon: Sparkles,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-600 text-white shadow-emerald-600/30',
      badgeBg: 'bg-emerald-500/20 text-emerald-400'
    },
    {
      type: 'autocodex',
      label: 'Auto Codex',
      shortLabel: 'Auto Codex',
      icon: Layers,
      color: 'text-cyan-400',
      activeBg: 'bg-cyan-600 text-white shadow-cyan-600/30',
      badgeBg: 'bg-cyan-500/20 text-cyan-400'
    },
    {
      type: 'plot',
      label: 'Plot Blueprint',
      shortLabel: 'Plot Blueprint',
      icon: Compass,
      color: 'text-purple-400',
      activeBg: 'bg-purple-600 text-white shadow-purple-600/30',
      badgeBg: 'bg-purple-500/20 text-purple-400'
    }
  ];

  const selectedContextItem = contextItems.find(item => item.type === inspectionContext.type) || contextItems[0];
  const activeLoreEntry = currentNovel?.loreEntries?.find(e => e.id === inspectionContext.entryId) || 
                          (editingLoreId ? currentNovel?.loreEntries?.find(e => e.id === editingLoreId) : null) ||
                          (currentNovel?.loreEntries && currentNovel.loreEntries.length > 0 ? currentNovel.loreEntries[0] : null);

  return (
    <AnimatePresence>
      {showPromptInspector && (
        <motion.div 
          key="prompt-inspector-overlay"
          className="fixed inset-0 z-[170] flex items-center justify-center p-2 sm:p-6 md:p-12"
        >
          <motion.div 
            key="prompt-inspector-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPromptInspector(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div 
            key="prompt-inspector-content"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-5xl h-[92vh] sm:h-[85vh] bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header: Tier 1 (Title + Mode Switch + Controls) */}
            <div className="p-3.5 sm:p-5 border-b border-zinc-800 bg-zinc-900/80 space-y-3 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                    <History className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-zinc-100 truncate flex items-center gap-1.5">
                      <span>Prompt Inspector</span>
                      <span className="hidden xs:inline-block text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {inspectorTab === 'current' ? 'Live Dry-Run' : 'Historical'}
                      </span>
                    </h2>
                  </div>
                </div>

                {/* Right controls: Tab toggle & close */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex bg-zinc-950 p-0.5 rounded-xl border border-zinc-800">
                    <button 
                      onClick={() => setInspectorTab('current')}
                      className={cn(
                        "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all",
                        inspectorTab === 'current' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      Current (Live)
                    </button>
                    <button 
                      onClick={() => setInspectorTab('last')}
                      className={cn(
                        "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all",
                        inspectorTab === 'last' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      Last Generated
                    </button>
                  </div>

                  <div className="hidden sm:flex gap-1.5">
                    <button 
                      onClick={() => setInspectorExpanded({ model: true, system: true, history: true, output: true })}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Expand All
                    </button>
                    <button 
                      onClick={() => setInspectorExpanded({ model: false, system: false, history: false, output: false })}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Collapse All
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowPromptInspector(false)} 
                    className="p-1.5 sm:p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors shrink-0"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Header: Tier 2 (Generation Context Switcher & Entry Picker) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
                {/* Horizontal Scrollable Generation Type Tabs for Touch & Desktop */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 -mx-1 px-1">
                  {contextItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = inspectionContext.type === item.type;
                    return (
                      <button
                        key={item.type}
                        onClick={() => {
                          setInspectionContext({ type: item.type, entryId: inspectionContext.entryId });
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 border",
                          isActive
                            ? cn(item.activeBg, "border-transparent shadow-sm")
                            : "bg-zinc-950/80 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border-zinc-800/80"
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : item.color)} />
                        <span>{item.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-controls: Codex Entry Selector or Mobile Expand/Collapse */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                  {inspectionContext.type === 'codex' && currentNovel?.loreEntries && currentNovel.loreEntries.length > 0 && (
                    <div className="relative flex-1 sm:flex-none">
                      <button
                        onClick={() => setIsEntryDropdownOpen(!isEntryDropdownOpen)}
                        className="w-full sm:w-auto flex items-center justify-between gap-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 transition-colors"
                      >
                        <span className="truncate max-w-[160px] text-amber-300">
                          {activeLoreEntry ? `항목: ${activeLoreEntry.title || 'Untitled'}` : '항목 선택'}
                        </span>
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isEntryDropdownOpen && "rotate-180")} />
                      </button>

                      <AnimatePresence>
                        {isEntryDropdownOpen && (
                          <motion.div key="entry-dropdown-wrapper" className="contents">
                            <motion.div 
                              key="entry-dropdown-backdrop"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-40" 
                              onClick={() => setIsEntryDropdownOpen(false)}
                            />
                            <motion.div
                              key="entry-dropdown-content"
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="absolute top-full left-0 sm:right-0 sm:left-auto mt-1 w-56 max-h-60 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-y-auto custom-scrollbar z-50 p-1"
                            >
                              {currentNovel.loreEntries.map((e) => (
                                <button
                                  key={e.id}
                                  onClick={() => {
                                    setInspectionContext({ type: 'codex', entryId: e.id });
                                    setIsEntryDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors truncate block",
                                    (inspectionContext.entryId === e.id || (!inspectionContext.entryId && activeLoreEntry?.id === e.id))
                                      ? "bg-amber-500/20 text-amber-300 font-bold"
                                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                  )}
                                >
                                  {e.title || 'Untitled Entry'}
                                </button>
                              ))}
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Mobile-only expand/collapse toggles */}
                  <div className="flex sm:hidden gap-1 ml-auto">
                    <button 
                      onClick={() => setInspectorExpanded({ model: true, system: true, history: true, output: true })}
                      className="px-2 py-1 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg text-[10px] font-bold"
                    >
                      전체 펼치기
                    </button>
                    <button 
                      onClick={() => setInspectorExpanded({ model: false, system: false, history: false, output: false })}
                      className="px-2 py-1 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg text-[10px] font-bold"
                    >
                      전체 접기
                    </button>
                  </div>
                </div>
              </div>

              {/* MARS 4-Auditor Sub-Agent Selector Bar (Shown when Refiner MARS is selected) */}
              {inspectionContext.type === 'consistency' && (
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-2 border-t border-zinc-800/60 text-xs">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>MARS Agent:</span>
                  </span>
                  <button
                    onClick={() => setRefinerSubTab('synthesis')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 border",
                      refinerSubTab === 'synthesis'
                        ? "bg-indigo-600 text-white border-transparent shadow-sm"
                        : "bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800"
                    )}
                  >
                    <Sparkles className="w-3 h-3 text-indigo-300" />
                    <span>👑 Stage 3: Master Restorer (문학적 정밀 복원)</span>
                  </button>
                  <button
                    onClick={() => setRefinerSubTab('plot')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 border",
                      refinerSubTab === 'plot'
                        ? "bg-blue-600 text-white border-transparent shadow-sm"
                        : "bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800"
                    )}
                  >
                    <Compass className="w-3 h-3 text-blue-300" />
                    <span>🕵️ Agent 1: 플롯 & 인과</span>
                  </button>
                  <button
                    onClick={() => setRefinerSubTab('physical')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 border",
                      refinerSubTab === 'physical'
                        ? "bg-emerald-600 text-white border-transparent shadow-sm"
                        : "bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800"
                    )}
                  >
                    <Layers className="w-3 h-3 text-emerald-300" />
                    <span>📐 Agent 2: 물리 & 시공간</span>
                  </button>
                  <button
                    onClick={() => setRefinerSubTab('lore')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 border",
                      refinerSubTab === 'lore'
                        ? "bg-purple-600 text-white border-transparent shadow-sm"
                        : "bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800"
                    )}
                  >
                    <Book className="w-3 h-3 text-purple-300" />
                    <span>📜 Agent 3: 세계관 & 지식경계</span>
                  </button>
                  <button
                    onClick={() => setRefinerSubTab('stylistic')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 border",
                      refinerSubTab === 'stylistic'
                        ? "bg-rose-600 text-white border-transparent shadow-sm"
                        : "bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800"
                    )}
                  >
                    <BookOpen className="w-3 h-3 text-rose-300" />
                    <span>✒️ Agent 4: 한국어 문체</span>
                  </button>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-8 space-y-4 sm:space-y-8 custom-scrollbar">
              {(() => {
                if (!displayInfo) {
                  return (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-zinc-600 space-y-4 text-center px-4">
                      <History className="w-14 h-14 opacity-20" />
                      <p className="text-sm">
                        {inspectorTab === 'current' 
                          ? (inspectionContext.type === 'novel' ? "소설을 선택하여 Live 소설 생성 프롬프트를 확인하세요." : 
                             inspectionContext.type === 'consistency' ? "소설을 선택하여 Live 일관성 검수기(Stage 2) 프롬프트를 확인하세요." :
                             inspectionContext.type === 'codex' ? "코덱스 항목을 선택하여 Live 어시스턴트 프롬프트를 확인하세요." :
                             inspectionContext.type === 'memory' ? "소설을 선택하여 스토리 메모리 생성 프롬프트를 확인하세요." :
                             inspectionContext.type === 'plot' ? "소설을 선택하여 플롯 청사진 생성 프롬프트를 확인하세요." :
                             "소설을 선택하여 Auto Codex 프롬프트를 확인하세요.")
                          : `아직 실행된 ${selectedContextItem.label} 생성 기록이 없습니다.`}
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Model & Parameters */}
                    <div className="space-y-3">
                      <button 
                        onClick={() => toggleSection('model')}
                        className="w-full flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest group"
                      >
                        <h3 className="flex items-center gap-2">
                          <span>Model & Parameters</span>
                          {(displayInfo as any).subAgentName && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                              {(displayInfo as any).subAgentName}
                            </span>
                          )}
                        </h3>
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", inspectorExpanded.model ? "rotate-0" : "-rotate-90")} />
                      </button>
                      <AnimatePresence initial={false}>
                        {inspectorExpanded.model && (
                          <motion.div
                            key="inspector-expanded-model"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3.5 sm:p-4 bg-zinc-950 rounded-xl border border-zinc-800 grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] text-zinc-600 uppercase font-bold">Model</span>
                                <p className="text-xs text-zinc-300 font-mono truncate">{displayInfo.modelName || displayInfo.model || "Default"}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-zinc-600 uppercase font-bold">Temperature</span>
                                <p className="text-xs text-zinc-300 font-mono">{displayInfo.config?.temperature ?? "N/A"}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-zinc-600 uppercase font-bold">Max Tokens</span>
                                <p className="text-xs text-zinc-300 font-mono">{displayInfo.config?.maxTokens ?? "N/A"}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-zinc-600 uppercase font-bold">Thinking Level</span>
                                <p className="text-xs text-zinc-300 font-mono">{displayInfo.config?.thinkingLevel ?? "N/A"}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-zinc-600 uppercase font-bold">Repetition Penalty</span>
                                <p className="text-xs text-zinc-300 font-mono">{displayInfo.config?.repetitionPenalty ?? "N/A"}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* System Instruction */}
                    <div className="space-y-3">
                      <button 
                        onClick={() => toggleSection('system')}
                        className="w-full flex items-center justify-between text-xs font-bold text-indigo-400 uppercase tracking-widest group"
                      >
                        <div className="flex items-center gap-2">
                          <span>System Instruction</span>
                          {displayInfo.type && (
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                              displayInfo.type === 'novel' ? "bg-indigo-500/20 text-indigo-400" : 
                              displayInfo.type === 'codex' ? "bg-amber-500/20 text-amber-400" :
                              displayInfo.type === 'memory' ? "bg-emerald-500/20 text-emerald-400" :
                              displayInfo.type === 'plot' ? "bg-purple-500/20 text-purple-400" :
                              "bg-rose-500/20 text-rose-400"
                            )}>
                              {(displayInfo as any).subAgentName || displayInfo.type}
                            </span>
                          )}
                          {inspectorTab === 'current' && <span className="text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded text-indigo-500 animate-pulse">LIVE</span>}
                        </div>
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", inspectorExpanded.system ? "rotate-0" : "-rotate-90")} />
                      </button>
                      <AnimatePresence initial={false}>
                        {inspectorExpanded.system && (
                          <motion.div
                            key="inspector-expanded-system"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <pre className="p-3.5 sm:p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed max-h-96 sm:max-h-[500px] overflow-y-auto custom-scrollbar">
                              {displayInfo.system}
                            </pre>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Messages */}
                    <div className="space-y-3">
                      <button 
                        onClick={() => toggleSection('history')}
                        className="w-full flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-widest group"
                      >
                        <h3 className="flex items-center gap-2">Messages (Synthetic History)</h3>
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", inspectorExpanded.history ? "rotate-0" : "-rotate-90")} />
                      </button>
                      <AnimatePresence initial={false}>
                        {inspectorExpanded.history && (
                          <motion.div
                            key="inspector-expanded-history"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden space-y-4"
                          >
                            {displayInfo.messages?.map((msg: any, idx: number) => (
                              <div key={idx} className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                                <div className={cn(
                                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-800",
                                  msg.role === 'user' ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
                                )}>
                                  {msg.role}
                                </div>
                                <pre className="p-4 text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                                  {msg.content}
                                </pre>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Output */}
                    {(displayInfo.output || displayInfo.error) && (
                      <div className="space-y-3">
                        <button 
                          onClick={() => toggleSection('output')}
                          className="w-full flex items-center justify-between text-xs font-bold text-rose-400 uppercase tracking-widest group"
                        >
                          <h3 className="flex items-center gap-2">
                            Output (AI Response)
                            {displayInfo.error && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30 lowercase">
                                error
                              </span>
                            )}
                          </h3>
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", inspectorExpanded.output ? "rotate-0" : "-rotate-90")} />
                        </button>
                        <AnimatePresence initial={false}>
                          {inspectorExpanded.output && (
                            <motion.div
                              key="inspector-expanded-output"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden space-y-3"
                            >
                              {/* Plot Thought Process CoT Cards (if present) */}
                              {info.thoughtProcess && (info.thoughtProcess.readerPayoffDynamics || info.thoughtProcess.incrementalRelationalShiftAnalysis || info.thoughtProcess.relationshipDeltaAnalysis) && (
                                <div className="space-y-2.5">
                                  {info.thoughtProcess.readerPayoffDynamics && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-purple-900/30 space-y-1">
                                      <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Compass className="w-3.5 h-3.5 text-purple-400" />
                                        <span>독자 보상 및 쾌감 훅 (Reader Payoff)</span>
                                      </div>
                                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">{info.thoughtProcess.readerPayoffDynamics}</p>
                                    </div>
                                  )}
                                  {(info.thoughtProcess.incrementalRelationalShiftAnalysis || info.thoughtProcess.relationshipDeltaAnalysis) && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-indigo-900/30 space-y-1">
                                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>미세한 심리 변화 (Incremental Relational Shift)</span>
                                      </div>
                                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">{info.thoughtProcess.incrementalRelationalShiftAnalysis || info.thoughtProcess.relationshipDeltaAnalysis}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Manual Codex Adaptive CoT & State Distillation Cards (if present) */}
                              {Boolean(info.thoughtProcess && (
                                info.thoughtProcess.directiveIntent ||
                                info.thoughtProcess.dechronologization ||
                                info.thoughtProcess.headerTeleology ||
                                info.thoughtProcess.losslessPreservationPlan
                              )) && (
                                <div className="space-y-3">
                                  {/* Header Summary & Intent Classification */}
                                  {info.thoughtProcess?.directiveIntent && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-indigo-900/30 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                          <Compass className="w-3.5 h-3.5 text-indigo-400" />
                                          <span>[Adaptive CoT] 작가 지시문 의도 분석 (Directive Intent)</span>
                                        </div>
                                        <span className={cn(
                                          "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border",
                                          info.thoughtProcess.directiveIntent.intentType === 'RESTRUCTURE'
                                            ? "bg-emerald-950/60 border-emerald-800/40 text-emerald-400"
                                            : info.thoughtProcess.directiveIntent.intentType === 'PURE_CREATIVE'
                                            ? "bg-purple-950/60 border-purple-800/40 text-purple-400"
                                            : info.thoughtProcess.directiveIntent.intentType === 'STORY_UPDATE'
                                            ? "bg-amber-950/60 border-amber-800/40 text-amber-400"
                                            : "bg-sky-950/60 border-sky-800/40 text-sky-400"
                                        )}>
                                          {info.thoughtProcess.directiveIntent.intentType === 'RESTRUCTURE' ? '구조 개편 (Restructure)' :
                                           info.thoughtProcess.directiveIntent.intentType === 'PURE_CREATIVE' ? '순수 창작 (Pure Creative)' :
                                           info.thoughtProcess.directiveIntent.intentType === 'STORY_UPDATE' ? '본문 사건 반영 (Story Update)' :
                                           '복합 지시 (Hybrid)'}
                                        </span>
                                      </div>
                                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                                        {info.thoughtProcess.directiveIntent.userIntentSummary}
                                      </p>
                                    </div>
                                  )}

                                  {/* De-chronologization (State Distillation) if present */}
                                  {info.thoughtProcess?.dechronologization && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-amber-900/30 space-y-2">
                                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                        <span>안티-타임라인 시공간 탈색 상태 증류 (De-chronologization)</span>
                                      </div>
                                      <div className="space-y-2 text-xs">
                                        {info.thoughtProcess.dechronologization.rawObservedEvent && (
                                          <div className="p-2 bg-zinc-900/60 rounded border border-zinc-800/60">
                                            <span className="text-[10px] font-semibold text-zinc-400 block mb-0.5">1. 관측된 본문 사건 (Observed Event)</span>
                                            <p className="text-zinc-300 font-sans">{info.thoughtProcess.dechronologization.rawObservedEvent}</p>
                                          </div>
                                        )}
                                        {info.thoughtProcess.dechronologization.evaporatedContextAndActions && (
                                          <div className="p-2 bg-zinc-900/40 rounded border border-zinc-900">
                                            <span className="text-[10px] font-semibold text-rose-400/80 block mb-0.5">2. 100% 증발·소각된 정황 및 동작 (Evaporated Context & Actions)</span>
                                            <p className="text-zinc-500 line-through font-sans leading-relaxed">{info.thoughtProcess.dechronologization.evaporatedContextAndActions}</p>
                                          </div>
                                        )}
                                        {info.thoughtProcess.dechronologization.distilledPermanentProperty && (
                                          <div className="p-2 bg-amber-950/20 rounded border border-amber-800/30">
                                            <span className="text-[10px] font-semibold text-amber-400 block mb-0.5">3. 추출된 영구 속성/스탠스/규칙 (Distilled Permanent State)</span>
                                            <p className="text-amber-200 font-sans leading-relaxed">{info.thoughtProcess.dechronologization.distilledPermanentProperty}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Header Teleology & Literary Prose */}
                                  {Array.isArray(info.thoughtProcess?.headerTeleology) && info.thoughtProcess.headerTeleology.length > 0 && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2">
                                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5 text-zinc-400" />
                                        <span>헤더 목적론 및 문학적 산문 도출 ({info.thoughtProcess.headerTeleology.length})</span>
                                      </div>
                                      <div className="space-y-2">
                                        {info.thoughtProcess.headerTeleology.map((ht: any, htIdx: number) => (
                                          <div key={htIdx} className="p-2.5 bg-zinc-900/70 rounded-lg border border-zinc-800/60 space-y-1 text-xs">
                                            <div className="flex items-center justify-between">
                                              <span className="font-semibold text-indigo-300 font-mono text-[11px]">{ht.targetHeader}</span>
                                            </div>
                                            {ht.implicitHeaderQuestion && (
                                              <p className="text-[11px] text-zinc-400 italic">
                                                Q: {ht.implicitHeaderQuestion}
                                              </p>
                                            )}
                                            {ht.distilledProseBullet && (
                                              <p className="text-zinc-200 font-sans bg-zinc-950/50 p-1.5 rounded border border-zinc-900 leading-relaxed">
                                                {ht.distilledProseBullet}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Lossless Full-Document Preservation Plan */}
                                  {info.thoughtProcess?.losslessPreservationPlan && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-emerald-900/30 space-y-1">
                                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>무손실 보존 및 외과수술 계획 (Lossless Preservation Plan)</span>
                                      </div>
                                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                                        {info.thoughtProcess.losslessPreservationPlan}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Auto-Codex 5-Step Evaluative CoT Cards (if present) */}
                              {((info.thoughtProcess && (
                                info.thoughtProcess.step0_authorDirectiveSupremacy ||
                                info.thoughtProcess.step1_semanticDiscovery ||
                                info.thoughtProcess.step1_candidateExtraction || 
                                info.thoughtProcess.step2_aliasAndExistingMapping || 
                                info.thoughtProcess.step3_newEntryScreening || 
                                info.thoughtProcess.step4_updateEvaluation || 
                                info.thoughtProcess.step5_globalSynthesis
                              )) || (inspectionContext.type === 'autocodex' && (info.thoughtProcess || info.globalAnalysis))) && (
                                <div className="space-y-3">
                                  {/* Step 0: Author Directive Supremacy */}
                                  {info.thoughtProcess?.step0_authorDirectiveSupremacy && (
                                    <div className="p-3 bg-zinc-950/90 rounded-xl border border-amber-500/40 space-y-2.5 shadow-sm">
                                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                          <span>[Step 0] 작가 특별 지침 절대 반영 (Author Directive Supremacy)</span>
                                        </div>
                                        <span className="text-[9px] text-amber-300/80 font-mono">Top Priority Override</span>
                                      </div>
                                      
                                      {info.thoughtProcess.step0_authorDirectiveSupremacy.detectedUserDirective && (
                                        <div className="text-xs text-zinc-300 bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/20 font-sans space-y-1">
                                          <div className="text-[10px] font-bold text-amber-300 uppercase">인식된 작가 지시:</div>
                                          <p className="leading-relaxed">{info.thoughtProcess.step0_authorDirectiveSupremacy.detectedUserDirective}</p>
                                        </div>
                                      )}

                                      {info.thoughtProcess.step0_authorDirectiveSupremacy.directiveDirectivesInterpretation && (
                                        <div className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                                          <span className="text-zinc-500 font-semibold mr-1.5">지침 해석 & 실행 방침:</span>
                                          {info.thoughtProcess.step0_authorDirectiveSupremacy.directiveDirectivesInterpretation}
                                        </div>
                                      )}

                                      {Array.isArray(info.thoughtProcess.step0_authorDirectiveSupremacy.affectedLoreEntries) && 
                                       info.thoughtProcess.step0_authorDirectiveSupremacy.affectedLoreEntries.length > 0 && (
                                        <div className="space-y-1.5 pt-1">
                                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">영향 받는 타겟 로어 항목 ({info.thoughtProcess.step0_authorDirectiveSupremacy.affectedLoreEntries.length})</span>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {info.thoughtProcess.step0_authorDirectiveSupremacy.affectedLoreEntries.map((aff: any, aIdx: number) => (
                                              <div key={aIdx} className="p-2 bg-zinc-900/80 rounded border border-zinc-800 text-xs space-y-1">
                                                <div className="flex items-center justify-between">
                                                  <span className="font-bold text-zinc-200">{aff.title}</span>
                                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">{aff.action}</span>
                                                </div>
                                                <p className="text-[11px] text-zinc-400 leading-tight">{aff.directiveReason}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {/* Step 5: Global Synthesis / Analysis */}
                                  {(info.thoughtProcess?.step5_globalSynthesis || info.globalAnalysis) && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-amber-900/30 space-y-1">
                                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                        <span>[Step 5] Auto-Codex 서사 총평 및 로어 변화 (Lore Synthesis)</span>
                                      </div>
                                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                                        {info.thoughtProcess?.step5_globalSynthesis || info.globalAnalysis}
                                      </p>
                                    </div>
                                  )}

                                  {/* Step 1-A: Active Lore Fact-Shift Triage */}
                                  {Array.isArray(info.thoughtProcess?.step1_semanticDiscovery?.activeLoreFactShiftTriage) && 
                                   info.thoughtProcess.step1_semanticDiscovery.activeLoreFactShiftTriage.length > 0 && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2">
                                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                                        <span>[Step 1-A] 활성 로어 사실 변동 사전 스캔 ({info.thoughtProcess.step1_semanticDiscovery.activeLoreFactShiftTriage.length})</span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {info.thoughtProcess.step1_semanticDiscovery.activeLoreFactShiftTriage.map((triage: any, tIdx: number) => {
                                          const hasShift = triage.hasFactShift === true;
                                          return (
                                            <div key={tIdx} className="p-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg space-y-1.5 text-xs">
                                              <div className="flex items-center justify-between gap-1">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="font-semibold text-zinc-200">{triage.targetTitle}</span>
                                                  {triage.targetEntryId && (
                                                    <span className="text-[10px] font-mono text-zinc-500">[{triage.targetEntryId}]</span>
                                                  )}
                                                </div>
                                                <span className={cn(
                                                  "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                                  hasShift 
                                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30" 
                                                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                                )}>
                                                  {hasShift ? '변동 감지' : '변동 없음'}
                                                </span>
                                              </div>
                                              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed bg-zinc-950/40 p-1.5 rounded border border-zinc-800/50">
                                                <span className="text-zinc-500 font-mono text-[10px] mr-1">관찰 사실:</span>
                                                {triage.observedFactShift}
                                              </p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Step 1-B & 2: Candidates & Alias Mapping (Unified 3-Track Discovery) */}
                                  {(() => {
                                    const candidates = flattenSemanticCandidates(info.thoughtProcess);
                                    if (candidates.length === 0) return null;

                                    return (
                                      <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2">
                                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                          <span>[Step 1-B & Step 2] 신규 실체 발굴 및 엔트리 매핑 ({candidates.length})</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {candidates.map((cand, cIdx) => {
                                            const mapping = Array.isArray(info.thoughtProcess?.step2_aliasAndExistingMapping)
                                              ? info.thoughtProcess.step2_aliasAndExistingMapping.find((m: any) => 
                                                  m.candidateName === cand.name || 
                                                  cand.name.includes(m.candidateName) ||
                                                  m.candidateName.includes(cand.name)
                                                )
                                              : null;

                                            return (
                                              <div key={cIdx} className="p-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg space-y-1.5 text-xs">
                                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                                  <div className="flex items-center gap-1.5">
                                                    {cand.candidateType === 'CONCEPTUAL' ? (
                                                      <Network className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                                    ) : cand.candidateType === 'IMPLICIT' ? (
                                                      <Boxes className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                                    ) : (
                                                      <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                    )}
                                                    <span className="font-semibold text-zinc-200">{cand.name}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1 flex-wrap">
                                                    <span className={cn(
                                                      "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                                      cand.candidateType === 'CONCEPTUAL' 
                                                        ? "bg-purple-950/70 text-purple-300 border border-purple-800/50" 
                                                        : cand.candidateType === 'IMPLICIT'
                                                        ? "bg-cyan-950/70 text-cyan-300 border border-cyan-800/50"
                                                        : "bg-indigo-950/70 text-indigo-300 border border-indigo-800/50"
                                                    )}>
                                                      {cand.candidateType === 'CONCEPTUAL' ? '개념 클러스터' : cand.candidateType === 'IMPLICIT' ? '암묵적 실체' : '명시적'}
                                                    </span>
                                                    <span className={cn(
                                                      "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                                                      cand.category === 'character' ? "bg-indigo-500/20 text-indigo-300" :
                                                      cand.category === 'location' ? "bg-emerald-500/20 text-emerald-300" :
                                                      cand.category === 'item' ? "bg-amber-500/20 text-amber-300" : "bg-purple-500/20 text-purple-300"
                                                    )}>
                                                      {cand.category}
                                                    </span>
                                                    {mapping && (
                                                      <span className={cn(
                                                        "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                        mapping.targetRoute === 'EXISTING_UPDATE_CANDIDATE' 
                                                          ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50" 
                                                          : "bg-cyan-950/60 text-cyan-300 border border-cyan-800/50"
                                                      )}>
                                                        {mapping.targetRoute === 'EXISTING_UPDATE_CANDIDATE' 
                                                          ? `갱신: ${mapping.mappedExistingTitle || mapping.mappedExistingId || '기존 항목'}` 
                                                          : '신규'}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Candidate Details by Track */}
                                                {cand.abstractDefinition && (
                                                  <p className="text-[11px] text-purple-200/90 font-sans leading-relaxed bg-purple-950/30 p-1.5 rounded border border-purple-900/30">
                                                    <span className="text-purple-400 font-semibold mr-1">개념 정의:</span>
                                                    {cand.abstractDefinition}
                                                  </p>
                                                )}

                                                {Array.isArray(cand.clusterEvidence) && cand.clusterEvidence.length > 0 && (
                                                  <div className="space-y-0.5 text-[11px] font-sans bg-zinc-950/50 p-1.5 rounded border border-zinc-800/60">
                                                    <span className="text-zinc-400 font-bold block text-[10px]">파편 근거 구절:</span>
                                                    {cand.clusterEvidence.map((ev, evIdx) => (
                                                      <p key={evIdx} className="text-zinc-300 leading-tight pl-1.5 border-l border-purple-700/50">
                                                        • {ev}
                                                      </p>
                                                    ))}
                                                  </div>
                                                )}

                                                {cand.description && (
                                                  <p className="text-[11px] text-cyan-200/90 font-sans leading-relaxed bg-cyan-950/30 p-1.5 rounded border border-cyan-900/30">
                                                    <span className="text-cyan-400 font-semibold mr-1">서술 단서:</span>
                                                    {cand.description}
                                                  </p>
                                                )}

                                                {cand.context && (
                                                  <p className="text-[11px] text-zinc-400 font-sans line-clamp-2 leading-relaxed">
                                                    <span className="text-zinc-500 font-mono text-[10px] mr-1">
                                                      {cand.candidateType === 'IMPLICIT' ? '재등장 필연성:' : '맥락:'}
                                                    </span>
                                                    {cand.context}
                                                  </p>
                                                )}

                                                {mapping?.mappingAnalysis && (
                                                  <p className="text-[11px] text-zinc-400 font-sans border-t border-zinc-800/60 pt-1 leading-relaxed">
                                                    <span className="text-zinc-500 font-mono text-[10px] mr-1">매핑 분석:</span>
                                                    {mapping.mappingAnalysis}
                                                  </p>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Step 1-B Track 4: Plot Section 4 Graduation Triage */}
                                  {Array.isArray(info.thoughtProcess?.step1_semanticDiscovery?.plotSection4GraduationTriage) && 
                                   info.thoughtProcess.step1_semanticDiscovery.plotSection4GraduationTriage.length > 0 && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-amber-900/30 space-y-2">
                                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                                          <span>[Step 1-B Track 4] 플롯 4번 코덱스 승격 감사 ({info.thoughtProcess.step1_semanticDiscovery.plotSection4GraduationTriage.length})</span>
                                        </div>
                                        <span className="text-[9px] text-zinc-500 font-mono">3-Gate Graduation Triage</span>
                                      </div>
                                      <div className="space-y-2">
                                        {info.thoughtProcess.step1_semanticDiscovery.plotSection4GraduationTriage.map((item: any, gIdx: number) => {
                                          const isGraduated = item.verdict === 'GRADUATE_TO_CODEX';
                                          const isKeep = item.verdict === 'KEEP_IN_PLOT';
                                          return (
                                            <div key={gIdx} className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-1.5 text-xs">
                                              <div className="flex items-center justify-between gap-1 flex-wrap border-b border-zinc-800 pb-1">
                                                <span className="font-semibold text-zinc-200 line-clamp-1">{item.sourceScratchpadContent}</span>
                                                <span className={cn(
                                                  "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border",
                                                  isGraduated 
                                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                                                    : isKeep
                                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                                )}>
                                                  {isGraduated ? '코덱스 승격' : isKeep ? '플롯 유지' : '폐기/졸업'}
                                                </span>
                                              </div>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-sans">
                                                <div className="bg-zinc-950/40 p-1.5 rounded border border-zinc-800/50">
                                                  <span className="text-zinc-500 font-mono text-[10px] block">본문 실현 & 1회성 작전 감사:</span>
                                                  <span className="text-zinc-300 leading-tight">
                                                    실현 여부: {item.manifestedInStoryProse ? 'O' : 'X'} | {item.transientTacticalTrickAudit}
                                                  </span>
                                                </div>
                                                <div className="bg-zinc-950/40 p-1.5 rounded border border-zinc-800/50">
                                                  <span className="text-zinc-500 font-mono text-[10px] block">세계관 영구성 & 판정 사유:</span>
                                                  <span className="text-zinc-300 leading-tight">
                                                    {item.worldCanonPermanenceEval} ({item.verdictRationale})
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Step 3: New Entry Screening (4 Gateways) */}
                                  {Array.isArray(info.thoughtProcess?.step3_newEntryScreening) && info.thoughtProcess.step3_newEntryScreening.length > 0 && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-cyan-900/30 space-y-2.5">
                                      <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                                        <span>[Step 3] 신규 엔트리 4대 적격성 심사 ({info.thoughtProcess.step3_newEntryScreening.length})</span>
                                      </div>
                                      <div className="space-y-2">
                                        {info.thoughtProcess.step3_newEntryScreening.map((item: any, sIdx: number) => {
                                          const isAccepted = item.verdict === 'ACCEPT';
                                          return (
                                            <div key={sIdx} className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-lg space-y-2 text-xs">
                                              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-zinc-800 pb-1.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="font-bold text-sm text-zinc-100">{item.candidateName}</span>
                                                  {item.candidateType && (
                                                    <span className={cn(
                                                      "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                                      item.candidateType === 'CONCEPTUAL' 
                                                        ? "bg-purple-950/70 text-purple-300 border border-purple-800/50" 
                                                        : item.candidateType === 'IMPLICIT'
                                                        ? "bg-cyan-950/70 text-cyan-300 border border-cyan-800/50"
                                                        : "bg-indigo-950/70 text-indigo-300 border border-indigo-800/50"
                                                    )}>
                                                      {item.candidateType === 'CONCEPTUAL' ? '개념 클러스터' : item.candidateType === 'IMPLICIT' ? '암묵적 실체' : '명시적'}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border",
                                                    isAccepted 
                                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                                                      : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                                  )}>
                                                    {isAccepted ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-rose-400" />}
                                                    {item.verdict}
                                                  </span>
                                                </div>
                                              </div>
                                              {item.verdictRationale && (
                                                <div className="text-[11px] text-zinc-300 bg-zinc-950/60 p-2 rounded border border-zinc-800/80 font-sans">
                                                  <span className="text-zinc-400 font-bold mr-1">판정 사유:</span>
                                                  {item.verdictRationale}
                                                </div>
                                              )}
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-sans">
                                                {item.narrativePermanenceEval && (
                                                  <div className="p-2 bg-zinc-950/40 rounded border border-zinc-800/50 space-y-0.5">
                                                    <span className="text-zinc-400 font-semibold block text-[10px]">1. 서사적 지속성</span>
                                                    <p className="text-zinc-300 leading-relaxed">{item.narrativePermanenceEval}</p>
                                                  </div>
                                                )}
                                                {item.functionalIdentityEval && (
                                                  <div className="p-2 bg-zinc-950/40 rounded border border-zinc-800/50 space-y-0.5">
                                                    <span className="text-zinc-400 font-semibold block text-[10px]">2. 고유 기능성/독립 식별성</span>
                                                    <p className="text-zinc-300 leading-relaxed">{item.functionalIdentityEval}</p>
                                                  </div>
                                                )}
                                                {item.narrativeStakesEval && (
                                                  <div className="p-2 bg-zinc-950/40 rounded border border-zinc-800/50 space-y-0.5">
                                                    <span className="text-zinc-400 font-semibold block text-[10px]">3. 서사적 이해관계 및 무게감</span>
                                                    <p className="text-zinc-300 leading-relaxed">{item.narrativeStakesEval}</p>
                                                  </div>
                                                )}
                                                {item.nonRedundancyEval && (
                                                  <div className="p-2 bg-zinc-950/40 rounded border border-zinc-800/50 space-y-0.5">
                                                    <span className="text-zinc-400 font-semibold block text-[10px]">4. 비중복성</span>
                                                    <p className="text-zinc-300 leading-relaxed">{item.nonRedundancyEval}</p>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Step 4: Existing Update Evaluation (4 Gateways) */}
                                  {Array.isArray(info.thoughtProcess?.step4_updateEvaluation) && info.thoughtProcess.step4_updateEvaluation.length > 0 && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-emerald-900/30 space-y-2.5">
                                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>[Step 4] 기존 항목 갱신 3대 감사 및 시공간 탈색 상태 증류 ({info.thoughtProcess.step4_updateEvaluation.length})</span>
                                      </div>
                                      <div className="space-y-2">
                                        {info.thoughtProcess.step4_updateEvaluation.map((item: any, uIdx: number) => {
                                          const isUpdate = item.verdict === 'UPDATE';
                                          return (
                                            <div key={uIdx} className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-lg space-y-2 text-xs">
                                              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-zinc-800 pb-1.5">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-bold text-sm text-zinc-100">{item.targetTitle}</span>
                                                  {item.targetEntryId && (
                                                    <span className="text-[10px] font-mono text-zinc-500">[ID: {item.targetEntryId}]</span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  {item.isLocked && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                      LOCKED (잠금)
                                                    </span>
                                                  )}
                                                  <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border",
                                                    isUpdate 
                                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                                                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                                  )}>
                                                    {isUpdate ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-zinc-400" />}
                                                    {item.verdict}
                                                  </span>
                                                </div>
                                              </div>
                                              {item.verdictRationale && (
                                                <div className="text-[11px] text-zinc-300 bg-zinc-950/60 p-2 rounded border border-zinc-800/80 font-sans">
                                                  <span className="text-zinc-400 font-bold mr-1">판정 사유:</span>
                                                  {item.verdictRationale}
                                                </div>
                                              )}
                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px] font-sans">
                                                {item.inertiaAndAntiOverinterpretationAudit && (
                                                  <div className="p-2 bg-zinc-950/40 rounded border border-zinc-800/50 space-y-0.5">
                                                    <span className="text-amber-400 font-semibold block text-[10px]">1. 심리/설정 관성 감사</span>
                                                    <p className="text-zinc-300 leading-relaxed">{item.inertiaAndAntiOverinterpretationAudit}</p>
                                                  </div>
                                                )}
                                                {item.revealedFactsPermanenceEval && (
                                                  <div className="p-2 bg-zinc-950/40 rounded border border-zinc-800/50 space-y-0.5">
                                                    <span className="text-zinc-400 font-semibold block text-[10px]">2. 사실의 영구성 평가</span>
                                                    <p className="text-zinc-300 leading-relaxed">{item.revealedFactsPermanenceEval}</p>
                                                  </div>
                                                )}
                                                {item.mereMentionAudit && (
                                                  <div className="p-2 bg-zinc-950/40 rounded border border-zinc-800/50 space-y-0.5">
                                                    <span className="text-zinc-400 font-semibold block text-[10px]">3. 단순 언급 기각 감사</span>
                                                    <p className="text-zinc-300 leading-relaxed">{item.mereMentionAudit}</p>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Condition-Gated State Distillation Box */}
                                              {item.stateDistillation && (
                                                <div className="p-2.5 bg-indigo-950/30 border border-indigo-900/40 rounded-lg space-y-2 text-[11px] font-sans">
                                                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[10px] uppercase tracking-wider border-b border-indigo-900/30 pb-1">
                                                    <Layers className="w-3.5 h-3.5" />
                                                    <span>시공간 탈색 상태 증류 (De-chronologization Pipeline)</span>
                                                  </div>
                                                  {item.stateDistillation.rawObservedEvent && (
                                                    <div className="text-zinc-300">
                                                      <span className="text-zinc-500 font-semibold mr-1.5">[관측 사건]:</span>
                                                      {item.stateDistillation.rawObservedEvent}
                                                    </div>
                                                  )}
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {item.stateDistillation.dechronologization?.evaporatedContextAndActions && (
                                                      <div className="p-2 bg-rose-950/20 border border-rose-900/30 rounded">
                                                        <span className="text-rose-400 font-semibold block text-[10px] mb-0.5">100% 증발된 씬 정황 및 동작 경과</span>
                                                        <p className="text-rose-200/80 line-through leading-relaxed">{item.stateDistillation.dechronologization.evaporatedContextAndActions}</p>
                                                      </div>
                                                    )}
                                                    {item.stateDistillation.dechronologization?.distilledPermanentProperty && (
                                                      <div className="p-2 bg-emerald-950/20 border border-emerald-900/30 rounded">
                                                        <span className="text-emerald-400 font-semibold block text-[10px] mb-0.5">추출된 영구적 속성/스탠스/규칙</span>
                                                        <p className="text-emerald-200 leading-relaxed">{item.stateDistillation.dechronologization.distilledPermanentProperty}</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                  {item.stateDistillation.headerTeleologyMapping && (
                                                    <div className="p-2 bg-zinc-950/60 rounded border border-indigo-900/30 space-y-1">
                                                      <div className="flex items-center justify-between gap-2 flex-wrap text-[10px]">
                                                        <span className="text-indigo-300 font-bold">
                                                          타겟 헤더: {item.stateDistillation.headerTeleologyMapping.targetHeader}
                                                        </span>
                                                        {item.stateDistillation.headerTeleologyMapping.implicitHeaderQuestion && (
                                                          <span className="text-zinc-400 italic">
                                                            "{item.stateDistillation.headerTeleologyMapping.implicitHeaderQuestion}"
                                                          </span>
                                                        )}
                                                      </div>
                                                      {item.stateDistillation.headerTeleologyMapping.distilledProseBullet && (
                                                        <div className="text-zinc-100 bg-zinc-900/80 p-1.5 rounded border border-zinc-800 font-mono text-[11px]">
                                                          {item.stateDistillation.headerTeleologyMapping.distilledProseBullet}
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              {item.surgicalMergePlan && (
                                                <div className="p-2 bg-zinc-950/40 rounded border border-zinc-800/50 space-y-0.5 text-[11px] font-sans">
                                                  <span className="text-zinc-400 font-semibold block text-[10px]">외과수술 병합 계획</span>
                                                  <p className="text-zinc-300 leading-relaxed">{item.surgicalMergePlan}</p>
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

                              {/* Story Memory 5-Step Evaluative CoT Cards (if present) */}
                              {Boolean(info.thoughtProcess && (
                                info.thoughtProcess.step1_deltaAnalysis ||
                                info.thoughtProcess.step2_causalityAndCulling ||
                                info.thoughtProcess.step3_compressionStrategy ||
                                info.thoughtProcess.step4_characterEpistemicDelta ||
                                info.thoughtProcess.step5_synthesisRationale
                              )) && (
                                <div className="space-y-3">
                                  {/* Step 5: Synthesis Rationale */}
                                  {info.thoughtProcess?.step5_synthesisRationale && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-emerald-900/40 space-y-1">
                                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>[Step 5] 3대 계층 메모리 최종 합성 전략 (Synthesis Rationale)</span>
                                      </div>
                                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                                        {info.thoughtProcess.step5_synthesisRationale}
                                      </p>
                                    </div>
                                  )}

                                  {/* Step 1: Delta Analysis */}
                                  {info.thoughtProcess?.step1_deltaAnalysis && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2">
                                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>[Step 1] 본문 델타 분석 및 코덱스 정적 속성 분리</span>
                                      </div>
                                      {Array.isArray(info.thoughtProcess.step1_deltaAnalysis.newPlotEvents) && info.thoughtProcess.step1_deltaAnalysis.newPlotEvents.length > 0 && (
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-400 block">신규 발생 사건 목록 ({info.thoughtProcess.step1_deltaAnalysis.newPlotEvents.length}):</span>
                                          <ul className="text-xs text-zinc-300 space-y-0.5 list-disc list-inside font-sans pl-1">
                                            {info.thoughtProcess.step1_deltaAnalysis.newPlotEvents.map((evt: string, eIdx: number) => (
                                              <li key={eIdx} className="leading-relaxed">{evt}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {info.thoughtProcess.step1_deltaAnalysis.codexEntityFiltering && (
                                        <div className="text-[11px] text-zinc-300 bg-zinc-900/80 p-2 rounded border border-zinc-800/80 font-sans">
                                          <span className="text-purple-400 font-bold mr-1">코덱스 정적 설정 배제 감사:</span>
                                          {info.thoughtProcess.step1_deltaAnalysis.codexEntityFiltering}
                                        </div>
                                      )}
                                      {info.thoughtProcess.step1_deltaAnalysis.userDirectiveIntent && (
                                        <div className="text-[11px] text-zinc-300 bg-zinc-900/80 p-2 rounded border border-zinc-800/80 font-sans">
                                          <span className="text-indigo-400 font-bold mr-1">유저 지시문 반영 초점:</span>
                                          {info.thoughtProcess.step1_deltaAnalysis.userDirectiveIntent}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Step 2: Causality & Culling (Preservation Lock & Archival) */}
                                  {info.thoughtProcess?.step2_causalityAndCulling && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-amber-900/30 space-y-2.5">
                                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                                        <span>[Step 2] 인과성 선별 & 불가침 보존 락 vs 연표 이관</span>
                                      </div>
                                      
                                      {/* Root Causes */}
                                      {Array.isArray(info.thoughtProcess.step2_causalityAndCulling.rootCauses) && info.thoughtProcess.step2_causalityAndCulling.rootCauses.length > 0 && (
                                        <div className="p-2.5 bg-zinc-900/80 border border-amber-800/40 rounded-lg space-y-1">
                                          <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                                            <Lock className="w-3 h-3 text-amber-400" />
                                            대서사 핵심 기점 (불가침 보존 락)
                                          </span>
                                          <ul className="text-xs text-zinc-300 space-y-0.5 list-disc list-inside font-sans pl-1">
                                            {info.thoughtProcess.step2_causalityAndCulling.rootCauses.map((rc: string, rIdx: number) => (
                                              <li key={rIdx} className="leading-relaxed">{rc}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {/* Active Threads & Chekhov's Guns */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Array.isArray(info.thoughtProcess.step2_causalityAndCulling.activeThreads) && info.thoughtProcess.step2_causalityAndCulling.activeThreads.length > 0 && (
                                          <div className="p-2.5 bg-zinc-900/80 border border-indigo-800/40 rounded-lg space-y-1">
                                            <span className="text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                                              <Activity className="w-3 h-3 text-indigo-400" />
                                              활성 미해결 스토리 스레드 ({info.thoughtProcess.step2_causalityAndCulling.activeThreads.length})
                                            </span>
                                            <div className="space-y-1">
                                              {info.thoughtProcess.step2_causalityAndCulling.activeThreads.map((th: any, tIdx: number) => (
                                                <div key={tIdx} className="text-xs text-zinc-300 border-l-2 border-indigo-500/60 pl-1.5 py-0.5 font-sans">
                                                  <span className="font-semibold text-zinc-200">{typeof th === 'string' ? th : th.description}</span>
                                                  {th.status && <span className="ml-1 text-[9px] font-mono px-1 py-0.2 bg-indigo-950 text-indigo-300 rounded border border-indigo-800/40">{th.status}</span>}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {Array.isArray(info.thoughtProcess.step2_causalityAndCulling.chekhovGuns) && info.thoughtProcess.step2_causalityAndCulling.chekhovGuns.length > 0 && (
                                          <div className="p-2.5 bg-zinc-900/80 border border-purple-800/40 rounded-lg space-y-1">
                                            <span className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
                                              <Compass className="w-3 h-3 text-purple-400" />
                                              체호프의 총 및 잠복 복선 ({info.thoughtProcess.step2_causalityAndCulling.chekhovGuns.length})
                                            </span>
                                            <ul className="text-xs text-zinc-300 space-y-0.5 list-disc list-inside font-sans pl-1">
                                              {info.thoughtProcess.step2_causalityAndCulling.chekhovGuns.map((gun: string, gIdx: number) => (
                                                <li key={gIdx} className="leading-relaxed">{gun}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>

                                      {/* Resolved Events To Archive */}
                                      {Array.isArray(info.thoughtProcess.step2_causalityAndCulling.resolvedEventsToArchive) && info.thoughtProcess.step2_causalityAndCulling.resolvedEventsToArchive.length > 0 && (
                                        <div className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-1">
                                          <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                            <Archive className="w-3 h-3 text-zinc-400" />
                                            완결 및 연표 이관 사건 ({info.thoughtProcess.step2_causalityAndCulling.resolvedEventsToArchive.length})
                                          </span>
                                          <div className="space-y-1">
                                            {info.thoughtProcess.step2_causalityAndCulling.resolvedEventsToArchive.map((rev: any, rIdx: number) => (
                                              <div key={rIdx} className="text-xs text-zinc-300 bg-zinc-950/60 p-1.5 rounded font-sans flex items-center justify-between gap-2">
                                                <span>• {typeof rev === 'string' ? rev : rev.summary}</span>
                                                {rev.archiveFormat && (
                                                  <span className="text-[9px] font-mono text-zinc-500 shrink-0">[{rev.archiveFormat}]</span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Step 3: Compression Strategy */}
                                  {info.thoughtProcess?.step3_compressionStrategy && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-cyan-900/30 space-y-2">
                                      <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Scale className="w-3.5 h-3.5 text-cyan-400" />
                                        <span>[Step 3] 연표 압축 & 인물 스냅샷 최적화 전략</span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-sans">
                                        {info.thoughtProcess.step3_compressionStrategy.preservationAudit && (
                                          <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800 space-y-0.5">
                                            <span className="text-amber-400 font-bold block text-[10px]">보존 락 감사 (헤더 1):</span>
                                            <p className="text-zinc-300 leading-relaxed">{info.thoughtProcess.step3_compressionStrategy.preservationAudit}</p>
                                          </div>
                                        )}
                                        {info.thoughtProcess.step3_compressionStrategy.ledgerPruningPlan && (
                                          <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800 space-y-0.5">
                                            <span className="text-cyan-400 font-bold block text-[10px]">연표 1줄 압축 계획 (헤더 2):</span>
                                            <p className="text-zinc-300 leading-relaxed">{info.thoughtProcess.step3_compressionStrategy.ledgerPruningPlan}</p>
                                          </div>
                                        )}
                                        {info.thoughtProcess.step3_compressionStrategy.characterSnapshotPlan && (
                                          <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800 space-y-0.5">
                                            <span className="text-purple-400 font-bold block text-[10px]">인물 상황 최신화 (헤더 3):</span>
                                            <p className="text-zinc-300 leading-relaxed">{info.thoughtProcess.step3_compressionStrategy.characterSnapshotPlan}</p>
                                          </div>
                                        )}
                                        {info.thoughtProcess.step3_compressionStrategy.characterBudgetEvaluation && (
                                          <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800 space-y-0.5">
                                            <span className="text-emerald-400 font-bold block text-[10px]">분량 예산 진단 (4,000자 이내):</span>
                                            <p className="text-zinc-300 leading-relaxed">{info.thoughtProcess.step3_compressionStrategy.characterBudgetEvaluation}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Step 4: Narrative Foothold & Actor States (New 1-line 3-element specification) */}
                                  {info.thoughtProcess?.step4_narrativeFootholdAndActorStates && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-purple-900/30 space-y-2.5">
                                      <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <MapPin className="w-3.5 h-3.5 text-purple-400" />
                                          <span>[Step 4] 현재 서사 도달점 및 인물 상황 ({info.thoughtProcess.step4_narrativeFootholdAndActorStates.actorStates?.length || 0})</span>
                                        </div>
                                        <span className="text-[10px] text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                                          1줄 3요소 착지점
                                        </span>
                                      </div>

                                      {/* Overall Narrative Foothold Banner */}
                                      {info.thoughtProcess.step4_narrativeFootholdAndActorStates.currentFoothold && (
                                        <div className="p-2 bg-purple-950/20 border border-purple-800/40 rounded-lg text-xs font-sans space-y-0.5">
                                          <span className="text-purple-300 font-bold block text-[10px]">현장 시공간 도달점 (Landing Ground):</span>
                                          <p className="text-zinc-200 leading-relaxed">{info.thoughtProcess.step4_narrativeFootholdAndActorStates.currentFoothold}</p>
                                        </div>
                                      )}

                                      {/* Actor States Grid */}
                                      {Array.isArray(info.thoughtProcess.step4_narrativeFootholdAndActorStates.actorStates) && info.thoughtProcess.step4_narrativeFootholdAndActorStates.actorStates.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {info.thoughtProcess.step4_narrativeFootholdAndActorStates.actorStates.map((actor: any, aIdx: number) => (
                                            <div key={aIdx} className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-1.5 text-xs font-sans">
                                              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1">
                                                <span className="font-bold text-zinc-100">{actor.character}</span>
                                                {actor.locationAndPresence && (
                                                  <span className="text-[10px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40 truncate max-w-[140px]">
                                                    {actor.locationAndPresence}
                                                  </span>
                                                )}
                                              </div>
                                              {actor.immediateResult && (
                                                <p className="text-[11px] text-zinc-300 leading-relaxed">
                                                  <span className="text-amber-400 font-semibold mr-1">직전 결과:</span>
                                                  {actor.immediateResult}
                                                </p>
                                              )}
                                              {actor.currentActionOrStance && (
                                                <p className="text-[11px] text-zinc-300 bg-zinc-950/60 p-1.5 rounded border border-zinc-800/60 leading-relaxed">
                                                  <span className="text-emerald-400 font-semibold mr-1">당면 착지 상태:</span>
                                                  {actor.currentActionOrStance}
                                                </p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Step 4: Character & Epistemic Delta (Legacy Fallback) */}
                                  {!info.thoughtProcess?.step4_narrativeFootholdAndActorStates && Array.isArray(info.thoughtProcess?.step4_characterEpistemicDelta?.characterDynamics) && info.thoughtProcess.step4_characterEpistemicDelta.characterDynamics.length > 0 && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-purple-900/30 space-y-2">
                                      <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-purple-400" />
                                        <span>[Step 4] 인물별 심리·관계 동향 및 인식론적 상태 ({info.thoughtProcess.step4_characterEpistemicDelta.characterDynamics.length})</span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {info.thoughtProcess.step4_characterEpistemicDelta.characterDynamics.map((charItem: any, cdIdx: number) => (
                                          <div key={cdIdx} className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-1.5 text-xs font-sans">
                                            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1">
                                              <span className="font-bold text-zinc-100">{charItem.character}</span>
                                              <span className="text-[10px] text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                                                최신 스냅샷
                                              </span>
                                            </div>
                                            {charItem.currentStance && (
                                              <p className="text-[11px] text-zinc-300 leading-relaxed">
                                                <span className="text-zinc-400 font-semibold mr-1">현재 심리/태도:</span>
                                                {charItem.currentStance}
                                              </p>
                                            )}
                                            {charItem.relationshipDelta && (
                                              <p className="text-[11px] text-zinc-300 leading-relaxed">
                                                <span className="text-indigo-400 font-semibold mr-1">관계 변화:</span>
                                                {charItem.relationshipDelta}
                                              </p>
                                            )}
                                            {charItem.epistemicState && (
                                              <p className="text-[11px] text-zinc-300 bg-zinc-950/60 p-1.5 rounded border border-zinc-800/60 leading-relaxed">
                                                <span className="text-amber-400 font-semibold mr-1">인식론적 갭 (앎 vs 모름):</span>
                                                {charItem.epistemicState}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Consistency Refiner Specialized Vector Cards & Audits */}
                              {(info.multiAgentAudits || info.globalContextAudit || (info.slices && info.slices.length > 0) || info.physicalLogicAnalysis || info.loreSystemAnalysis || info.loreAudits || info.characterDynamicsAnalysis || info.characterAudits || info.plotAndDirectiveAnalysis || info.linguisticAnalysis || info.informationOrderAudit || (info.changeLog && info.changeLog.length > 0) || info.narrativeAnalysis || (displayInfo as any).isSubAgent) && (
                                <div className="space-y-3">
                                  {/* Individual Sub-Agent Full Raw Report View */}
                                  {(displayInfo as any).isSubAgent && (
                                    <div className="p-3.5 bg-zinc-950/90 rounded-xl border border-zinc-800 space-y-2.5 shadow-sm">
                                      <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between border-b border-zinc-800 pb-2">
                                        <div className="flex items-center gap-1.5">
                                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                          <span>{(displayInfo as any).subAgentName} 감사 결과 원문 (Raw Audit Output)</span>
                                        </div>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                                          Auditor Model
                                        </span>
                                      </div>
                                      <pre className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {displayInfo.output || "(감사 보고서 텍스트 없음)"}
                                      </pre>
                                    </div>
                                  )}

                                  {/* Multi-Agent Parallel Refiner (MARS) 4 Auditor Reports Overview (When Master Novelist tab is selected) */}
                                  {!(displayInfo as any).isSubAgent && info.multiAgentAudits && (
                                    <div className="p-3.5 bg-zinc-950/90 rounded-xl border border-amber-900/40 space-y-3 shadow-sm">
                                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between border-b border-amber-950 pb-2">
                                        <div className="flex items-center gap-1.5">
                                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                          <span>MARS 4대 전문 감사 에이전트 심층 보고서 (Parallel Audit Reports)</span>
                                        </div>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                                          Dual-Tier Auditor
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* 1. Plot & Directives Auditor */}
                                        {info.multiAgentAudits.plotAudit && (
                                          <div className="p-3 bg-zinc-900/80 rounded-xl border border-blue-900/40 space-y-2">
                                            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
                                              <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                                                <Compass className="w-3 h-3 text-blue-400" />
                                                Agent 1: 플롯 & 작가 지시사항
                                              </span>
                                            </div>
                                            <div className="text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                                              {info.multiAgentAudits.plotAudit}
                                            </div>
                                          </div>
                                        )}

                                        {/* 2. Physical & Spatial Auditor */}
                                        {info.multiAgentAudits.physicalAudit && (
                                          <div className="p-3 bg-zinc-900/80 rounded-xl border border-emerald-900/40 space-y-2">
                                            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
                                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                                                <Layers className="w-3 h-3 text-emerald-400" />
                                                Agent 2: 물리 & 시공간 연속성
                                              </span>
                                            </div>
                                            <div className="text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                                              {info.multiAgentAudits.physicalAudit}
                                            </div>
                                          </div>
                                        )}

                                        {/* 3. Lore & Epistemic Boundary Auditor */}
                                        {info.multiAgentAudits.loreAudit && (
                                          <div className="p-3 bg-zinc-900/80 rounded-xl border border-purple-900/40 space-y-2">
                                            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
                                              <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                                                <Sparkles className="w-3 h-3 text-purple-400" />
                                                Agent 3: 세계관 로어 & 지식 경계
                                              </span>
                                            </div>
                                            <div className="text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                                              {info.multiAgentAudits.loreAudit}
                                            </div>
                                          </div>
                                        )}

                                        {/* 4. Korean Stylistic Aesthetics Auditor */}
                                        {info.multiAgentAudits.stylisticAudit && (
                                          <div className="p-3 bg-zinc-900/80 rounded-xl border border-rose-900/40 space-y-2">
                                            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
                                              <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5">
                                                <BookOpen className="w-3 h-3 text-rose-400" />
                                                Agent 4: 한국어 원어민 문체 & 미적 감각
                                              </span>
                                            </div>
                                            <div className="text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                                              {info.multiAgentAudits.stylisticAudit}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {info.multiAgentAudits.failedAudits && info.multiAgentAudits.failedAudits.length > 0 && (
                                        <div className="p-2 bg-rose-950/30 border border-rose-900/40 rounded text-[11px] text-rose-300">
                                          <span className="font-bold">일시적 응답 지연 에이전트:</span> {info.multiAgentAudits.failedAudits.join(', ')}
                                        </div>
                                      )}

                                      {/* Stage 3 Master Novelist Final Prose Output */}
                                      <div className="p-3.5 bg-zinc-950/90 rounded-xl border border-indigo-900/40 space-y-2.5 shadow-sm mt-3">
                                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center justify-between border-b border-indigo-950 pb-2">
                                          <div className="flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                            <span>Stage 3 최종 탈고 소설 본문 (Master Novelist Raw Output)</span>
                                          </div>
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
                                            Primary Model
                                          </span>
                                        </div>
                                        {info.error && (
                                          <div className="p-2.5 bg-rose-950/30 border border-rose-900/50 rounded-lg text-xs text-rose-300 font-mono">
                                            [ERROR] {info.error}
                                          </div>
                                        )}
                                        <RefinerDiffViewer
                                          rawDraft={info.rawDraft || lastNovelPromptInfo?.output || ''}
                                          refinedText={info.output || info.refinedText || ''}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* Legacy Consistency Refiner Fields (Shown only for legacy data without MARS audits) */}
                                  {!info.multiAgentAudits && (
                                    <>
                                  {/* Analysis Language Anchor */}
                                  {info.analysisLanguage && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 rounded-lg border border-zinc-800 text-xs text-zinc-400">
                                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Analysis Language</span>
                                      <span className="text-zinc-300 font-sans">{info.analysisLanguage}</span>
                                    </div>
                                  )}

                                  {/* Global Context & Active Directives Audit */}
                                  {info.globalContextAudit && (
                                    <div className="p-3.5 bg-zinc-950/90 rounded-xl border border-indigo-900/40 space-y-3 shadow-sm">
                                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center justify-between border-b border-indigo-950 pb-2">
                                        <div className="flex items-center gap-1.5">
                                          <Compass className="w-3.5 h-3.5 text-indigo-400" />
                                          <span>글로벌 컨텍스트 & 활성 로어 (Global Context Audit)</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-500 font-mono">사전 정합성 맵</span>
                                      </div>

                                      {info.globalContextAudit.activeDirectivesSummary && (
                                        <div className="p-2.5 bg-zinc-900/70 rounded-lg border border-zinc-800/80 space-y-1 text-xs font-sans">
                                          <span className="text-[10px] font-bold text-indigo-300 block">활성 인라인 지시 및 플롯 목표</span>
                                          <p className="text-zinc-300 leading-relaxed">{info.globalContextAudit.activeDirectivesSummary}</p>
                                        </div>
                                      )}

                                      {/* Active Codex Scope (Exhaustive Indexing) */}
                                      {Array.isArray(info.globalContextAudit.activeCodexScope) && info.globalContextAudit.activeCodexScope.length > 0 ? (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-amber-400/90 block uppercase tracking-wider">
                                              감사 대상 활성 로어 전체 목록 ({info.globalContextAudit.activeCodexScope.length})
                                            </span>
                                            <span className="text-[9px] text-zinc-500 font-mono">사전 편향 배제 · 전수 슬라이스 대조용</span>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5 p-2.5 bg-zinc-900/80 rounded-lg border border-zinc-800/70">
                                            {info.globalContextAudit.activeCodexScope.map((name: string, nIdx: number) => (
                                              <span key={nIdx} className="px-2 py-1 rounded bg-amber-950/40 border border-amber-900/40 text-amber-300 text-xs font-medium flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                {name}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ) : Array.isArray(info.globalContextAudit.relevantCodexCandidates) && info.globalContextAudit.relevantCodexCandidates.length > 0 ? (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-amber-400/90 block uppercase tracking-wider">
                                              검수 대상 후보 로어 ({info.globalContextAudit.relevantCodexCandidates.length})
                                            </span>
                                            <span className="text-[9px] text-zinc-500 font-mono">사전 판단 배제 · 슬라이스 전수 대조용</span>
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {info.globalContextAudit.relevantCodexCandidates.map((rc: any, rcIdx: number) => (
                                              <div key={rcIdx} className="p-2.5 bg-zinc-900/80 rounded-lg border border-zinc-800/70 space-y-2 text-xs font-sans">
                                                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
                                                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                    {rc.loreName}
                                                  </span>
                                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-400 border border-amber-800/40">
                                                    후보 로어
                                                  </span>
                                                </div>
                                                <div className="text-[11px] text-zinc-300 leading-relaxed bg-zinc-950/60 p-2 rounded border border-zinc-900">
                                                  <span className="text-zinc-500 font-semibold block text-[10px] mb-0.5">선별 근거 (Selection Rationale):</span>
                                                  {rc.selectionRationale}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : Array.isArray(info.globalContextAudit.relevantCodexConstraints) && info.globalContextAudit.relevantCodexConstraints.length > 0 ? (
                                        <div className="space-y-2">
                                          <span className="text-[10px] font-bold text-amber-400/90 block uppercase tracking-wider">
                                            초안 연계 코덱스 제약 바인딩 ({info.globalContextAudit.relevantCodexConstraints.length})
                                          </span>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {info.globalContextAudit.relevantCodexConstraints.map((rc: any, rcIdx: number) => (
                                              <div key={rcIdx} className="p-2.5 bg-zinc-900/80 rounded-lg border border-zinc-800/70 space-y-1.5 text-xs font-sans">
                                                <div className="flex items-center justify-between">
                                                  <span className="font-bold text-amber-300">{rc.loreName}</span>
                                                </div>
                                                <p className="text-zinc-300 text-[11px]">{rc.keyRule}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : null}

                                      {info.globalContextAudit.globalFulfillmentAssessment && (
                                        <div className="p-2 bg-indigo-950/20 border border-indigo-900/30 rounded-lg text-xs font-sans space-y-0.5">
                                          <span className="text-indigo-300 font-bold block text-[10px]">전역 서사 목표 이행도 진단:</span>
                                          <p className="text-zinc-200 leading-relaxed">{info.globalContextAudit.globalFulfillmentAssessment}</p>
                                        </div>
                                      )}

                                      {/* Unified Global Narrative & Directive Audit */}
                                      {info.globalContextAudit.globalPlotAndDirectiveAudit && (
                                        <div className="p-2.5 bg-blue-950/20 border border-blue-900/40 rounded-lg text-xs font-sans space-y-2">
                                          <div className="flex items-center justify-between flex-wrap gap-2">
                                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                              <Compass className="w-3.5 h-3.5 text-blue-400" />
                                              전역 플롯 및 작가 지시사항 정밀 감사 (Global Plot & Directive Audit)
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800/60 space-y-1">
                                              <span className="text-[10px] font-bold text-blue-300 block">지시사항 이행 분석</span>
                                              <p className="text-zinc-200 text-[11px] leading-relaxed">
                                                {info.globalContextAudit.globalPlotAndDirectiveAudit.directiveFulfillmentStatus || '특이 지시 없음 또는 온전히 반영됨'}
                                              </p>
                                            </div>
                                            <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800/60 space-y-1">
                                              <span className="text-[10px] font-bold text-indigo-300 block">서사 호흡 및 템포</span>
                                              <p className="text-zinc-200 text-[11px] leading-relaxed">
                                                {info.globalContextAudit.globalPlotAndDirectiveAudit.narrativeArcAndPacing}
                                              </p>
                                            </div>
                                            <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800/60 space-y-1">
                                              <span className="text-[10px] font-bold text-cyan-300 block">인과 논리 및 전개</span>
                                              <p className="text-zinc-200 text-[11px] leading-relaxed">
                                                {info.globalContextAudit.globalPlotAndDirectiveAudit.causalLogicAndProgression}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {Array.isArray(info.globalContextAudit.plotDefectsIdentified) && info.globalContextAudit.plotDefectsIdentified.length > 0 && (
                                        <div className="p-2.5 bg-rose-950/30 border border-rose-900/50 rounded-lg space-y-2">
                                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                                            전역 식별 플롯/지시 결함 ({info.globalContextAudit.plotDefectsIdentified.length})
                                          </span>
                                          <div className="space-y-1.5">
                                            {info.globalContextAudit.plotDefectsIdentified.map((d: any, dIdx: number) => (
                                              <div key={dIdx} className="p-2 bg-zinc-950/80 rounded border border-rose-900/40 text-xs font-sans space-y-1">
                                                <div className="flex items-center justify-between">
                                                  <span className="font-mono text-[10px] text-rose-300 font-bold">
                                                    [{d.ruleId}] {d.category}
                                                  </span>
                                                </div>
                                                {d.citedProse && (
                                                  <div className="text-[11px] text-rose-200/90 font-mono bg-rose-950/40 p-1 rounded border border-rose-900/30">
                                                    "{d.citedProse}"
                                                  </div>
                                                )}
                                                <p className="text-zinc-300 text-[11px]">{d.issueDescription}</p>
                                                {d.correctionDirective && (
                                                  <p className="text-emerald-400 text-[11px] font-mono">&rarr; {d.correctionDirective}</p>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Refiner V2 Global Defects & Rules */}
                                      {Array.isArray(info.globalContextAudit.globalDefects) && info.globalContextAudit.globalDefects.length > 0 && (
                                        <div className="p-2.5 bg-rose-950/25 border border-rose-900/50 rounded-lg space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                              선언된 전역 결함 및 Global Rule ({info.globalContextAudit.globalDefects.length}건)
                                            </span>
                                            <span className="text-[9px] text-zinc-500 font-mono">슬라이스 하달용 지침</span>
                                          </div>
                                          <div className="space-y-2">
                                            {info.globalContextAudit.globalDefects.map((gd: any, gdIdx: number) => (
                                              <div key={gdIdx} className="p-2.5 bg-zinc-950/80 rounded border border-rose-900/40 space-y-1.5 text-xs font-sans">
                                                <div className="flex items-center justify-between">
                                                  <span className="font-mono text-[10px] text-rose-300 font-bold px-1.5 py-0.5 bg-rose-950 rounded border border-rose-800/40">
                                                    [{gd.ruleId}] {gd.category}
                                                  </span>
                                                </div>
                                                <p className="text-zinc-300 text-[11px] leading-relaxed">
                                                  <span className="text-zinc-500 font-semibold mr-1">전역 결함 사유:</span>
                                                  {gd.issue}
                                                </p>
                                                {gd.correctionDirective && (
                                                  <p className="text-emerald-300 text-[11px] bg-emerald-950/30 p-2 rounded border border-emerald-900/40 leading-relaxed">
                                                    <span className="font-bold mr-1">전역 교정 명령:</span>
                                                    {gd.correctionDirective}
                                                  </p>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Dynamic Sliced Audits Timeline (SSOT - Refiner V2) */}
                                  {Array.isArray(info.slices) && info.slices.length > 0 && (
                                    <div className="p-3.5 bg-zinc-950/90 rounded-xl border border-emerald-900/40 space-y-3 shadow-sm">
                                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between border-b border-emerald-950 pb-2">
                                        <div className="flex items-center gap-1.5">
                                          <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                          <span>동적 슬라이스 전수 감사 타임라인 ({info.slices.length}개 구간)</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-500 font-mono">250~350자 개행 분할 전수 스캔</span>
                                      </div>

                                      <div className="space-y-3">
                                        {info.slices.map((slice: any, sIdx: number) => {
                                          const hasIncidentFails = Array.isArray(slice.incidentAudits) && slice.incidentAudits.some((i: any) => i.verdict === 'FAIL');
                                          const hasStyleDefects = Array.isArray(slice.stylisticAudit?.stylisticDefects) && slice.stylisticAudit.stylisticDefects.length > 0;
                                          const hasLegacyDefects = Array.isArray(slice.newDefectsIdentified) && slice.newDefectsIdentified.length > 0;
                                          const hasDefects = hasIncidentFails || hasStyleDefects || hasLegacyDefects;

                                          return (
                                            <div key={sIdx} className={cn(
                                              "p-3 rounded-lg border space-y-2.5 transition-colors",
                                              hasDefects 
                                                ? "bg-rose-950/10 border-rose-900/40" 
                                                : "bg-zinc-900/60 border-zinc-800/60"
                                            )}>
                                              {/* Slice Header */}
                                              <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-2">
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-zinc-800 text-zinc-200 border border-zinc-700">
                                                    Slice {slice.sliceIndex}
                                                  </span>
                                                  {hasDefects ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                                      <AlertCircle className="w-3 h-3 text-rose-400" />
                                                      결함 발견
                                                    </span>
                                                  ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                      무결 (PASS)
                                                    </span>
                                                  )}
                                                </div>

                                                {Array.isArray(slice.inheritedFixesApplied) && slice.inheritedFixesApplied.length > 0 && (
                                                  <div className="flex items-center gap-1 text-[10px] text-amber-400 font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                                                    <span>승계 규칙 적용 ({slice.inheritedFixesApplied.length})</span>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Text Excerpt */}
                                              {slice.textExcerpt && (
                                                <div className="text-[11px] text-zinc-300 bg-zinc-950/70 p-2 rounded border border-zinc-800/80 font-sans leading-relaxed">
                                                  <span className="text-[9px] text-zinc-500 block font-mono mb-0.5">초안 구간 본문:</span>
                                                  "{slice.textExcerpt}"
                                                </div>
                                              )}

                                              {/* Epoch 1: Zero-Bias Fact Census (Refiner V2 SSOT) */}
                                              {Array.isArray(slice.factCensus) && slice.factCensus.length > 0 && (
                                                <div className="p-2.5 bg-zinc-950/80 rounded-lg border border-blue-900/30 space-y-2">
                                                  <div className="flex items-center justify-between border-b border-blue-950 pb-1.5">
                                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                                      객관적 사실 인벤토리 (Fact Census - {slice.factCensus.length}개 팩트)
                                                    </span>
                                                    <span className="text-[9px] text-zinc-500 font-mono">Epoch 1 · 무비판적 전수 분해</span>
                                                  </div>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                                    {slice.factCensus.map((fact: any, fIdx: number) => {
                                                      const factCats: string[] = Array.isArray(fact.categories) && fact.categories.length > 0
                                                        ? fact.categories
                                                        : (fact.category ? [fact.category] : ['ACTOR_STATE']);

                                                      const getCatColor = (cat: string) => {
                                                        if (cat === 'ACTOR_STATE') return 'text-sky-300 bg-sky-950/60 border-sky-800/40';
                                                        if (cat === 'ACTION_EVENT') return 'text-emerald-300 bg-emerald-950/60 border-emerald-800/40';
                                                        if (cat === 'UTTERANCE_AND_TONE') return 'text-amber-300 bg-amber-950/60 border-amber-800/40';
                                                        if (cat === 'KNOWLEDGE_CLAIM') return 'text-indigo-300 bg-indigo-950/60 border-indigo-800/40';
                                                        return 'text-cyan-300 bg-cyan-950/60 border-cyan-800/40';
                                                      };

                                                      return (
                                                        <div key={fIdx} className="p-2 bg-zinc-900/80 rounded border border-zinc-800/70 text-xs font-sans space-y-1.5 flex flex-col justify-between">
                                                          <div className="space-y-1">
                                                            <div className="flex items-center justify-between gap-1 flex-wrap">
                                                              <span className="font-mono text-[10px] font-bold text-blue-300 px-1.5 py-0.5 bg-blue-950/80 rounded border border-blue-800/40">
                                                                {fact.factId || `F${fIdx + 1}`}
                                                              </span>
                                                              <div className="flex items-center gap-1 flex-wrap">
                                                                {factCats.map((cat: string, cIdx: number) => (
                                                                  <span key={cIdx} className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border", getCatColor(cat))}>
                                                                    {cat}
                                                                  </span>
                                                                ))}
                                                              </div>
                                                            </div>
                                                            {fact.sourceSentence && (
                                                              <p className="text-[10px] text-zinc-400 italic bg-zinc-950/50 p-1 rounded border border-zinc-800/40 line-clamp-2">
                                                                "{fact.sourceSentence}"
                                                              </p>
                                                            )}
                                                          </div>
                                                          <p className="text-[11px] text-zinc-100 font-medium leading-snug">
                                                            {fact.extractedFact}
                                                          </p>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              )}

                                              {/* Epoch 1-B: Holistic Fact Synthesis */}
                                              {slice.holisticStateSummary && (
                                                <div className="p-2.5 bg-indigo-950/25 rounded-lg border border-indigo-900/40 space-y-1 text-xs font-sans">
                                                  <span className="text-indigo-300 font-bold block text-[10px] flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                                    Epoch 1-B: 통합 팩트 종합 상태 (Holistic Fact Synthesis)
                                                  </span>
                                                  <p className="text-zinc-200 text-[11px] leading-relaxed">
                                                    {slice.holisticStateSummary}
                                                  </p>
                                                </div>
                                              )}

                                              {/* Physical Logic Audit (Refiner V2) */}
                                              {slice.physicalLogicAudit?.spatialAndActorContinuity && (
                                                <div className="p-2 bg-zinc-950/50 rounded border border-zinc-800/50 space-y-0.5 text-xs font-sans">
                                                  <span className="text-emerald-400 font-bold block text-[10px] flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                    물리 및 공간 연속성 (Spatial Continuity)
                                                  </span>
                                                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                                                    {slice.physicalLogicAudit.spatialAndActorContinuity}
                                                  </p>
                                                </div>
                                              )}

                                              {/* Incident Audits (Lore / Character Incidents - Refiner V2) */}
                                              {Array.isArray(slice.incidentAudits) && slice.incidentAudits.length > 0 && (
                                                <div className="space-y-2">
                                                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                                                    사건 단위 로어·인물 감사 (Incident Audits - {slice.incidentAudits.length}건)
                                                  </span>
                                                  <div className="space-y-2">
                                                    {slice.incidentAudits.map((inc: any, iIdx: number) => {
                                                      const isFail = inc.verdict === 'FAIL';
                                                      return (
                                                        <div key={iIdx} className={cn(
                                                          "p-2.5 rounded-lg border text-xs font-sans space-y-2",
                                                          isFail ? "bg-rose-950/20 border-rose-900/40" : "bg-zinc-950/70 border-zinc-800/60"
                                                        )}>
                                                          <div className="flex items-center justify-between border-b border-zinc-800/70 pb-1.5">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                              <span className="font-mono text-[10px] text-zinc-400 font-bold">
                                                                [{inc.incidentId}]
                                                              </span>
                                                              {Array.isArray(inc.targetedFactIds) && inc.targetedFactIds.map((fId: string, tfIdx: number) => (
                                                                <span key={tfIdx} className="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40 text-[10px] font-mono">
                                                                  단서: {fId}
                                                                </span>
                                                              ))}
                                                              {Array.isArray(inc.referencedLores) && inc.referencedLores.map((lor: string, lIdx: number) => (
                                                                <span key={lIdx} className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40 text-[10px]">
                                                                  {lor}
                                                                </span>
                                                              ))}
                                                            </div>
                                                            <span className={cn(
                                                              "px-2 py-0.5 rounded text-[10px] font-bold font-mono",
                                                              isFail ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                                            )}>
                                                              {inc.verdict}
                                                            </span>
                                                          </div>

                                                          {/* 1. Cited Passages (Observed Evidence) */}
                                                          {Array.isArray(inc.citedPassages) && inc.citedPassages.length > 0 && (
                                                            <div className="space-y-1">
                                                              <span className="text-[10px] font-semibold text-zinc-500 block">1. 포착된 원문 증거:</span>
                                                              {inc.citedPassages.map((p: string, pIdx: number) => (
                                                                <div key={pIdx} className="p-1.5 bg-zinc-900 rounded border border-zinc-800 text-[11px] text-zinc-200 font-mono">
                                                                  "{p}"
                                                                </div>
                                                              ))}
                                                            </div>
                                                          )}

                                                          {/* 2. Observed Anomaly */}
                                                          {inc.observedAnomaly && (
                                                            <div className="text-[11px] text-zinc-300 bg-zinc-900/60 p-2 rounded border border-zinc-800/60">
                                                              <span className="text-amber-400 font-semibold block text-[10px] mb-0.5">2. 관찰된 이상 현상 및 의혹:</span>
                                                              {inc.observedAnomaly}
                                                            </div>
                                                          )}

                                                          {/* 3. Grounding Basis */}
                                                          {inc.groundingBasis && (
                                                            <div className="text-[11px] text-zinc-300 bg-zinc-900/60 p-2 rounded border border-zinc-800/60">
                                                              <span className="text-indigo-400 font-semibold block text-[10px] mb-0.5">3. 코덱스 기준 원문:</span>
                                                              {inc.groundingBasis}
                                                            </div>
                                                          )}

                                                          {/* 4. Causal Analysis (CoT) */}
                                                          {inc.causalAnalysis && (
                                                            <div className="text-[11px] text-zinc-300 leading-relaxed">
                                                              <span className="text-purple-400 font-semibold mr-1">4. 인과 추론 (CoT):</span>
                                                              {inc.causalAnalysis}
                                                            </div>
                                                          )}

                                                          {/* Correction Directive */}
                                                          {inc.correctionDirective && isFail && (
                                                            <div className="text-[11px] text-emerald-300 bg-emerald-950/20 p-2 rounded border border-emerald-900/30 leading-relaxed">
                                                              <span className="font-bold mr-1">교정 지침:</span>
                                                              {inc.correctionDirective}
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              )}

                                              {/* Stylistic Audit (Refiner V2: 2-Phase Macro Flow & Defect Queue) */}
                                              {slice.stylisticAudit && (
                                                <div className="p-2.5 bg-zinc-950/80 rounded-lg border border-cyan-900/30 space-y-2 text-xs font-sans">
                                                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                                                    한국어 문체 감수 (2-Phase Stylistic Audit)
                                                  </span>
                                                  
                                                  {/* Phase A: Macro Flow */}
                                                  {slice.stylisticAudit.macroFlowEvaluation && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                      {slice.stylisticAudit.macroFlowEvaluation.rhythmAndPacing && (
                                                        <div className="p-2 bg-zinc-900/70 rounded border border-zinc-800 space-y-0.5">
                                                          <span className="text-cyan-300 font-bold block text-[10px]">호흡 및 완급 조절:</span>
                                                          <p className="text-zinc-300 text-[11px] leading-relaxed">
                                                            {slice.stylisticAudit.macroFlowEvaluation.rhythmAndPacing}
                                                          </p>
                                                        </div>
                                                      )}
                                                      {slice.stylisticAudit.macroFlowEvaluation.toneAndImmersion && (
                                                        <div className="p-2 bg-zinc-900/70 rounded border border-zinc-800 space-y-0.5">
                                                          <span className="text-indigo-300 font-bold block text-[10px]">흡입력 및 일관성:</span>
                                                          <p className="text-zinc-300 text-[11px] leading-relaxed">
                                                            {slice.stylisticAudit.macroFlowEvaluation.toneAndImmersion}
                                                          </p>
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}

                                                  {/* Phase B: Stylistic Defects Queue */}
                                                  {Array.isArray(slice.stylisticAudit.stylisticDefects) && slice.stylisticAudit.stylisticDefects.length > 0 && (
                                                    <div className="space-y-1.5 pt-1">
                                                      <span className="text-[10px] font-bold text-rose-400 block">
                                                        문체 결함 큐 ({slice.stylisticAudit.stylisticDefects.length}건):
                                                      </span>
                                                      <div className="space-y-1.5">
                                                        {slice.stylisticAudit.stylisticDefects.map((def: any, defIdx: number) => (
                                                          <div key={defIdx} className="p-2 bg-rose-950/15 border border-rose-900/40 rounded space-y-1 text-xs">
                                                            <div className="flex items-center justify-between">
                                                              <span className="font-mono text-[9px] text-rose-300 font-bold px-1.5 py-0.2 bg-rose-950 rounded">
                                                                [{def.category}]
                                                              </span>
                                                            </div>
                                                            <div className="text-[11px] text-rose-200/90 font-mono bg-rose-950/30 p-1.5 rounded">
                                                              "{def.targetPassage}"
                                                            </div>
                                                            <p className="text-zinc-300 text-[11px] leading-relaxed">
                                                              <span className="text-zinc-500 font-semibold mr-1">진단:</span>
                                                              {def.critique}
                                                            </p>
                                                            {def.polishSuggestion && (
                                                              <p className="text-emerald-300 text-[11px] bg-emerald-950/20 p-1.5 rounded leading-relaxed">
                                                                <span className="font-bold mr-1">윤문 대안:</span>
                                                                "{def.polishSuggestion}"
                                                              </p>
                                                            )}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              {/* 4-Tier Micro-Continuity Stage Audits (SSOT) */}
                                              {slice.stageAudits && (
                                                <div className="space-y-2 text-xs font-sans">
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                                    {/* Tier 1: Physical / Situational */}
                                                    <div className="p-2.5 bg-zinc-950/70 rounded-lg border border-emerald-900/40 space-y-1">
                                                      <span className="text-emerald-400 font-bold block text-[10px] flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                        1단계: 물리·공간·상태 인과
                                                      </span>
                                                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                                                        {slice.stageAudits.stage1_PhysicalAndSituational || slice.stageAudits.stage2_PhysicalAndSituational || slice.stageAudits.stage1_Physical || '특이사항 없음 (PASS)'}
                                                      </p>
                                                    </div>

                                                    {/* Tier 2: Lore Canon & Voice */}
                                                    <div className="p-2.5 bg-zinc-950/70 rounded-lg border border-purple-900/40 space-y-1">
                                                      <span className="text-purple-400 font-bold block text-[10px] flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                                        2단계: 로어·말투 정합
                                                      </span>
                                                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                                                        {slice.stageAudits.stage2_LoreCanonAndVoice || slice.stageAudits.stage2_LoreAndCharacter || slice.stageAudits.stage3_LoreAndCharacter || '코덱스 및 인물 페르소나 정합성 일치 (PASS)'}
                                                      </p>
                                                    </div>

                                                    {/* Tier 3: Epistemic Boundary & POV */}
                                                    <div className="p-2.5 bg-zinc-950/70 rounded-lg border border-amber-900/40 space-y-1">
                                                      <span className="text-amber-400 font-bold block text-[10px] flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                        3단계: 지식 경계·시점
                                                      </span>
                                                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                                                        {slice.stageAudits.stage3_EpistemicBoundaryAndPOV || (slice.stageAudits.stage2_LoreAndCharacter ? '기존 2단계 로어 항목에 통합 기록됨' : '지식 경계 및 인지 비대칭 정상 (PASS)')}
                                                      </p>
                                                    </div>

                                                    {/* Tier 4: Native Linguistic & Style */}
                                                    <div className="p-2.5 bg-zinc-950/70 rounded-lg border border-cyan-900/40 space-y-1">
                                                      <span className="text-cyan-400 font-bold block text-[10px] flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                                        4단계: 한국어 모국어 문체
                                                      </span>
                                                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                                                        {slice.stageAudits.stage4_NativeLinguisticAndStyle || slice.stageAudits.stage3_NativeLinguisticAndStyle || slice.stageAudits.stage4_Linguistic || '번역투/어색한 문체 없음 (PASS)'}
                                                      </p>
                                                    </div>
                                                  </div>

                                                  {/* Backward Compatibility: Legacy Stage 1 Directive & Plot if present */}
                                                  {(slice.stageAudits.stage1_DirectiveAndPlot || slice.stageAudits.stage2_Directive) && (
                                                    <div className="p-2 bg-indigo-950/30 rounded border border-indigo-900/40 space-y-0.5">
                                                      <span className="text-indigo-400 font-bold block text-[10px]">[구버전 기록] 지시/플롯 준수</span>
                                                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                                                        {slice.stageAudits.stage1_DirectiveAndPlot || slice.stageAudits.stage2_Directive}
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              {/* Defects Identified in This Slice (SSOT: newDefectsIdentified) */}
                                              {Array.isArray(slice.newDefectsIdentified) && slice.newDefectsIdentified.length > 0 && (
                                                <div className="p-2.5 bg-rose-950/20 border border-rose-900/40 rounded-lg space-y-1.5 text-xs font-sans">
                                                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                                                    구간 발견 결함 ({slice.newDefectsIdentified.length}건)
                                                  </span>
                                                  <div className="space-y-1.5">
                                                    {slice.newDefectsIdentified.map((def: any, defIdx: number) => (
                                                      <div key={defIdx} className="p-2 bg-zinc-950/80 rounded border border-rose-900/30 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                          <span className={cn(
                                                            "font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border",
                                                            def.category === 'EPISTEMIC' ? "bg-amber-950/80 text-amber-300 border-amber-800/50" :
                                                            def.category === 'PHYSICAL' ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/50" :
                                                            def.category === 'LORE' ? "bg-purple-950/80 text-purple-300 border-purple-800/50" :
                                                            def.category === 'CHARACTER_SPEECH' ? "bg-pink-950/80 text-pink-300 border-pink-800/50" :
                                                            def.category === 'DIRECTIVE' ? "bg-indigo-950/80 text-indigo-300 border-indigo-800/50" :
                                                            "bg-rose-950 text-rose-300 border-rose-900/50"
                                                          )}>
                                                            [{def.ruleId}] {def.category}
                                                          </span>
                                                        </div>
                                                        {def.citedProse && (
                                                          <div className="text-[11px] text-rose-200/90 font-mono bg-rose-950/40 p-1.5 rounded">
                                                            "{def.citedProse}"
                                                          </div>
                                                        )}
                                                        <p className="text-zinc-300 text-[11px] leading-relaxed">
                                                          <span className="text-zinc-500 font-semibold mr-1">사유:</span>
                                                          {def.issueDescription}
                                                        </p>
                                                        {def.correctionDirective && (
                                                          <p className="text-emerald-300 text-[11px] bg-emerald-950/20 p-1.5 rounded leading-relaxed">
                                                            <span className="font-bold mr-1">교정:</span>
                                                            {def.correctionDirective}
                                                          </p>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Refiner Change Log */}
                                  {Array.isArray(info.changeLog) && info.changeLog.length > 0 && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-indigo-900/30 space-y-2">
                                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <History className="w-3.5 h-3.5 text-indigo-400" />
                                          <span>Refiner Change Log ({info.changeLog.length}개 수정 내역)</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-500 font-mono">Semantic-Invariance Audit</span>
                                      </div>
                                      <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar">
                                        {info.changeLog.map((log: any, lIdx: number) => (
                                          <div key={lIdx} className="p-2.5 bg-zinc-900/80 rounded-lg border border-zinc-800 text-xs space-y-1.5">
                                            <div className="flex items-center justify-between text-[10px]">
                                              <span className="px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 font-mono font-semibold">
                                                [{log.vector}]
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                                              <div className="p-2 bg-rose-950/20 border border-rose-900/40 rounded text-rose-300 leading-relaxed">
                                                <span className="text-[9px] text-rose-400 font-bold block mb-1">수정 전 (Before):</span>
                                                "{log.before}"
                                              </div>
                                              <div className="p-2 bg-emerald-950/20 border border-emerald-900/40 rounded text-emerald-300 leading-relaxed">
                                                <span className="text-[9px] text-emerald-400 font-bold block mb-1">수정 후 (After):</span>
                                                "{log.after}"
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Detected Issues */}
                                  {Array.isArray(info.conflicts) && info.conflicts.length > 0 && (
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-rose-900/30 space-y-1.5">
                                      <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                        <span>Detected Conflicts & Phrasing Corrections ({info.conflicts.length})</span>
                                      </div>
                                      <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside font-sans">
                                        {info.conflicts.map((conflict: string, cIdx: number) => (
                                          <li key={cIdx} className="leading-relaxed">{conflict}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                    </>
                                  )}
                                </div>
                              )}
                              {!info.multiAgentAudits && (
                                <pre className={cn(
                                  "p-4 rounded-xl border text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar",
                                  info.error ? "bg-rose-950/20 border-rose-900/50 text-rose-300" : "bg-zinc-950 border-zinc-800 text-zinc-400"
                                )}>
                                  {info.error ? `[ERROR] ${info.error}\n\n` : ''}
                                  {info.output || "(응답 텍스트 없음)"}
                                </pre>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
