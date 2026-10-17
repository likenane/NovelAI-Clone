export interface LoreEntry {
  id: string;
  title: string;
  content: string;
  keywords: string; // Comma separated
  isAlwaysActive: boolean;
  enabled: boolean;
  type: 'item' | 'folder';
  parentId: string | null;
  order: number;
  isLocked?: boolean;
  internalNotes?: string;
  proposedContent?: string | null;
  isProposalOnly?: boolean;
  isPruningProposal?: boolean;
  updateReason?: string | null;
  originalEntryId?: string | null;
}

export interface Novel {
  id: string;
  title: string;
  content: string;
  authorUid: string;
  createdAt: any;
  updatedAt: any;
  storyMemory?: string;
  plot?: string;
  type?: 'item' | 'folder';
  parentId?: string | null;
  order?: number;
  settings: NovelSettings;
  loreEntries?: LoreEntry[];
  memoryCards?: MemoryArchiveCard[];
}

export interface AutomationSettings {
  autoCodex: boolean;
  autoPruning: boolean;
  enableStrictConsistency?: boolean;
  autoPlot?: boolean;
}

export type ThinkingLevel = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';

export type AIEngineTaskType = 'novel' | 'auditor' | 'memory' | 'plot' | 'codex' | 'autoCodex';

export interface PlotSettings {
  model: 'gemini' | 'openrouter';
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  thinkingLevel?: ThinkingLevel;
  includeInPrompt: boolean;
  triggerChars?: number;
  systemPrompt?: string;
}

export interface AuditorModelSettings {
  model: 'gemini' | 'openrouter';
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  thinkingLevel?: ThinkingLevel;
}

export interface MultiAgentAuditReports {
  plotAudit?: string;
  physicalAudit?: string;
  loreAudit?: string;
  stylisticAudit?: string;
  failedAudits?: string[];
}

export interface PersonaPrimingSettings {
  enabled: boolean;
  customTrigger?: string;
  customDeclaration?: string;
}

export interface NovelSettings {
  model: 'gemini' | 'openrouter';
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  context: string;
  thinkingLevel?: ThinkingLevel;
  contextWindow: number; // Number of characters to send
  continuationLength?: number; // Length of the prefill suffix
  /**
   * 전속 웹소설 작가 인컨텍스트 페르소나 프라이밍 (Synthetic History Injection).
   * 대화 히스토리 최상단에 전속 작가 선언 페어([User Prompt -> Model Declaration])를 주입하여
   * 창작의 자유도와 작가적 페르소나 몰입도를 극대화합니다.
   */
  personaPriming?: PersonaPrimingSettings;
  /**
   * 작품 고유의 문체, 어조, 시점, 연출 지침 (단일 진실 공급원).
   * 플롯의 [1. 서술 방향 및 연출 디렉팅] '### 작품 전역 지침'과 런타임에 100% 모순 없이 결합됩니다.
   */
  styleDirectives?: string;
  /** @deprecated 시스템 펌웨어(novel_system.md)로 완전 잠금되어 UI에서 편집하지 않습니다. */
  systemPrompt: string;
  repetitionPenalty: number;
  /** @deprecated 시스템 펌웨어(codex_system.md)로 완전 잠금되어 UI에서 편집하지 않습니다. */
  codexSystemPrompt?: string;
  autoCodexContextWindow?: number;
  autoCodexTriggerChars?: number;
  autoCodex?: {
    modelName: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    topK: number;
    repetitionPenalty?: number;
    triggerChars?: number;
    thinkingLevel?: ThinkingLevel;
  };
  pruningThresholdChars?: number;
  enableContextPruning?: boolean;
  automation?: AutomationSettings;
  codex?: {
    model: 'gemini' | 'openrouter';
    modelName: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    topK: number;
    systemPrompt?: string;
    thinkingLevel?: ThinkingLevel;
  };
  memory?: {
    model: 'gemini' | 'openrouter';
    modelName: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    topK: number;
    thinkingLevel?: ThinkingLevel;
  };
  plot?: PlotSettings;
  auditor?: AuditorModelSettings;
}

