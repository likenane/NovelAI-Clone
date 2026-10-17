import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Settings, 
  Save, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  BookOpen, 
  User, 
  LogOut, 
  Key,
  Sparkles,
  History,
  Menu,
  X,
  Pencil,
  CheckCircle2,
  Loader2,
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
  Book,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  Folder,
  FolderPlus,
  ChevronDown,
  GripVertical,
  FileText,
  Copy,
  MessageSquarePlus,
  Command,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Sliders,
  Eye,
  FileJson,
  Download,
  Upload,
  Database,
  Terminal,
  BrainCircuit,
  ChevronUp,
  Info,
  AlertTriangle,
  Search,
  Check,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDocFromServer,
  setDoc,
  getDoc,
  deleteField
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  Novel, 
  NovelSettings, 
  LoreEntry, 
  AIProvider, 
  Notification, 
  NotificationType,
  OperationType,
  FirestoreErrorInfo,
  DuplicateNovelOptions,
  AIEngineTaskType
} from './types';
import { 
  generateTaskContext
} from './services/promptService';
import { 
  generateGeminiContent, 
  generateOpenRouterContent 
} from './services/aiService';
import { GLOBAL_DEFAULTS } from './constants';
import SettingsPanel from './components/SettingsPanel';
import { AIEngineStudioModal } from './components/AIEngineStudioModal';
import { Sidebar } from './components/Sidebar';
import { Codex } from './components/Codex';
import { AuthOverlay } from './components/AuthOverlay';
import { PromptInspector } from './components/PromptInspector';
import { MemoryWorkbench } from './components/MemoryWorkbench';
import { PlotWorkbench } from './components/PlotWorkbench';
import { FullScreenPromptEditor } from './components/FullScreenPromptEditor';
import { GlobalSettings } from './components/GlobalSettings';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { EditorContainer } from './components/EditorContainer';
import { useNotification } from './components/NotificationSystem';
import { cn, handleFirestoreError, getFriendlyErrorMessage } from './lib/utils';
import { useAuth } from './hooks/useAuth';
import { useNovels } from './hooks/useNovels';
import { useNovelContent } from './hooks/useNovelContent';
import { useAIEngine } from './hooks/useAIEngine';
import { useAutoCodex } from './hooks/useAutoCodex';
import { useAutoPlot } from './hooks/useAutoPlot';
import { usePromptPresets } from './hooks/usePromptPresets';
import { createNovelExportEnvelope, parseAndNormalizeNovelUpload } from './lib/novelIO';
import { isDescendantOfLore } from './lib/loreUtils';

// Import prompt markdown files
import novelSystemPrompt from './prompts/novel_system.md?raw';
import codexSystemPrompt from './prompts/codex_system.md?raw';
import memorySystemPrompt from './prompts/memory_system.md?raw';

// --- Tiptap Extensions ---
// Moved to lib/editor/extensions.ts

// --- Types ---
// Moved to types.ts

// --- Constants ---
// GLOBAL_DEFAULTS moved to constants.ts

// --- Sortable Item Component ---

// --- Sortable Item Component ---

