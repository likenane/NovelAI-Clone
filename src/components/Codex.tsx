import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { 
  X, 
  Book, 
  FolderPlus, 
  PlusCircle, 
  BookOpen, 
  Trash2, 
  ToggleRight, 
  ToggleLeft, 
  Sparkles, 
  History, 
  Settings, 
  ChevronLeft, 
  Folder, 
  Copy, 
  Check, 
  RefreshCw, 
  Scissors, 
  Maximize2, 
  Wrench, 
  GitFork, 
  SlidersHorizontal 
} from 'lucide-react';
import { FullScreenTextEditor } from './FullScreenTextEditor';
import { DirectiveScanPopover } from './DirectiveScanPopover';
import { 
  DndContext, 
  closestCenter,
  useDroppable
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { cn } from '../lib/utils';
import { Novel, LoreEntry, ThinkingLevel, CodexSpinoffEntry, AIEngineTaskType } from '../types';
import { deduplicateLoreContent } from '../lib/loreUtils';
import { SortableLoreItem } from './SortableLoreItem';
import { ProposalDiffView } from './ProposalDiffView';
import { PendingProposalsList } from './PendingProposalsList';
import { CollapsibleTextArea } from './ui/CollapsibleTextArea';
import { GLOBAL_DEFAULTS, AVAILABLE_MODELS, ALL_THINKING_LEVELS, getSupportedThinkingLevels, getValidThinkingLevel } from '../constants';

const RootDropZone: React.FC<{ isDragging: boolean }> = ({ isDragging }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'codex-root-drop-zone',
  });

  if (!isDragging) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "py-2 px-3 my-1.5 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-150 animate-in fade-in",
        isOver
          ? "border-indigo-500 bg-indigo-500/20 text-indigo-300 scale-[1.02] shadow-md shadow-indigo-500/20"
          : "border-zinc-700/80 bg-zinc-900/80 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
      )}
    >
      <Folder className="w-3.5 h-3.5 text-indigo-400" />
      <span>최상위(루트)로 이동하려면 여기에 드롭하세요</span>
    </div>
  );
};

interface CodexProps {
  isCodexOpen: boolean;
  setIsCodexOpen: (open: boolean) => void;
  currentNovel: Novel | null;
  setCurrentNovel: (novel: Novel | null) => void;
  editingLoreId: string | null;
  setEditingLoreId: (id: string | null) => void;
  addLoreEntry: (type: 'item' | 'folder', parentId?: string | null, initialData?: Partial<LoreEntry>) => Promise<string | undefined>;
  updateLoreEntry: (id: string, updates: Partial<LoreEntry>) => void;
  deleteLoreEntry: (id: string) => void;
  onMoveToRoot?: (id: string) => void;
  getFlattenedLore: (entries: LoreEntry[]) => { entry: LoreEntry; depth: number }[];
  sensors: any;
  handleDragEnd: (event: any) => void;
  expandedFolders: string[];
  toggleFolder: (id: string) => void;
  isCodexAIOpen: boolean;
  setIsCodexAIOpen: (open: boolean) => void;
  isCodexSettingsOpen: boolean;
  setIsCodexSettingsOpen: (open: boolean) => void;
  isCodexGenerating: boolean;
  codexAISuggestion: string;
  setCodexAISuggestion: (val: string) => void;
  codexAISpinoffs?: CodexSpinoffEntry[];
  setCodexAISpinoffs?: (spinoffs: CodexSpinoffEntry[]) => void;
  codexAIInstruction: string;
  setCodexAIInstruction: (val: string) => void;
  handleGenerateCodex: (entry: LoreEntry) => void;
  generateTaskContext: (taskType: any, novel: Novel, extraData?: any) => any;
  setLastCodexPromptInfo: (info: any) => void;
  lastCodexPromptInfo?: any;
  setInspectionContext: (ctx: any) => void;
  setShowPromptInspector: (show: boolean) => void;
  openRouterKey: string;
  setIsGlobalSettingsOpen: (open: boolean) => void;
  acceptProposal: (id: string, editedContent?: string) => void;
  rejectProposal: (id: string) => void;
  acceptPruning: (id: string) => void;
  rejectPruning: (id: string) => void;
  isScanning: boolean;
  scanForProposals: (options: { isManual?: boolean; userDirective?: string }) => void;
  onHealHierarchy?: () => Promise<void>;
  openAIEngineStudio?: (task?: AIEngineTaskType) => void;
}

