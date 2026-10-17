import { LoreEntry, Novel, AITaskType, NovelSettings } from '../types';
import { checkKeywordMatch } from './loreUtils';
import { GLOBAL_DEFAULTS, DEFAULT_PERSONA_PRIMING } from '../constants';
import autoCodexSystemPromptRaw from '../prompts/auto-codex-system.md?raw';
import autoCodexPruningSchemaRaw from '../prompts/autocodex_pruning_schema.md?raw';
import autoCodexPruningRulesRaw from '../prompts/autocodex_pruning_rules.md?raw';
import codexFormattingRulesRaw from '../prompts/codex_formatting_rules.md?raw';
import consistencyCritiqueSystemPrompt from '../prompts/consistency_critique_system.md?raw';
import { stripInlineComments } from './utils';
import { GenerationMessage } from '../services/aiService';
import { 
  extractMentionedEntities, 
  searchRelevantMemoryCards, 
  formatArchiveCardsForPrompt 
} from './memoryArchiveUtils';

/**
 * [SSOT Engine] 전속 웹소설 작가 인컨텍스트 페르소나 프라이밍(Persona Priming) 턴 쌍을 생성합니다.
 * 
 * API 표준 규약:
 * - 1턴(User): [Master-Author Covenant & Persona Priming] 프라이밍 지시문
 * - 2턴(Model): 전속 작가의 헌신 및 자기 일관성(Self-Commitment) 선언문
 * 
 * 효과:
 * 1. Self-Consistency Bias를 통해 모델이 스스로 소설가 페르소나 및 높은 협력성을 유지
 * 2. 과도한 AI 메타 발언 억제 및 거침없는 장르적 표현력 강화
 * 3. 최종 출력물에는 사족을 달지 않는 자가 규율 선언으로 JSON/소설 본문 완벽 호환
 */
export function getPersonaPrimingMessages(novelSettings?: NovelSettings): GenerationMessage[] {
  const personaConfig = novelSettings?.personaPriming;
  const isEnabled = personaConfig?.enabled !== false; // 기본 활성화 (true)

  if (!isEnabled) {
    return [];
  }

  const trigger = personaConfig?.customTrigger?.trim() || DEFAULT_PERSONA_PRIMING.customTrigger;
  const declaration = personaConfig?.customDeclaration?.trim() || DEFAULT_PERSONA_PRIMING.customDeclaration;

  return [
    { role: 'user', content: trigger },
    { role: 'model', content: declaration }
  ];
}

/**
 * 에디터의 HTML 콘텐츠를 순수 텍스트(Plain Text)로 변환합니다.
 * {} 태그나 기타 내용은 제거하지 않은 순수한 상태입니다. (Codex, Memory 등에서 사용)
 */
export function getRawPlainText(htmlContent: string): string {
  return htmlContent
    .replace(/<span data-instruction[^>]*>(.*?)<\/span>/gi, (match, p1) => {
      const trimmed = p1.replace(/^\{+/, '').replace(/\}+$/, '').trim();
      return `{ ${trimmed} }`;
    })
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>?/gm, '');
}

export interface NovelContextResult {
  storyContext: string; // Full cleaned text
  storyContextNovel: string; // Truncated text for novel generation
  userDirectiveBlock: string;
  anchorTailText: string;
  cleanContent: string;
}

export interface ResolvedStoryContext {
  windowProse: string;       // 지시어 제거 + 최근 contextWindow만큼 엄격히 슬라이스된 본문
  windowProseNovel: string;  // 앵커 테일을 제외한 본문 (이어쓰기 및 탈고 본체)
  anchorTailText: string;    // 이어쓰기 접합용 직전 미세 앵커 텍스트
  userDirectiveBlock: string;// 추출된 사용자 지시문 블록 (## [User Directive] ...)
  cleanFullContent: string;  // 지시어만 제거된 소설 전체 본문 (오직 통계/비프롬프트 용도로만 보관)
  isTruncated: boolean;      // 본문이 contextWindow보다 길어 앞부분이 잘렸는지 여부
}

export interface ResolveStoryContextOptions {
  contextWindow: number;
  continuationLength?: number;
  extractDirectives?: boolean;
}

/**
 * [SSOT Engine] 소설 HTML 콘텐츠의 본문 전처리, 지시어 분리, contextWindow 슬라이싱, 앵커 테일 분리를 전담하는 단일 진실 공급원.
 * 
 * 1. HTML 태그 정규화 및 줄바꿈 복원
 * 2. 최하단 lookback 범위({} 지시사항) 안전 추출 및 본문에서 완전 격리 제거
 * 3. [불변 원칙] 설정된 contextWindow만큼 맨 뒤에서부터 엄격하게 슬라이싱 (windowProse)
 * 4. continuationLength에 따른 본체(windowProseNovel)와 앵커 테일(anchorTailText) 분리
 */
export function resolveStoryContextEngine(
  htmlContent: string,
  options: ResolveStoryContextOptions
): ResolvedStoryContext {
  const rawContent = getRawPlainText(htmlContent);
  const continuationLength = options.continuationLength ?? GLOBAL_DEFAULTS.continuationLength;
  const contextWindow = Math.max(100, options.contextWindow || GLOBAL_DEFAULTS.contextWindow);

  // 1. 하단부(lookbackRange)에서 지시사항 추출 (옵션 지정 시)
  const extractDirectives = options.extractDirectives !== false;
  let cleanContent = rawContent;
  let extractedInstructions = "";

  if (extractDirectives) {
    const lookbackRange = continuationLength * 2;
    const lastPart = rawContent.slice(-lookbackRange);
    const instructionMatches: string[] = lastPart.match(/\{[^}]+\}/g) || [];
    extractedInstructions = instructionMatches.join('\n');

    if (instructionMatches.length > 0) {
      const contentBeforeLastPart = rawContent.slice(0, -lookbackRange);
      let cleanLastPart = lastPart;
      instructionMatches.forEach(inst => {
        const escapedInst = inst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedInst + '\\n?', 'g');
        cleanLastPart = cleanLastPart.replace(regex, '');
      });
      cleanContent = (contentBeforeLastPart + cleanLastPart).replace(/\n{4,}$/g, '\n\n\n');
    }
  }

  // 2. [불변 원칙] contextWindow 제한 적용 (뒤에서부터 contextWindow만큼만 취함)
  const isTruncated = cleanContent.length > contextWindow;
  const windowProse = isTruncated ? cleanContent.slice(-contextWindow) : cleanContent;

  // 3. Story Context와 Anchor Tail 분리
  const suffixStartIndex = Math.max(0, windowProse.length - continuationLength);
  const windowProseNovel = windowProse.slice(0, suffixStartIndex).trimEnd();
  const anchorTailText = windowProse.slice(suffixStartIndex);

  return {
    windowProse,
    windowProseNovel,
    anchorTailText,
    userDirectiveBlock: extractedInstructions ? `## [User Directive]\n${extractedInstructions}\n` : "",
    cleanFullContent: cleanContent,
    isTruncated
  };
}