export default function App() {
  const { addNotification, removeNotification, updateNotification } = useNotification();
  
  // --- Custom Hooks ---
  const { user, isAuthReady, userSettings, openRouterKey, setOpenRouterKey } = useAuth();
  const { 
    novels, isSaving: isNovelsSaving, addNovel, deleteNovel, updateNovel, duplicateNovel,
    applyOptimisticNovels, setDragLock, getBufferedSnapshot, isDraggingGlobal, registerOrphanedWrite,
    createNovelWithSubcollections, exportCompleteNovelData
  } = useNovels(user, addNotification);
  
  // UI States
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [editingNovelId, setEditingNovelId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  
  // Drag and Drop Intent & Fallback states
  const dragIntentRef = useRef<{ id: string; type: 'reorder' | 'nest' | null; insertBelow: boolean; insertLineTargetId: string | null; targetParentId: string | null; predictedOrder: number } | null>(null);
  const [dragIntent, setDragIntent] = useState<{ id: string; type: 'reorder' | 'nest' | null; insertBelow: boolean; insertLineTargetId: string | null; targetParentId: string | null; predictedOrder: number } | null>(null);
  
  const pointerStartCoordsRef = useRef<{x: number, y: number} | null>(null);
  const lastValidDropTargetRef = useRef<string | null>(null);
  const lastValidPointerCoordsRef = useRef<{x: number, y: number} | null>(null);
  const [debugMode, setDebugMode] = useState(() => {
    const saved = localStorage.getItem('debug_mode');
    return saved ? JSON.parse(saved) : false;
  });

  const [editor, setEditor] = useState<any>(null);
  const editorRef = useRef<any>(null);
  
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const getEditorContent = useCallback(() => {
    return editorRef.current?.getHTML();
  }, []);

  useEffect(() => {
    localStorage.setItem('debug_mode', JSON.stringify(debugMode));
  }, [debugMode]);

  const [showPromptInspector, setShowPromptInspector] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'current' | 'last'>('current');
  const [inspectorExpanded, setInspectorExpanded] = useState<Record<string, boolean>>({ model: true, system: true, history: true, output: true });
  const [inspectionContext, setInspectionContext] = useState<{ type: 'novel' | 'consistency' | 'codex' | 'memory' | 'autocodex' | 'plot', entryId?: string }>({ type: 'novel' });
  
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  
  const { 
    currentNovel, 
    setCurrentNovel, 
    lastSavedNovelRef, 
    lastContentRef, 
    updateLoreEntry, 
    addLoreEntry, 
    deleteLoreEntry,
    moveLoreEntryToRoot,
    healLoreHierarchy,
    addMemoryCard,
    updateMemoryCard,
    deleteMemoryCard,
    commitMemoryProposal,
    saveNovel,
    updateNovelContent,
    hasError,
    isSaving: isNovelSaving
  } = useNovelContent(user, novels, addNotification, removeNotification, updateNotification, setShowSavedIndicator, getEditorContent);

  const {
    incrementChars,
    resetChars,
    acceptProposal,
    rejectProposal,
    acceptPruning,
    rejectPruning,
    isScanning: isAutoCodexScanning,
    scanForProposals,
    lastAutoCodexPromptInfo
  } = useAutoCodex(currentNovel, updateLoreEntry, deleteLoreEntry, addLoreEntry, openRouterKey, addNotification, getEditorContent);

  const {
    isGeneratingPlot,
    pendingPlotProposal,
    lastPlotPromptInfo,
    generatePlot,
    incrementPlotChars,
    clearPendingPlotProposal
  } = useAutoPlot(currentNovel, openRouterKey, addNotification, getEditorContent);

  const handleIncrementChars = (count: number) => {
    incrementChars(count);
    incrementPlotChars(count);
  };

  const {
    presets: promptPresets,
    isLoading: isPresetsLoading,
    savePreset: savePromptPreset,
    deletePreset: deletePromptPreset
  } = usePromptPresets(user);

  const isSaving = isNovelsSaving || isNovelSaving;
  const [editTitle, setEditTitle] = useState("");
  const [novelToDelete, setNovelToDelete] = useState<string | null>(null);
  const [fullScreenEdit, setFullScreenEdit] = useState<{ type: 'system' | 'codexSystem', value: string } | null>(null);
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [isMemoryWorkbenchOpen, setIsMemoryWorkbenchOpen] = useState(false);
  const [isPlotWorkbenchOpen, setIsPlotWorkbenchOpen] = useState(false);
  const [isAIEngineStudioOpen, setIsAIEngineStudioOpen] = useState(false);
  const [aiEngineStudioTask, setAiEngineStudioTask] = useState<AIEngineTaskType>('novel');

  const openAIEngineStudio = useCallback((task: AIEngineTaskType = 'novel') => {
    setAiEngineStudioTask(task);
    setIsAIEngineStudioOpen(true);
  }, []);
  const [plotAIInstruction, setPlotAIInstruction] = useState("");
  const [plotWorkbenchSettings, setPlotWorkbenchSettings] = useState<any>(null);
  const [isMemorySettingsExpanded, setIsMemorySettingsExpanded] = useState(false);
  const [memoryMobileTab, setMemoryMobileTab] = useState<'original' | 'suggestion' | 'instruction'>('suggestion');
  const [editingLoreId, setEditingLoreId] = useState<string | null>(null);
  const [isCodexAIOpen, setIsCodexAIOpen] = useState(false);
  const [isCodexSettingsOpen, setIsCodexSettingsOpen] = useState(false);
  const [codexAIInstruction, setCodexAIInstruction] = useState("");
  const [memoryAIInstruction, setMemoryAIInstruction] = useState("");
  const [memoryWorkbenchSettings, setMemoryWorkbenchSettings] = useState<any>(null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [novelExpandedFolders, setNovelExpandedFolders] = useState<string[]>([]);
  const [showDuplicateMenu, setShowDuplicateMenu] = useState(false);
  const [selectedServer, setSelectedServer] = useState(localStorage.getItem('selected_firebase_server') || 'default');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Listen for Uncatchable Quota Errors
  useEffect(() => {
    const handleQuotaError = () => {
      addNotification({ 
        message: 'DATABASE ERROR: Quota Exceeded. Your changes are NOT being saved. Please upgrade your plan or try again tomorrow.', 
        type: 'error' 
      });
    };
    window.addEventListener('firestore-quota-error', handleQuotaError);
    return () => window.removeEventListener('firestore-quota-error', handleQuotaError);
  }, [addNotification]);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isLocked, setIsLocked] = useState(true);

  const handleServerSwitch = (server: string) => {
    if (server === selectedServer) return;
    localStorage.setItem('selected_firebase_server', server);
    setSelectedServer(server);
    window.location.reload();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const lastNovelIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // When switching novels, reset lastContentRef to ensure the new content is pushed to the editor
    if (currentNovel?.id !== lastNovelIdRef.current) {
      lastContentRef.current = "---RESET---"; // Force a mismatch
      lastNovelIdRef.current = currentNovel?.id || null;
    }
  }, [currentNovel?.id]);

  const {
    isGenerating,
    isCodexGenerating,
    isMemoryGenerating,
    lastGeneratedText,
    lastNovelPromptInfo,
    lastConsistencyPromptInfo,
    lastCodexPromptInfo,
    lastMemoryPromptInfo,
    codexAISuggestion,
    setCodexAISuggestion,
    codexAISpinoffs,
    setCodexAISpinoffs,
    memoryAISuggestion,
    setMemoryAISuggestion,
    memoryAIProposal,
    setMemoryAIProposal,
    handleContinue,
    handleGenerateCodex,
    handleGenerateMemory,
    setLastNovelPromptInfo,
    setLastCodexPromptInfo,
    setLastMemoryPromptInfo,
    handleDryRunNovel
  } = useAIEngine(
    user,
    currentNovel,
    setCurrentNovel,
    editor,
    openRouterKey,
    addNotification,
    removeNotification,
    scrollContainerRef
  );

  const [openSections, setOpenSections] = useState<string[]>(['params']);

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getMyDefaults = () => {
    const savedParams = userSettings?.params || {};
    const savedPrompts = userSettings?.prompts || {};
    
    // Legacy support for old combined key
    const legacySaved = localStorage.getItem('user_default_settings');
    const legacy = legacySaved ? JSON.parse(legacySaved) : {};

    const params = {
      temperature: savedParams.temperature ?? legacy.temperature ?? GLOBAL_DEFAULTS.temperature,
      maxTokens: savedParams.maxTokens ?? legacy.maxTokens ?? GLOBAL_DEFAULTS.maxTokens,
      topP: savedParams.topP ?? legacy.topP ?? GLOBAL_DEFAULTS.topP,
      topK: savedParams.topK ?? legacy.topK ?? GLOBAL_DEFAULTS.topK,
      contextWindow: savedParams.contextWindow ?? legacy.contextWindow ?? GLOBAL_DEFAULTS.contextWindow,
      repetitionPenalty: savedParams.repetitionPenalty ?? legacy.repetitionPenalty ?? GLOBAL_DEFAULTS.repetitionPenalty,
      thinkingLevel: savedParams.thinkingLevel ?? legacy.thinkingLevel ?? GLOBAL_DEFAULTS.thinkingLevel,
      codex: {
        model: savedParams.codex?.model ?? GLOBAL_DEFAULTS.codex.model,
        modelName: savedParams.codex?.modelName ?? GLOBAL_DEFAULTS.codex.modelName,
        temperature: savedParams.codex?.temperature ?? GLOBAL_DEFAULTS.codex.temperature,
        maxTokens: savedParams.codex?.maxTokens ?? GLOBAL_DEFAULTS.codex.maxTokens,
        topP: savedParams.codex?.topP ?? GLOBAL_DEFAULTS.codex.topP,
        topK: savedParams.codex?.topK ?? GLOBAL_DEFAULTS.codex.topK,
        thinkingLevel: savedParams.codex?.thinkingLevel ?? GLOBAL_DEFAULTS.codex.thinkingLevel,
      }
    };
    
    const prompts = {
      systemPrompt: GLOBAL_DEFAULTS.systemPrompt,
      codexSystemPrompt: GLOBAL_DEFAULTS.codexSystemPrompt,
    };
    
    return { ...params, ...prompts };
  };  // --- Prompt Generation Helpers ---
  // Moved to services/promptService.ts
;






  // --- History System ---
  const undo = () => {
    if (editor) {
      editor.commands.undo();
    }
  };

  const redo = () => {
    if (editor) {
      editor.commands.redo();
    }
  };

  const insertInstruction = () => {
    if (editor) {
      (editor.commands as any).setInstruction();
    }
  };

  const openFullScreenEditor = (type: 'system' | 'codexSystem') => {
    if (!currentNovel) return;
    let value = '';
    if (type === 'system') value = currentNovel.settings.systemPrompt || '';
    else if (type === 'codexSystem') value = currentNovel.settings.codexSystemPrompt || GLOBAL_DEFAULTS.codexSystemPrompt;
    
    setFullScreenEdit({ type, value });
  };

  const applyFullScreenEdit = () => {
    if (!currentNovel || !fullScreenEdit) return;
    let field: keyof Novel['settings'] = 'systemPrompt';
    if (fullScreenEdit.type === 'system') field = 'systemPrompt';
    else if (fullScreenEdit.type === 'codexSystem') field = 'codexSystemPrompt';

    // updateNovel을 사용하여 Firestore에 즉시 저장하고 상태를 동기화합니다.
    // (updateNovelContent는 에디터 본문(content) 전용 디바운스 함수이므로 settings가 무시되는 버그가 있었습니다)
    updateNovel(currentNovel.id, {
      settings: { ...currentNovel.settings, [field]: fullScreenEdit.value }
    });
    setFullScreenEdit(null);
  };

  // --- Codex Management ---
  useEffect(() => {
    setIsCodexAIOpen(false);
    setCodexAISuggestion("");
    setCodexAIInstruction("");
  }, [editingLoreId]);




  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id || !currentNovel) return;

    const entries = [...(currentNovel.loreEntries || [])];
    const activeItem = entries.find(e => e.id === active.id);
    if (!activeItem) return;

    // Check if dropped onto the root drop zone
    if (over.id === 'codex-root-drop-zone' || over.id === 'root') {
      if (activeItem.parentId !== null) {
        await moveLoreEntryToRoot(activeItem.id);
      }
      return;
    }

    const flattened = getFlattenedLore(entries);
    const oldIndex = flattened.findIndex(f => f.entry.id === active.id);
    const newIndex = flattened.findIndex(f => f.entry.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const overItem = flattened[newIndex].entry;
      
      // Determine new parent:
      // If activeItem and overItem are already siblings, keep their existing parentId (reorder siblings)
      // Otherwise:
      // - If overItem is a folder, nest active inside overItem
      // - If overItem is an item, adopt overItem's parentId
      let newParentId = activeItem.parentId || null;
      if ((activeItem.parentId || null) !== (overItem.parentId || null)) {
        if (overItem.type === 'folder') {
          newParentId = overItem.id;
        } else {
          newParentId = overItem.parentId || null;
        }
      }

      // Circular Reference & Self/Descendant Guard:
      // An item (especially a folder) cannot have itself or any of its descendants as its parent!
      if (newParentId) {
        if (active.id === newParentId || isDescendantOfLore(newParentId, String(active.id), entries)) {
          addNotification({ 
            message: '폴더를 자기 자신이나 하위 항목 안으로 이동할 수 없습니다.', 
            type: 'error' 
          });
          return;
        }
      }

      // Get all siblings under newParentId excluding activeItem
      const siblings = entries
        .filter(e => (e.parentId || null) === (newParentId || null) && e.id !== active.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      let insertIdx = siblings.findIndex(s => s.id === overItem.id);
      if (insertIdx === -1) {
        insertIdx = siblings.length;
      } else {
        if (oldIndex < newIndex) {
          insertIdx += 1;
        }
      }

      siblings.splice(insertIdx, 0, { ...activeItem, parentId: newParentId });

      // Create clean, gap-spaced orders (0, 10, 20...) for siblings
      const siblingOrderMap = new Map<string, number>();
      siblings.forEach((s, idx) => {
        siblingOrderMap.set(s.id, idx * 10);
      });

      // Update original entries array without modifying unrelated entries
      const updatedEntries = entries.map(entry => {
        if (entry.id === active.id) {
          return {
            ...entry,
            parentId: newParentId,
            order: siblingOrderMap.get(entry.id) ?? entry.order
          };
        }
        if (siblingOrderMap.has(entry.id)) {
          return {
            ...entry,
            order: siblingOrderMap.get(entry.id)!
          };
        }
        return entry;
      });

      // If nested into a folder, ensure the folder is expanded so user sees the dropped item
      if (newParentId && !expandedFolders.includes(newParentId)) {
        setExpandedFolders(prev => [...prev, newParentId]);
      }

      // Optimistic local state update for zero-lag UI feedback
      setCurrentNovel({
        ...currentNovel,
        loreEntries: updatedEntries
      });

      // Update Firestore for each affected entry
      try {
        const batch: Promise<void>[] = [];
        updatedEntries.forEach(entry => {
          if (entry.id === active.id || siblingOrderMap.has(entry.id)) {
            batch.push(updateDoc(doc(db, 'novels', currentNovel.id, 'loreEntries', entry.id), {
              parentId: entry.parentId || null,
              order: entry.order,
              updatedAt: serverTimestamp()
            }));
          }
        });
        await Promise.all(batch);
      } catch (error) {
        console.error("Failed to update lore positions:", error);
        addNotification({ message: '항목 위치 저장에 실패했습니다.', type: 'error' });
      }
    }
  };

  const getFlattenedLore = (
    entries: LoreEntry[], 
    parentId: string | null = null, 
    depth = 0,
    visitedIds: Set<string> = new Set()
  ): { entry: LoreEntry, depth: number }[] => {
    const sorted = entries
      .filter(e => (e.parentId || null) === (parentId || null))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    let result: { entry: LoreEntry, depth: number }[] = [];
    for (const entry of sorted) {
      if (visitedIds.has(entry.id)) continue; // Guard against circular loops
      visitedIds.add(entry.id);

      result.push({ entry, depth });
      if (entry.type === 'folder' && expandedFolders.includes(entry.id)) {
        result = [...result, ...getFlattenedLore(entries, entry.id, depth + 1, visitedIds)];
      }
    }

    // Safety net: At top level (depth === 0), ONLY surface TRUE orphans
    // (items whose parentId is set, but the parent folder does not exist in entries at all)
    if (depth === 0) {
      const folderIds = new Set(entries.filter(e => e.type === 'folder').map(e => e.id));
      const trueOrphans = entries
        .filter(e => e.parentId !== null && !folderIds.has(e.parentId) && !visitedIds.has(e.id))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      for (const orphan of trueOrphans) {
        visitedIds.add(orphan.id);
        result.push({ entry: orphan, depth: 0 });
        if (orphan.type === 'folder' && expandedFolders.includes(orphan.id)) {
          result = [...result, ...getFlattenedLore(entries, orphan.id, 1, visitedIds)];
        }
      }
    }

    return result;
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const toggleNovelFolder = (id: string) => {
    setNovelExpandedFolders(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const handleNovelDragStart = (event: any) => {
    setActiveDragId(event.active.id);
    setDragLock(true);
    
    if (event.activatorEvent) {
      pointerStartCoordsRef.current = {
        x: 'clientX' in event.activatorEvent ? event.activatorEvent.clientX : (event.activatorEvent as TouchEvent).touches?.[0]?.clientX || 0,
        y: 'clientY' in event.activatorEvent ? event.activatorEvent.clientY : (event.activatorEvent as TouchEvent).touches?.[0]?.clientY || 0
      };
    }
  };

  const handleNovelDragOver = (event: any) => {
    const { active, over, delta } = event;
    if (!active || !over || active.id === over.id || !pointerStartCoordsRef.current) return;

    const currentPointer = {
      x: pointerStartCoordsRef.current.x + delta.x,
      y: pointerStartCoordsRef.current.y + delta.y
    };

    lastValidDropTargetRef.current = String(over.id);
    lastValidPointerCoordsRef.current = currentPointer;

    let overId = String(over.id);
    let type: 'reorder' | 'nest' | null = 'reorder';
    
    if (overId.startsWith('placeholder-')) {
      overId = overId.replace('placeholder-', '');
      type = 'nest';
    } else if (overId.startsWith('nest-')) {
      overId = overId.replace('nest-', '');
      type = 'nest';
    }

    const activeItem = novels.find(n => n.id === String(active.id));
    const overItemRaw = novels.find(n => n.id === overId);
    if (!activeItem || !overItemRaw) return;

    // Circular Reference Guard
    const isDescendantOf = (childId: string, parentId: string): boolean => {
      let current = novels.find(n => n.id === childId);
      while (current && current.parentId) {
        if (current.parentId === parentId) return true;
        current = novels.find(n => n.id === current.parentId);
      }
      return false;
    };

    let targetParentId = type === 'nest' ? overId : (overItemRaw.parentId || null);

    if (activeItem.type === 'folder' && targetParentId) {
      if (active.id === targetParentId || isDescendantOf(targetParentId, String(active.id))) {
        return; // Invalid target
      }
    }

    const siblings = novels
      .filter(n => (n.parentId || null) === targetParentId && n.id !== String(active.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    let predictedOrder = 65536;
    let insertLineTargetId: string | null = null;
    let insertBelow = false;

    if (type === 'nest') {
       if (siblings.length > 0) {
         predictedOrder = Math.floor((0 + (siblings[0].order || 65536)) / 2);
       }
       insertLineTargetId = overId; 
    } else {
       let insertAfterIndex = -1;
       
       for (let i = 0; i < siblings.length; i++) {
         const sibling = siblings[i];
         const siblingElement = document.getElementById(`sortable-item-${sibling.id}`);
         if (siblingElement && currentPointer) {
            const rect = siblingElement.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (currentPointer.y > midpoint) {
              insertAfterIndex = i;
            }
         }
       }

       if (insertAfterIndex === -1) {
         insertBelow = false;
         insertLineTargetId = siblings.length > 0 ? siblings[0].id : overId;
         predictedOrder = siblings.length > 0 ? Math.floor((siblings[0].order || 65536) / 2) : 65536;
       } else {
         insertBelow = true;
         insertLineTargetId = siblings[insertAfterIndex].id;
         const prevOrder = siblings[insertAfterIndex].order || 0;
         const nextOrder = insertAfterIndex + 1 < siblings.length ? (siblings[insertAfterIndex + 1].order || prevOrder + 65536 * 2) : prevOrder + 65536 * 2;
         predictedOrder = Math.floor((prevOrder + nextOrder) / 2);
       }
    }

    if (predictedOrder === 0) predictedOrder = 65536;

    const newIntent = {
      id: overId,
      type,
      insertBelow,
      insertLineTargetId,
      targetParentId,
      predictedOrder
    };

    const isSame = dragIntentRef.current?.id === newIntent.id && 
                   dragIntentRef.current?.type === newIntent.type &&
                   dragIntentRef.current?.insertBelow === newIntent.insertBelow &&
                   dragIntentRef.current?.insertLineTargetId === newIntent.insertLineTargetId &&
                   dragIntentRef.current?.predictedOrder === newIntent.predictedOrder &&
                   dragIntentRef.current?.targetParentId === newIntent.targetParentId;

    if (!isSame) {
       dragIntentRef.current = newIntent;
       setDragIntent(newIntent);
    }
  };

  const clearDragState = () => {
    setActiveDragId(null);
    setDragLock(false);
    setDragIntent(null);
    dragIntentRef.current = null;
    pointerStartCoordsRef.current = null;
    lastValidDropTargetRef.current = null;
    lastValidPointerCoordsRef.current = null;
  };

  const handleNovelDragCancel = () => {
    clearDragState();
  };

  const handleNovelDragEnd = async (event: any) => {
    const { active, over } = event;
    let actualOverId = over ? String(over.id) : null;
    let actualPointer = lastValidPointerCoordsRef.current;

    // Fallback & Stale Check
    if (!over || active.id === actualOverId) {
       if (lastValidDropTargetRef.current && pointerStartCoordsRef.current && actualPointer) {
           const currentAbsPointer = {
               x: pointerStartCoordsRef.current.x + event.delta.x,
               y: pointerStartCoordsRef.current.y + event.delta.y
           };
           const diffX = currentAbsPointer.x - actualPointer.x;
           const diffY = currentAbsPointer.y - actualPointer.y;
           const dist = Math.sqrt(diffX*diffX + diffY*diffY);
           
           if (dist <= 30) {
               // Fallback accepted
           } else {
               clearDragState();
               return;
           }
       } else {
           clearDragState();
           return;
       }
    }

    const activeId = String(active.id);

    // Single Source of Truth
    const intent = dragIntentRef.current;
    if (!intent) {
      clearDragState();
      return;
    }

    const { targetParentId, predictedOrder } = intent;

    // Deep Cross-Validation (Check if buffered snapshot removed them)
    const bufferedSnapshot = getBufferedSnapshot();
    if (bufferedSnapshot) {
      const activeExists = bufferedSnapshot.some(n => n.id === activeId);
      const overExists = bufferedSnapshot.some(n => n.id === intent.id);
      if (!activeExists || (!overExists && intent.id !== 'root')) {
        addNotification({ message: 'Item was modified remotely. Canceling drag.', type: 'error' });
        clearDragState(); // will flush latest
        return;
      }
    }

    // Optimistic Array Mutation
    const backupNovels = [...novels]; // Rollback cache
    const updatedNovels = novels.map(n => {
      if (n.id === activeId) {
        return { ...n, parentId: targetParentId, order: predictedOrder };
      }
      return n;
    });

    applyOptimisticNovels(updatedNovels);
    
    // Auto-expand folder if nested
    if (intent.type === 'nest' && !novelExpandedFolders.includes(intent.id)) {
      setNovelExpandedFolders(prev => [...prev, intent.id]);
    }

    clearDragState();

    // Network Phase & Timeout Guard
    try {
      const updatePromise = updateDoc(doc(db, 'novels', activeId), {
        parentId: targetParentId || null,
        order: predictedOrder
      });

      const timeoutPromise = new Promise<{timeout: boolean}>((resolve) => setTimeout(() => resolve({timeout: true}), 10000));
      const result = await Promise.race([updatePromise.then(() => ({timeout: false})), timeoutPromise]);
      
      if (result.timeout) {
        addNotification({ message: 'Network slow. Drag updates delayed.', type: 'info' });
        registerOrphanedWrite(activeId);
      }
      
    } catch (error) {
      console.error('Network write failed explicitly:', error);
      applyOptimisticNovels(backupNovels); // Rollback
      addNotification({ message: 'Failed to move item.', type: 'error' });
    } finally {
      setDragLock(false);
    }
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNovel();
      }
      // Ctrl + Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        if (editor?.can().undo()) {
          e.preventDefault();
          undo();
        }
      }
      // Ctrl + Y or Ctrl + Shift + Z: Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        if (editor?.can().redo()) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNovel, editor, isGenerating, isSaving]);

  // --- Actions ---
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create user document if it doesn't exist
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const createNewNovel = async (parentId: string | null = null, type: 'item' | 'folder' = 'item') => {
    if (!user) return;
    const myDefaults = getMyDefaults();
    const maxOrder = novels.length > 0 ? Math.max(...novels.map(n => n.order || 0)) : 0;
    
    const newNovelData = {
      title: type === 'item' ? "Untitled Novel" : "New Folder",
      authorUid: user.uid,
      createdAt: Date.now(),
      updatedAt: serverTimestamp(),
      storyMemory: "",
      type,
      parentId,
      order: maxOrder + 1,
      settings: {
        model: 'gemini',
        modelName: 'gemini-3.8-flash',
        context: "",
        ...myDefaults
      }
    };
    try {
      if (type === 'item') {
         const docId = await createNovelWithSubcollections(newNovelData as any, "", []);
         if (docId) {
            setEditingNovelId(docId);
            setEditTitle(newNovelData.title);
            setCurrentNovel({ id: docId, ...newNovelData, content: "" } as any);
         }
      } else {
         const docRef = await addDoc(collection(db, 'novels'), newNovelData);
         setEditingNovelId(docRef.id);
         setEditTitle(newNovelData.title);
      }
    } catch (error) {
      addNotification({ message: getFriendlyErrorMessage(error), type: 'error' });
      // Throws but we've intercepted console.error globally, so user is aware if it's Quota
      // We don't want to crash the UI thread, so we'll just log
      console.error("Create Novel Error", error);
    }
  };

  const downloadNovel = async (novel: Novel) => {
    let nid: string | null = null;
    try {
      let envelope: any = null;
      let preSaveFailed = false;

      // 1. If downloading the currently active novel:
      if (currentNovel?.id === novel.id) {
        nid = addNotification({ message: '소설 다운로드 준비 중 (최신 에디터 상태 동기화)...', type: 'loading' });

        // 1-A. Non-blocking Pre-save attempt:
        // Try saving to DB, but NEVER block or abort the download if Firestore fails/rejects (e.g. Quota Exceeded)
        try {
          const saveOk = await saveNovel(undefined, true);
          if (!saveOk) {
            preSaveFailed = true;
          }
        } catch (saveErr) {
          console.warn("Pre-save failed (e.g. Quota or network issue). Proceeding with live memory snapshot:", saveErr);
          preSaveFailed = true;
        }

        // 1-B. In-Memory Hot Snapshot Export (Zero-I/O guarantee):
        // Pull the freshest live HTML directly from Tiptap editor memory
        const liveContent = getEditorContent?.() ?? currentNovel.content ?? "";
        const activeExportNovel: Novel = {
          ...currentNovel,
          content: liveContent,
          plot: currentNovel.plot || "",
          storyMemory: currentNovel.storyMemory || "",
          memoryCards: currentNovel.memoryCards || [],
        };

        // Create standard V2 envelope directly from memory without triggering Firestore reads
        envelope = createNovelExportEnvelope(activeExportNovel);
      } else {
        // 2. Downloading an inactive novel from sidebar:
        // Must fetch from Firestore since it's not currently mounted in memory
        nid = addNotification({ message: '데이터베이스에서 백업 데이터를 생성 중입니다...', type: 'loading' });

        try {
          const exportData = await exportCompleteNovelData(novel.id);
          envelope = createNovelExportEnvelope(exportData);
        } catch (fetchErr: any) {
          console.error("Failed to fetch novel from DB for export:", fetchErr);
          const isQuota = fetchErr?.code === 'resource-exhausted' || 
                          fetchErr?.message?.includes('RESOURCE_EXHAUSTED') || 
                          fetchErr?.message?.includes('Quota exceeded') ||
                          fetchErr?.message?.includes('quota');
          if (isQuota) {
            if (nid) removeNotification(nid);
            addNotification({
              message: 'Firestore 일일 할당량이 초과되어 보관된 소설을 불러올 수 없습니다. 해당 소설을 먼저 에디터로 열어두신 후 다운로드해 주세요.',
              type: 'error'
            });
          } else {
            if (nid) removeNotification(nid);
            addNotification({
              message: `소설 데이터를 불러오는 데 실패했습니다: ${getFriendlyErrorMessage(fetchErr)}`,
              type: 'error'
            });
          }
          return;
        }
      }

      if (!envelope) {
        throw new Error("Failed to generate export envelope");
      }

      // 3. Trigger Browser Download
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${envelope.metadata.title || 'novel'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (nid) removeNotification(nid);

      if (preSaveFailed) {
        addNotification({ 
          message: `소설 다운로드 완료: "${envelope.metadata.title}" (DB 할당량 초과 등으로 서버 저장은 건너뛰었으나, 에디터의 최신 본문과 데이터를 안전하게 로컬 백업했습니다. 본문 ${envelope.metadata.charCount.toLocaleString()}자, 코덱스 ${envelope.metadata.loreCount}개)`, 
          type: 'info' 
        });
      } else {
        addNotification({ 
          message: `소설 다운로드 완료: "${envelope.metadata.title}" (V2 표준 백업, 본문 ${envelope.metadata.charCount.toLocaleString()}자, 코덱스 ${envelope.metadata.loreCount}개)`, 
          type: 'success' 
        });
      }
    } catch (e: any) {
      console.error("Export failure:", e);
      if (nid) removeNotification(nid);
      addNotification({ message: `소설 다운로드 중 오류가 발생했습니다: ${getFriendlyErrorMessage(e)}`, type: 'error' });
    }
  };

  const handleUploadNovel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    // Clear value to allow re-uploading same file
    event.target.value = '';

    let nid: string | null = null;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        nid = addNotification({ message: '소설 파일 분석 및 정규화 중...', type: 'loading' });
        const rawJson = e.target?.result as string;
        const maxOrder = novels.length > 0 ? Math.max(...novels.map(n => n.order || 0)) : 0;

        const { novelMetadata, content, loreEntries, memoryCards, stats } = parseAndNormalizeNovelUpload(rawJson, user.uid, maxOrder);

        if (nid) updateNotification(nid, { message: '데이터베이스에 소설을 복원하는 중...', type: 'loading' });
        
        await createNovelWithSubcollections(novelMetadata, content, loreEntries, {
          memoryCards
        });

        if (nid) removeNotification(nid);
        const featureDetails = [
          stats.hasPlot ? '플롯 청사진' : null,
          stats.hasStoryMemory ? '스토리 메모리' : null,
          stats.memoryCardCount ? `보관소 카드 ${stats.memoryCardCount}장` : null,
          stats.isV2 ? 'V2 표준' : '레거시 V1 자동 변환'
        ].filter(Boolean).join(', ');

        addNotification({ 
          message: `소설 가져오기 완료: "${stats.title}" (본문 ${stats.charCount.toLocaleString()}자, 코덱스 ${stats.loreCount}개 | ${featureDetails})`, 
          type: 'success',
          duration: 5000
        });
      } catch (err: any) {
        console.error("Upload failed", err);
        if (nid) removeNotification(nid);
        addNotification({ 
          message: `소설 업로드 실패: ${err.message || "올바른 JSON 파일이 아닙니다."}`, 
          type: 'error' 
        });
      }
    };
    reader.readAsText(file);
  };



  const handleDuplicateNovel = async (options: DuplicateNovelOptions | boolean) => {
    if (!currentNovel) return;
    const normalizedOptions: DuplicateNovelOptions = typeof options === 'boolean'
      ? { mode: options ? 'full' : 'settings_only', includeContent: options }
      : options;

    const newId = await duplicateNovel(currentNovel.id, normalizedOptions);
    if (newId) {
      // 1. Strip hydrated data
      const { content, loreEntries, ...pureMetadata } = currentNovel;
      // 2. Build unhydrated state (same for all duplicate options)
      setCurrentNovel({
        ...pureMetadata,
        id: newId,
        title: pureMetadata.title + " (Copy)",
        loreEntries: [], // Stripped safely
        content: undefined, // Explicitly triggers Loading UI & Unmounts Editor
      } as any);
    }
  };

  const updateOpenRouterKey = async (key: string) => {
    setOpenRouterKey(key);
    localStorage.setItem('openrouter_key', key);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          'settings.openRouterKey': key
        });
      } catch (error) {
        console.error("Failed to save API key to cloud:", error);
      }
    }
  };

  const startEditingTitle = (novel: Novel) => {
    setEditingNovelId(novel.id);
    setEditTitle(novel.title);
  };

  const saveTitle = async (novel: Novel) => {
    if (!editTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'novels', novel.id), {
        title: editTitle,
        updatedAt: serverTimestamp()
      });
      if (currentNovel?.id === novel.id) {
        setCurrentNovel({ ...currentNovel, title: editTitle });
      }
    } catch (error) {
      console.error("Failed to update title:", error);
    } finally {
      setEditingNovelId(null);
    }
  };

  const resetParamsToDefaults = () => {
    if (!currentNovel) return;
    const defaults = userSettings?.params || {
      temperature: GLOBAL_DEFAULTS.temperature,
      maxTokens: GLOBAL_DEFAULTS.maxTokens,
      topP: GLOBAL_DEFAULTS.topP,
      topK: GLOBAL_DEFAULTS.topK,
      contextWindow: GLOBAL_DEFAULTS.contextWindow,
      thinkingLevel: GLOBAL_DEFAULTS.thinkingLevel,
    };
    updateNovel(currentNovel.id, {
      settings: { ...currentNovel.settings, ...defaults }
    });
  };

  const saveParamsAsDefaults = async () => {
    if (!currentNovel || !user) return;
    const { temperature, maxTokens, topP, topK, contextWindow, thinkingLevel } = currentNovel.settings;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'settings.params': { temperature, maxTokens, topP, topK, contextWindow, thinkingLevel }
      });
      addNotification({ message: "Generation parameters saved as global defaults!", type: 'success' });
    } catch (error) {
      console.error("Failed to save defaults:", error);
      addNotification({ message: "Failed to save defaults to cloud.", type: 'error' });
    }
  };

  const resetPromptsToDefaults = () => {
    if (!currentNovel) return;
    const defaults = {
      systemPrompt: GLOBAL_DEFAULTS.systemPrompt,
      codexSystemPrompt: GLOBAL_DEFAULTS.codexSystemPrompt,
    };
    
    // Update local state immediately for instant UI feedback
    setCurrentNovel({
      ...currentNovel,
      settings: { ...currentNovel.settings, ...defaults }
    });

    // Persist to Firestore
    updateNovel(currentNovel.id, {
      settings: { ...currentNovel.settings, ...defaults }
    });
    addNotification({ message: "Prompts hard reset to system defaults.", type: 'success' });
  };

  // --- Render Helpers ---
  return (
    <div className="h-screen w-screen flex bg-zinc-950 text-zinc-100 font-sans overflow-hidden relative">
      <AuthOverlay 
        isAuthReady={isAuthReady}
        user={user}
        handleLogin={handleLogin}
      />
      
      {user && (
        <>
          <Sidebar 
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            novels={novels}
            currentNovel={currentNovel}
            setCurrentNovel={(n) => {
              if (currentNovel?.id !== n?.id && n?.type !== 'folder') {
                if (currentNovel) {
                  saveNovel(undefined, true);
                }
                setCurrentNovel(n);
              }
            }}
            createNewNovel={createNewNovel}
            handleUploadNovel={handleUploadNovel}
            uploadInputRef={uploadInputRef}
            sensors={sensors}
            handleNovelDragStart={handleNovelDragStart}
            handleNovelDragOver={handleNovelDragOver}
            handleNovelDragEnd={handleNovelDragEnd}
            handleNovelDragCancel={handleNovelDragCancel}
            activeDragId={activeDragId}
            dragIntent={dragIntent}
            editingNovelId={editingNovelId}
            editTitle={editTitle}
            startEditingTitle={startEditingTitle}
            setEditTitle={setEditTitle}
            saveTitle={saveTitle}
            setNovelToDelete={setNovelToDelete}
            downloadNovel={downloadNovel}
            novelExpandedFolders={novelExpandedFolders}
            toggleNovelFolder={toggleNovelFolder}
            user={user}
            setIsGlobalSettingsOpen={setIsGlobalSettingsOpen}
            handleLogout={handleLogout}
          />

          {/* Main Content */}
          <main className="flex-1 h-full flex flex-col relative min-w-0 overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-md z-10">
              <div className="flex items-center gap-4 flex-1">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400"
                >
                  <Menu className="w-5 h-5" />
                </button>
                {currentNovel && (
                  <input 
                    value={currentNovel.title || ''}
                    onChange={(e) => setCurrentNovel({ ...currentNovel, title: e.target.value })}
                    onBlur={() => saveNovel(undefined, true)}
                    className="bg-transparent border-none focus:ring-0 text-lg font-semibold text-zinc-100 w-full max-w-md placeholder-zinc-700"
                    placeholder="Novel Title..."
                  />
                )}
              </div>

              <div className="flex items-center gap-3">
                <AnimatePresence>
                  {isSaving && !showSavedIndicator && (
                    <motion.div
                      key="saving-indicator"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 px-2 py-1"
                    >
                      <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Saving...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {showSavedIndicator && (
                    <motion.div
                      key="saved-indicator"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Saved</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {currentNovel && (
                  <>
                    <button 
                      onClick={() => saveNovel()}
                      disabled={isSaving}
                      className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white disabled:opacity-50"
                    >
                      <Save className={cn("w-5 h-5", isSaving && "animate-pulse")} />
                    </button>
                    <button 
                      onClick={() => downloadNovel(currentNovel)}
                      className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white"
                      title="Download Novel"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => {
                        setInspectionContext({ type: 'novel' });
                        setShowPromptInspector(true);
                      }}
                      className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white"
                      title="Inspect Prompt"
                    >
                      <History className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white"
                      data-testid="settings-button"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </header>

            {hasError ? (
              <div className="flex-1 flex flex-col items-center justify-center text-red-500 space-y-4">
                <AlertTriangle className="w-12 h-12" />
                <p className="text-lg">Failed to load novel content. Check your connection.</p>
              </div>
            ) : !currentNovel ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4 select-none">
                <BookOpen className="w-16 h-16 opacity-20" />
                <p className="text-lg font-medium opacity-50">Select a novel to start writing</p>
              </div>
            ) : currentNovel.content === undefined ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-zinc-800" />
                <p className="text-lg animate-pulse">Loading story...</p>
              </div>
            ) : (
              <EditorContainer 
                key={currentNovel.id}
                currentNovel={currentNovel}
                onEditorReady={setEditor}
                scrollContainerRef={scrollContainerRef}
                setIsCodexOpen={setIsCodexOpen}
                setIsPlotWorkbenchOpen={setIsPlotWorkbenchOpen}
                hasPendingPlotProposal={!!pendingPlotProposal}
                handleContinue={handleContinue}
                handleDryRunNovel={handleDryRunNovel}
                isGenerating={isGenerating}
                createNewNovel={createNewNovel}
                debugMode={debugMode}
                updateNovelContent={updateNovelContent}
                incrementChars={handleIncrementChars}
                lastContentRef={lastContentRef}
              />
            )}
          </main>

          {/* Settings Overlay */}
          {currentNovel && (
            <SettingsPanel 
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              currentNovel={currentNovel}
              setCurrentNovel={setCurrentNovel}
              updateNovel={updateNovel}
              openSections={openSections}
              toggleSection={toggleSection}
              isLocked={isLocked}
              setIsLocked={setIsLocked}
              openRouterKey={openRouterKey}
              setIsGlobalSettingsOpen={setIsGlobalSettingsOpen}
              openFullScreenEditor={openFullScreenEditor}
              resetPromptsToDefaults={resetPromptsToDefaults}
              resetParamsToDefaults={resetParamsToDefaults}
              saveParamsAsDefaults={saveParamsAsDefaults}
              setMemoryAIInstruction={setMemoryAIInstruction}
              setMemoryAISuggestion={setMemoryAISuggestion}
              setMemoryWorkbenchSettings={setMemoryWorkbenchSettings}
              setIsMemoryWorkbenchOpen={setIsMemoryWorkbenchOpen}
              setIsPlotWorkbenchOpen={setIsPlotWorkbenchOpen}
              setPlotAIInstruction={setPlotAIInstruction}
              setPlotWorkbenchSettings={setPlotWorkbenchSettings}
              duplicateNovel={handleDuplicateNovel}
              onDelete={deleteNovel}
              saveNovel={saveNovel}
              promptPresets={promptPresets}
              savePromptPreset={savePromptPreset}
              deletePromptPreset={deletePromptPreset}
              isPresetsLoading={isPresetsLoading}
              openAIEngineStudio={openAIEngineStudio}
              scanForProposals={scanForProposals}
              isAutoCodexScanning={isAutoCodexScanning}
            />
          )}

          {/* Unified AI Engine Studio Modal */}
          {currentNovel && (
            <AIEngineStudioModal 
              isOpen={isAIEngineStudioOpen}
              onClose={() => setIsAIEngineStudioOpen(false)}
              currentNovel={currentNovel}
              setCurrentNovel={setCurrentNovel}
              updateNovel={updateNovel}
              initialTask={aiEngineStudioTask}
              openRouterKey={openRouterKey}
              setIsGlobalSettingsOpen={setIsGlobalSettingsOpen}
            />
          )}

          <PromptInspector 
            showPromptInspector={showPromptInspector}
            setShowPromptInspector={setShowPromptInspector}
            inspectorTab={inspectorTab}
            setInspectorTab={setInspectorTab}
            inspectorExpanded={inspectorExpanded}
            setInspectorExpanded={setInspectorExpanded}
            inspectionContext={inspectionContext}
            setInspectionContext={setInspectionContext}
            currentNovel={currentNovel}
            editingLoreId={editingLoreId}
            codexAIInstruction={codexAIInstruction}
            memoryAIInstruction={memoryAIInstruction}
            memoryWorkbenchSettings={memoryWorkbenchSettings}
            plotAIInstruction={plotAIInstruction}
            plotWorkbenchSettings={plotWorkbenchSettings}
            lastNovelPromptInfo={lastNovelPromptInfo}
            lastConsistencyPromptInfo={lastConsistencyPromptInfo}
            lastCodexPromptInfo={lastCodexPromptInfo}
            lastMemoryPromptInfo={lastMemoryPromptInfo}
            lastAutoCodexPromptInfo={lastAutoCodexPromptInfo}
            lastPlotPromptInfo={lastPlotPromptInfo}
            generateTaskContext={generateTaskContext}
            getEditorContent={getEditorContent}
          />

          <MemoryWorkbench 
            isOpen={isMemoryWorkbenchOpen}
            onClose={() => setIsMemoryWorkbenchOpen(false)}
            currentNovel={currentNovel}
            memoryAIInstruction={memoryAIInstruction}
            setMemoryAIInstruction={setMemoryAIInstruction}
            memoryWorkbenchSettings={memoryWorkbenchSettings}
            setMemoryWorkbenchSettings={setMemoryWorkbenchSettings}
            isMemoryGenerating={isMemoryGenerating}
            handleGenerateMemory={handleGenerateMemory}
            memoryAISuggestion={memoryAISuggestion}
            setMemoryAISuggestion={setMemoryAISuggestion}
            memoryAIProposal={memoryAIProposal}
            setMemoryAIProposal={setMemoryAIProposal}
            memoryCards={currentNovel?.memoryCards || []}
            addMemoryCard={addMemoryCard}
            updateMemoryCard={updateMemoryCard}
            deleteMemoryCard={deleteMemoryCard}
            commitMemoryProposal={commitMemoryProposal}
            updateNovelContent={updateNovelContent}
            setInspectionContext={setInspectionContext}
            setShowPromptInspector={setShowPromptInspector}
            isMemorySettingsExpanded={isMemorySettingsExpanded}
            setIsMemorySettingsExpanded={setIsMemorySettingsExpanded}
            memoryMobileTab={memoryMobileTab}
            setMemoryMobileTab={setMemoryMobileTab}
            openAIEngineStudio={openAIEngineStudio}
          />

          <PlotWorkbench 
            isOpen={isPlotWorkbenchOpen}
            onClose={() => setIsPlotWorkbenchOpen(false)}
            currentNovel={currentNovel}
            updateNovelContent={updateNovelContent}
            plotAIInstruction={plotAIInstruction}
            setPlotAIInstruction={setPlotAIInstruction}
            plotWorkbenchSettings={plotWorkbenchSettings || currentNovel?.settings.plot || GLOBAL_DEFAULTS.plot}
            setPlotWorkbenchSettings={setPlotWorkbenchSettings}
            isGeneratingPlot={isGeneratingPlot}
            handleGeneratePlot={(instruction, settings) => generatePlot({ isManual: true, userInstruction: instruction, customSettings: settings })}
            pendingPlotProposal={pendingPlotProposal}
            clearPendingPlotProposal={clearPendingPlotProposal}
            setInspectionContext={setInspectionContext}
            setShowPromptInspector={setShowPromptInspector}
            openAIEngineStudio={openAIEngineStudio}
          />

          <FullScreenPromptEditor 
            fullScreenEdit={fullScreenEdit}
            setFullScreenEdit={setFullScreenEdit}
            applyFullScreenEdit={applyFullScreenEdit}
          />

          {/* Debug Trace for Codex Parent Visibility */}
          {isCodexOpen ? (
            <motion.div key="codex-parent-active">
              <Codex 
                isCodexOpen={isCodexOpen}
                setIsCodexOpen={setIsCodexOpen}
                currentNovel={currentNovel}
                setCurrentNovel={setCurrentNovel}
                editingLoreId={editingLoreId}
                setEditingLoreId={setEditingLoreId}
                addLoreEntry={addLoreEntry}
                updateLoreEntry={updateLoreEntry}
                deleteLoreEntry={deleteLoreEntry}
                onMoveToRoot={moveLoreEntryToRoot}
                onHealHierarchy={healLoreHierarchy}
                getFlattenedLore={getFlattenedLore}
                sensors={sensors}
                handleDragEnd={handleDragEnd}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                isCodexAIOpen={isCodexAIOpen}
                setIsCodexAIOpen={setIsCodexAIOpen}
                isCodexSettingsOpen={isCodexSettingsOpen}
                setIsCodexSettingsOpen={setIsCodexSettingsOpen}
                isCodexGenerating={isCodexGenerating}
                codexAISuggestion={codexAISuggestion}
                setCodexAISuggestion={setCodexAISuggestion}
                codexAISpinoffs={codexAISpinoffs}
                setCodexAISpinoffs={setCodexAISpinoffs}
                codexAIInstruction={codexAIInstruction}
                setCodexAIInstruction={setCodexAIInstruction}
                handleGenerateCodex={(entry) => { void handleGenerateCodex(entry, codexAIInstruction); }}
                generateTaskContext={generateTaskContext}
                setLastCodexPromptInfo={setLastCodexPromptInfo}
                lastCodexPromptInfo={lastCodexPromptInfo}
                setInspectionContext={setInspectionContext}
                setShowPromptInspector={setShowPromptInspector}
                openRouterKey={openRouterKey}
                setIsGlobalSettingsOpen={setIsGlobalSettingsOpen}
                acceptProposal={acceptProposal}
                rejectProposal={rejectProposal}
                acceptPruning={acceptPruning}
                rejectPruning={rejectPruning}
                isScanning={isAutoCodexScanning}
                scanForProposals={(options) => scanForProposals(options)}
                openAIEngineStudio={openAIEngineStudio}
              />
            </motion.div>
          ) : (
            <div key="codex-parent-inactive" />
          )}

          <GlobalSettings 
            isOpen={isGlobalSettingsOpen}
            onClose={() => setIsGlobalSettingsOpen(false)}
            openRouterKey={openRouterKey}
            updateOpenRouterKey={updateOpenRouterKey}
            selectedServer={selectedServer}
            handleServerSwitch={handleServerSwitch}
            debugMode={debugMode}
            setDebugMode={setDebugMode}
          />

          <DeleteConfirmationModal 
            novelToDelete={novelToDelete}
            setNovelToDelete={setNovelToDelete}
            onDelete={deleteNovel}
          />
        </>
      )}
    </div>
  );
}
