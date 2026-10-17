import { Novel, NovelSettings, LoreEntry, NovelExportEnvelopeV2 } from '../types';
import { GLOBAL_DEFAULTS, getValidThinkingLevel } from '../constants';

/**
 * Sanitizes deprecated or unauthorized model IDs to prevent 403 PERMISSION_DENIED errors.
 */
function sanitizeLegacyModelName(modelName: string | undefined, provider?: string): string {
  if (!modelName) return provider === 'openrouter' ? 'google/gemini-3.8-flash' : 'gemini-3.8-flash';
  if (modelName === 'gemini-3.6-flash' || modelName === 'google/gemini-3.6-flash') {
    return provider === 'openrouter' || modelName.startsWith('google/') 
      ? 'google/gemini-3.8-flash' 
      : 'gemini-3.8-flash';
  }
  return modelName;
}

/**
 * Deep merges incoming settings with GLOBAL_DEFAULTS to guarantee zero missing keys
 * and sanitizes thinkingLevel and models against runtime errors.
 */
export function deepMergeNovelSettings(incoming?: Partial<NovelSettings>): NovelSettings {
  const base = { ...GLOBAL_DEFAULTS };
  if (!incoming) return base as NovelSettings;

  const mergedModel = incoming.model || base.model;
  const rawModelName = incoming.modelName || base.modelName;
  const mergedModelName = sanitizeLegacyModelName(rawModelName, mergedModel);

  return {
    ...base,
    ...incoming,
    model: mergedModel,
    modelName: mergedModelName,
    thinkingLevel: getValidThinkingLevel(incoming.thinkingLevel, mergedModelName),
    temperature: typeof incoming.temperature === 'number' ? incoming.temperature : base.temperature,
    maxTokens: typeof incoming.maxTokens === 'number' ? incoming.maxTokens : base.maxTokens,
    topP: typeof incoming.topP === 'number' ? incoming.topP : base.topP,
    topK: typeof incoming.topK === 'number' ? incoming.topK : base.topK,
    contextWindow: typeof incoming.contextWindow === 'number' ? incoming.contextWindow : base.contextWindow,
    continuationLength: typeof incoming.continuationLength === 'number' ? incoming.continuationLength : base.continuationLength,
    repetitionPenalty: typeof incoming.repetitionPenalty === 'number' ? incoming.repetitionPenalty : base.repetitionPenalty,
    styleDirectives: typeof incoming.styleDirectives === 'string' ? incoming.styleDirectives : (base.styleDirectives || ""),
    // System firmware prompts are always anchored to codebase SSOT defaults
    systemPrompt: base.systemPrompt,
    codexSystemPrompt: base.codexSystemPrompt,
    
    // Sub-settings: Plot
    plot: {
      ...base.plot,
      ...(incoming.plot || {}),
      model: incoming.plot?.model || base.plot.model,
      modelName: sanitizeLegacyModelName(incoming.plot?.modelName || base.plot.modelName, incoming.plot?.model || base.plot.model),
      thinkingLevel: getValidThinkingLevel(incoming.plot?.thinkingLevel, incoming.plot?.modelName || base.plot.modelName),
      temperature: typeof incoming.plot?.temperature === 'number' ? incoming.plot.temperature : base.plot.temperature,
      maxTokens: typeof incoming.plot?.maxTokens === 'number' ? incoming.plot.maxTokens : base.plot.maxTokens,
      topP: typeof incoming.plot?.topP === 'number' ? incoming.plot.topP : base.plot.topP,
      topK: typeof incoming.plot?.topK === 'number' ? incoming.plot.topK : base.plot.topK,
      includeInPrompt: incoming.plot?.includeInPrompt !== undefined ? incoming.plot.includeInPrompt : base.plot.includeInPrompt,
      triggerChars: typeof incoming.plot?.triggerChars === 'number' ? incoming.plot.triggerChars : base.plot.triggerChars,
    },

    // Sub-settings: Auto-Codex
    autoCodex: {
      ...base.autoCodex,
      ...(incoming.autoCodex || {}),
      modelName: sanitizeLegacyModelName(incoming.autoCodex?.modelName || base.autoCodex.modelName),
      thinkingLevel: getValidThinkingLevel(incoming.autoCodex?.thinkingLevel, incoming.autoCodex?.modelName || base.autoCodex.modelName),
      temperature: typeof incoming.autoCodex?.temperature === 'number' ? incoming.autoCodex.temperature : base.autoCodex.temperature,
      maxTokens: typeof incoming.autoCodex?.maxTokens === 'number' ? incoming.autoCodex.maxTokens : base.autoCodex.maxTokens,
      topP: typeof incoming.autoCodex?.topP === 'number' ? incoming.autoCodex.topP : base.autoCodex.topP,
      topK: typeof incoming.autoCodex?.topK === 'number' ? incoming.autoCodex.topK : base.autoCodex.topK,
      repetitionPenalty: typeof incoming.autoCodex?.repetitionPenalty === 'number' ? incoming.autoCodex.repetitionPenalty : base.autoCodex.repetitionPenalty,
      triggerChars: typeof incoming.autoCodex?.triggerChars === 'number' ? incoming.autoCodex.triggerChars : base.autoCodex.triggerChars,
    },

    // Sub-settings: Automation
    automation: {
      ...base.automation,
      ...(incoming.automation || {}),
      autoCodex: incoming.automation?.autoCodex !== undefined ? incoming.automation.autoCodex : base.automation.autoCodex,
      autoPruning: incoming.automation?.autoPruning !== undefined ? incoming.automation.autoPruning : base.automation.autoPruning,
      enableStrictConsistency: incoming.automation?.enableStrictConsistency !== undefined ? incoming.automation.enableStrictConsistency : base.automation.enableStrictConsistency,
      autoPlot: incoming.automation?.autoPlot !== undefined ? incoming.automation.autoPlot : base.automation.autoPlot,
    },

    // Sub-settings: Codex Assistant
    codex: {
      ...base.codex,
      ...(incoming.codex || {}),
      model: incoming.codex?.model || base.codex.model,
      modelName: sanitizeLegacyModelName(incoming.codex?.modelName || base.codex.modelName, incoming.codex?.model || base.codex.model),
      thinkingLevel: getValidThinkingLevel(incoming.codex?.thinkingLevel, incoming.codex?.modelName || base.codex.modelName),
      temperature: typeof incoming.codex?.temperature === 'number' ? incoming.codex.temperature : base.codex.temperature,
      maxTokens: typeof incoming.codex?.maxTokens === 'number' ? incoming.codex.maxTokens : base.codex.maxTokens,
      topP: typeof incoming.codex?.topP === 'number' ? incoming.codex.topP : base.codex.topP,
      topK: typeof incoming.codex?.topK === 'number' ? incoming.codex.topK : base.codex.topK,
      systemPrompt: incoming.codex?.systemPrompt || base.codexSystemPrompt,
    },

    // Sub-settings: Memory Assistant
    memory: {
      ...base.memory,
      ...(incoming.memory || {}),
      model: incoming.memory?.model || base.memory.model,
      modelName: sanitizeLegacyModelName(incoming.memory?.modelName || base.memory.modelName, incoming.memory?.model || base.memory.model),
      thinkingLevel: getValidThinkingLevel(incoming.memory?.thinkingLevel, incoming.memory?.modelName || base.memory.modelName),
      temperature: typeof incoming.memory?.temperature === 'number' ? incoming.memory.temperature : base.memory.temperature,
      maxTokens: typeof incoming.memory?.maxTokens === 'number' ? incoming.memory.maxTokens : base.memory.maxTokens,
      topP: typeof incoming.memory?.topP === 'number' ? incoming.memory.topP : base.memory.topP,
      topK: typeof incoming.memory?.topK === 'number' ? incoming.memory.topK : base.memory.topK,
    },

    // Sub-settings: Auditor Model (Multi-Agent Parallel Refiner)
    auditor: {
      ...base.auditor,
      ...(incoming.auditor || {}),
      model: incoming.auditor?.model || incoming.model || base.auditor?.model || base.model || 'gemini',
      modelName: sanitizeLegacyModelName(
        incoming.auditor?.modelName || (
          (incoming.auditor?.model || incoming.model || base.model) === 'openrouter'
            ? 'google/gemini-3.8-flash'
            : 'gemini-3.8-flash'
        ),
        incoming.auditor?.model || incoming.model || base.model
      ),
      thinkingLevel: getValidThinkingLevel(incoming.auditor?.thinkingLevel, incoming.auditor?.modelName || base.auditor?.modelName),
      temperature: typeof incoming.auditor?.temperature === 'number' ? incoming.auditor.temperature : (base.auditor?.temperature ?? 0.3),
      maxTokens: typeof incoming.auditor?.maxTokens === 'number' ? incoming.auditor.maxTokens : (base.auditor?.maxTokens ?? 8000),
      topP: typeof incoming.auditor?.topP === 'number' ? incoming.auditor.topP : (base.auditor?.topP ?? 0.95),
      topK: typeof incoming.auditor?.topK === 'number' ? incoming.auditor.topK : (base.auditor?.topK ?? 40),
    }
  } as NovelSettings;
}

