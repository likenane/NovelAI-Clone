import { LoreEntry, ManualCodexResponse, ManualCodexThoughtProcess, CodexSpinoffEntry } from '../types';

/**
 * Checks if any of the keywords are present in the text.
 * @param text The text to search in.
 * @param keywords A comma-separated string of keywords.
 * @returns boolean
 */
export const checkKeywordMatch = (text: string, keywords: string): boolean => {
  if (!keywords.trim()) return false;
  const keywordList = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
  if (keywordList.length === 0) return false;
  
  const lowerText = text.toLowerCase();
  return keywordList.some(keyword => lowerText.includes(keyword));
};

/**
 * Deterministically finds entries that haven't been mentioned in the recent context.
 * @param entries List of lore entries.
 * @param recentText The recent story text.
 * @returns List of entry IDs that are candidates for pruning.
 */
export const getPruningCandidates = (entries: LoreEntry[], recentText: string): string[] => {
  return entries
    .filter(entry => {
      if (entry.type === 'folder') return false;
      if (!entry.enabled) return false;
      if (entry.isAlwaysActive) return false;
      if (entry.isLocked) return false;
      
      // If keywords match, it's NOT a candidate for pruning
      return !checkKeywordMatch(recentText, entry.keywords);
    })
    .map(entry => entry.id);
};

/**
 * Normalizes lore text for comparison (removes whitespace, punctuation, etc.)
 */
export const normalizeLoreText = (text: string): string => {
  return (text || '')
    .replace(/[\s\r\n\t]+/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()"'`]/g, '')
    .toLowerCase();
};

/**
 * Programmatically deduplicates bullet lines and enforces SSOT across section headers in lore content.
 */
export const deduplicateLoreContent = (content: string): string => {
  if (!content) return '';

  const lines = content.split('\n');
  const resultLines: string[] = [];
  const seenBulletNormalized = new Set<string>();
  let currentHeader = '';

  // Profile keys that strictly belong to [기본 정보] or [개요]
  const profileKeys = ['이름:', '소속/신분:', '신체/외형:', '소속:', '신분:', '명칭:', '세력명:', '나이:', '성별:'];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Track Tier-1 Header
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentHeader = trimmed;
      resultLines.push(rawLine);
      continue;
    }

    // Skip non-bullet lines (Tier-2 or empty)
    if (!trimmed.startsWith('- ')) {
      resultLines.push(rawLine);
      continue;
    }

    // It's a bullet line (- ...)
    const bulletText = trimmed.replace(/^- \s*/, '').trim();
    const normalized = normalizeLoreText(bulletText);

    // If this is NOT a primary header, check if it's a profile key being duplicated
    if (currentHeader !== '[기본 정보]' && currentHeader !== '[개요]') {
      const isProfileKeyDuplicate = profileKeys.some(key => bulletText.startsWith(key));
      if (isProfileKeyDuplicate) {
        // Skip duplicate profile bullet outside primary headers
        continue;
      }
    }

    // Check for exact/normalized duplicate bullet lines anywhere in the lore entry
    if (normalized && seenBulletNormalized.has(normalized)) {
      // Skip duplicate bullet line
      continue;
    }

    if (normalized) {
      seenBulletNormalized.add(normalized);
    }
    resultLines.push(rawLine);
  }

  // Clean up trailing multiple blank lines and trim
  return resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

/**
 * Strips category bracket prefixes such as [세력], [장소], [개념], [인물], [사물], etc.
 * Useful for matching candidate titles between CoT screening and newEntries proposals.
 */
export const stripCategoryPrefix = (title: string | null | undefined): string => {
  if (!title) return '';
  return title.replace(/^\[(세력|인물|장소|개념|사물|아이템|사건|규칙|시스템|집단|조직)\]\s*/i, '').trim();
};

/**
 * Normalizes a candidate title or name for robust deduplication & CoT cross-matching.
 */
export const normalizeCandidateTitle = (title: string | null | undefined): string => {
  if (!title) return '';
  const stripped = stripCategoryPrefix(title);
  return stripped.toLowerCase().replace(/\s+/g, ' ').trim();
};

export interface FlattenedSemanticCandidate {
  name: string;
  category: 'character' | 'location' | 'item' | 'lore';
  candidateType: 'EXPLICIT' | 'IMPLICIT' | 'CONCEPTUAL';
  description?: string;
  context?: string;
  clusterEvidence?: string[];
  abstractDefinition?: string;
}

/**
 * Flattens both new 3-track semantic discovery and legacy step1_candidateExtraction into a unified list.
 */