export interface PromptPreset {
  id: string;
  name: string;
  prompts: {
    systemPrompt: string;
    codexSystemPrompt: string;
    [key: string]: string;
  };
  createdAt: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export type AIProvider = 'gemini' | 'openrouter';

export type AITaskType = 'novel' | 'codex' | 'memory' | 'autocodex' | 'consistency' | 'plot' | 'critique_plot' | 'critique_physical' | 'critique_lore' | 'critique_stylistic' | 'critique_synthesis';

export type NotificationType = 'info' | 'success' | 'error' | 'loading' | 'generating';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
  charCount?: number;
}

export type DuplicateMode = 'full' | 'settings_only' | 'tail';

export interface DuplicateNovelOptions {
  mode?: DuplicateMode;
  tailChars?: number;
  includeContent?: boolean;
}

// Auto-Codex Chain-of-Thought (CoT) & Response Types
export interface AutoCodexCandidateExtraction {
  candidateName: string;
  category: 'character' | 'location' | 'item' | 'lore';
  mentionContext: string;
}

export interface AutoCodexExplicitEntity {
  candidateName: string;
  category: 'character' | 'location' | 'item' | 'lore';
  mentionContext: string;
}

export interface AutoCodexImplicitEntity {
  temporaryAnchorTitle: string;
  category: 'character' | 'location' | 'item' | 'lore';
  descriptiveClues: string;
  recurrenceBasis: string;
}

export interface AutoCodexConceptualCluster {
  proposedConceptTitle: string;
  category: 'lore';
  clusterEvidence: string[];
  abstractDefinition: string;
}

export interface AutoCodexPlotGraduationTriage {
  sourceScratchpadContent: string;
  manifestedInStoryProse: boolean;
  transientTacticalTrickAudit: string;
  worldCanonPermanenceEval: string;
  verdict: 'GRADUATE_TO_CODEX' | 'KEEP_IN_PLOT' | 'DISCARD_OBSOLETE';
  verdictRationale: string;
}

export interface AutoCodexActiveLoreTriage {
  targetEntryId?: string;
  targetTitle: string;
  observedFactShift: string;
  hasFactShift: boolean;
}

export interface AutoCodexSemanticDiscovery {
  activeLoreFactShiftTriage?: AutoCodexActiveLoreTriage[];
  explicitEntities?: AutoCodexExplicitEntity[];
  implicitEmergentEntities?: AutoCodexImplicitEntity[];
  conceptualClusters?: AutoCodexConceptualCluster[];
  plotSection4GraduationTriage?: AutoCodexPlotGraduationTriage[];
}

export interface AutoCodexAliasMapping {
  candidateName: string;
  candidateType?: 'EXPLICIT' | 'IMPLICIT' | 'CONCEPTUAL';
  mappingAnalysis: string;
  targetRoute: 'NEW_ENTRY_CANDIDATE' | 'EXISTING_UPDATE_CANDIDATE';
  mappedExistingId: string | null;
  mappedExistingTitle?: string | null;
}

export interface AutoCodexNewEntryScreening {
  candidateName: string;
  candidateType?: 'EXPLICIT' | 'IMPLICIT' | 'CONCEPTUAL';
  narrativePermanenceEval: string;
  functionalIdentityEval: string;
  narrativeStakesEval: string;
  nonRedundancyEval: string;
  verdict: 'ACCEPT' | 'REJECT';
  verdictRationale: string;
}

export interface AutoCodexStateDistillation {
  rawObservedEvent: string;
  dechronologization: {
    evaporatedContextAndActions: string;
    distilledPermanentProperty: string;
  };
  headerTeleologyMapping: {
    targetHeader: string;
    implicitHeaderQuestion: string;
    distilledProseBullet: string;
  };
}

export interface AutoCodexUpdateEvaluation {
  targetEntryId: string;
  targetTitle: string;
  isLocked: boolean;
  inertiaAndAntiOverinterpretationAudit: string;
  revealedFactsPermanenceEval: string;
  mereMentionAudit: string;
  verdict: 'UPDATE' | 'DROP';
  verdictRationale: string;
  stateDistillation?: AutoCodexStateDistillation | null;
  surgicalMergePlan: string;
}