/**
 * 소설 본문 생성(Novel Generation)에 특화된 텍스트 처리를 수행합니다.
 * (SSOT 엔진 resolveStoryContextEngine을 래핑하여 하위 호환성을 100% 보장합니다)
 */
export function processNovelContext(
  htmlContent: string,
  contextWindow: number,
  continuationLength: number
): NovelContextResult {
  const resolved = resolveStoryContextEngine(htmlContent, {
    contextWindow,
    continuationLength,
    extractDirectives: true
  });

  return {
    storyContext: resolved.windowProse,
    storyContextNovel: resolved.windowProseNovel,
    userDirectiveBlock: resolved.userDirectiveBlock,
    anchorTailText: resolved.anchorTailText,
    cleanContent: resolved.cleanFullContent
  };
}

/**
 * 활성화된 로어(Codex) 항목들을 필터링하여 마크다운 블록으로 변환합니다.
 * @param options.excludeId 제외할 항목 ID (Codex 개별 수정 시 사용)
 * @param options.includeMetadata ID, Locked 상태 등 메타데이터 포함 여부 (Auto Codex에서 사용)
 */
export function formatActiveLore(
  loreEntries: LoreEntry[] | undefined, 
  windowContent: string,
  options: { excludeId?: string; includeMetadata?: boolean; preserveLoreComments?: boolean } = {}
): string {
  if (!loreEntries || loreEntries.length === 0) return "";
  
  const sortedEntries = [...loreEntries].sort((a, b) => a.order - b.order);
  const entriesToInclude = sortedEntries.filter(entry => {
    if (entry.type === 'folder') return false;
    if (options.excludeId && entry.id === options.excludeId) return false;
    if (!entry.enabled) return false;
    if (entry.isAlwaysActive) return true;
    
    return checkKeywordMatch(windowContent, entry.keywords);
  });

  if (entriesToInclude.length === 0) return "";

  const header = options.includeMetadata ? "## [Active Lore Entries]" : "## [The Codex: Relevant Lore & Settings]";
  
  return header + "\n" + 
    entriesToInclude.map(e => {
      const metadata = options.includeMetadata ? `ID: ${e.id} | Title: ${e.title} | Locked: ${!!e.isLocked}\n` : `### ${e.title}\n`;
      const content = options.preserveLoreComments ? e.content : stripInlineComments(e.content);
      return `${metadata}${content}`;
    }).join("\n\n") + 
    "\n";
}

/**
 * [SSOT Engine] 에디터의 인메모리 라이브 상태(Undo/Redo 포함)를 최우선으로 획득하는 단일 진실 공급원(SSOT) 헬퍼.
 * 
 * 불변 원칙:
 * 1. 에디터 인스턴스(Editor) 또는 getEditorContent 콜백이 제공되면 반드시 그 최신 HTML(라이브 상태)을 반환합니다.
 * 2. 에디터가 언마운트되었거나 본문을 가져올 수 없는 경우:
 *    - strictMode(기본값 true): Stale State에 의한 오작동을 차단하기 위해 명시적 에러를 던집니다.
 *    - allowSavedFallback=true: 명시적으로 저장된 본문 폴백을 허용한 경우에만 novel.content를 반환합니다.
 */