export const Codex: React.FC<CodexProps> = ({
  isCodexOpen,
  setIsCodexOpen,
  currentNovel,
  setCurrentNovel,
  editingLoreId,
  setEditingLoreId,
  addLoreEntry,
  updateLoreEntry,
  deleteLoreEntry,
  onMoveToRoot,
  onHealHierarchy,
  getFlattenedLore,
  sensors,
  handleDragEnd,
  expandedFolders,
  toggleFolder,
  isCodexAIOpen,
  setIsCodexAIOpen,
  isCodexSettingsOpen,
  setIsCodexSettingsOpen,
  isCodexGenerating,
  codexAISuggestion,
  setCodexAISuggestion,
  codexAISpinoffs = [],
  setCodexAISpinoffs,
  codexAIInstruction,
  setCodexAIInstruction,
  handleGenerateCodex,
  generateTaskContext,
  setLastCodexPromptInfo,
  lastCodexPromptInfo,
  setInspectionContext,
  setShowPromptInspector,
  openRouterKey,
  setIsGlobalSettingsOpen,
  acceptProposal,
  rejectProposal,
  acceptPruning,
  rejectPruning,
  isScanning,
  scanForProposals,
  openAIEngineStudio
}) => {
  if (!isCodexOpen) return (
    <React.Fragment>
      {null}
    </React.Fragment>
  );

  const proposals = currentNovel?.loreEntries?.filter(e => e.proposedContent || e.isProposalOnly) || [];
  const regularEntries = currentNovel?.loreEntries?.filter(e => !e.proposedContent && !e.isProposalOnly) || [];
  const [isDraggingLore, setIsDraggingLore] = useState(false);

  const handleOpenAutoCodexInspector = () => {
    if (setInspectionContext && setShowPromptInspector) {
      setInspectionContext({ type: 'autocodex' });
      setShowPromptInspector(true);
    }
  };

  // Local state for main fields to prevent excessive global re-renders
  const [localTitle, setLocalTitle] = useState("");
  const [localKeywords, setLocalKeywords] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [isFullScreenCodexOpen, setIsFullScreenCodexOpen] = useState(false);
  const [scanDirective, setScanDirective] = useState("");
  const [isDirectiveInputOpen, setIsDirectiveInputOpen] = useState(false);
  const [addedSpinoffTitles, setAddedSpinoffTitles] = useState<Record<string, boolean>>({});
  
  // Accumulator for debounced updates to prevent multi-field data loss
  const pendingUpdatesRef = useRef<Partial<LoreEntry>>({});
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with prop when novel or entry changes
  useEffect(() => {
    const entry = currentNovel?.loreEntries?.find(e => e.id === editingLoreId);
    if (entry) {
      setLocalTitle(entry.title || "");
      setLocalKeywords(entry.keywords || "");
      setLocalContent(entry.content || "");
    }
  }, [editingLoreId, currentNovel?.id]); // Only reset when entry or novel ID changes

  // Helper for debounced updates that accumulates changes safely
  const debouncedUpdate = (id: string, updates: Partial<LoreEntry>) => {
    // Accumulate the updates to prevent data loss from overlapping timeouts
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
      if (Object.keys(pendingUpdatesRef.current).length > 0) {
        updateLoreEntry(id, pendingUpdatesRef.current);
        pendingUpdatesRef.current = {}; // Clear after sending
      }
    }, 1000);
  };

  // Safe wrapper for AI proposal acceptance to ensure UI sync and scrub pending overwrites
  const handleAcceptProposal = (id: string, editedContent?: string) => {
    const entry = currentNovel?.loreEntries?.find(e => e.id === id);
    if (!entry) return;
    
    // Determine the final content that will be saved
    const finalContent = editedContent !== undefined ? editedContent : (entry.proposedContent || '');
    
    acceptProposal(id, editedContent);

    if (editingLoreId === id) {
      setLocalContent(finalContent);
      delete pendingUpdatesRef.current.content; // Scrub any typing residue
    }
  };

  // Helper: Apply AI suggestion to current entry content only (preserves spinoff cards)
  const handleApplyContentOnly = () => {
    if (!editingLoreId || !codexAISuggestion) return;
    setLocalContent(codexAISuggestion); // Optimistic UI override
    delete pendingUpdatesRef.current.content; // Scrub pending updates
    updateLoreEntry(editingLoreId, { content: codexAISuggestion });
    setCodexAISuggestion("");
  };

  // Helper: Apply AI suggestion AND batch-register all spinoff concepts into Codex
  const handleApplyAll = async () => {
    if (!editingLoreId) return;
    const entry = currentNovel?.loreEntries?.find(e => e.id === editingLoreId);
    if (!entry) return;

    // 1. Apply main suggestion to current entry if present
    if (codexAISuggestion) {
      setLocalContent(codexAISuggestion);
      delete pendingUpdatesRef.current.content;
      updateLoreEntry(entry.id, { content: codexAISuggestion });
    }

    // 2. Batch register all pending spinoff entries
    if (codexAISpinoffs && codexAISpinoffs.length > 0) {
      const newAddedMap = { ...addedSpinoffTitles };
      for (const spinoff of codexAISpinoffs) {
        if (!newAddedMap[spinoff.title]) {
          await addLoreEntry(
            'item',
            entry.parentId || null,
            {
              title: spinoff.title,
              type: 'item',
              keywords: spinoff.keywords || spinoff.title,
              content: spinoff.content || '',
              updateReason: spinoff.spinoffReason || '개념 분화 생성'
            }
          );
          newAddedMap[spinoff.title] = true;
        }
      }
      setAddedSpinoffTitles(newAddedMap);
    }

    // 3. Clear assistant suggestion and spinoffs
    setCodexAISuggestion("");
    if (setCodexAISpinoffs) {
      setCodexAISpinoffs([]);
    }
  };

  return (
    <motion.div 
      key="codex-overlay"
      className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-8"
    >
      <motion.div 
        key="codex-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsCodexOpen(false)}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div 
        key="codex-content"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-6xl h-full max-h-full sm:max-h-[90vh] bg-zinc-900 border-x-0 sm:border border-zinc-800 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-3 sm:p-6 border-b border-zinc-800 flex items-center justify-between gap-4 bg-zinc-900/50">
          <div className="flex items-center gap-2 sm:gap-3">
            {editingLoreId ? (
              <button 
                onClick={() => setEditingLoreId(null)}
                className="sm:hidden p-2 hover:bg-zinc-800 rounded-lg text-indigo-400"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : (
              <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
                <Book className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
              </div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100">
                {editingLoreId ? 'Entry Details' : 'The Codex'}
              </h2>
              <p className="text-[10px] sm:text-xs text-zinc-500 hidden xs:block">
                {editingLoreId ? 'Refine your lore details.' : 'Manage world settings.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsDirectiveInputOpen(!isDirectiveInputOpen)}
                disabled={isScanning}
                className={cn(
                  "p-2 sm:p-2.5 rounded-xl transition-all active:scale-95 border flex items-center justify-center relative",
                  isScanning
                    ? "bg-amber-600/30 border-amber-500/50 text-amber-300"
                    : isDirectiveInputOpen || scanDirective.trim()
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700/60"
                )}
                title={scanDirective.trim() ? `지침 반영 스캔: "${scanDirective.slice(0, 20)}..."` : "오토 코덱스 본문 스캔 (Auto Codex Scan)"}
              >
                <RefreshCw className={cn("w-4 h-4 text-amber-400", isScanning && "animate-spin text-amber-400")} />
                {scanDirective.trim() && !isScanning && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>

              <DirectiveScanPopover 
                isOpen={isDirectiveInputOpen}
                onClose={() => setIsDirectiveInputOpen(false)}
                onScan={(directiveText) => {
                  scanForProposals({ isManual: true, userDirective: directiveText || undefined });
                }}
                directive={scanDirective}
                onDirectiveChange={setScanDirective}
                isScanning={isScanning}
                openAIEngineStudio={openAIEngineStudio}
                novelId={currentNovel?.id}
                triggerChars={currentNovel?.settings?.autoCodex?.triggerChars ?? currentNovel?.settings?.autoCodexTriggerChars ?? 7500}
              />
            </div>

            <button 
              onClick={() => addLoreEntry('folder')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95"
            >
              <FolderPlus className="w-4 h-4" />
              <span className="hidden xs:inline">Folder</span>
            </button>
            <button 
              onClick={() => addLoreEntry('item')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden xs:inline">Entry</span>
            </button>
            <button 
              onClick={() => setIsCodexOpen(false)}
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Entry List */}
          <div className={cn(
            "w-full sm:w-80 border-b sm:border-b-0 sm:border-r border-zinc-800 flex flex-col bg-zinc-950/30 h-full",
            editingLoreId ? "hidden sm:flex" : "flex"
          )}>
            <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
              <PendingProposalsList 
                proposals={proposals} 
                selectedId={editingLoreId} 
                onSelect={setEditingLoreId} 
                onOpenInspector={handleOpenAutoCodexInspector}
              />
              
              {(!regularEntries || regularEntries.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4 opacity-30">
                  <BookOpen className="w-12 h-12" />
                  <p className="text-xs">No entries yet. Create your first lore item!</p>
                </div>
              ) : (
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={() => setIsDraggingLore(true)}
                  onDragEnd={(event) => {
                    setIsDraggingLore(false);
                    handleDragEnd(event);
                  }}
                  onDragCancel={() => setIsDraggingLore(false)}
                >
                  <RootDropZone isDragging={isDraggingLore} />
                  <SortableContext 
                    items={getFlattenedLore(regularEntries).map(i => i.entry.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {getFlattenedLore(regularEntries).map(({ entry, depth }) => (
                      <SortableLoreItem 
                        key={entry.id}
                        entry={entry}
                        depth={depth}
                        isEditing={editingLoreId === entry.id}
                        onEdit={setEditingLoreId}
                        onToggleEnabled={(id, enabled) => updateLoreEntry(id, { enabled })}
                        onToggleAlwaysActive={(id, active) => updateLoreEntry(id, { isAlwaysActive: active })}
                        onDelete={deleteLoreEntry}
                        onMoveToRoot={onMoveToRoot}
                        onAddChild={(parentId, type) => {
                          addLoreEntry(type, parentId);
                          if (!expandedFolders.includes(parentId)) {
                            toggleFolder(parentId);
                          }
                        }}
                        isExpanded={expandedFolders.includes(entry.id)}
                        onToggleExpand={toggleFolder}
                        onAcceptPruning={acceptPruning}
                        onRejectPruning={rejectPruning}
                        hasChildren={currentNovel.loreEntries?.some(e => e.parentId === entry.id) || false}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          {/* Entry editor */}
          <div className={cn(
            "flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-zinc-950/10",
            !editingLoreId ? "hidden sm:block" : "block"
          )}>
            {editingLoreId && currentNovel?.loreEntries?.find(e => e.id === editingLoreId) ? (
              (() => {
                const entry = currentNovel.loreEntries.find(e => e.id === editingLoreId)!;
                const isProposal = !!entry.proposedContent || entry.isProposalOnly;
                
                if (isProposal) {
                  return (
                    <ProposalDiffView 
                      entry={entry} 
                      onAccept={(id, content) => {
                        handleAcceptProposal(id, content);
                      }} 
                      onReject={(id) => {
                        rejectProposal(id);
                        if (entry.isProposalOnly) {
                          setEditingLoreId(null);
                        }
                      }} 
                      onOpenInspector={handleOpenAutoCodexInspector}
                    />
                  );
                }

                const isFolder = entry.type === 'folder';
                
                return (
                  <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
                    {entry.isPruningProposal && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-amber-500">
                          <Scissors className="w-5 h-5" />
                          <div>
                            <p className="text-sm font-bold">Pruning Suggestion</p>
                            <p className="text-xs opacity-80">This entry hasn't been mentioned recently. Deactivate it to save context?</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => acceptPruning(entry.id)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-900 text-xs font-bold rounded-lg transition-colors"
                          >
                            Deactivate
                          </button>
                          <button 
                            onClick={() => rejectPruning(entry.id)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors"
                          >
                            Keep
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <input 
                        value={localTitle}
                        onChange={(e) => {
                          setLocalTitle(e.target.value);
                          debouncedUpdate(entry.id, { title: e.target.value });
                        }}
                        className="bg-transparent border-none focus:ring-0 text-xl sm:text-3xl font-bold text-zinc-100 w-full placeholder-zinc-800"
                        placeholder={isFolder ? "Folder Name..." : "Entry Title..."}
                      />
                      <button 
                        onClick={() => {
                          deleteLoreEntry(entry.id);
                          setEditingLoreId(null);
                        }}
                        className="p-2 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 rounded-lg transition-colors shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {!isFolder ? (
                      <>
                        <CollapsibleTextArea 
                          label="Internal Notes"
                          value={entry.internalNotes || ''}
                          onChange={(v) => updateLoreEntry(entry.id, { internalNotes: v })}
                          placeholder="Private notes for you or AI. Not included in story generation context..."
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Activation Keywords</label>
                            <input 
                              value={localKeywords}
                              onChange={(e) => {
                                setLocalKeywords(e.target.value);
                                debouncedUpdate(entry.id, { keywords: e.target.value });
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 text-zinc-100"
                              placeholder="hero, sword, excalibur..."
                            />
                            <p className="text-[10px] text-zinc-500 italic">Comma-separated. Triggers when found in context.</p>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Settings</label>
                            <div className="flex items-center gap-4 flex-wrap">
                              <button 
                                onClick={() => updateLoreEntry(entry.id, { isAlwaysActive: !entry.isAlwaysActive })}
                                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                              >
                                {entry.isAlwaysActive ? <ToggleRight className="w-6 h-6 text-indigo-500" /> : <ToggleLeft className="w-6 h-6" />}
                                Always Active
                              </button>
                              <button 
                                onClick={() => updateLoreEntry(entry.id, { enabled: !entry.enabled })}
                                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                              >
                                {entry.enabled ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6" />}
                                Enabled
                              </button>
                              <button 
                                onClick={() => updateLoreEntry(entry.id, { isLocked: !entry.isLocked })}
                                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                                title="Prevent Auto-Codex from modifying this entry"
                              >
                                {entry.isLocked ? <ToggleRight className="w-6 h-6 text-red-500" /> : <ToggleLeft className="w-6 h-6" />}
                                Locked
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Content</label>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => setIsFullScreenCodexOpen(true)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-transparent"
                                title="Expand to Full Screen"
                              >
                                <Maximize2 className="w-3 h-3" />
                                <span className="hidden xs:inline">Expand</span>
                              </button>
                              <button 
                                onClick={() => {
                                  const cleaned = deduplicateLoreContent(localContent);
                                  if (cleaned !== localContent) {
                                    setLocalContent(cleaned);
                                    updateLoreEntry(entry.id, { content: cleaned });
                                  }
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-transparent"
                                title="Enforce SSOT & Deduplicate bullets"
                              >
                                <Scissors className="w-3 h-3" />
                                <span className="hidden xs:inline">Deduplicate</span>
                              </button>
                              <button 
                                onClick={() => setIsCodexAIOpen(!isCodexAIOpen)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all",
                                  isCodexAIOpen 
                                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" 
                                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-transparent"
                                )}
                              >
                                <Sparkles className="w-3 h-3" />
                                AI Assistant
                              </button>
                            </div>
                          </div>
                          
                          <div className={cn(
                            "grid gap-4 transition-all duration-300",
                            isCodexAIOpen ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
                          )}>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Entry Content</label>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(entry.content);
                                  }}
                                  className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-indigo-400 rounded transition-colors"
                                  title="Copy content"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                              <textarea 
                                value={localContent}
                                onChange={(e) => {
                                  setLocalContent(e.target.value);
                                  debouncedUpdate(entry.id, { content: e.target.value });
                                }}
                                className="w-full h-64 sm:h-96 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 text-zinc-300 text-sm sm:text-base leading-relaxed resize-none custom-scrollbar focus:ring-1 focus:ring-indigo-500/50"
                                placeholder="Describe the lore, character, or setting in detail..."
                              />
                            </div>

                            {isCodexAIOpen && (
                              <div className="flex flex-col h-64 sm:h-96 bg-zinc-900/50 border border-indigo-500/20 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="p-3 border-b border-indigo-500/10 bg-indigo-500/5 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">AI Assistant</span>
                                    <button 
                                      onClick={() => {
                                        setInspectionContext({ type: 'codex', entryId: entry.id });
                                        setShowPromptInspector(true);
                                      }}
                                      className="p-1 hover:bg-indigo-500/20 text-indigo-400 rounded transition-colors"
                                      title="Inspect Prompt"
                                    >
                                      <History className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (openAIEngineStudio) {
                                          openAIEngineStudio('codex');
                                        } else {
                                          setIsCodexSettingsOpen(!isCodexSettingsOpen);
                                        }
                                      }}
                                      className="p-1 rounded transition-colors hover:bg-indigo-500/20 text-indigo-400"
                                      title="Codex AI Engine Settings"
                                    >
                                      <SlidersHorizontal className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {codexAISuggestion && codexAISpinoffs && codexAISpinoffs.length > 0 ? (
                                    <div className="flex items-center gap-1.5">
                                      <button 
                                        onClick={handleApplyContentOnly}
                                        className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold rounded-md transition-colors border border-zinc-700"
                                        title="현재 항목 본문만 수정하고 분화 카드는 유지합니다"
                                      >
                                        본문만 적용
                                      </button>
                                      <button 
                                        onClick={handleApplyAll}
                                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-md transition-colors shadow-sm"
                                        title="본문 갱신 및 모든 분화 항목을 코덱스에 일괄 등록합니다"
                                      >
                                        전체 적용 (분화 {codexAISpinoffs.length}개 포함)
                                      </button>
                                    </div>
                                  ) : codexAISuggestion ? (
                                    <button 
                                      onClick={handleApplyContentOnly}
                                      className="px-2 py-1 bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-bold rounded-md transition-colors"
                                    >
                                      본문 적용
                                    </button>
                                  ) : (codexAISpinoffs && codexAISpinoffs.length > 0) ? (
                                    <button 
                                      onClick={handleApplyAll}
                                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-md transition-colors shadow-sm"
                                    >
                                      분화 항목 일괄 등록 ({codexAISpinoffs.length}개)
                                    </button>
                                  ) : null}
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
                                  {isCodexGenerating ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-50">
                                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                      <p className="text-[10px] font-medium text-indigo-400 uppercase tracking-widest">Generating...</p>
                                    </div>
                                  ) : (codexAISuggestion || (codexAISpinoffs && codexAISpinoffs.length > 0)) ? (
                                    <div className="space-y-3">
                                      {codexAISuggestion && (
                                        <>
                                          {(lastCodexPromptInfo?.updateReason || lastCodexPromptInfo?.thoughtProcess?.directiveIntent?.userIntentSummary) && (
                                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex gap-2.5 items-start">
                                              <span className="text-indigo-400 mt-0.5 text-sm flex-shrink-0">💡</span>
                                              <div className="space-y-0.5 min-w-0">
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">AI's Reasoning</p>
                                                <p className="text-xs text-indigo-200/90 leading-relaxed font-sans">
                                                  {lastCodexPromptInfo?.updateReason || lastCodexPromptInfo?.thoughtProcess?.directiveIntent?.userIntentSummary}
                                                </p>
                                              </div>
                                            </div>
                                          )}

                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Suggested Content</label>
                                              <button 
                                                onClick={() => {
                                                  navigator.clipboard.writeText(codexAISuggestion);
                                                }}
                                                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 rounded transition-colors"
                                                title="Copy suggestion"
                                              >
                                                <Copy className="w-3 h-3" />
                                              </button>
                                            </div>
                                            <div className="text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-serif bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/60">
                                              {codexAISuggestion}
                                            </div>
                                          </div>
                                        </>
                                      )}

                                      {codexAISpinoffs && codexAISpinoffs.length > 0 && (
                                        <div className="space-y-2 pt-2 border-t border-indigo-500/20">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                              <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                                                개념 분화 신규 항목 (Spinoffs: {codexAISpinoffs.length})
                                              </span>
                                            </div>
                                            <button
                                              onClick={async () => {
                                                for (const spinoff of codexAISpinoffs) {
                                                  if (!addedSpinoffTitles[spinoff.title]) {
                                                    await addLoreEntry(
                                                      'item', 
                                                      entry.parentId || null, 
                                                      {
                                                        title: spinoff.title,
                                                        type: 'item',
                                                        keywords: spinoff.keywords || spinoff.title,
                                                        content: spinoff.content || '',
                                                        updateReason: spinoff.spinoffReason || '개념 분화 생성'
                                                      }
                                                    );
                                                    setAddedSpinoffTitles(prev => ({ ...prev, [spinoff.title]: true }));
                                                  }
                                                }
                                              }}
                                              className="text-[10px] font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/30 px-2 py-0.5 rounded transition-colors"
                                            >
                                              전체 코덱스 등록
                                            </button>
                                          </div>

                                          <div className="space-y-2">
                                            {codexAISpinoffs.map((spinoff, idx) => {
                                              const isAdded = !!addedSpinoffTitles[spinoff.title];
                                              return (
                                                <div 
                                                  key={`${spinoff.title}-${idx}`}
                                                  className="bg-zinc-900/90 border border-indigo-500/20 rounded-xl p-3 space-y-2"
                                                >
                                                  <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      <span className="text-xs font-bold text-zinc-200 truncate">
                                                        {spinoff.title}
                                                      </span>
                                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                                                        {spinoff.type}
                                                      </span>
                                                    </div>
                                                    <button
                                                      onClick={async () => {
                                                        if (isAdded) return;
                                                        await addLoreEntry(
                                                          'item', 
                                                          entry.parentId || null, 
                                                          {
                                                            title: spinoff.title,
                                                            type: 'item',
                                                            keywords: spinoff.keywords || spinoff.title,
                                                            content: spinoff.content || '',
                                                            updateReason: spinoff.spinoffReason || '개념 분화 생성'
                                                          }
                                                        );
                                                        setAddedSpinoffTitles(prev => ({ ...prev, [spinoff.title]: true }));
                                                      }}
                                                      disabled={isAdded}
                                                      className={cn(
                                                        "flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-all",
                                                        isAdded 
                                                          ? "bg-emerald-500/20 text-emerald-300 cursor-default" 
                                                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm active:scale-95"
                                                      )}
                                                    >
                                                      {isAdded ? (
                                                        <>
                                                          <Check className="w-3 h-3" />
                                                          <span>등록됨</span>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <PlusCircle className="w-3 h-3" />
                                                          <span>새 항목 등록</span>
                                                        </>
                                                      )}
                                                    </button>
                                                  </div>

                                                  {spinoff.spinoffReason && (
                                                    <p className="text-[11px] text-zinc-400 italic">
                                                      💡 {spinoff.spinoffReason}
                                                    </p>
                                                  )}

                                                  <div className="text-[11px] text-zinc-300 leading-relaxed font-serif bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/80 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                                    {spinoff.content}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-4">
                                      <Sparkles className="w-8 h-8 text-indigo-500/20" />
                                      <div className="space-y-1">
                                        <p className="text-xs text-zinc-500">Need help expanding this entry?</p>
                                        <p className="text-[10px] text-zinc-600">AI will use your story context and other lore to suggest details.</p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="p-3 border-t border-indigo-500/10 bg-zinc-950/50">
                                  <div className="flex gap-2">
                                    <input 
                                      value={codexAIInstruction}
                                      onChange={(e) => setCodexAIInstruction(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleGenerateCodex(entry);
                                        }
                                      }}
                                      className="flex-1 bg-zinc-950 border border-indigo-500/20 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500/50"
                                      placeholder="Instructions for AI..."
                                    />
                                    <button 
                                      onClick={() => handleGenerateCodex(entry)}
                                      disabled={isCodexGenerating}
                                      className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all disabled:opacity-50"
                                    >
                                      <Sparkles className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20 opacity-30">
                        <Folder className="w-20 h-20 text-indigo-500" />
                        <div className="space-y-2">
                          <p className="text-lg font-bold">This is a Folder</p>
                          <p className="text-sm">Use folders to organize your lore entries by category.</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-20">
                <Book className="w-24 h-24" />
                <div className="space-y-2">
                  <p className="text-xl font-bold">Select an Entry</p>
                  <p className="text-sm">Choose a lore entry from the list to view and edit its details.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <FullScreenTextEditor 
        isOpen={isFullScreenCodexOpen}
        onClose={() => setIsFullScreenCodexOpen(false)}
        value={localContent}
        onChange={(val) => {
          setLocalContent(val);
          if (editingLoreId) {
            debouncedUpdate(editingLoreId, { content: val });
          }
        }}
        title={localTitle || 'Untitled Entry'}
        description="Detailed worldbuilding and lore editing."
        icon={<Book className="w-5 h-5 text-indigo-400" />}
        saveMode="auto"
        zIndex="z-[140]"
        placeholder="Describe the lore, character, or setting in detail..."
      />
    </motion.div>
  );
};