export interface AutoCodexDirectiveAnalysis {
  hasUserDirective: boolean;
  directiveSummary: string;
  targetedLoreTitles: string[];
  spinoffOrSplitRequests: string[];
}

export interface AutoCodexThoughtProcess {
  step0_directiveAnalysis?: AutoCodexDirectiveAnalysis;
  step1_semanticDiscovery?: AutoCodexSemanticDiscovery;
  step1_candidateExtraction?: AutoCodexCandidateExtraction[]; // Backward compatibility fallback
  step2_aliasAndExistingMapping?: AutoCodexAliasMapping[];
  step3_newEntryScreening?: AutoCodexNewEntryScreening[];
  step4_updateEvaluation?: AutoCodexUpdateEvaluation[];
  step5_globalSynthesis?: string;
}

export interface AutoCodexUpdateProposal {
  originalEntryId: string;
  updateReason: string;
  proposedContent: string;
  id?: string;
}

export interface AutoCodexNewEntryProposal {
  title: string;
  updateReason: string;
  type: 'character' | 'location' | 'item' | 'lore';
  content: string;
  keywords: string;
}

export interface AutoCodexResponse {
  thoughtProcess?: AutoCodexThoughtProcess;
  globalAnalysis?: string; // Backward compatibility fallback
  updates?: AutoCodexUpdateProposal[];
  newEntries?: AutoCodexNewEntryProposal[];
  prune?: string[];
}

export interface MemoryDeltaAnalysis {
  newPlotEvents: string[];
  codexEntityFiltering?: string;
  userDirectiveIntent?: string;
}

export interface MemoryResolvedEvent {
  eventId?: string;
  summary: string;
  archiveFormat?: string;
}

export interface MemoryActiveThread {
  threadId?: string;
  description: string;
  status?: string;
}

export interface MemoryCausalityAndCulling {
  rootCauses: string[];
  resolvedEventsToArchive: MemoryResolvedEvent[];
  activeThreads?: MemoryActiveThread[];
  chekhovGuns: string[];
}

export interface MemoryCompressionStrategy {
  preservationAudit: string;
  ledgerPruningPlan: string;
  characterSnapshotPlan: string;
  characterBudgetEvaluation?: string;
}

export interface MemoryActorState {
  character: string;
  locationAndPresence: string; // [위치/동행/배치]
  immediateResult: string; // [직전 사건의 물리적/직접적 결과 및 상태 변화]
  currentActionOrStance: string; // [당장 처한 즉각적 상태/착지점]
}

export interface MemoryNarrativeFootholdAndActorStates {
  currentFoothold?: string; // 소설 본문 직후의 전체적인 서사 도달점 및 현장 시공간 착지점
  actorStates: MemoryActorState[];
}

export interface MemoryCharacterDynamic {
  character: string;
  currentStance: string;
  relationshipDelta: string;
  epistemicState: string;
}

export interface MemoryCharacterEpistemicDelta {
  characterDynamics: MemoryCharacterDynamic[];
}

export type MemoryCardType = '사건' | '막요약' | '정정';

export interface MemoryArchiveCard {
  id: string;               // UUID
  novelId: string;
  type: MemoryCardType;
  tags: string[];           // 인물, 사물, 장소, 조직, 단서 (3~8개)
  time: string;             // 이야기 안의 시점 표현 (예: "수로 잠입 당일 밤")
  content: string;          // 그 카드만 읽어도 이해되는 완결된 문장
  lasting: string;          // 이후에도 남는 영향 또는 "없음"
  order: number;            // 생성 순서 (타임스탬프 기반 정렬 인덱스)
  createdAt: number;
  updatedAt?: number;
}

export interface MemoryArchiveEntryDraft {
  type: MemoryCardType;
  tags: string[];
  time: string;
  content: string;
  lasting: string;
}