/**
 * Sanitizes and validates LoreEntries:
 * 1. Strips unaccepted AI proposal items (isProposalOnly: true)
 * 2. Enforces consistent IDs and preserves isLocked, internalNotes, type, parentId, order
 * 3. Verifies hierarchical parentId references
 */
export function sanitizeAndRemapLoreEntries(rawLoreEntries?: any[]): LoreEntry[] {
  if (!Array.isArray(rawLoreEntries)) return [];

  // Filter out transient, unapproved AI proposals to maintain canon world purity
  const canonEntries = rawLoreEntries.filter(entry => !entry?.isProposalOnly);

  const cleanEntries: LoreEntry[] = canonEntries.map((entry, index) => {
    const id = (typeof entry.id === 'string' && entry.id.trim()) 
      ? entry.id.trim() 
      : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `lore_${Date.now()}_${index}`);

    return {
      id,
      title: typeof entry.title === 'string' ? entry.title : "Untitled Entry",
      content: typeof entry.content === 'string' ? entry.content : "",
      keywords: typeof entry.keywords === 'string' ? entry.keywords : "",
      isAlwaysActive: Boolean(entry.isAlwaysActive),
      enabled: entry.enabled !== false,
      type: entry.type === 'folder' ? 'folder' : 'item',
      parentId: (typeof entry.parentId === 'string' && entry.parentId.trim()) ? entry.parentId.trim() : null,
      order: typeof entry.order === 'number' ? entry.order : index,
      isLocked: Boolean(entry.isLocked),
      internalNotes: typeof entry.internalNotes === 'string' ? entry.internalNotes : ""
    };
  });

  // Check parentId referential integrity
  const entryIdSet = new Set(cleanEntries.map(e => e.id));
  return cleanEntries.map(entry => {
    if (entry.parentId && !entryIdSet.has(entry.parentId)) {
      // Orphaned reference safely routed to root
      return { ...entry, parentId: null };
    }
    return entry;
  });
}

