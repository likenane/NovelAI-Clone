import { useState, useCallback, useRef, useEffect } from 'react';
import { LoreEntry, Novel, AutoCodexResponse } from '../types';
import { GLOBAL_DEFAULTS } from '../constants';
import { generateTaskContext } from '../services/promptService';
import { generateGeminiContent, generateOpenRouterContent } from '../services/aiService';
import { getPruningCandidates, deduplicateLoreContent, normalizeCandidateTitle } from '../lib/loreUtils';
import { resolveLiveStoryContent } from '../lib/contextProviders';
import { getNovelCharCount, setNovelCharCount, resetNovelCharCount } from '../lib/counterStorage';

import { useNotification } from '../components/NotificationSystem';

function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function useAutoCodex(
  novel: Novel | null,
  updateLoreEntry: (id: string, updates: Partial<LoreEntry>) => void,
  deleteLoreEntry: (id: string) => void,
  addLoreEntry: (type: 'item' | 'folder', parentId: string | null, initialData?: Partial<LoreEntry>) => Promise<string | undefined>,
  openRouterKey: string,
  addNotification: (notif: any) => string,
  getEditorContent?: () => string
) {
  const charsSinceLastScanRef = useRef<number>(getNovelCharCount(novel?.id, 'autocodex'));
  const [isScanning, setIsScanning] = useState(false);
  const [lastAutoCodexPromptInfo, setLastAutoCodexPromptInfo] = useState<any>(null);
  const isScanningRef = useRef(false);
  const { removeNotification } = useNotification();

  useEffect(() => {
    const handleQuotaError = () => {
      setIsScanning(false);
      isScanningRef.current = false;
    };
    window.addEventListener('firestore-quota-error', handleQuotaError);
    return () => window.removeEventListener('firestore-quota-error', handleQuotaError);
  }, []);

  // Hydrate persistent counter on novel change (do NOT reset on setting toggle)
  useEffect(() => {
    if (novel?.id) {
      charsSinceLastScanRef.current = getNovelCharCount(novel.id, 'autocodex');
    } else {
      charsSinceLastScanRef.current = 0;
    }

    const handleCounterEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.novelId === novel?.id && customEvent.detail?.type === 'autocodex') {
        charsSinceLastScanRef.current = customEvent.detail.count;
      }
    };

    window.addEventListener('novel-counter-updated', handleCounterEvent);
    return () => window.removeEventListener('novel-counter-updated', handleCounterEvent);
  }, [novel?.id]);

  const scanForProposals = useCallback(async (options: { isManual?: boolean; userDirective?: string } = {}) => {
    const { isManual = false, userDirective } = options;
    if (!novel || isScanningRef.current) return;
    
    const settings = novel.settings;
    const isAutoCodexEnabled = settings.automation?.autoCodex ?? false;
    
    // 자동 호출(isManual=false)일 때만 활성화 여부 검사
    if (!isManual && !isAutoCodexEnabled) return;

    // Lazy Migration / Getter wrapper for trigger chars
    const triggerChars = settings.autoCodex?.triggerChars ?? settings.autoCodexTriggerChars ?? GLOBAL_DEFAULTS.autoCodex.triggerChars;
    if (!isManual && !triggerChars) return;

    setIsScanning(true);
    isScanningRef.current = true;
    const scanNotifId = addNotification({ 
      message: isManual 
        ? (userDirective?.trim() ? "지시형 코덱스 스캔 실행 중..." : "수동 코덱스 스캔 실행 중...") 
        : "오토 코덱스 백그라운드 스캔 중...", 
      type: 'generating' 
    });

    let responseText = "";
    try {
      let latestContent = "";
      try {
        latestContent = resolveLiveStoryContent(novel, getEditorContent, { strict: isManual, allowSavedFallback: !isManual });
      } catch (err: any) {
        if (isManual) {
          addNotification({ message: err.message || "에디터 본문을 불러올 수 없습니다.", type: 'error' });
        }
        return;
      }

      const promptInfo = generateTaskContext('autocodex', novel, { 
        enablePruning: !!settings.enableContextPruning,
        overrideContent: latestContent,
        userDirective: userDirective?.trim() || undefined
      });
      setLastAutoCodexPromptInfo(promptInfo);
      
      const autoCodexSettings = novel.settings.autoCodex || GLOBAL_DEFAULTS.autoCodex;
      const generationParams = {
        ...autoCodexSettings,
        ...promptInfo.config,
        system: promptInfo.system,
        messages: promptInfo.messages,
        responseFormat: promptInfo.responseFormat,
        modelName: promptInfo.modelName
      };

      if (promptInfo.modelName.includes('gemini') && !promptInfo.modelName.includes('google/')) {
        responseText = await generateGeminiContent(generationParams as any);
      } else {
        responseText = await generateOpenRouterContent(generationParams as any, openRouterKey);
      }

      // Observability: Record raw output immediately for Prompt Inspector
      setLastAutoCodexPromptInfo((prev: any) => ({
        ...(prev || promptInfo),
        output: responseText,
        error: undefined
      }));

      // Ghost Scan Defense: Check if disabled while request was in-flight (only for auto)
      if (!isManual && novel.settings.automation?.autoCodex === false) {
        console.log("Auto-Codex was disabled during scan. Discarding results.");
        return;
      }
      
      // 파이프라인 1단계: 마크다운 코드블록 완전 제거 (순수 텍스트 추출)
      let normalizedContent = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

      if (!normalizedContent.startsWith('{')) {
        // 중괄호로 시작하지 않는 최악의 경우 방어
        normalizedContent = '{' + normalizedContent;
      }

      // 파이프라인 3단계: JSON 파싱 및 구조 검증
      const parsed: AutoCodexResponse = JSON.parse(normalizedContent);
      const synthesisSummary = parsed.thoughtProcess?.step5_globalSynthesis || parsed.globalAnalysis;
      if (synthesisSummary) {
        console.log("AI Auto-Codex Synthesis / Analysis:", synthesisSummary);
      }

      const rawUpdates = parsed.updates || (parsed as any).modifiedEntries || (parsed as any).updatedEntries || [];
      const rawNewEntries = parsed.newEntries || (parsed as any).createdEntries || (parsed as any).addedEntries || [];
      const rawPrune = parsed.prune || (parsed as any).pruning || (parsed as any).pruneEntries || [];

      // Observability: Update prompt info with parsed CoT and proposals for Prompt Inspector
      setLastAutoCodexPromptInfo((prev: any) => ({
        ...(prev || promptInfo),
        output: responseText,
        thoughtProcess: parsed.thoughtProcess,
        globalAnalysis: parsed.globalAnalysis,
        updates: rawUpdates,
        newEntries: rawNewEntries,
        prune: rawPrune,
        error: undefined
      }));

      let updatesCount = 0;
      let newCount = 0;
      let pruneProposalCount = 0;

      // CoT 방어 필터: step3에서 REJECT된 후보명 및 step4에서 DROP/Locked 처리된 항목 ID 수집
      const rejectedNewCandidateNames = new Set<string>();
      for (const s of (parsed.thoughtProcess?.step3_newEntryScreening || [])) {
        if (s.verdict === 'REJECT') {
          const candidateName = s.candidateName || (s as any).candidateTitle || (s as any).name || (s as any).title;
          if (candidateName) {
            rejectedNewCandidateNames.add(normalizeText(candidateName));
            rejectedNewCandidateNames.add(normalizeCandidateTitle(candidateName));
          }
        }
      }

      const droppedUpdateTargetIds = new Set(
        (parsed.thoughtProcess?.step4_updateEvaluation || [])
          .filter(s => s.verdict === 'DROP' || s.isLocked)
          .map(s => s.targetEntryId || (s as any).entryId || (s as any).id)
          .filter(Boolean)
      );

      if (rawUpdates && Array.isArray(rawUpdates)) {
        for (const update of rawUpdates) {
          const targetId = update.originalEntryId || (update as any).targetEntryId || (update as any).entryId || update.id;
          if (!targetId || droppedUpdateTargetIds.has(targetId)) {
            console.log(`Auto-Codex Filtering: Skipped update for targetId '${targetId}' (dropped by CoT or missing ID)`);
            continue;
          }
          const entry = novel.loreEntries?.find(e => e.id === targetId);
          if (entry && !entry.isLocked) {
            const proposedText = update.proposedContent || (update as any).content || (update as any).description || '';
            // Evaluator: Normalized Meaningful Diff Check
            if (normalizeText(entry.content) === normalizeText(proposedText)) {
              console.log(`Auto-Codex Filtering: Dropped identical proposal for '${entry.title}'`);
              continue;
            }
            // Deduplication is naturally handled here since we update the existing entry directly
            // 'updateLoreEntry' immediately overwrites the old proposal fields for the same ID
            updateLoreEntry(entry.id, { 
              proposedContent: deduplicateLoreContent(proposedText),
              updateReason: update.updateReason || (update as any).rationale || (update as any).reason,
              originalEntryId: entry.id
            });
            updatesCount++;
          }
        }
      }

      if (rawNewEntries && Array.isArray(rawNewEntries)) {
        for (const newEntry of rawNewEntries) {
          const newEntryTitle = newEntry.title || (newEntry as any).candidateName || (newEntry as any).candidateTitle || (newEntry as any).name || "New Proposed Entry";
          const normalizedRawTitle = normalizeText(newEntryTitle);
          const normalizedCleanTitle = normalizeCandidateTitle(newEntryTitle);
          if (rejectedNewCandidateNames.has(normalizedRawTitle) || rejectedNewCandidateNames.has(normalizedCleanTitle)) {
            console.log(`Auto-Codex Filtering: Skipped new entry '${newEntryTitle}' (rejected by CoT step3)`);
            continue;
          }

          const rawContent = newEntry.content || (newEntry as any).description || (newEntry as any).proposedContent || "";
          const reason = newEntry.updateReason || (newEntry as any).rationale || (newEntry as any).reason;
          const keywords = newEntry.keywords || (newEntry as any).tags || "";

          // Check for Title-based Deduplication in pending proposals
          const existingSameTitleNew = novel.loreEntries?.find(
            e => e.isProposalOnly && (
              normalizeText(e.title) === normalizedRawTitle ||
              normalizeCandidateTitle(e.title) === normalizedCleanTitle
            )
          );
          if (existingSameTitleNew) {
             updateLoreEntry(existingSameTitleNew.id, {
               proposedContent: deduplicateLoreContent(rawContent),
               keywords: keywords || existingSameTitleNew.keywords,
               updateReason: reason || existingSameTitleNew.updateReason
             });
             newCount++;
             continue;
          }

          await addLoreEntry('item', null, {
            title: newEntryTitle,
            proposedContent: deduplicateLoreContent(rawContent),
            keywords: keywords,
            isProposalOnly: true,
            enabled: false, // Disabled until accepted
            updateReason: reason
          });
          newCount++;
        }
      }

      // AI-driven pruning proposals
      if (settings.enableContextPruning && rawPrune && Array.isArray(rawPrune)) {
        for (const pruneId of rawPrune) {
          const entry = novel.loreEntries?.find(e => e.id === pruneId);
          if (entry && !entry.isLocked && entry.enabled && !entry.isAlwaysActive && !entry.isPruningProposal) {
            updateLoreEntry(entry.id, { isPruningProposal: true });
            pruneProposalCount++;
          }
        }
      }

      // Deterministic local pruning check
      if (settings.enableContextPruning && novel.loreEntries) {
        const pruningThreshold = settings.pruningThresholdChars || 50000;
        const rawContent = (novel.content || "")
          .replace(/<[^>]*>?/gm, '')
          .trimEnd();
        const recentText = rawContent.slice(-pruningThreshold);
        
        const localCandidates = getPruningCandidates(novel.loreEntries, recentText);
        for (const candidateId of localCandidates) {
          const entry = novel.loreEntries.find(e => e.id === candidateId);
          if (entry && !entry.isPruningProposal) {
            updateLoreEntry(entry.id, { isPruningProposal: true });
            pruneProposalCount++;
          }
        }
      }

      let message = `Auto-Codex scan complete. Found ${updatesCount} updates and ${newCount} new entries.`;
      if (pruneProposalCount > 0) message += ` ${pruneProposalCount} entries suggested for deactivation.`;

      // Successful scan: reset counter in memory and localStorage (both auto and manual)
      charsSinceLastScanRef.current = 0;
      if (novel?.id) {
        resetNovelCharCount(novel.id, 'autocodex');
      }

      addNotification({ message, type: 'success' });
    } catch (error: any) {
      console.error("Auto-Codex scan failed:", error);
      // Preserve output and record exact error for Prompt Inspector
      setLastAutoCodexPromptInfo((prev: any) => ({
        ...prev,
        output: responseText || prev?.output,
        error: error.message || "Auto-Codex scan failed."
      }));
      addNotification({ message: `Auto-Codex scan failed: ${error.message}`, type: 'error' });
      // NOTE: Do NOT reset counter on error so the user does not lose progress and can retry
    } finally {
      setIsScanning(false);
      isScanningRef.current = false;
      removeNotification(scanNotifId);
    }
  }, [novel, openRouterKey, addNotification, updateLoreEntry, addLoreEntry, getEditorContent, removeNotification]);

  const incrementChars = useCallback((count: number) => {
    const isAutoCodexEnabled = novel?.settings?.automation?.autoCodex ?? false;
    if (!isAutoCodexEnabled || !novel?.id) return;

    // Delta Subtraction with Floor: add typed characters, subtract deleted characters, floored at 0
    const newCount = Math.max(0, charsSinceLastScanRef.current + count);
    charsSinceLastScanRef.current = newCount;
    setNovelCharCount(novel.id, 'autocodex', newCount);

    const triggerChars = novel.settings?.autoCodex?.triggerChars ?? novel.settings?.autoCodexTriggerChars ?? GLOBAL_DEFAULTS.autoCodex.triggerChars;
    
    if (charsSinceLastScanRef.current >= triggerChars) {
      // Trigger scan asynchronously
      setTimeout(() => {
        scanForProposals({ isManual: false });
      }, 0);
      charsSinceLastScanRef.current = 0; // Reset immediately to prevent multiple triggers
      resetNovelCharCount(novel.id, 'autocodex');
    }
  }, [novel?.id, novel?.settings?.automation?.autoCodex, novel?.settings?.autoCodex, novel?.settings?.autoCodexTriggerChars, scanForProposals]);

  const resetChars = useCallback(() => {
    charsSinceLastScanRef.current = 0;
    if (novel?.id) {
      resetNovelCharCount(novel.id, 'autocodex');
    }
  }, [novel?.id]);

  const acceptProposal = useCallback((entryId: string, editedContent?: string) => {
    if (!novel?.loreEntries) return;
    const entry = novel.loreEntries.find(e => e.id === entryId);
    if (!entry) return;

    const finalContent = editedContent !== undefined ? editedContent : (entry.proposedContent || '');

    if (entry.isProposalOnly) {
      updateLoreEntry(entryId, {
        content: finalContent,
        proposedContent: null,
        updateReason: null,
        originalEntryId: null,
        isProposalOnly: false,
        enabled: true
      });
    } else {
      updateLoreEntry(entryId, {
        content: finalContent,
        proposedContent: null,
        updateReason: null,
        originalEntryId: null
      });
    }
  }, [novel?.loreEntries, updateLoreEntry]);

  const rejectProposal = useCallback((entryId: string) => {
    if (!novel?.loreEntries) return;
    const entry = novel.loreEntries.find(e => e.id === entryId);
    if (!entry) return;

    if (entry.isProposalOnly) {
      deleteLoreEntry(entryId);
    } else {
      updateLoreEntry(entryId, {
        proposedContent: null,
        updateReason: null,
        originalEntryId: null
      });
    }
  }, [novel?.loreEntries, updateLoreEntry, deleteLoreEntry]);

  const acceptPruning = useCallback((entryId: string) => {
    updateLoreEntry(entryId, {
      enabled: false,
      isPruningProposal: false
    });
  }, [updateLoreEntry]);

  const rejectPruning = useCallback((entryId: string) => {
    updateLoreEntry(entryId, {
      isPruningProposal: false
    });
  }, [updateLoreEntry]);

  return {
    incrementChars,
    resetChars,
    acceptProposal,
    rejectProposal,
    acceptPruning,
    rejectPruning,
    isScanning,
    scanForProposals,
    lastAutoCodexPromptInfo
  };
}