export interface MemoryProposal {
  thoughtProcess?: MemoryThoughtProcess;
  finalMemoryText: string;
  archiveEntries: MemoryArchiveEntryDraft[];
}

export interface MemoryThoughtProcess {
  newEvents?: string[];
  stateChanges?: string[];
  clueChanges?: string[];
  existingMemoryReview?: string;
  foldingPlan?: string;
  sizeCheck?: string;
  // 하위 호환성 (레거시 CoT 필드 지원)
  step1_deltaAnalysis?: MemoryDeltaAnalysis;
  step2_causalityAndCulling?: MemoryCausalityAndCulling;
  step3_compressionStrategy?: MemoryCompressionStrategy;
  step4_narrativeFootholdAndActorStates?: MemoryNarrativeFootholdAndActorStates;
  step4_characterEpistemicDelta?: MemoryCharacterEpistemicDelta;
  step5_synthesisRationale?: string;
  [key: string]: any;
}

export interface MemoryResponse {
  thoughtProcess?: MemoryThoughtProcess;
  finalMemoryText: string;
  archiveEntries?: MemoryArchiveEntryDraft[];
}

export interface NovelExportEnvelopeV2 {
  $schema: 'ai-novelist-studio/export-v2';
  version: 2;
  exportedAt: string; // ISO 8601
  appVersion: string;
  metadata: {
    title: string;
    charCount: number;
    loreCount: number;
    memoryCardCount?: number;
    hasPlot: boolean;
    hasStoryMemory: boolean;
  };
  novel: {
    title: string;
    content: string;
    storyMemory: string;
    plot: string;
    settings: NovelSettings;
    loreEntries: LoreEntry[];
    memoryCards?: MemoryArchiveCard[];
    type?: 'item' | 'folder';
    parentId?: string | null;
    order?: number;
  };
}

// ---------------------------------------------------------------------------
// Consistency Refiner Types (Evidence-First CoT Specification)
// ---------------------------------------------------------------------------

export interface CharacterAuditItem {
  characterName: string;
  actionsAndDialogue?: string;
  epistemicAudit: string;
  personalityAndValuesAudit?: string;
  speechAndToneAudit?: string;
  authenticityAudit?: string; // Backward compatibility fallback
  verdict: 'PASS' | 'OOC_DETECTED' | 'SPEECH_TONE_MISMATCH' | 'EPISTEMIC_VIOLATION' | string;
}

export interface LoreAuditItem {
  loreName: string;
  citedProse?: string;
  codexRule: string;
  complianceAudit: string;
  verdict: 'PASS' | 'LORE_CONTRADICTION' | 'MECHANIC_VIOLATION' | string;
}

export interface LinguisticExpositionAndLoreLabeling {
  detectedPhrases?: string[];
  analysis: string;
  conversionPlan?: string;
  pruningPlan?: string; // Backward compatibility fallback
  overCorrectionGuard?: string;
  hasIssues: boolean;
}

export interface LinguisticNativeFluency {
  detectedIssues?: string[];
  analysis: string;
  overCorrectionGuard?: string;
  hasIssues: boolean;
}

export interface LinguisticDynamicStylisticFlaws {
  flaws?: string[];
  analysis: string;
  overCorrectionGuard?: string;
  hasIssues: boolean;
}

export interface LinguisticAnalysisStructured {
  expositionAndLoreLabeling?: LinguisticExpositionAndLoreLabeling;
  nativeFluencyAndTranslationese?: LinguisticNativeFluency;
  dynamicStylisticFlaws?: LinguisticDynamicStylisticFlaws;
  summary: string;
  hasAnyLinguisticIssue?: boolean;
}

export interface InformationOrderAudit {
  conclusionFirstPhrases?: string[];
  analysis: string;
  reorderPlan?: string;
  hasIssues: boolean;
}

export type RefinerChangeVector = 'PHYSICAL' | 'CHARACTER' | 'LORE' | 'PLOT' | 'STRUCTURE' | 'LINGUISTIC' | string;