export const flattenSemanticCandidates = (thoughtProcess: any): FlattenedSemanticCandidate[] => {
  if (!thoughtProcess) return [];
  const results: FlattenedSemanticCandidate[] = [];

  const discovery = thoughtProcess.step1_semanticDiscovery;
  if (discovery) {
    if (Array.isArray(discovery.explicitEntities)) {
      for (const item of discovery.explicitEntities) {
        if (item?.candidateName) {
          results.push({
            name: item.candidateName,
            category: item.category || 'character',
            candidateType: 'EXPLICIT',
            context: item.mentionContext
          });
        }
      }
    }
    if (Array.isArray(discovery.implicitEmergentEntities)) {
      for (const item of discovery.implicitEmergentEntities) {
        if (item?.temporaryAnchorTitle) {
          results.push({
            name: item.temporaryAnchorTitle,
            category: item.category || 'lore',
            candidateType: 'IMPLICIT',
            description: item.descriptiveClues,
            context: item.recurrenceBasis
          });
        }
      }
    }
    if (Array.isArray(discovery.conceptualClusters)) {
      for (const item of discovery.conceptualClusters) {
        if (item?.proposedConceptTitle) {
          results.push({
            name: item.proposedConceptTitle,
            category: item.category || 'lore',
            candidateType: 'CONCEPTUAL',
            clusterEvidence: item.clusterEvidence,
            abstractDefinition: item.abstractDefinition
          });
        }
      }
    }
  }

  // Backward compatibility fallback for legacy logs
  if (results.length === 0 && Array.isArray(thoughtProcess.step1_candidateExtraction)) {
    for (const item of thoughtProcess.step1_candidateExtraction) {
      if (item?.candidateName) {
        results.push({
          name: item.candidateName,
          category: item.category || 'character',
          candidateType: 'EXPLICIT',
          context: item.mentionContext
        });
      }
    }
  }

  return results;
};

/**
 * Cleans, sanitizes, and deduplicates the raw text generated by the Codex AI Assistant.
 * Strips markdown code fences, leading markdown headers (e.g. ### [Title], ### Title: ...),
 * and redundant entry title labels before standard deduplication.
 */