export function resolveLiveStoryContent(
  novel: Novel | null | undefined,
  editorOrGetter?: any | (() => string | undefined) | null,
  options: { allowSavedFallback?: boolean; strict?: boolean } = {}
): string {
  const { allowSavedFallback = false, strict = true } = options;

  let liveText: string | undefined = undefined;

  if (typeof editorOrGetter === 'function') {
    liveText = editorOrGetter();
  } else if (editorOrGetter && typeof editorOrGetter.getHTML === 'function') {
    liveText = editorOrGetter.getHTML();
  }

  if (liveText !== undefined && liveText !== null) {
    return liveText;
  }

  if (allowSavedFallback && novel && typeof novel.content === 'string') {
    return novel.content;
  }

  if (strict) {
    throw new Error('에디터 본문을 불러오는 중이거나 에디터가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
  }

  return novel?.content || "";
}

/**
 * 모든 AI 태스크에서 공통으로 사용할 수 있는 '거대 사전(Total Variable Dictionary)'을 구축합니다.
 * 이 함수는 소설의 모든 상태와 추가 데이터를 마크다운용 변수로 번역하는 역할을 합니다.
 * 단 하나의 조금 무겁더라도 안정적인 번역기 역할을 수행합니다.
 */
export function buildTotalVariableDictionary(novel: Novel, extraData?: any, options?: { preserveLoreComments?: boolean }) {
  const contextWindow = novel.settings.contextWindow || GLOBAL_DEFAULTS.contextWindow;
  const continuationLength = novel.settings.continuationLength || GLOBAL_DEFAULTS.continuationLength;
  
  if (extraData?.overrideContent === undefined) {
    console.warn(`[buildTotalVariableDictionary] Stale State Fallback Warning: 'overrideContent' was not provided. Falling back to novel.content.`);
  }

  const rawContent = extraData?.overrideContent !== undefined ? extraData.overrideContent : (novel.content || "");
  
  // [SSOT Engine] 단일 진실 공급원을 통한 본문 전처리, 지시어 분리, contextWindow 슬라이싱
  const resolvedStory = resolveStoryContextEngine(rawContent, {
    contextWindow,
    continuationLength,
    extractDirectives: true
  });

  const preserveLoreComments = options?.preserveLoreComments ?? false;
  // 모든 표준 태스크가 공유할 엄격히 슬라이스된 본문 윈도우
  const windowContent = resolvedStory.windowProse;

  // 1. Novel Task 전용 가공 (SSOT 엔진 결과 직접 바인딩)
  const { windowProseNovel: storyContextNovel, userDirectiveBlock, anchorTailText } = resolvedStory;

  // 2. Codex Task 전용 가공
  const entry = extraData?.entry;
  const codexAIInstruction = extraData?.codexAIInstruction;
  const rawCodexSystem = GLOBAL_DEFAULTS.codexSystemPrompt;
  const codexSystemPrompt = rawCodexSystem.replace('{{CODEX_FORMATTING_RULES}}', codexFormattingRulesRaw);

  // 3. Memory Task 전용 가공
  const memoryAIInstruction = extraData?.memoryAIInstruction || "";
  const defaultMemoryInstruction = GLOBAL_DEFAULTS.memoryInstruction;
  const memoryInstructionContent = memoryAIInstruction.trim() || defaultMemoryInstruction;

  // 4. Auto Codex Task 전용 가공 (동일한 SSOT 엔진을 활용하여 autoCodexWindow 엄격 적용)
  const enablePruning = extraData?.enablePruning ?? false;
  const autoCodexWindow = novel.settings.autoCodexContextWindow || GLOBAL_DEFAULTS.autoCodexContextWindow;
  const resolvedAutoCodex = resolveStoryContextEngine(rawContent, {
    contextWindow: autoCodexWindow,
    continuationLength: 0,
    extractDirectives: false
  });
  const autoCodexContent = resolvedAutoCodex.windowProse;
  const autoCodexUserDirective = extraData?.userDirective?.trim() || "";
  const pruningSchema = enablePruning ? autoCodexPruningSchemaRaw.trimEnd() : '';
  const pruningRules = enablePruning ? autoCodexPruningRulesRaw.trimEnd() : '';
  const autoCodexSystemPrompt = autoCodexSystemPromptRaw
    .replace('{{PRUNING_SCHEMA}}', pruningSchema)
    .replace('{{PRUNING_RULES}}', pruningRules)
    .replace('{{CODEX_FORMATTING_RULES}}', codexFormattingRulesRaw);

  // 5. Plot Task 전용 가공
  const plotAIInstruction = extraData?.plotAIInstruction?.trim()
    ? extraData.plotAIInstruction.trim()
    : GLOBAL_DEFAULTS.plotInstruction;

  const rawPlotBlueprint = (novel.settings.plot?.includeInPrompt !== false && novel.plot && novel.plot.trim())
    ? novel.plot
    : "";

  const styleDirectives = novel.settings.styleDirectives?.trim() || "";
  const styleDirectivesSystemBlock = styleDirectives
    ? `\n\n[Author Novel Style & Directing Directives]\n작가가 지정한 시점, 서술 어조, 캐릭터 보이스 및 핵심 문체 규칙은 다음과 같다:\n${styleDirectives}`
    : "";
  const styleDirectivesBlock = formatStyleDirectives(styleDirectives);
  const plotBlueprint = rawPlotBlueprint ? formatPlotBlueprint(rawPlotBlueprint) : "";

  // 3-1. 보관소 카드(Memory Archive Cards) 결정론적 검색 및 가공 (SSOT)
  const memoryEntities = extractMentionedEntities(windowContent, novel.loreEntries || []);
  const memoryRelevantCards = searchRelevantMemoryCards(novel.memoryCards || [], memoryEntities, 20);
  const relevantArchiveCardsMemory = formatArchiveCardsForPrompt(memoryRelevantCards);

  // 이어쓰기 및 검수용 보관소 카드 (본문 말미 400자 + 플롯 + (검수 시) 초안에서 추출)
  const novelTailScanText = [
    anchorTailText || windowContent.slice(-400),
    rawPlotBlueprint || '',
    extraData?.rawDraft || ''
  ].filter(Boolean).join('\n');
  const novelEntities = extractMentionedEntities(novelTailScanText, novel.loreEntries || []);
  const novelRelevantCards = searchRelevantMemoryCards(novel.memoryCards || [], novelEntities, 20);
  const novelArchiveCardsBlock = novelRelevantCards.length > 0
    ? `## [관련 보관소 과거 사실 (참고용. 같은 사안은 뒤의 카드가 우선)]\n${formatArchiveCardsForPrompt(novelRelevantCards)}\n`
    : "";

  return {
    // 🚨 [방어벽] 레거시 호환성을 보장하되, 실수로 CLEAN_STORY_CONTEXT를 참조하더라도
    // contextWindow 상한선이 무조건 적용된 windowProse가 주입되도록 강제
    CLEAN_STORY_CONTEXT: resolvedStory.windowProse,
    RAW_PLAIN_TEXT: resolvedStory.cleanFullContent,
    
    // [Basic Metadata]
    STORY_TITLE: novel.title || "제목 없는 소설",
    STORY_AUTHOR_UID: novel.authorUid || "미지정",

    // [Global Context Blocks]
    STORY_CONTEXT: resolvedStory.windowProse,
    STORY_MEMORY_BLOCK: formatStoryMemory(novel.storyMemory),
    RELEVANT_ARCHIVE_CARDS_MEMORY: relevantArchiveCardsMemory,
    RELEVANT_ARCHIVE_CARDS_NOVEL_BLOCK: novelArchiveCardsBlock,
    ACTIVE_LORE_BLOCK: formatActiveLore(novel.loreEntries, windowContent, { excludeId: entry?.id, preserveLoreComments }),
    
    // [Novel Task Variables]
    // 시스템 프롬프트는 펌웨어 SSOT(GLOBAL_DEFAULTS.systemPrompt)로 강제 고정
    SYSTEM_PROMPT_NOVEL: GLOBAL_DEFAULTS.systemPrompt,
    STYLE_DIRECTIVES_SYSTEM_BLOCK: styleDirectivesSystemBlock,
    STYLE_DIRECTIVES_BLOCK: styleDirectivesBlock,
    STORY_CONTEXT_NOVEL: storyContextNovel,
    USER_DIRECTIVE_BLOCK: userDirectiveBlock,
    ANCHOR_TAIL_TEXT: anchorTailText,

    // [Codex Task Variables]
    SYSTEM_PROMPT_CODEX: codexSystemPrompt,
    CODEX_FORMATTING_RULES: codexFormattingRulesRaw,
    STORY_CONTEXT_CODEX: windowContent,
    TARGET_LORE_TITLE: entry?.title || "",
    TARGET_LORE_CONTENT: entry?.content || "(내용 없음)",
    USER_INSTRUCTION_CODEX: codexAIInstruction || "[Current Story Text]의 맥락을 바탕으로 이 코덱스 항목을 정밀하게 다듬거나 보강하라.",

    // [Memory Task Variables]
    SYSTEM_PROMPT_MEMORY: GLOBAL_DEFAULTS.memorySystemPrompt,
    STORY_CONTEXT_MEMORY: windowContent,
    USER_INSTRUCTION_MEMORY: `## [Instruction]\n${memoryInstructionContent}\n\n`,

    // [Auto Codex Task Variables]
    SYSTEM_PROMPT_AUTOCODEX: autoCodexSystemPrompt,
    STORY_CONTEXT_AUTOCODEX: autoCodexContent,
    ACTIVE_LORE_BLOCK_AUTO: formatActiveLore(novel.loreEntries, autoCodexContent, { includeMetadata: true, preserveLoreComments }),
    USER_DIRECTIVE_AUTOCODEX: autoCodexUserDirective ? `## [User Directive (Mandatory Directing)]\n${autoCodexUserDirective}\n\n` : "",
    PRUNING_SCHEMA: pruningSchema,
    PRUNING_RULES: pruningRules,

    // [Plot Task Variables]
    SYSTEM_PROMPT_PLOT: GLOBAL_DEFAULTS.plotSystemPrompt,
    PLOT_BLUEPRINT: plotBlueprint,
    USER_INSTRUCTION_PLOT: plotAIInstruction,
    CURRENT_PLOT_CONTENT: novel.plot?.trim() || "(현재 설정된 플롯이 없습니다. 본문과 코덱스를 분석하여 새로운 플롯을 수립하세요.)",

    // [Consistency Task Variables - MARS Stage 3 Master Novelist SSOT]
    SYSTEM_PROMPT_CONSISTENCY: `${GLOBAL_DEFAULTS.systemPrompt}\n\n---\n\n${GLOBAL_DEFAULTS.critiqueSynthesisPrompt}`,
    CRITIQUE_SYNTHESIS_SYSTEM: GLOBAL_DEFAULTS.critiqueSynthesisPrompt,
    LORE: formatActiveLore(novel.loreEntries, windowContent, { preserveLoreComments }),
    MEMORY: formatStoryMemory(novel.storyMemory),
    USER_INSTRUCTION: userDirectiveBlock.trim() ? userDirectiveBlock : "(지시사항 없음)",
    RECENT_CONTEXT: windowContent,
    RAW_DRAFT: extraData?.rawDraft || "",
    ANCHOR_TEXT: extraData?.anchorText || "",
  };
}

/**
 * 소설 설정의 styleDirectives(작품 문체 및 연출 지침)를 마크다운 블록으로 변환하는 단일 진실 공급원(SSOT) 포매터입니다.
 */
export function formatStyleDirectives(directives: string | undefined): string {
  if (!directives || !directives.trim()) return "";
  return `## [Novel Style & Directing Guide]\n${directives.trim()}\n`;
}

/**
 * 소설 설정의 styleDirectives와 플롯 청사진을 정리하는 헬퍼 함수입니다.
 */
export function resolveNarrativeDirectivesContext(
  styleDirectives: string | undefined,
  plotBlueprint: string | undefined
): { mergedPlotBlueprint?: string; standaloneStyleBlock?: string } {
  const cleanStyle = styleDirectives?.trim() || "";
  const cleanPlot = plotBlueprint?.trim() || "";

  return {
    mergedPlotBlueprint: cleanPlot || undefined,
    standaloneStyleBlock: cleanStyle ? formatStyleDirectives(cleanStyle) : undefined
  };
}

/**
 * 플롯 청사진을 마크다운 블록으로 변환합니다.
 */
export function formatPlotBlueprint(plot: string | undefined): string {
  if (!plot || !plot.trim()) return "";
  return `## [Plot Blueprint]\n${plot.trim()}\n`;
}

/**
 * 스토리 메모리를 마크다운 블록으로 변환합니다.
 */
export function formatStoryMemory(memory: string | undefined): string {
  if (!memory || !memory.trim()) return "";
  return `## [Story Memory]\n${memory.trim()}\n`;
}

/**
 * 사용자의 지시사항(Instruction)을 마크다운 블록으로 변환합니다.
 */
export function formatUserDirective(instructions: string | undefined): string {
  if (!instructions || !instructions.trim()) return "";
  return `## [User Directive]\n${instructions.trim()}\n`;
}

/**
 * 앵커(Anchor) 오버랩 이어쓰기 지시문 블록을 생성하는 단일 진실 공급원(SSOT) 포매터입니다.
 * 초안 작성(continuation)과 리파이너 탈고(refinement)에서 각각 적절한 종결 지침을 전달할 수 있도록
 * mode 옵션을 지원하며, 앵커 태그(<anchor>)는 최하단 스티칭 신뢰성을 위해 동일하게 유지됩니다.
 */
export function formatAnchorBlock(
  anchorText: string | undefined,
  options?: { mode?: 'continuation' | 'refinement' }
): string {
  if (!anchorText || !anchorText.trim()) return "";
  const rawTailEnd = anchorText.trimEnd();
  const anchorLength = Math.min(25, Math.max(10, Math.floor(rawTailEnd.length * 0.3)));
  const expectedAnchor = rawTailEnd.slice(-anchorLength);

  if (!expectedAnchor) return "";

  const tailInstruction = options?.mode === 'refinement'
    ? `반드시 <anchor> 내부의 텍스트를 글자 그대로 출력한 직후, 오직 <RAW_DRAFT>가 다루는 사건의 범위 내에서 4대 진단 보고서를 반영하여 작업을 진행하라. <RAW_DRAFT>가 도달한 마지막 사건/상황의 매듭에서 집필을 끝마치라. 플롯이나 지시사항에 그 뒤의 전개가 남아 있더라도, <RAW_DRAFT>가 다루지 않은 사건을 덧붙이지 마라.`
    : `위 앵커 텍스트를 글자 그대로 출력한 직후, 자연스럽게 다음 이야기를 이어서 집필하라.`;

  return (
    `### [Immediate Stitching Anchor]\n` +
    `앞선 서사의 완전한 연속성을 보장하기 위해, 반드시 아래 <anchor> XML 태그 내부의 텍스트를 글자 하나, 공백, 줄바꿈까지 단 하나도 변경하지 말고 그대로 복사하여 첫머리에 출력하며 응답을 시작하라.\n` +
    `글자 하나라도 임의로 수정하거나 누락하지 마라.\n\n` +
    `<anchor>\n${expectedAnchor}\n</anchor>\n\n` +
    tailInstruction
  );
}

/**
 * 소설 생성 및 다중 에이전트 감사/탈고 파이프라인에서 사용하는
 * 100% 단일 진실 공급원(SSOT) 표준 서사 컨텍스트 블록 생성기입니다.
 * 
 * 정형화된 컨텍스트 배치 순서:
 * 1. [The Codex] (세계관/인물/불변 법칙)
 * 2. [Plot Blueprint] (플롯 청사진/사건 전개)
 * 3. [Story Memory] (직전 회차/장기 기억)
 * 4. [Current Story Text] (현재 집필 중인 본문 맥락)
 * 5. [Immediate Preceding Anchor] (옵션: 앵커 포함 시)
 * 6. [User Directive] (작가의 지시사항)
 */
export function buildStandardNarrativeContext(
  variables: Record<string, string>,
  options?: { includeAnchor?: boolean }
): string[] {
  const sections: string[] = [];

  // 1. [The Codex]
  if (variables.ACTIVE_LORE_BLOCK?.trim()) {
    sections.push(variables.ACTIVE_LORE_BLOCK.trim());
  }

  // 2. [Novel Style & Directing Guide] (작가의 서술 지침: 시점, 어조, 핵심 문체 룰)
  if (variables.STYLE_DIRECTIVES_BLOCK?.trim()) {
    sections.push(variables.STYLE_DIRECTIVES_BLOCK.trim());
  }

  // 3. [Plot Blueprint] (플롯 청사진: 1번 연출 디렉팅 + 2~4번 시퀀스 전개)
  if (variables.PLOT_BLUEPRINT?.trim()) {
    sections.push(variables.PLOT_BLUEPRINT.trim());
  }

  // 3. [Story Memory]
  if (variables.STORY_MEMORY_BLOCK?.trim()) {
    sections.push(variables.STORY_MEMORY_BLOCK.trim());
  }

  // 3-1. [Relevant Archive Cards] (보관소 과거 사실 참고)
  if (variables.RELEVANT_ARCHIVE_CARDS_NOVEL_BLOCK?.trim()) {
    sections.push(variables.RELEVANT_ARCHIVE_CARDS_NOVEL_BLOCK.trim());
  }

  // 4. [Current Story Text] (SSOT: 온전한 최근 본문 주입으로 앵커 절단 및 Ghost Gap 방지)
  const currentStoryText = variables.STORY_CONTEXT?.trim() || variables.STORY_CONTEXT_NOVEL?.trim();
  if (currentStoryText) {
    sections.push(`## [Current Story Text]\n${currentStoryText}`);
  }

  // 5. [Immediate Preceding Anchor] (옵션 지정 시)
  if (options?.includeAnchor && variables.ANCHOR_TAIL_TEXT?.trim()) {
    const anchorBlock = formatAnchorBlock(variables.ANCHOR_TAIL_TEXT);
    if (anchorBlock) {
      sections.push(anchorBlock);
    }
  }

  // 6. [User Directive]
  if (variables.USER_DIRECTIVE_BLOCK?.trim()) {
    sections.push(variables.USER_DIRECTIVE_BLOCK.trim());
  }

  return sections;
}

/**
 * MARS Stage 2 4대 전문 감사관(Plot, Physical, Lore, Stylistic)을 위한
 * 단일 진실 공급원(SSOT) 유저 프롬프트 포매터입니다.
 * 
 * - 상단: 표준 서사 배경 (앵커 배제)
 * - 하단: 순수 XML 태그로 완벽히 격리된 감사 대상 초안 (<RAW_DRAFT>)
 */
export function formatAuditorPrompt(variables: Record<string, string>, scopedDraft: string): string {
  const standardNarrativeSections = buildStandardNarrativeContext(variables, { includeAnchor: false });
  return [
    ...standardNarrativeSections,
    `<RAW_DRAFT>\n${scopedDraft.trim()}\n</RAW_DRAFT>`
  ].join('\n\n');
}

/**
 * MARS Stage 3 Master Novelist / Literary Restorer(수석 문학 복원가) 최종 렌더링 모델 및
 * 프롬프트 검사기(Prompt Inspector)를 위한 단일 진실 공급원(SSOT) 프롬프트 포매터입니다.
 * 
 * 구조적 인지 최적화 (Narrative Order Harmonization & Recency-Biased Anchor Architecture):
 * - 상단 서사 배경: [The Codex] -> [Style] -> [Plot Blueprint] -> [Story Memory]
 * - 원본 본문 맥락: ## [Current Story Text] (contextWindow 내 온전한 단일 소설 본문 전체)
 * - 작가 집필 지시: ## [User Directive] (인라인 {} 지침)
 * - 중단 참고 자료 브리핑: 미완성 초안 (<RAW_DRAFT>) 및 4대 전문 진단 보고서 (## [Specialist Diagnostic Reports])
 * - 최하단 (Recency Zone - 생성 직전 지점):
 *   ## [Final Directing for Master Literary Restorer] -> ### [Immediate Stitching Anchor] (<anchor>)
 */
export function formatMasterSynthesisPrompt(
  variables: Record<string, string>,
  rawDraft: string,
  auditReports?: {
    plotReport?: string;
    physicalReport?: string;
    loreReport?: string;
    stylisticReport?: string;
  }
): string {
  // 1. 상단 배경 컨텍스트 및 원본 소설 본문 조립 (서사 인과 순서 일원화: 배경 -> 원본 본문 -> 지시문)
  const upperSections: string[] = [];
  if (variables.ACTIVE_LORE_BLOCK?.trim()) upperSections.push(variables.ACTIVE_LORE_BLOCK.trim());
  if (variables.STYLE_DIRECTIVES_BLOCK?.trim()) upperSections.push(variables.STYLE_DIRECTIVES_BLOCK.trim());
  if (variables.PLOT_BLUEPRINT?.trim()) upperSections.push(variables.PLOT_BLUEPRINT.trim());
  if (variables.STORY_MEMORY_BLOCK?.trim()) upperSections.push(variables.STORY_MEMORY_BLOCK.trim());
  
  // [SSOT 원칙]: 초안(<RAW_DRAFT>) 이전에 온전한 원본 소설 본문 전체를 단일 블록으로 전진 배치
  const currentStoryText = variables.STORY_CONTEXT?.trim() || variables.STORY_CONTEXT_NOVEL?.trim();
  if (currentStoryText) {
    upperSections.push(`## [Current Story Text]\n${currentStoryText}`);
  }
  
  if (variables.USER_DIRECTIVE_BLOCK?.trim()) upperSections.push(variables.USER_DIRECTIVE_BLOCK.trim());

  // 2. 중단 참고 자료 브리핑 (초안 + 4대 전문 진단 보고서)
  const plotRep = auditReports?.plotReport?.trim() || "(실제 실행 시 서사 역동 & 인과 복원 분석관의 심층 진단 보고서가 주입됩니다)";
  const physicalRep = auditReports?.physicalReport?.trim() || "(실제 실행 시 시공간 물리 정합 분석관의 심층 진단 보고서가 주입됩니다)";
  const loreRep = auditReports?.loreReport?.trim() || "(실제 실행 시 로어 수호 & 인지 경계 분석관의 심층 진단 보고서가 주입됩니다)";
  const stylisticRep = auditReports?.stylisticReport?.trim() || "(실제 실행 시 한국어 문체 & 미학 조율관의 심층 진단 보고서가 주입됩니다)";

  const briefingSections = [
    `<RAW_DRAFT>\n${rawDraft.trim()}\n</RAW_DRAFT>`,
    `================================================================================\n` +
    `## [Specialist Diagnostic Reports]\n` +
    `아래는 초안(<RAW_DRAFT>)에 대한 4대 전문 분석관의 독립 심층 진단 보고서입니다.\n` +
    `================================================================================`,
    `### 1. 서사 역동 및 인과 정합 진단 보고서\n${plotRep}`,
    `### 2. 시공간 물리 연속성 진단 보고서\n${physicalRep}`,
    `### 3. 로어 수호 및 인지 경계 진단 보고서\n${loreRep}`,
    `### 4. 한국어 문체 및 미학 진단 보고서\n${stylisticRep}`
  ];

  // 3. 최하단 실행 구역 (Recency Zone - 생성 직전 지점: 최종 집필 지침 및 기계적 스티칭 앵커 직결)
  const executionZoneSections: string[] = [];

  executionZoneSections.push(
    `## [Final Directing for Master Literary Restorer]\n` +
    `위 4대 전문 진단 보고서의 통찰을 총체적으로 수렴하여, 미완성 초안(<RAW_DRAFT>)의 서사적 뼈대를 바탕으로 직전 본문([Current Story Text])의 마지막 호흡에서 0.1초의 단절도 없이 이어지는 완전한 완성본 소설 본문으로 종합 탈고(Holistic Literary Restoration)하십시오.\n` +
    `특정 구절만 기계적으로 땜질(Find-and-Replace)하는 행위를 엄격히 금지하며, 글 전체의 리듬과 긴장감을 일관된 거장의 문체로 처음부터 끝까지 완전하게 다시 빚어내십시오.\n\n` +
    `[핵심 범위 원칙: 사건 지평선(Event Horizon) & 월경(Trespassing) 금지]\n` +
    `1. 개정의 자율성 (마지막 문장 고정 금지): 초안의 묘사, 대사, 문장 흐름, 결말 표현은 진단 보고서의 권고에 따라 얼마든지 자유롭고 과감하게 고치고 새로 쓰십시오. 초안의 마지막 문장을 기계적으로 흉내 내거나 고정할 필요가 전혀 없습니다.\n` +
    `2. 사건 범위의 엄격한 한정: 단, 이번 집필에서 다루는 사건의 범위는 오직 <RAW_DRAFT>가 도달한 마지막 사건/상황의 매듭까지로 엄격히 한정됩니다. <RAW_DRAFT>의 마지막 사건이 자연스럽게 해결·완결되는 순간 마침표를 찍고 글을 맺으십시오.\n` +
    `3. 미래 전개 월경 금지: 상단의 [Plot Blueprint]나 [User Directive]는 초안의 의도를 이해하기 위한 참고 배경일 뿐입니다. 그곳에 적힌 미래의 전개나 다음 단계의 사건이 있더라도, <RAW_DRAFT>가 아직 다루지 않은 영역으로 넘어가는 행위(Trespassing)를 엄격히 금지합니다.\n\n` +
    `[CRITICAL: 어떤 분석 설명, 서두 인사, 마크다운 코드블록(\`\`\`) 없이, 독자가 읽을 최종 복원 완성본 소설 본문 텍스트만을 온전히 출력하십시오.]`
  );

  const anchorBlock = formatAnchorBlock(variables.ANCHOR_TAIL_TEXT, { mode: 'refinement' });
  if (anchorBlock) {
    executionZoneSections.push(anchorBlock);
  }

  return [...upperSections, ...briefingSections, ...executionZoneSections].join('\n\n');
}

export function buildSyntheticHistoryMessages(
  plainText: string, 
  continuationLength: number, 
  userDirective: string,
  activeLore?: string,
  plotBlueprint?: string,
  storyMemory?: string,
  contextWindow?: number,
  personaPrimingMessages: GenerationMessage[] = [],
  archiveCardsBlock?: string
): GenerationMessage[] {
    // 0. Defense-in-Depth (2차 심층 방어): 혹시라도 contextWindow보다 긴 텍스트가 전달될 경우 강제 슬라이싱
    const safeText = (contextWindow && contextWindow > 0 && plainText.length > contextWindow)
      ? plainText.slice(-contextWindow)
      : plainText;

    // 1. Suffix 분리 (마지막 턴의 User 텍스트)
    const suffixIndex = Math.max(0, safeText.length - continuationLength);
    const tail = safeText.slice(suffixIndex);
    const remaining = safeText.slice(0, suffixIndex);
    
    const anchorInstruction = formatAnchorBlock(tail)
      ? `\n\n${formatAnchorBlock(tail)}`
      : `\n\n## [System Note]\n군더더기 없이 오직 "지시사항을 반영한 순수한 소설 본문"만을 곧바로 출력하라. 불필요한 인사말, 확인 멘트("네, 알겠습니다" 등), 사족에 해당하는 대화형 문장은 일절 출력하지 마라. `;

    const finalUserContent = userDirective 
      ? `${userDirective}\n\n## [Current Story Text]\n${tail}${anchorInstruction}` 
      : `## [Current Story Text]\n${tail}${anchorInstruction}`;

    // 최상단 User 턴에 주입할 컨텍스트 프리픽스 ([The Codex] -> [★ Plot Blueprint] -> [Story Memory] -> [보관소 과거 사실])
    // 시간적 인과 구조(초기 설정/미래 목적/과거 요약 -> 본문 전개)를 보장하기 위해
    // 대화의 가장 첫 번째 User 턴 상단에 배치합니다.
    const prefixBlocks = [activeLore, plotBlueprint, storyMemory, archiveCardsBlock].filter(b => b && b.trim()).map(b => b!.trim());
    const topContextPrefix = prefixBlocks.length > 0 ? `${prefixBlocks.join('\n\n')}\n\n` : "";

    // 2. 본문 선행 맥락이 200자 미만인 초반부:
    // 하드코딩된 예시 주입으로 인한 장르/문맥 오염을 원천 차단하기 위해 단일 유저 턴으로 전달
    // 이 경우 최상단 User 턴이 곧 활성 턴이므로 topContextPrefix를 결합하여 전달
    if (remaining.length < 200) {
        return [
            ...personaPrimingMessages,
            { role: "user", content: `${topContextPrefix}${finalUserContent}` }
        ];
    }

    // 3. 본문의 실제 문장/문단 기반 Anchor Stitching History 구성
    // remaining의 400자 윈도우에서 실제 문단/문장 경계 포착
    const searchWindowSize = Math.min(remaining.length, 450);
    const searchWindow = remaining.slice(-searchWindowSize);
    
    // 분할 기준점 탐색 (빈 줄 또는 단일 줄바꿈 또는 마침표)
    let splitPos = searchWindow.lastIndexOf('\n\n');
    if (splitPos === -1 || splitPos < 40 || splitPos > searchWindowSize - 40) {
        splitPos = searchWindow.lastIndexOf('\n');
    }
    if (splitPos === -1 || splitPos < 40 || splitPos > searchWindowSize - 40) {
        splitPos = searchWindow.lastIndexOf('. ');
        if (splitPos !== -1) splitPos += 1;
    }
    if (splitPos === -1 || splitPos < 40 || splitPos > searchWindowSize - 40) {
        splitPos = Math.floor(searchWindowSize / 2);
    }

    const globalSplitIndex = remaining.length - searchWindowSize + splitPos;
    const part1 = remaining.slice(0, globalSplitIndex).trimEnd();
    const rawPart2 = remaining.slice(globalSplitIndex);
    
    // part1의 끝부분 15자를 part2(Model 턴)의 머리에 앵커로 달아주어
    // 모델이 "과거 턴의 끝부분을 머리에 겹쳐서 자연스럽게 이어 쓰는 것"을 100% 모방하도록 함
    const part1Anchor = part1.slice(-15);
    const modelTurnContent = `${part1Anchor}${rawPart2}`;

    return [
        ...personaPrimingMessages,
        { role: "user", content: `${topContextPrefix}## [Current Story Text]\n${part1}` },
        { role: "model", content: modelTurnContent },
        { role: "user", content: finalUserContent }
    ];
}

export interface BuildTaskMessagesParams {
  taskType: AITaskType;
  variables: ReturnType<typeof buildTotalVariableDictionary>;
  novel: Novel;
  extraData?: any;
}

/**
 * 모든 AI 태스크의 Messages(대화 턴)를 단일 파이프라인에서 생성하는 통합 SSOT 엔진.
 * 1. 전속 웹소설 작가 페르소나 프라이밍(Persona Priming) 턴 쌍을 모든 요청 최상단에 주입합니다.
 * 2. 공통 맥락(Codex Lore + Story Memory)을 시간적 인과순서(선행 설정/기억 -> 본문)에 맞춰 일원화 추출 및 결합합니다.
 * 3. 태스크 성격(소설 본문 이어쓰기 멀티턴 vs 지시/JSON 분석 단일 턴)에 따라 적절한 턴 구조로 안전하게 분기합니다.
 */
export function buildTaskMessages({
  taskType,
  variables,
  novel,
  extraData
}: BuildTaskMessagesParams): GenerationMessage[] {
  // 1. 공통 Context Envelope 결합 (100% 일원화)
  // Auto-Codex는 메타데이터([ID: xxx] | Locked)가 포함된 ACTIVE_LORE_BLOCK_AUTO를 사용하고,
  // 그 외 태스크는 표준 ACTIVE_LORE_BLOCK을 사용합니다.
  const loreBlock = (taskType === 'autocodex')
    ? variables.ACTIVE_LORE_BLOCK_AUTO
    : variables.ACTIVE_LORE_BLOCK;

  const plotBlock = (novel.settings.plot?.includeInPrompt !== false && novel.plot && novel.plot.trim())
    ? formatPlotBlueprint(novel.plot)
    : "";

  const memoryBlock = variables.STORY_MEMORY_BLOCK;

  // 최상단 User 턴에 주입할 컨텍스트 프리픽스 ([The Codex] -> [★ Plot Blueprint] -> [Story Memory])
  const prefixBlocks = [loreBlock, plotBlock, memoryBlock].filter(b => b && b.trim()).map(b => b.trim());
  const topContextPrefix = prefixBlocks.length > 0 ? `${prefixBlocks.join('\n\n')}\n\n` : "";

  // 전속 웹소설 작가 페르소나 프라이밍 턴 쌍 획득 (SSOT)
  const personaPriming = getPersonaPrimingMessages(novel.settings);

  // 2. 태스크별 턴 빌더 전략 분기
  switch (taskType) {
    case 'novel': {
      // 소설 이어쓰기 전용: 합성 멀티턴 앵커 스티칭
      const novelWindow = novel.settings.contextWindow || GLOBAL_DEFAULTS.contextWindow;
      return buildSyntheticHistoryMessages(
        variables.STORY_CONTEXT || extraData?.overrideContent || novel.content || "",
        novel.settings.continuationLength || GLOBAL_DEFAULTS.continuationLength,
        variables.USER_DIRECTIVE_BLOCK,
        loreBlock,
        plotBlock,
        memoryBlock,
        novelWindow,
        personaPriming,
        variables.RELEVANT_ARCHIVE_CARDS_NOVEL_BLOCK
      );
    }

    case 'memory': {
      // 스토리 메모리 갱신 (신규 2-Tier 표준 입력 규약 준수)
      // ## 설정집
      // ## 플롯 청사진
      // ## 기존 핵심 기억
      // ## 관련 보관소 카드
      // ## 직전 본문
      // ## 작가 지시
      const codexContent = variables.ACTIVE_LORE_BLOCK?.trim() || "없음";
      const plotContent = (novel.settings.plot?.includeInPrompt !== false && novel.plot && novel.plot.trim())
        ? novel.plot.trim()
        : "없음";
      const existingMemory = novel.storyMemory?.trim() || "없음";
      const relevantArchive = variables.RELEVANT_ARCHIVE_CARDS_MEMORY || "없음";
      const storyContext = variables.STORY_CONTEXT_MEMORY?.trim() || "없음";
      const authorDirective = extraData?.memoryAIInstruction?.trim() || "없음";

      const tailDirective = `## [Output Protocol & Strict JSON Requirement]\n` +
        `시스템 지침에 정의된 JSON 스키마 규격을 엄격히 준수하여 유효한 JSON 객체만을 출력하라.\n` +
        `JSON 결과를 마크다운 코드 블록(\`\`\`json ... \`\`\`)으로 감싸지 마라. 오직 순수한 JSON 객체만을 출력하라.`;

      const memoryContentParts = [
        `## 설정집\n${codexContent}`,
        `## 플롯 청사진\n${plotContent}`,
        `## 기존 핵심 기억\n${existingMemory}`,
        `## 관련 보관소 카드\n${relevantArchive}`,
        `## 직전 본문\n${storyContext}`,
        `## 작가 지시\n${authorDirective}`,
        tailDirective
      ];

      return [
        ...personaPriming,
        {
          role: "user",
          content: memoryContentParts.join('\n\n')
        }
      ];
    }

    case 'plot': {
      // 플롯 워크벤치 / 자동 갱신 태스크 (SSOT Standard Input Order)
      // 1. 설정집 (The Codex: Relevant Lore & Settings)
      // 2. 서사 요약 (Story Memory)
      // 3. 최근 본문 (Current Story Text)
      // 4. 기존 플롯 참조 (Current Plot Blueprint (Reference))
      // 5. 작가 지시문 (User Directive)
      // 6. 출력 규약 (Output Protocol)
      const contentParts = [
        loreBlock?.trim() ? loreBlock.trim() : "",
        memoryBlock?.trim() ? memoryBlock.trim() : "",
        `## [Current Story Text]\n${variables.STORY_CONTEXT}`,
        `## [Current Plot Blueprint (Reference)]\n${variables.CURRENT_PLOT_CONTENT}`,
        `## [User Directive]\n${variables.USER_INSTRUCTION_PLOT}`,
        `## [Output Protocol]\n시스템 지침에 정의된 JSON 스키마 규격을 엄격히 준수하여 유효한 JSON 객체만을 출력하라. 마크다운 코드 블록으로 감싸지 마라.`
      ].filter(p => p && p.trim());

      return [
        ...personaPriming,
        {
          role: "user",
          content: contentParts.join('\n\n')
        }
      ];
    }

    case 'autocodex': {
      // 오토 코덱스: 공통 프리픽스(ID 메타데이터 포함) + 소설 본문 + 유저 지침(최하단 Recency Bias 배치) + 최종 출력 규약
      const directiveBlock = variables.USER_DIRECTIVE_AUTOCODEX?.trim() || "";
      const contentParts = [
        topContextPrefix.trim(),
        `## [Current Story Text]\n${variables.STORY_CONTEXT_AUTOCODEX}`,
        directiveBlock,
        `## [Output Protocol]\n시스템 지침에 정의된 JSON 스키마 규격을 엄격히 준수하여 유효한 JSON 객체만을 출력하라. 마크다운 코드 블록으로 감싸지 마라.`
      ].filter(p => p && p.trim());

      return [
        ...personaPriming,
        {
          role: "user",
          content: contentParts.join('\n\n')
        }
      ];
    }

    case 'codex': {
      // 코덱스 어시스턴트: 선행 배경 + 소설 본문 + 타겟 로어 + 유저 지시문 + 최종 JSON 트리거
      // (포맷 스키마 및 마스터 서식 규약은 System Instruction에 완벽히 격리되어 주입됨)
      const targetBlock = `## [Target Lore Entry to Update/Create]\n항목명: ${variables.TARGET_LORE_TITLE}\n현재 내용:\n${variables.TARGET_LORE_CONTENT}`;
      const userDirective = variables.USER_INSTRUCTION_CODEX?.trim() 
        ? `## [User Directive]\n${variables.USER_INSTRUCTION_CODEX}` 
        : "";
      
      const finalTrigger = `## [Final Instruction]\n` +
        `[User Directive], [Current Story Text], [Target Lore Entry to Update/Create]을 바탕으로 시스템 지침에 정의된 대로 { 로 시작하는 구조화된 JSON 객체를 출력하라.`;

      const contentParts = [
        topContextPrefix.trim(),
        `## [Current Story Text]\n${variables.STORY_CONTEXT_CODEX}`,
        targetBlock,
        userDirective,
        finalTrigger
      ].filter(part => part && part.trim());

      return [
        ...personaPriming,
        {
          role: "user",
          content: contentParts.join('\n\n')
        }
      ];
    }

    case 'consistency': {
      // MARS Stage 3 Master Novelist 최종 탈고 구조 (100% SSOT 단일 포매터 호출)
      const draftContent = variables.RAW_DRAFT || extraData?.rawDraft || "(Stage 1 초안 - 실제 생성 실행 시 동적으로 주입됩니다)";
      const formattedSynthesisPrompt = formatMasterSynthesisPrompt(variables, draftContent, extraData?.auditReports);

      return [
        ...personaPriming,
        {
          role: "user",
          content: formattedSynthesisPrompt
        }
      ];
    }
  }
}

/**
 * 런타임 불변 가드 (Invariant Assertion Guard)
 * 프롬프트 메시지에 포함된 본문 텍스트가 contextWindow 상한선(+ 마진)을 초과하지 않는지 검증하고,
 * 초과 시 자동 클리핑 처리하여 비정상적인 거대 본문 누출을 원천 차단합니다.
 */
export function assertContextWindowGuard(
  messages: GenerationMessage[],
  maxAllowedChars: number
): GenerationMessage[] {
  if (!messages || messages.length === 0 || maxAllowedChars <= 0) return messages;

  // 허용 버퍼: continuationLength(약 200자) 및 마크다운 헤더 감안 (15% 여유 + 300자)
  const softLimit = Math.round(maxAllowedChars * 1.15) + 300;

  return messages.map(msg => {
    if (typeof msg.content === 'string' && msg.content.includes('## [Current Story Text]\n')) {
      const parts = msg.content.split('## [Current Story Text]\n');
      if (parts.length >= 2) {
        const prefix = parts[0];
        const storyAndRest = parts.slice(1).join('## [Current Story Text]\n');
        
        // 본문 텍스트 길이가 상한선을 명백히 초과한 경우 안전 클리핑
        if (storyAndRest.length > softLimit) {
          console.warn(`[assertContextWindowGuard] Story text exceeded contextWindow (${storyAndRest.length} > ${softLimit}). Auto-clipping applied.`);
          const clipped = storyAndRest.slice(-maxAllowedChars);
          return {
            ...msg,
            content: `${prefix}## [Current Story Text]\n${clipped}`
          };
        }
      }
    }
    return msg;
  });
}