export interface RefinerChangeLogItem {
  before: string;
  after: string;
  vector: RefinerChangeVector;
}

// ---------------------------------------------------------------------------
// Dynamic Sliced Audit & Causal Pipeline Types (Refiner Reform SSOT)
// ---------------------------------------------------------------------------

export interface RefinerCodexCandidate {
  selectionRationale: string;
  loreName: string;
}

export interface RefinerGlobalPlotAudit {
  narrativeArcAndPacing: string;
  directiveFulfillmentStatus: string;
  causalLogicAndProgression: string;
}

export interface RefinerGlobalContextAudit {
  activeDirectivesSummary: string;
  activeCodexScope?: string[]; // Exhaustive list of all active lore entries in this session
  relevantCodexCandidates?: RefinerCodexCandidate[]; // Legacy candidate list fallback
  globalFulfillmentAssessment?: string; // Legacy field fallback
  globalPlotAndDirectiveAudit?: RefinerGlobalPlotAudit; // SSOT unified macro plot & directive audit
  plotDefectsIdentified?: RefinerSliceDefect[]; // Macro defects identified at the global level
  globalDefects?: any[]; // Legacy backward compatibility fallback
}

export interface RefinerSliceStageAudits {
  // 4-Tier Micro-Continuity Architecture (Refiner SSOT)
  stage1_PhysicalAndSituational: string;
  stage2_LoreCanonAndVoice?: string;
  stage3_EpistemicBoundaryAndPOV?: string;
  stage4_NativeLinguisticAndStyle?: string;
  // Backward compatibility fields for legacy records
  stage2_LoreAndCharacter?: string;
  stage3_NativeLinguisticAndStyle?: string;
  stage1_DirectiveAndPlot?: string;
  stage2_Directive?: string;
  stage1_Physical?: string;
  stage2_PhysicalAndSituational?: string;
  stage3_LoreAndCharacter?: string;
  stage4_Linguistic?: string;
}

export interface RefinerSliceDefect {
  ruleId: string;
  category: 'DIRECTIVE' | 'PHYSICAL' | 'LORE' | 'CHARACTER_SPEECH' | 'EPISTEMIC' | 'LINGUISTIC' | string;
  citedProse: string;
  issueDescription: string;
  correctionDirective: string;
}

export interface RefinerSliceItem {
  sliceIndex: number;
  textExcerpt: string;
  flaggedProseQuotes?: string[]; // Pure prose excerpts within THIS slice flagged during initial scan, without pre-judged reasons
  inheritedFixesApplied: string[];
  stageAudits: RefinerSliceStageAudits;
  newDefectsIdentified: RefinerSliceDefect[];
}


// ---------------------------------------------------------------------------
// Manual Codex Assistant Types (Adaptive CoT & State Distillation Specification)
// ---------------------------------------------------------------------------

export type ManualCodexIntentType = 'RESTRUCTURE' | 'PURE_CREATIVE' | 'STORY_UPDATE' | 'HYBRID';

export interface ManualCodexDirectiveIntent {
  intentType: ManualCodexIntentType;
  userIntentSummary: string;
}

export interface ManualCodexDechronologization {
  rawObservedEvent: string;
  evaporatedContextAndActions: string;
  distilledPermanentProperty: string;
}

export interface ManualCodexHeaderTeleology {
  targetHeader: string;
  implicitHeaderQuestion: string;
  distilledProseBullet: string;
}

export interface ManualCodexThoughtProcess {
  directiveIntent: ManualCodexDirectiveIntent;
  dechronologization?: ManualCodexDechronologization | null;
  headerTeleology?: ManualCodexHeaderTeleology[];
  losslessPreservationPlan: string;
}

export interface CodexSpinoffEntry {
  title: string;
  type: 'character' | 'location' | 'item' | 'lore';
  keywords: string;
  content: string;
  spinoffReason?: string;
}

export interface ManualCodexResponse {
  thoughtProcess?: ManualCodexThoughtProcess;
  updateReason?: string;
  finalContent: string;
  spinoffEntries?: CodexSpinoffEntry[];
}