export const cleanLoreAssistantOutput = (rawText: string, entryTitle?: string): string => {
  if (!rawText) return '';
  let cleaned = rawText.trim();

  // 1. Strip markdown code fences if model wrapped output in ```markdown or ```
  cleaned = cleaned.replace(/^```(?:markdown|text|txt)?\s*\n/i, '');
  cleaned = cleaned.replace(/\n```\s*$/i, '');
  cleaned = cleaned.trim();

  // 2. Strip legacy guideline header if present
  cleaned = cleaned.replace(/^### \[Lore Assistant Guideline\].*?### .*?\n/s, '').trim();

  // 3. Strip leading markdown headers such as "### Title: ...", "### Hina", "## [Hina]", "# Hina"
  cleaned = cleaned.replace(/^(?:#{1,6}\s*(?:Title:?\s*)?.*?\n+)+/i, '').trim();

  // 4. If the text begins with "[EntryTitle]" on its own line matching the entry's own title, strip it
  if (entryTitle && entryTitle.trim()) {
    const escapedTitle = entryTitle.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const titleHeaderRegex = new RegExp(`^\\[\\s*${escapedTitle}\\s*\\]\\s*\\n+`, 'i');
    cleaned = cleaned.replace(titleHeaderRegex, '').trim();
  }

  // 5. Run standard deduplication
  return deduplicateLoreContent(cleaned);
};

/**
 * Parses and validates the structured response from the Manual Codex AI Assistant.
 * Gracefully extracts `thoughtProcess` and `finalContent`, with multi-layered fallbacks
 * for pure-text responses or malformed JSON.
 */
export const parseCodexAssistantResponse = (
  rawText: string,
  entryTitle?: string
): { 
  thoughtProcess: ManualCodexThoughtProcess | null; 
  updateReason: string | null; 
  finalContent: string;
  spinoffEntries?: CodexSpinoffEntry[];
} => {
  if (!rawText) return { thoughtProcess: null, updateReason: null, finalContent: '', spinoffEntries: [] };

  let cleaned = rawText.trim();
  // Strip code fences
  cleaned = cleaned.replace(/^```(?:json|markdown|text|txt)?\s*\n/i, '');
  cleaned = cleaned.replace(/\n```\s*$/i, '');
  cleaned = cleaned.trim();

  // Attempt JSON parsing
  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ManualCodexResponse;
      const finalRaw = parsed.finalContent || (parsed as any).content || '';
      const reason = parsed.updateReason || parsed.thoughtProcess?.directiveIntent?.userIntentSummary || null;
      const rawSpinoffs = Array.isArray(parsed.spinoffEntries) ? parsed.spinoffEntries : [];
      const sanitizedSpinoffs: CodexSpinoffEntry[] = rawSpinoffs
        .filter(s => s && typeof s.title === 'string' && s.title.trim())
        .map(s => ({
          title: s.title.trim(),
          type: (['character', 'location', 'item', 'lore'].includes(s.type) ? s.type : 'item') as any,
          keywords: s.keywords || s.title.trim(),
          content: cleanLoreAssistantOutput(s.content || '', s.title.trim()),
          spinoffReason: s.spinoffReason || '개념 분화 신규 항목'
        }));

      if (finalRaw && typeof finalRaw === 'string') {
        return {
          thoughtProcess: parsed.thoughtProcess || null,
          updateReason: reason,
          finalContent: cleanLoreAssistantOutput(finalRaw, entryTitle),
          spinoffEntries: sanitizedSpinoffs
        };
      }
    }
  } catch (err) {
    // JSON parse failed, attempt regex recovery of finalContent and updateReason field
    try {
      let reason: string | null = null;
      const reasonMatch = cleaned.match(/"updateReason"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (reasonMatch && reasonMatch[1]) {
        reason = JSON.parse(`"${reasonMatch[1]}"`);
      }
      const regexMatch = cleaned.match(/"finalContent"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (regexMatch && regexMatch[1]) {
        const unescaped = JSON.parse(`"${regexMatch[1]}"`);
        return {
          thoughtProcess: null,
          updateReason: reason,
          finalContent: cleanLoreAssistantOutput(unescaped, entryTitle)
        };
      }
    } catch {
      // Ignore regex parsing error and proceed to plain text fallback
    }
  }

  // Pure plain text fallback (e.g. legacy model output or fallback mode)
  return {
    thoughtProcess: null,
    updateReason: null,
    finalContent: cleanLoreAssistantOutput(cleaned, entryTitle)
  };
};

/**
 * Checks if childId is a descendant of ancestorId among the lore entries.
 * Includes infinite loop guards.
 */
export const isDescendantOfLore = (
  childId: string,
  ancestorId: string,
  entries: LoreEntry[]
): boolean => {
  if (!childId || !ancestorId || childId === ancestorId) return false;
  const entryMap = new Map<string, LoreEntry>();
  for (const e of entries) {
    entryMap.set(e.id, e);
  }

  let current = entryMap.get(childId);
  const visited = new Set<string>();

  while (current && current.parentId) {
    if (visited.has(current.id)) break; // cycle detected
    visited.add(current.id);
    if (current.parentId === ancestorId) return true;
    current = entryMap.get(current.parentId);
  }

  return false;
};

/**
 * Sanitizes lore entries by detecting and repairing:
 * 1. Self-references (entry.parentId === entry.id)
 * 2. Non-existent parents (entry.parentId does not match any valid folder in entries)
 * 3. Circular reference cycles (A -> B -> A, etc.)
 * Returns repaired entries and list of repaired IDs.
 */
export const sanitizeAndHealLoreEntries = (
  entries: LoreEntry[]
): { healed: LoreEntry[]; repairedIds: string[] } => {
  if (!entries || entries.length === 0) {
    return { healed: [], repairedIds: [] };
  }

  const entryMap = new Map<string, LoreEntry>();
  for (const e of entries) {
    entryMap.set(e.id, { 
      ...e,
      parentId: (e.parentId === '' || e.parentId === undefined) ? null : e.parentId,
      order: (typeof e.order === 'number' && !isNaN(e.order)) ? e.order : 0
    });
  }

  const repairedIds = new Set<string>();

  // 1. Direct self-reference or missing parent
  for (const [id, entry] of entryMap.entries()) {
    if (entry.parentId) {
      if (entry.parentId === id) {
        // Self-parent
        entry.parentId = null;
        repairedIds.add(id);
      } else {
        const parent = entryMap.get(entry.parentId);
        if (!parent || parent.type !== 'folder') {
          // Parent doesn't exist or is not a folder
          entry.parentId = null;
          repairedIds.add(id);
        }
      }
    }
  }

  // 2. Cycle detection (traverse upward to ensure path terminates at null)
  for (const [id, entry] of entryMap.entries()) {
    if (!entry.parentId) continue;

    const visited = new Set<string>([id]);
    let curr = entryMap.get(entry.parentId);
    let hasCycle = false;

    while (curr && curr.parentId) {
      if (visited.has(curr.id)) {
        hasCycle = true;
        break;
      }
      visited.add(curr.id);
      curr = entryMap.get(curr.parentId);
    }

    if (hasCycle) {
      // Break cycle by resetting this entry's parent to null
      entry.parentId = null;
      repairedIds.add(id);
    }
  }

  // 3. If any repairs happened, clean up sibling orders for affected buckets
  if (repairedIds.size > 0) {
    const buckets = new Map<string | null, LoreEntry[]>();
    for (const e of entryMap.values()) {
      const pid = e.parentId || null;
      if (!buckets.has(pid)) buckets.set(pid, []);
      buckets.get(pid)!.push(e);
    }

    for (const [_, group] of buckets.entries()) {
      group.sort((a, b) => (a.order || 0) - (b.order || 0));
      group.forEach((item, index) => {
        const newOrder = index * 10;
        if (item.order !== newOrder) {
          item.order = newOrder;
          repairedIds.add(item.id);
        }
      });
    }
  }

  const healed = Array.from(entryMap.values());
  return {
    healed,
    repairedIds: Array.from(repairedIds),
  };
};