/**
 * Strips HTML tags to calculate rough character count for metadata
 */
export function calculatePlainTextLength(htmlContent: string): number {
  if (!htmlContent) return 0;
  return htmlContent.replace(/<[^>]*>/g, '').trim().length;
}

/**
 * Packages a complete Novel into a standardized V2 Export Envelope
 */
export function createNovelExportEnvelope(novel: Novel): NovelExportEnvelopeV2 {
  const content = novel.content || "";
  const plot = novel.plot || "";
  const storyMemory = novel.storyMemory || "";
  const loreEntries = sanitizeAndRemapLoreEntries(novel.loreEntries);
  const memoryCards = Array.isArray(novel.memoryCards) ? novel.memoryCards : [];
  const settings = deepMergeNovelSettings(novel.settings);

  return {
    $schema: 'ai-novelist-studio/export-v2',
    version: 2,
    exportedAt: new Date().toISOString(),
    appVersion: '2.0.0',
    metadata: {
      title: novel.title || "Untitled Novel",
      charCount: calculatePlainTextLength(content),
      loreCount: loreEntries.length,
      memoryCardCount: memoryCards.length,
      hasPlot: Boolean(plot.trim().length > 0),
      hasStoryMemory: Boolean(storyMemory.trim().length > 0)
    },
    novel: {
      title: novel.title || "Untitled Novel",
      content,
      storyMemory,
      plot,
      settings,
      loreEntries,
      memoryCards,
      type: novel.type || 'item',
      parentId: novel.parentId || null,
      order: novel.order || 0
    }
  };
}

