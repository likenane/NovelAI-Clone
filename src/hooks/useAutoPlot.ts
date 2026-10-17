import { useState, useCallback, useRef, useEffect } from 'react';
import { Novel } from '../types';
import { GLOBAL_DEFAULTS } from '../constants';
import { generateTaskContext } from '../services/promptService';
import { generateGeminiContent, generateOpenRouterContent } from '../services/aiService';
import { parseAndValidatePlotResponse, ParsedPlotResponse } from '../services/plotService';
import { resolveLiveStoryContent } from '../lib/contextProviders';
import { useNotification } from '../components/NotificationSystem';
import { getNovelCharCount, setNovelCharCount, resetNovelCharCount } from '../lib/counterStorage';

export interface PendingPlotProposal extends ParsedPlotResponse {
  createdAt: number;
}

export function useAutoPlot(
  novel: Novel | null,
  openRouterKey: string,
  addNotification: (notif: any) => string,
  getEditorContent?: () => string
) {
  const charsSinceLastPlotRef = useRef<number>(getNovelCharCount(novel?.id, 'autoplot'));
  const [isGeneratingPlot, setIsGeneratingPlot] = useState(false);
  const [lastPlotPromptInfo, setLastPlotPromptInfo] = useState<any>(null);
  const [pendingPlotProposal, setPendingPlotProposal] = useState<PendingPlotProposal | null>(null);
  const isGeneratingRef = useRef(false);
  const { removeNotification } = useNotification();

  // Hydrate persistent counter on novel change (do NOT reset on setting toggle)
  useEffect(() => {
    if (novel?.id) {
      charsSinceLastPlotRef.current = getNovelCharCount(novel.id, 'autoplot');
    } else {
      charsSinceLastPlotRef.current = 0;
    }

    const handleCounterEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.novelId === novel?.id && customEvent.detail?.type === 'autoplot') {
        charsSinceLastPlotRef.current = customEvent.detail.count;
      }
    };

    window.addEventListener('novel-counter-updated', handleCounterEvent);
    return () => window.removeEventListener('novel-counter-updated', handleCounterEvent);
  }, [novel?.id]);

  const generatePlot = useCallback(async (options: {
    isManual?: boolean;
    userInstruction?: string;
    customSettings?: any;
  } = {}) => {
    const { isManual = false, userInstruction, customSettings } = options;
    if (!novel || isGeneratingRef.current) return null;

    const isAutoPlotEnabled = novel.settings.automation?.autoPlot ?? false;
    if (!isManual && !isAutoPlotEnabled) return null;

    const plotSettings = customSettings || novel.settings.plot || GLOBAL_DEFAULTS.plot;
    const triggerChars = plotSettings.triggerChars ?? GLOBAL_DEFAULTS.plot.triggerChars;
    if (!isManual && !triggerChars) return null;

    setIsGeneratingPlot(true);
    isGeneratingRef.current = true;
    const notifId = addNotification({
      message: isManual ? "플롯 제안을 생성하는 중입니다..." : "백그라운드에서 플롯을 분석 및 갱신 중입니다...",
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
        return null;
      }

      const promptInfo = generateTaskContext('plot', novel, {
        plotAIInstruction: userInstruction,
        plotWorkbenchSettings: plotSettings,
        overrideContent: latestContent
      });
      setLastPlotPromptInfo(promptInfo);

      const generationParams = {
        ...plotSettings,
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

      // Record output immediately for full observability in Prompt Inspector
      setLastPlotPromptInfo((prev: any) => ({
        ...(prev || promptInfo),
        output: responseText,
        error: undefined
      }));

      // Ghost Scan Defense: Check if disabled while in-flight (for auto calls only)
      if (!isManual && novel.settings.automation?.autoPlot === false) {
        console.log("Auto-Plot was disabled during generation. Discarding results.");
        return null;
      }

      // 2-Tier Hybrid Parsing & Strict Fail-Fast Validation
      const parsed = parseAndValidatePlotResponse(responseText);

      // Enhance inspector metadata with parsed thoughtProcess & blueprint
      setLastPlotPromptInfo((prev: any) => ({
        ...(prev || promptInfo),
        output: responseText,
        thoughtProcess: parsed.thoughtProcess,
        plotBlueprint: parsed.plotBlueprint,
        finalPlotText: parsed.finalPlotText,
        error: undefined
      }));

      const proposal: PendingPlotProposal = {
        ...parsed,
        createdAt: Date.now()
      };

      setPendingPlotProposal(proposal);
      charsSinceLastPlotRef.current = 0;
      if (novel?.id) {
        resetNovelCharCount(novel.id, 'autoplot');
      }

      addNotification({
        message: isManual ? "새로운 플롯 청사진 제안이 도착했습니다." : "자동 플롯 갱신 제안이 생성되었습니다.",
        type: 'success'
      });

      return proposal;
    } catch (err: any) {
      console.error("Plot generation / validation error:", err);
      // Preserve output and record exact error for Prompt Inspector
      setLastPlotPromptInfo((prev: any) => ({
        ...prev,
        output: responseText || prev?.output,
        error: err.message || "플롯 생성 및 검증 중 오류가 발생했습니다."
      }));

      addNotification({
        message: err.message || "플롯 생성 및 검증 중 오류가 발생했습니다.",
        type: 'error',
        duration: 6000
      });
      return null;
    } finally {
      setIsGeneratingPlot(false);
      isGeneratingRef.current = false;
      removeNotification(notifId);
    }
  }, [novel, openRouterKey, addNotification, removeNotification]);

  const onCharactersAdded = useCallback((count: number) => {
    if (!novel?.settings?.automation?.autoPlot || !novel?.id) return;
    
    // Delta Subtraction with Floor: add typed characters, subtract deleted characters, floored at 0
    const newCount = Math.max(0, charsSinceLastPlotRef.current + count);
    charsSinceLastPlotRef.current = newCount;
    setNovelCharCount(novel.id, 'autoplot', newCount);

    const triggerChars = novel.settings.plot?.triggerChars ?? GLOBAL_DEFAULTS.plot.triggerChars;
    if (charsSinceLastPlotRef.current >= triggerChars && !isGeneratingRef.current) {
      charsSinceLastPlotRef.current = 0; // Reset immediately to prevent multiple triggers
      resetNovelCharCount(novel.id, 'autoplot');
      setTimeout(() => {
        generatePlot({ isManual: false });
      }, 0);
    }
  }, [novel?.id, novel?.settings?.automation?.autoPlot, novel?.settings?.plot?.triggerChars, generatePlot]);

  const resetPlotChars = useCallback(() => {
    charsSinceLastPlotRef.current = 0;
    if (novel?.id) {
      resetNovelCharCount(novel.id, 'autoplot');
    }
  }, [novel?.id]);

  const clearPendingPlotProposal = useCallback(() => {
    setPendingPlotProposal(null);
  }, []);

  return {
    isGeneratingPlot,
    pendingPlotProposal,
    lastPlotPromptInfo,
    generatePlot,
    onCharactersAdded,
    incrementPlotChars: onCharactersAdded,
    resetPlotChars,
    clearPendingPlotProposal,
    setPendingPlotProposal
  };
}
