import { useState, useRef, useCallback, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Novel, LoreEntry, MemoryProposal } from '../types';
import { GLOBAL_DEFAULTS } from '../constants';
import { 
  generateTaskContext
} from '../services/promptService';
import { 
  generateGeminiContent, 
  generateOpenRouterContent 
} from '../services/aiService';
import { runConsistencyPipeline } from '../services/refinerService';
import { sliceProseByTokens } from '../lib/tokenSlicer';
import { stitchAndTrimAnchor } from '../lib/utils';
import { resolveLiveStoryContent } from '../lib/contextProviders';
import { deduplicateLoreContent, cleanLoreAssistantOutput, parseCodexAssistantResponse } from '../lib/loreUtils';
import { parseAndValidateMemoryResponse } from '../services/memoryService';

export function useAIEngine(
  user: FirebaseUser | null,
  currentNovel: Novel | null,
  setCurrentNovel: React.Dispatch<React.SetStateAction<Novel | null>>,
  editor: Editor | null,
  openRouterKey: string,
  addNotification: (n: any) => string,
  removeNotification: (id: string) => void,
  scrollContainerRef: React.RefObject<HTMLDivElement>
) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCodexGenerating, setIsCodexGenerating] = useState(false);
  const [isMemoryGenerating, setIsMemoryGenerating] = useState(false);
  
  const [lastGeneratedText, setLastGeneratedText] = useState("");
  const [lastNovelPromptInfo, setLastNovelPromptInfo] = useState<any>(null);
  const [lastConsistencyPromptInfo, setLastConsistencyPromptInfo] = useState<any>(null);
  const [lastCodexPromptInfo, setLastCodexPromptInfo] = useState<any>(null);
  const [lastMemoryPromptInfo, setLastMemoryPromptInfo] = useState<any>(null);
  
  const [codexAISuggestion, setCodexAISuggestion] = useState("");
  const [codexAISpinoffs, setCodexAISpinoffs] = useState<import('../types').CodexSpinoffEntry[]>([]);
  const [memoryAISuggestion, setMemoryAISuggestion] = useState("");
  const [memoryAIProposal, setMemoryAIProposal] = useState<MemoryProposal | null>(null);
  
  const generationNotifyId = useRef<string | null>(null);

  // --- DRY RUN FUNCTION ---
  const handleDryRunNovel = useCallback(() => {
    if (!currentNovel || !editor) return;
    let preGenerationContent = "";
    try {
      preGenerationContent = resolveLiveStoryContent(currentNovel, editor, { strict: true });
    } catch (err: any) {
      addNotification({ message: err.message || "에디터 본문을 불러올 수 없습니다.", type: 'error' });
      return;
    }

    try {
      const promptInfo = generateTaskContext('novel', currentNovel, { overrideContent: preGenerationContent });

      console.log("=== [DRY RUN] CONTEXT BUILDER OUTPUT ===");
      console.log("1. SYSTEM:\n", promptInfo.system);
      console.log("2. MESSAGES:\n", JSON.stringify(promptInfo.messages, null, 2));
      console.log("========================================");

      setLastNovelPromptInfo(promptInfo);

      addNotification({ message: "Dry-Run complete. Check console or Prompt Inspector.", type: 'success' });
    } catch (error: any) {
      console.error("Dry-Run Failed:", error);
      addNotification({ message: `Dry-Run Failed: ${error.message}`, type: 'error' });
    }
  }, [currentNovel, editor, addNotification]);
  // ------------------------

  const handleContinue = useCallback(async () => {
    if (!currentNovel || isGenerating || !editor) return;
    
    let preGenerationContent = "";
    try {
      preGenerationContent = resolveLiveStoryContent(currentNovel, editor, { strict: true });
    } catch (err: any) {
      addNotification({ message: err.message || "에디터 본문을 불러올 수 없습니다.", type: 'error' });
      return;
    }
    const promptInfo = generateTaskContext('novel', currentNovel, { overrideContent: preGenerationContent });
    const { model, ...params } = currentNovel.settings;

    setLastNovelPromptInfo(promptInfo);
    setLastGeneratedText("");

    // Clear previous highlights
    editor.chain()
      .setMeta('addToHistory', false)
      .command(({ tr }) => {
        tr.removeMark(0, tr.doc.content.size, editor.schema.marks.aiHighlight);
        return true;
      })
      .run();

    setIsGenerating(true);
    editor.setEditable(false); // UI Lock during generation
    const charCount = editor.getText().length;
    
    const enableStrictConsistency = currentNovel.settings.automation?.enableStrictConsistency ?? true;
    const generatingMessage = enableStrictConsistency 
      ? "[AI 생성 논리성 검증 진행 중...] (최대 30초 소요 가능)" 
      : "Generating...";

    generationNotifyId.current = addNotification({
      message: generatingMessage,
      type: 'generating',
      charCount
    });

    try {
      let generatedText = "";
      let alreadyTrimmed = false;

      if (enableStrictConsistency) {
        const pipelineResult = await runConsistencyPipeline(
          currentNovel, 
          preGenerationContent,
          openRouterKey,
          (stage1Context) => setLastNovelPromptInfo(stage1Context),
          (stage2Context) => setLastConsistencyPromptInfo(stage2Context)
        );
        if (pipelineResult) {
          generatedText = pipelineResult.finalText;
          alreadyTrimmed = true;
          setLastConsistencyPromptInfo((prev: any) => ({
            ...prev,
            output: pipelineResult.stage2Output,
            error: pipelineResult.stage2Error,
            refinedText: pipelineResult.stage2RefinedText,
            rawDraft: pipelineResult.rawDraft,
            analysisLanguage: pipelineResult.analysisLanguage,
            globalContextAudit: pipelineResult.globalContextAudit,
            slices: pipelineResult.slices,
            physicalLogicAnalysis: pipelineResult.physicalLogicAnalysis,
            loreSystemAnalysis: pipelineResult.loreSystemAnalysis,
            loreAudits: pipelineResult.loreAudits,
            characterDynamicsAnalysis: pipelineResult.characterDynamicsAnalysis,
            characterAudits: pipelineResult.characterAudits,
            plotAndDirectiveAnalysis: pipelineResult.plotAndDirectiveAnalysis,
            linguisticAnalysis: pipelineResult.linguisticAnalysis,
            structuredLinguisticAnalysis: pipelineResult.structuredLinguisticAnalysis,
            informationOrderAudit: pipelineResult.informationOrderAudit,
            narrativeAnalysis: pipelineResult.narrativeAnalysis,
            conflicts: pipelineResult.conflicts,
            changeLog: pipelineResult.changeLog,
            multiAgentAudits: pipelineResult.multiAgentAudits
          }));
          if (pipelineResult.fallbackOccurred) {
            addNotification({ message: "무결성 검증 실패: 안전을 위해 1단계 초안(rawDraft)을 삽입했습니다.", type: 'error', duration: 5000 });
          }
        }
      } else {
        // Direct Stage 1 approach
        if (model === 'gemini') {
          generatedText = await generateGeminiContent({ ...params, ...promptInfo });
        } else {
          if (!openRouterKey) {
            addNotification({ message: "Please enter your OpenRouter API key in settings.", type: 'error' });
            return;
          }
          generatedText = await generateOpenRouterContent({ ...params, ...promptInfo }, openRouterKey);
        }
      }

      if (generatedText) {
        setLastNovelPromptInfo((prev: any) => prev ? ({ ...prev, output: generatedText }) : prev);
        
        // 1. Anchor Stitching: Trim echoed anchor from the AI's natural response
        const anchorTailText = promptInfo?.anchorTailText || "";
        const rawCleanedText = alreadyTrimmed ? generatedText : stitchAndTrimAnchor(anchorTailText, generatedText);
        // Normalize CRLF to LF
        const cleanedText = rawCleanedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // 2. Physical Newline Detection (Direct from AI's natural output)
        // Check if there are leading newlines (even if preceded by spaces/tabs)
        const leadingNewlinesMatch = cleanedText.match(/^[ \t]*(\n+)/);
        const newlineCount = leadingNewlinesMatch ? leadingNewlinesMatch[1].length : 0;

        let processedAIContent = "";
        if (newlineCount > 0) {
          // New paragraph continuation: strip leading newlines and any spaces before them
          processedAIContent = cleanedText.replace(/^[ \t]*\n+/, '');
        } else {
          // Inline continuation: strictly preserve leading spaces so words do not get glued together
          processedAIContent = cleanedText;
          // Guard against duplicate spaces if editor already ended with a space/tab
          const editorText = editor.getText();
          if (/[ \t]$/.test(editorText) && /^[ \t]/.test(processedAIContent)) {
            processedAIContent = processedAIContent.replace(/^[ \t]+/, '');
          }
        }

        // 3. Engine-Side Prose Token Slice: Slice strictly at user-configured maxTokens
        // Refiner 활성화(enableStrictConsistency) 시에는 모델이 초안의 사건 지평선 내에서 완결한 문장과 마침표를
        // 온전히 보존하기 위해 사후 기계적 절단을 적용하지 않고 그대로 삽입합니다.
        // Refiner 미사용(직접 1단계 생성) 시에만 사용자 지정 maxTokens로 엄격 슬라이싱을 유지합니다.
        if (!enableStrictConsistency) {
          const targetMaxTokens = currentNovel.settings.maxTokens || 500;
          const { slicedText: tokenSlicedContent } = sliceProseByTokens(processedAIContent, targetMaxTokens);
          processedAIContent = tokenSlicedContent;
        }

        const lines = processedAIContent.split('\n');

        const docSize = editor.state.doc.content.size;
        const lastNode = editor.state.doc.lastChild;
        const isLastNodeParagraph = lastNode && lastNode.type.name === 'paragraph';

        // Convert lines to standard paragraph HTML.
        // Empty lines become empty paragraphs <p></p> to preserve blank lines between paragraphs.
        const formatLinesToHtml = (lineArr: string[]) => {
          return lineArr.map(line => `<p>${line}</p>`).join('');
        };

        // 3. Execution: Insert into Tiptap based on physical newlines
        let startPos = docSize;
        const chain = editor.chain().focus();

        if (newlineCount >= 2) {
          // Double newline (\n\n): Blank line between paragraphs
          // Insert an empty paragraph followed by the new content paragraphs at the end of the document
          startPos = docSize;
          const htmlContent = '<p></p>' + formatLinesToHtml(lines);
          chain.insertContentAt(docSize, htmlContent);
        } else if (newlineCount === 1) {
          // Single newline (\n): Immediate new paragraph without blank line
          startPos = docSize;
          const htmlContent = formatLinesToHtml(lines);
          chain.insertContentAt(docSize, htmlContent);
        } else {
          // Inline continuation (no leading newline):
          // Append the first line directly into the existing last paragraph
          const currentPos = (isLastNodeParagraph && docSize > 1) ? docSize - 1 : docSize;
          startPos = currentPos;

          if (lines.length > 0) {
            chain.insertContentAt(currentPos, lines[0]);
            if (lines.length > 1) {
              const remainingHtml = formatLinesToHtml(lines.slice(1));
              chain.insertContentAt(docSize + lines[0].length, remainingHtml);
            }
          }
        }

        chain.command(({ tr, state }) => {
          const endPos = tr.doc.content.size;
          const safeStart = Math.min(startPos, endPos);
          
          // Apply mark directly to the transaction
          const markType = state.schema.marks.aiHighlight;
          if (markType) {
            const mark = markType.create({ class: 'bg-indigo-500/20 text-indigo-400' });
            tr.addMark(safeStart, endPos, mark);
          }
          
          // Set selection to the end
          tr.setSelection((state.selection.constructor as any).create(tr.doc, endPos));
          return true;
        })
        .setMeta('ai-generated', true)
        .run();

        setLastGeneratedText(cleanedText);
        
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
          editor.commands.focus('end');
        }, 100);

      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      addNotification({ message: error.message || "Generation failed.", type: 'error' });
    } finally {
      setIsGenerating(false);
      editor.setEditable(true); // Unlock UI
      if (generationNotifyId.current) {
        removeNotification(generationNotifyId.current);
        generationNotifyId.current = null;
      }
    }
  }, [currentNovel, isGenerating, editor, openRouterKey, addNotification, removeNotification, scrollContainerRef, setCurrentNovel]);

  const handleGenerateCodex = async (entry: LoreEntry, codexAIInstruction: string) => {
    if (!currentNovel || isCodexGenerating) return;
    
    let liveContent = "";
    try {
      liveContent = resolveLiveStoryContent(currentNovel, editor, { strict: true });
    } catch (err: any) {
      addNotification({ message: err.message || "에디터 본문을 불러올 수 없습니다.", type: 'error' });
      return;
    }

    setIsCodexGenerating(true);
    setCodexAISuggestion("");
    setCodexAISpinoffs([]);
    
    try {
      const promptInfo = generateTaskContext('codex', currentNovel, { 
        entry, 
        codexAIInstruction,
        overrideContent: liveContent
      });
      const codexSettings = currentNovel.settings.codex || GLOBAL_DEFAULTS.codex;
      const { model, ...params } = codexSettings;
      const generationPayload = { ...params, ...promptInfo.config, ...promptInfo };

      setLastCodexPromptInfo(promptInfo);

      let generatedText = "";
      if (model === 'gemini') {
        generatedText = await generateGeminiContent(generationPayload);
      } else {
        if (!openRouterKey) {
          addNotification({ message: "Please enter your OpenRouter API key in settings.", type: 'error' });
          return;
        }
        generatedText = await generateOpenRouterContent(generationPayload, openRouterKey);
      }

      if (generatedText) {
        const parsed = parseCodexAssistantResponse(generatedText, entry.title);
        setLastCodexPromptInfo((prev: any) => prev ? ({ 
          ...prev, 
          output: generatedText,
          thoughtProcess: parsed.thoughtProcess,
          updateReason: parsed.updateReason,
          finalContent: parsed.finalContent,
          spinoffEntries: parsed.spinoffEntries
        }) : prev);
        setCodexAISuggestion(parsed.finalContent);
        if (parsed.spinoffEntries && parsed.spinoffEntries.length > 0) {
          setCodexAISpinoffs(parsed.spinoffEntries);
        }
      }
    } catch (error: any) {
      console.error("Codex generation failed:", error);
      addNotification({ message: error.message || "Failed to generate lore content.", type: 'error' });
    } finally {
      setIsCodexGenerating(false);
    }
  };

  const handleGenerateMemory = async (instruction: string, memoryWorkbenchSettings: any) => {
    if (!currentNovel || isMemoryGenerating) return;
    
    let liveContent = "";
    try {
      liveContent = resolveLiveStoryContent(currentNovel, editor, { strict: true });
    } catch (err: any) {
      addNotification({ message: err.message || "에디터 본문을 불러올 수 없습니다.", type: 'error' });
      return;
    }

    setIsMemoryGenerating(true);
    setMemoryAISuggestion("");
    setMemoryAIProposal(null);
    
    try {
      const promptInfo = generateTaskContext('memory', currentNovel, { 
        memoryAIInstruction: instruction, 
        memoryWorkbenchSettings,
        overrideContent: liveContent
      });
      const memorySettings = currentNovel.settings.memory || GLOBAL_DEFAULTS.memory;
      const { model, ...params } = memorySettings;

      setLastMemoryPromptInfo(promptInfo);

      let generatedText = "";
      if (model === 'gemini') {
        generatedText = await generateGeminiContent({ ...params, ...promptInfo });
      } else {
        if (!openRouterKey) {
          addNotification({ message: "Please enter your OpenRouter API key in settings.", type: 'error' });
          return;
        }
        generatedText = await generateOpenRouterContent({ ...params, ...promptInfo }, openRouterKey);
      }

      if (generatedText) {
        const parsedMemory = parseAndValidateMemoryResponse(generatedText);
        setLastMemoryPromptInfo((prev: any) => prev ? ({ 
          ...prev, 
          output: generatedText,
          thoughtProcess: parsedMemory.thoughtProcess,
          finalMemoryText: parsedMemory.finalMemoryText,
          archiveEntries: parsedMemory.archiveEntries
        }) : prev);
        setMemoryAISuggestion(parsedMemory.finalMemoryText);
        setMemoryAIProposal({
          thoughtProcess: parsedMemory.thoughtProcess,
          finalMemoryText: parsedMemory.finalMemoryText,
          archiveEntries: parsedMemory.archiveEntries || []
        });
      }
    } catch (error: any) {
      console.error("Memory generation failed:", error);
      addNotification({ message: error.message || "Failed to generate story memory.", type: 'error' });
    } finally {
      setIsMemoryGenerating(false);
    }
  };

  return {
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
    setLastConsistencyPromptInfo,
    setLastCodexPromptInfo,
    setLastMemoryPromptInfo,
    handleDryRunNovel
  };
}