export interface ParsedNovelUploadResult {
  novelMetadata: Omit<Novel, 'id' | 'content' | 'loreEntries'>;
  content: string;
  loreEntries: LoreEntry[];
  memoryCards?: import('../types').MemoryArchiveCard[];
  stats: {
    title: string;
    charCount: number;
    loreCount: number;
    memoryCardCount?: number;
    hasPlot: boolean;
    hasStoryMemory: boolean;
    isV2: boolean;
  };
}

/**
 * Parses and normalizes incoming upload JSON:
 * - Detects V2 Envelope vs Legacy V1
 * - Preserves plot, storyMemory, settings (via deep merge)
 * - Sanitizes lore hierarchy
 */
export function parseAndNormalizeNovelUpload(
  rawJson: string, 
  authorUid: string, 
  maxOrder: number
): ParsedNovelUploadResult {
  const parsed = JSON.parse(rawJson);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error("Invalid novel file: Not a valid JSON object.");
  }

  const isV2 = parsed.$schema === 'ai-novelist-studio/export-v2' || parsed.version === 2;
  const payload = (isV2 && parsed.novel) ? parsed.novel : parsed;

  if (typeof payload.title !== 'string' || !payload.title.trim()) {
    throw new Error("Invalid novel format: 'title' is missing or not a string.");
  }

  // Content extraction (fallback to empty string if missing)
  const content = typeof payload.content === 'string' ? payload.content : "";

  // Story memory extraction with legacy context migration
  const storyMemory = typeof payload.storyMemory === 'string' 
    ? payload.storyMemory 
    : (typeof payload.settings?.context === 'string' ? payload.settings.context : "");

  // Plot extraction (100% Zero-Loss)
  const plot = typeof payload.plot === 'string' ? payload.plot : "";

  // Deep merge settings
  const settings = deepMergeNovelSettings(payload.settings);

  // Sanitize Lore
  const loreEntries = sanitizeAndRemapLoreEntries(payload.loreEntries);

  // Sanitize Memory Cards
  let memoryCards: import('../types').MemoryArchiveCard[] = [];
  if (Array.isArray(payload.memoryCards)) {
    memoryCards = payload.memoryCards
      .filter((c: any) => c && typeof c === 'object' && c.content)
      .map((c: any, idx: number) => ({
        id: typeof c.id === 'string' && c.id ? c.id : `card_${Date.now()}_${idx}`,
        novelId: '',
        type: (c.type === '막요약' || c.type === '정정') ? c.type : '사건',
        tags: Array.isArray(c.tags) ? c.tags.filter(Boolean) : [],
        time: typeof c.time === 'string' ? c.time : '해당 시점',
        content: typeof c.content === 'string' ? c.content : '',
        lasting: typeof c.lasting === 'string' ? c.lasting : '없음',
        order: typeof c.order === 'number' ? c.order : Date.now() + idx,
        createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now() + idx
      }));
  }

  const novelMetadata: Omit<Novel, 'id' | 'content' | 'loreEntries'> = {
    title: payload.title.trim(),
    authorUid,
    createdAt: typeof payload.createdAt === 'number' ? payload.createdAt : Date.now(),
    updatedAt: Date.now(),
    storyMemory,
    plot,
    type: payload.type === 'folder' ? 'folder' : 'item',
    parentId: null, // Imported novels default to root level unless organized
    order: maxOrder + 1,
    settings
  };

  return {
    novelMetadata,
    content,
    loreEntries,
    memoryCards,
    stats: {
      title: novelMetadata.title,
      charCount: calculatePlainTextLength(content),
      loreCount: loreEntries.length,
      memoryCardCount: memoryCards.length,
      hasPlot: Boolean(plot.trim().length > 0),
      hasStoryMemory: Boolean(storyMemory.trim().length > 0),
      isV2
    }
  };
}
