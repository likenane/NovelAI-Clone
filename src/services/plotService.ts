import { Novel } from '../types';

export interface Step2ExecutionFactors {
  isInitialCreation?: boolean;
  hasDirectingChangeRequest?: boolean;
  hasGlobalDirectingChangeRequest?: boolean;
  hasArcDirectingUpdate?: boolean;
  needsLegacyMigration?: boolean;
  currentRulesAdequate?: boolean;
  deductionReason?: string;
  criteriaEvaluation?: string;
  execute: boolean;
}

export interface Step34ExecutionFactors {
  isInitialCreation?: boolean;
  isArcCompletedOrNewArcRequired?: boolean;
  isMilestoneCompletedOrNewArc?: boolean;
  hasMacroShiftRequest?: boolean;
  currentArcRoadmapValid?: boolean;
  currentRoadmapValid?: boolean;
  deductionReason?: string;
  criteriaEvaluation?: string;
  execute: boolean;
}

export interface Step5ExecutionFactors {
  hasNewForeshadowingOrLogicRules?: boolean;
  existingFrameworkSufficient?: boolean;
  hasPrunableOrGraduatedItems?: boolean;
  prunableItemsAudit?: string[];
  deductionReason?: string;
  criteriaEvaluation?: string;
  execute: boolean;
}

export interface Step67ExecutionFactors {
  isSection1OnlyRevision?: boolean;
  needsProseDraftingSequences?: boolean;
  deductionReason?: string;
  criteriaEvaluation?: string;
  execute: boolean;
}

// Aliases for backward compatibility
export type Step7ExecutionFactors = Step5ExecutionFactors;
export type Step56ExecutionFactors = Step67ExecutionFactors;

export interface MilestoneProgressAnalysis {
  currentMilestone?: string;
  milestonePhase?: 'EARLY' | 'MID' | 'LATE' | string;
  isTransitionBridgeRequired?: boolean;
  bridgeTargetMilestone?: string;
  deductionReason?: string;
}

export interface PriorLogicAndForeshadowingStrategy {
  recalledForeshadowing?: string;
  plantedForeshadowing?: string;
  diegeticLogicConstraints?: string;
}

export interface OperationalBlueprint {
  blueprintTitle?: string;
  coreChallengeAndConstraints?: string;
  threatAndConstraint?: string;
  keyLeverageAndAdvantage?: string;
  informationAsymmetry?: string;
  stepByStepProgression?: string;
  preparatoryInductionSteps?: string;
  decisiveMechanism?: string;
  executionMechanism?: string;
  costsAndAftermath?: string;
  costAndCounteraction?: string;
}

export interface DraftOperationalLogicAndInvariants {
  operationalBlueprints?: OperationalBlueprint[];
  diegeticConstraintsAndInvariants?: string[];
  latentForeshadowingAndClues?: {
    recalledForeshadowing?: string;
    plantedForeshadowing?: string;
  } | any;
}

export interface HardLogicSelfCritique {
  antiConvenienceAndPlausibility?: string;
  antiConvenienceAndFakeTactics?: string;
  causalFeasibility?: string;
  causalInevitabilityAndPhysics?: string;
  processDensity?: string;
  maneuveringDensity?: string;
  consequenceAndConsistency?: string;
  costAndCounteraction?: string;
}

export interface PatchedOperationalLogic {
  patchedBlueprintsAndInvariants?: string;
  scratchpads?: { category: string; content: string }[];
}

export interface StepInvariantsAndForeshadowing {
  isBypassed: boolean;
  bypassReason?: string;
  antiDuplicationAndGraduationAudit?: {
    section1DirectingLeakCheck?: string;
    codexOverlapFilter?: string;
    graduationPruningList?: string[];
  };
  draftOperationalLogicAndInvariants?: DraftOperationalLogicAndInvariants;
  hardLogicSelfCritique?: HardLogicSelfCritique;
  patchedOperationalLogic?: PatchedOperationalLogic;
  priorLogicAndForeshadowingStrategy?: PriorLogicAndForeshadowingStrategy;
  scratchpad?: string;
  scratchpads?: { category: string; content: string }[];
}

export interface PlotSelfCritiqueFlaws {
  causality?: string;
  causalityAndLogicFulfillment?: string;
  characterOOC?: string;
  entertainment?: string;
  entertainmentAndPayoff?: string;
  pacingDensity?: string;
  historicalFactAndTimeline?: string;
  foreshadowingAndLogicFulfillment?: string;
  customVectors?: { vectorName: string; flaw: string }[];
}

export interface StepActiveSequences {
  isBypassed?: boolean;
  bypassReason?: string;
  episodeIncident?: string;
  episodeIdeation?: {
    narrativeIntent: string;
    characterInertia: string;
    plausibleDelta: string;
    structuralDestination: string;
    episodeIncident: string;
  };
  sequences: PlotSceneSequence[];
  customCritiqueVectors?: { vectorName: string; focus: string }[];
  selfCritiqueFlaws?: PlotSelfCritiqueFlaws;
  patchedSolutions?: string;
}

export interface PlotDiagnosis {
  contextAnalysis?: string;
  plotType?: string;
  mismatches?: string[];
  roadmapDecision?: string;
  currentMilestone?: string;
  milestonePhase?: 'EARLY' | 'MID' | 'LATE' | string;
  section1Handling?: string;
}

export interface PlotReaderAnalysis {
  enjoymentDirection?: string;
  currentExpectations?: string[];
  openClues?: string[];
}

export interface PlotCandidate {
  id: string;
  direction: string;
}

export interface PlotReverseReview {
  id: string;
  expectationRelation: string; // readerAnalysis.currentExpectations의 구체적 항목과 대조해 충족 | 지연 | 비틀기 | 뒤집기 판정
  characterFit: string;
  codexAndStoryFit: string;
  strengths: string;
  weaknesses: string;
  // 하위 호환성 필드 (선택적)
  predictability?: string;
  verdict?: string;
}

export type PlotDecisionType = '채택' | '조합' | '기각';

export interface PlotSelectionDecision {
  id: string;
  decision: PlotDecisionType;
  reason: string;
}

export interface PlotTwistAndNewSetting {
  name: string;
  kind: string; // '신규 설정' | '반전'
  relationToCodex?: string;
  cluesAndPayoff?: string;
  readerKnownFactRisk?: string;
}

export interface PlotSelection {
  comparison?: string;
  decisions?: PlotSelectionDecision[];
  chosen?: string;
  twistAndNewSettings?: PlotTwistAndNewSetting[];
}

export interface PlotVerification {
  codexCheck?: string[];
  characterCheck?: string;
  continuityCheck?: string;
}

export interface PlotSection4Plan {
  keepOrAdd?: string[];
  remove?: string[];
}

export interface PlotUpdatePlan {
  section1?: string;
  section2?: string;
  section4?: string;
  prunedItems?: string[];
}

export interface PlotPreWriteCheck {
  consistency?: string;
  character?: string;
  logic?: string;
  densityAndPayoff?: string;
}

export interface PlotThoughtProcess {
  // New 5-Tier Reader-Driven CoT (Primary)
  diagnosis?: PlotDiagnosis;
  readerAnalysis?: PlotReaderAnalysis;
  codexMaterial?: string[];
  candidates?: PlotCandidate[];
  reverseReview?: PlotReverseReview[];
  selection?: PlotSelection;
  verification?: PlotVerification;
  sequencePlan?: string[];
  section4Plan?: PlotSection4Plan;

  // 3-Tier Streamlined CoT (Secondary / Transitional)
  contextAnalysis?: string;
  updatePlan?: PlotUpdatePlan;
  preWriteCheck?: PlotPreWriteCheck;

  step1_diagnosis?: {
    contextAnalysis?: string;
    plotType: string;
    plotDirection: string;
    reasoning?: string;
    milestoneProgressAnalysis?: MilestoneProgressAnalysis;
    stepExecutionPlan?: {
      step2_directing?: Step2ExecutionFactors;
      step3_4_macro?: Step34ExecutionFactors;
      step5_invariants?: Step5ExecutionFactors;
      step6_7_activeSequences?: Step67ExecutionFactors;
      // Backward compatibility aliases
      step5_6_activeSequences?: Step56ExecutionFactors;
      step7_invariants?: Step7ExecutionFactors;
    };
  };

  // Legacy 8-Step CoT fields (for backward compatibility)
  step2_directingConstitution?: {
    isBypassed: boolean;
    bypassReason?: string;
    directingRules?: string;
  };
  step3_4_macro?: {
    isBypassed: boolean;
    bypassReason?: string;
    preliminaryIdeation?: {
      narrativeIntent: string;
      characterInertia: string;
      plausibleDelta: string;
    };
    macroRoadmap?: string;
    macroCritiqueAndPatch?: string | {
      logicalFlow: string;
      pacingAndPayoff: string;
      characterInertiaAndDelta?: string;
      timelineAndCanonConsistency?: string;
      customVectors?: { vectorName: string; flaw: string }[];
      patchedSolutions: string;
    };
  };
  // Pre-Inference Step 5: Foreshadowing and Logic Invariants (Primary)
  step5_invariantsAndForeshadowing?: StepInvariantsAndForeshadowing;
  // Step 6-7: Active Sequences and Self-Critique (Primary)
  step6_7_activeSequences?: StepActiveSequences;
  // Backward compatibility fields
  step5_6_activeSequences?: StepActiveSequences;
  step7_invariantsAndForeshadowing?: StepInvariantsAndForeshadowing;
  // Legacy fields
  readerPayoffDynamics?: string;
  longTermInertiaBaseline?: string;
  shortTermSituationalDynamics?: string;
  narrativeInertiaAssessment?: string;
  relationshipDeltaAnalysis?: string;
  incrementalRelationalShiftAnalysis?: string;
  clicheAndPacingControl?: string;
  directingTechniques?: string;
}

export interface PlotSceneSequence {
  title: string;                       // 시퀀스 제목
  narrativeFlow: string;               // 서사 전개 및 사건 흐름
  dialogueAndActionDirecting?: string; // 대화 태도 & 행동 디렉팅
  dialogueDirecting?: string;          // 레거시 호환용 필드
  directingCraft: string;              // 핵심 연출 작법
  sequenceHook: string;                // 시퀀스 훅
  isBridgeSequence?: boolean;          // 다음 마일스톤 국면 전이용 임시 가교 시퀀스 여부
}

export interface MicroPlotBeats {
  incident: string;                 // 사건 타이틀 및 쟁점
  narrativeIntent?: string;         // 서사적 의도 및 목적
  characterInertia?: string;        // 캐릭터 심리 관성
  incrementalRelationshipShift: string; // 현재 사건에 따른 미세한 심리 변화 (Relationship Delta)
  relationshipDelta?: string;        // 레거시 호환용 필드
  structuralDestination?: string;   // 에피소드 구조적 종착지
  sequences: PlotSceneSequence[];   // 씬 시퀀스
  // 레거시 호환용 필드
  objective?: string;
  sceneBeats?: string[];
  characterDirectives?: string;
  antiDirectives?: string;
}

export interface PlotBlueprintStructure {
  themeAndGenreDirectives: string;   // [1. 서술 방향 및 연출 디렉팅]
  macroPlot: string;                 // [2. 장기 대서사 플롯]
  microPlot: MicroPlotBeats;         // [3. 현재 진행 중인 사건 플롯]
  persistentLogicFramework?: string; // [4. 장기 복선 및 설정 스크래치패드]
}

export interface ParsedPlotResponse {
  thoughtProcess: PlotThoughtProcess;
  plotBlueprint: PlotBlueprintStructure;
  finalPlotText: string;
}

/**
 * 플롯 4대 필수 섹션 검증을 위한 정규식 목록.
 * 새로운 표준 4대 헤더와 기존 레거시 3대 헤더를 모두 수용합니다.
 */
export const PLOT_HEADER_PATTERNS = [
  {
    name: '서술 방향 및 연출 디렉팅',
    regex: /\[(?:1\.\s*)?(?:서술\s*방향\s*및\s*연출\s*디렉팅|작품의\s*테마\s*및\s*장르상\s*유의점)\]/i,
    required: true
  },
  {
    name: '장기 대서사 플롯',
    regex: /\[(?:2\.\s*)?(?:장기\s*대서사\s*플롯(?:\s*\(.*?\))?|장기\s*플롯)\]/i,
    required: true
  },
  {
    name: '현재 진행 중인 사건 플롯',
    regex: /\[(?:3\.\s*)?(?:현재\s*진행\s*중인\s*(?:사건\s*)?플롯|진행중인\s*플롯)\]/i,
    required: true
  },
  {
    name: '장기 복선 및 고정 논리 프레임워크',
    regex: /\[(?:4\.\s*)?(?:장기\s*복선(?:\s*및\s*고정\s*논리\s*프레임워크)?|고정\s*논리\s*프레임워크|장기\s*복선\s*및\s*계획)\]/i,
    required: false // 레거시 3헤더 소설과의 하위 호환성 보장
  }
] as const;

/**
 * finalPlotText 내에 필수적인 계층 헤더가 존재하는지 엄격하게 검증합니다.
 */
export function validatePlotHeaders(finalPlotText: string): void {
  const missing: string[] = [];
  for (const pattern of PLOT_HEADER_PATTERNS) {
    if (pattern.required && !pattern.regex.test(finalPlotText)) {
      missing.push(`[${pattern.name}]`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `플롯 필수 헤더 누락 (${missing.join(', ')}).\n필수 계층 헤더(서술 방향 및 연출 디렉팅 / 장기 대서사 플롯 / 현재 진행 중인 사건 플롯)를 준수해야 합니다.`
    );
  }
}

/**
 * 플롯 텍스트에서 씬 시퀀스들을 정규식으로 직접 추출합니다.
 */
export function extractSequencesFromPlotText(plotText: string): PlotSceneSequence[] {
  if (!plotText) return [];
  const seqRegex = /###\s*(?:시퀀스|Sequence)\s*(\d+)(?:[^\n:]*?\[([^\]]+)\])?[^\n:]*?:\s*([^\n]+)([\s\S]*?)(?=(?:###\s*(?:시퀀스|Sequence)|\[4\.|\Z))/gi;
  const sequences: PlotSceneSequence[] = [];
  let match: RegExpExecArray | null;

  while ((match = seqRegex.exec(plotText)) !== null) {
    const num = match[1];
    const milestonePart = match[2] ? ` [${match[2]}]` : '';
    const rawTitle = match[3]?.trim() || `시퀀스 ${num}`;
    const fullTitle = `시퀀스 ${num}${milestonePart}: ${rawTitle}`.trim();
    const body = match[4] || '';

    const narrativeMatch = body.match(/-\s*\[서사\s*전개\]\s*:\s*([^\n]+(?:\n(?!-\s*\[)[^\n]+)*)/i);
    const directingMatch = body.match(/-\s*\[행동\s*및\s*대화\s*디렉팅\]\s*:\s*([^\n]+(?:\n(?!-\s*\[)[^\n]+)*)/i);
    const craftMatch = body.match(/-\s*\[연출\s*작법\]\s*:\s*([^\n]+(?:\n(?!-\s*\[)[^\n]+)*)/i);
    const hookMatch = body.match(/-\s*\[시퀀스\s*훅\]\s*:\s*([^\n]+(?:\n(?!-\s*\[)[^\n]+)*)/i);

    sequences.push({
      title: fullTitle,
      narrativeFlow: narrativeMatch ? narrativeMatch[1].trim() : body.trim(),
      dialogueAndActionDirecting: directingMatch ? directingMatch[1].trim() : '',
      dialogueDirecting: directingMatch ? directingMatch[1].trim() : '',
      directingCraft: craftMatch ? craftMatch[1].trim() : '',
      sequenceHook: hookMatch ? hookMatch[1].trim() : '',
      isBridgeSequence: /가교|Bridge/i.test(fullTitle)
    });
  }

  return sequences;
}

/**
 * 플롯 텍스트가 도중에 잘리지 않고 온전하게 완결되었는지 엄격하게 검증합니다.
 * 도중에 잘린 불완전한 플롯을 사용자가 승낙하는 사고를 원천 방지합니다.
 */
export function validatePlotCompleteness(finalPlotText: string, sequencesCount?: number): void {
  validatePlotHeaders(finalPlotText);

  // 최소 길이 검증 (확장된 4대 계층 및 5,000자 시퀀스 플롯은 최소 800자 이상이어야 함)
  if (finalPlotText.length < 800) {
    throw new Error("플롯 분량이 너무 짧거나 불완전합니다. (최소 800자 이상의 온전한 구성 필요)");
  }

  // 6~8단계 시퀀스 완결성 검증 (시퀀스 4 이상 존재 여부 또는 sequencesCount >= 4)
  const hasClosingSequence = /수습\s*및\s*여운|결말/i.test(finalPlotText);
  const hasSequence4OrMore = /시퀀스\s*([4-8]|\d{2,})|Sequence\s*([4-8]|\d{2,})/i.test(finalPlotText);
  if (!hasClosingSequence && !hasSequence4OrMore && (sequencesCount === undefined || sequencesCount < 4)) {
    throw new Error(
      "플롯 시퀀스가 도중에 잘렸거나 미완결 상태입니다. (시퀀스 4 이상까지 온전히 완성되어야 합니다. Max Tokens를 늘려주세요.)"
    );
  }
}

/**
 * AI 응답 텍스트를 파싱하고 엄격한 스키마, 필수 헤더 및 완결성을 검증합니다.
 * 2-Tier 하이브리드 복원 파이프라인:
 * 1-Pass: 문자열 제어문자 방어 정제를 거친 안전한 JSON 파싱 및 완결성 검증
 * 2-Pass: 정규식 추출 시에도 필수 헤더와 시퀀스 완결성이 완전히 포함된 경우에만 복원 승인
 * Fail-Fast: 도중에 잘렸거나 불완전한 플롯은 즉시 명확한 진단 에러를 발생시킵니다.
 */
export function parseAndValidatePlotResponse(rawResponse: string): ParsedPlotResponse {
  if (!rawResponse || !rawResponse.trim()) {
    throw new Error("AI 응답이 비어 있습니다.");
  }

  // --- 1-Pass: 방어적 JSON 파싱 시도 ---
  let cleaned = rawResponse.trim();
  // Markdown 코드 블록(```json ... ```) 제거 방어
  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
  }

  // 최외곽 { 와 } 슬라이싱 (서두 프리앰블 및 말미 노이즈 제거)
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  let parsed: any = null;
  let jsonParseError: string | null = null;

  // 1차 표준 JSON.parse 시도
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    jsonParseError = err.message || 'JSON 문법 오류';

    // 2차: 따옴표 내부의 Raw Newline 및 제어문자 방어 정제 후 재시도
    try {
      const sanitized = sanitizeJsonStringLiterals(cleaned);
      parsed = JSON.parse(sanitized);
      jsonParseError = null; // 정제 파싱 성공
    } catch (retryErr: any) {
      jsonParseError = retryErr.message || jsonParseError;
    }
  }

  // JSON 파싱이 성공했고 유효한 객체인 경우 Full Rich 매핑 진행
  if (parsed && typeof parsed === 'object') {
    // 1. thoughtProcess 검증 및 매핑
    const thought = parsed.thoughtProcess || {};
    const finalPlotText = String(parsed.finalPlotText || '').trim();

    // 1-A. New 5-Tier Reader-Driven CoT Architecture (Primary)
    const isNewReaderDrivenCoT = Boolean(
      thought.diagnosis || thought.readerAnalysis || thought.candidates || 
      thought.reverseReview || thought.selection || thought.verification || 
      thought.sequencePlan || thought.section4Plan
    );

    if (isNewReaderDrivenCoT) {
      const diagRaw = thought.diagnosis || {};
      const normalizedDiagnosis: PlotDiagnosis = {
        contextAnalysis: diagRaw.contextAnalysis ? String(diagRaw.contextAnalysis).trim() : undefined,
        plotType: diagRaw.plotType ? String(diagRaw.plotType).trim() : 'AUTO_UPDATE',
        mismatches: Array.isArray(diagRaw.mismatches) ? diagRaw.mismatches.map(String) : [],
        roadmapDecision: diagRaw.roadmapDecision ? String(diagRaw.roadmapDecision).trim() : undefined,
        currentMilestone: diagRaw.currentMilestone ? String(diagRaw.currentMilestone).trim() : undefined,
        milestonePhase: diagRaw.milestonePhase ? String(diagRaw.milestonePhase).trim() : undefined,
        section1Handling: diagRaw.section1Handling ? String(diagRaw.section1Handling).trim() : undefined,
      };

      const readerRaw = thought.readerAnalysis || {};
      const normalizedReader: PlotReaderAnalysis = {
        enjoymentDirection: readerRaw.enjoymentDirection ? String(readerRaw.enjoymentDirection).trim() : undefined,
        currentExpectations: Array.isArray(readerRaw.currentExpectations) ? readerRaw.currentExpectations.map(String) : [],
        openClues: Array.isArray(readerRaw.openClues) ? readerRaw.openClues.map(String) : []
      };

      const normalizedCodexMaterial: string[] = Array.isArray(thought.codexMaterial) ? thought.codexMaterial.map(String) : [];

      const normalizedCandidates: PlotCandidate[] = Array.isArray(thought.candidates) ? thought.candidates.map((c: any) => ({
        id: String(c.id || '').trim(),
        direction: String(c.direction || '').trim()
      })) : [];

      const normalizedReverseReview: PlotReverseReview[] = Array.isArray(thought.reverseReview) ? thought.reverseReview.map((r: any) => ({
        id: String(r.id || '').trim(),
        expectationRelation: String(r.expectationRelation || r.predictability || '').trim(),
        characterFit: String(r.characterFit || '').trim(),
        codexAndStoryFit: String(r.codexAndStoryFit || '').trim(),
        strengths: String(r.strengths || '').trim(),
        weaknesses: String(r.weaknesses || '').trim()
      })) : [];

      const selRaw = thought.selection || {};
      const rawDecisions = Array.isArray(selRaw.decisions) ? selRaw.decisions : [];
      const normalizedDecisions: PlotSelectionDecision[] = rawDecisions.map((d: any) => {
        const id = String(d.id || '').trim();
        const rawDecision = String(d.decision || '').trim();
        const reason = String(d.reason || '').trim();

        let decision: PlotDecisionType = '기각';
        if (rawDecision === '채택' || rawDecision === '조합' || rawDecision === '기각') {
          decision = rawDecision as PlotDecisionType;
        } else if (rawDecision.includes('채택')) {
          decision = '채택';
        } else if (rawDecision.includes('조합')) {
          decision = '조합';
        }

        return { id, decision, reason };
      });

      // [파싱·검증 영향 확인 사항]
      // 1. decisions[].decision 값 검증 ('채택', '조합', '기각')
      // 2. decisions[].id는 candidates[].id 집합에 존재해야 하며, 모든 후보가 decisions에 한 번씩 등장하는지 검증
      if (normalizedCandidates.length > 0 && (rawDecisions.length > 0 || selRaw.decisions)) {
        const candidateIdSet = new Set(normalizedCandidates.map(c => c.id));
        const seenDecisionIds = new Set<string>();

        for (const dec of normalizedDecisions) {
          if (!candidateIdSet.has(dec.id)) {
            throw new Error(`플롯 검증 실패: selection.decisions의 ID "${dec.id}"가 candidates 목록에 존재하지 않습니다.`);
          }
          if (seenDecisionIds.has(dec.id)) {
            throw new Error(`플롯 검증 실패: selection.decisions에 중복된 후보 ID "${dec.id}"가 존재합니다.`);
          }
          seenDecisionIds.add(dec.id);

          if (dec.decision !== '채택' && dec.decision !== '조합' && dec.decision !== '기각') {
            throw new Error(`플롯 검증 실패: selection.decisions의 decision 값은 '채택', '조합', '기각' 중 하나여야 합니다. (입력: "${dec.decision}")`);
          }
        }

        const missingCandidateIds = normalizedCandidates.filter(c => !seenDecisionIds.has(c.id)).map(c => c.id);
        if (missingCandidateIds.length > 0) {
          throw new Error(`플롯 검증 실패: 모든 후보가 decisions에 한 번씩 등장해야 합니다. 누락된 후보: ${missingCandidateIds.join(', ')}`);
        }
      }

      const normalizedSelection: PlotSelection = {
        comparison: selRaw.comparison ? String(selRaw.comparison).trim() : undefined,
        decisions: normalizedDecisions.length > 0 ? normalizedDecisions : undefined,
        chosen: selRaw.chosen ? String(selRaw.chosen).trim() : undefined,
        twistAndNewSettings: Array.isArray(selRaw.twistAndNewSettings) ? selRaw.twistAndNewSettings.map((t: any) => ({
          name: String(t.name || '').trim(),
          kind: String(t.kind || '신규 설정').trim(),
          relationToCodex: t.relationToCodex ? String(t.relationToCodex).trim() : undefined,
          cluesAndPayoff: t.cluesAndPayoff ? String(t.cluesAndPayoff).trim() : undefined,
          readerKnownFactRisk: t.readerKnownFactRisk ? String(t.readerKnownFactRisk).trim() : undefined
        })) : []
      };

      const verRaw = thought.verification || {};
      const normalizedVerification: PlotVerification = {
        codexCheck: Array.isArray(verRaw.codexCheck) ? verRaw.codexCheck.map(String) : [],
        characterCheck: verRaw.characterCheck ? String(verRaw.characterCheck).trim() : undefined,
        continuityCheck: verRaw.continuityCheck ? String(verRaw.continuityCheck).trim() : undefined
      };

      const normalizedSequencePlan: string[] = Array.isArray(thought.sequencePlan) ? thought.sequencePlan.map(String) : [];

      const s4Raw = thought.section4Plan || {};
      const normalizedSection4Plan: PlotSection4Plan = {
        keepOrAdd: Array.isArray(s4Raw.keepOrAdd) ? s4Raw.keepOrAdd.map(String) : [],
        remove: Array.isArray(s4Raw.remove) ? s4Raw.remove.map(String) : []
      };

      // Extract sequences from plot text or blueprint
      const blueprint = parsed.plotBlueprint || {};
      const micro = blueprint.microPlot || {};
      let sequences: PlotSceneSequence[] = Array.isArray(micro.sequences) ? micro.sequences : [];
      if (sequences.length === 0 && finalPlotText) {
        sequences = extractSequencesFromPlotText(finalPlotText);
      }

      const thoughtProcess: PlotThoughtProcess = {
        diagnosis: normalizedDiagnosis,
        readerAnalysis: normalizedReader,
        codexMaterial: normalizedCodexMaterial,
        candidates: normalizedCandidates,
        reverseReview: normalizedReverseReview,
        selection: normalizedSelection,
        verification: normalizedVerification,
        sequencePlan: normalizedSequencePlan,
        section4Plan: normalizedSection4Plan,

        // Backward compatibility mappings
        contextAnalysis: normalizedDiagnosis.contextAnalysis,
        step1_diagnosis: {
          contextAnalysis: normalizedDiagnosis.contextAnalysis,
          plotType: normalizedDiagnosis.plotType || 'AUTO_UPDATE',
          plotDirection: normalizedSelection.chosen || normalizedDiagnosis.roadmapDecision || '',
          milestoneProgressAnalysis: {
            currentMilestone: normalizedDiagnosis.currentMilestone,
            milestonePhase: normalizedDiagnosis.milestonePhase,
          }
        },
        updatePlan: {
          section1: normalizedDiagnosis.section1Handling,
          section2: normalizedDiagnosis.roadmapDecision,
          section4: normalizedSection4Plan.keepOrAdd?.join(', '),
          prunedItems: normalizedSection4Plan.remove || []
        },
        preWriteCheck: {
          consistency: normalizedVerification.continuityCheck,
          character: normalizedVerification.characterCheck,
          logic: normalizedVerification.codexCheck?.join('; '),
          densityAndPayoff: normalizedReader.enjoymentDirection
        }
      };

      const plotBlueprint: PlotBlueprintStructure = {
        themeAndGenreDirectives: String(blueprint.themeAndGenreDirectives || '').trim(),
        macroPlot: String(blueprint.macroPlot || '').trim(),
        microPlot: {
          incident: String(micro.incident || normalizedDiagnosis.currentMilestone || '').trim(),
          narrativeIntent: normalizedSelection.chosen,
          characterInertia: normalizedVerification.characterCheck,
          incrementalRelationshipShift: '',
          relationshipDelta: '',
          structuralDestination: normalizedDiagnosis.roadmapDecision,
          sequences
        },
        persistentLogicFramework: String(blueprint.persistentLogicFramework || '').trim()
      };

      if (finalPlotText) {
        validatePlotCompleteness(finalPlotText, sequences.length);
        return { thoughtProcess, plotBlueprint, finalPlotText };
      }
    }

    // 1-B. Legacy 3-Tier and Algorithmic Formats
    if (thought.contextAnalysis || thought.step1_diagnosis || thought.updatePlan || thought.preWriteCheck || thought.step5_6_activeSequences || thought.step6_7_activeSequences || thought.step5_invariantsAndForeshadowing) {
      const step1 = thought.step1_diagnosis || {};
      const step2 = thought.step2_directingConstitution || {};
      const step34 = thought.step3_4_macro || {};
      
      // Step 5 Invariants & Foreshadowing (Pre-Inference) - support new and legacy keys
      const step5Raw = thought.step5_invariantsAndForeshadowing || thought.step7_invariantsAndForeshadowing || {};
      const priorLogic = step5Raw.priorLogicAndForeshadowingStrategy || {};
      
      // Step 6-7 Active Sequences - support new and legacy keys
      const step67Raw = thought.step6_7_activeSequences || thought.step5_6_activeSequences || {};
      const selfCritique = step67Raw.selfCritiqueFlaws || {};
      const episodeIdeation = step67Raw.episodeIdeation || {};
      
      const rawPlan = step1.stepExecutionPlan || {};
      const step2Plan = rawPlan.step2_directing;
      const step34Plan = rawPlan.step3_4_macro;
      const step5Plan = rawPlan.step5_invariants || rawPlan.step7_invariants;
      const step67Plan = rawPlan.step6_7_activeSequences || rawPlan.step5_6_activeSequences;

      const normalizedStep5Plan: Step5ExecutionFactors | undefined = step5Plan ? {
        hasNewForeshadowingOrLogicRules: step5Plan.hasNewForeshadowingOrLogicRules !== undefined ? Boolean(step5Plan.hasNewForeshadowingOrLogicRules) : undefined,
        existingFrameworkSufficient: step5Plan.existingFrameworkSufficient !== undefined ? Boolean(step5Plan.existingFrameworkSufficient) : undefined,
        hasPrunableOrGraduatedItems: step5Plan.hasPrunableOrGraduatedItems !== undefined ? Boolean(step5Plan.hasPrunableOrGraduatedItems) : undefined,
        prunableItemsAudit: Array.isArray(step5Plan.prunableItemsAudit) ? step5Plan.prunableItemsAudit.map(String) : undefined,
        deductionReason: step5Plan.deductionReason ? String(step5Plan.deductionReason).trim() : undefined,
        criteriaEvaluation: step5Plan.criteriaEvaluation ? String(step5Plan.criteriaEvaluation).trim() : undefined,
        execute: Boolean(step5Plan.execute)
      } : undefined;

      const normalizedStep67Plan: Step67ExecutionFactors | undefined = step67Plan ? {
        isSection1OnlyRevision: step67Plan.isSection1OnlyRevision !== undefined ? Boolean(step67Plan.isSection1OnlyRevision) : undefined,
        needsProseDraftingSequences: step67Plan.needsProseDraftingSequences !== undefined ? Boolean(step67Plan.needsProseDraftingSequences) : undefined,
        deductionReason: step67Plan.deductionReason ? String(step67Plan.deductionReason).trim() : undefined,
        criteriaEvaluation: step67Plan.criteriaEvaluation ? String(step67Plan.criteriaEvaluation).trim() : undefined,
        execute: Boolean(step67Plan.execute)
      } : undefined;

      const normalizedPlan = rawPlan ? {
        step2_directing: step2Plan ? {
          isInitialCreation: step2Plan.isInitialCreation !== undefined ? Boolean(step2Plan.isInitialCreation) : undefined,
          hasDirectingChangeRequest: step2Plan.hasDirectingChangeRequest !== undefined ? Boolean(step2Plan.hasDirectingChangeRequest) : undefined,
          currentRulesAdequate: step2Plan.currentRulesAdequate !== undefined ? Boolean(step2Plan.currentRulesAdequate) : undefined,
          deductionReason: step2Plan.deductionReason ? String(step2Plan.deductionReason).trim() : undefined,
          criteriaEvaluation: step2Plan.criteriaEvaluation ? String(step2Plan.criteriaEvaluation).trim() : undefined,
          execute: Boolean(step2Plan.execute)
        } : undefined,
        step3_4_macro: step34Plan ? {
          isInitialCreation: step34Plan.isInitialCreation !== undefined ? Boolean(step34Plan.isInitialCreation) : undefined,
          isArcCompletedOrNewArcRequired: step34Plan.isArcCompletedOrNewArcRequired !== undefined ? Boolean(step34Plan.isArcCompletedOrNewArcRequired) : undefined,
          isMilestoneCompletedOrNewArc: step34Plan.isMilestoneCompletedOrNewArc !== undefined ? Boolean(step34Plan.isMilestoneCompletedOrNewArc) : undefined,
          hasMacroShiftRequest: step34Plan.hasMacroShiftRequest !== undefined ? Boolean(step34Plan.hasMacroShiftRequest) : undefined,
          currentArcRoadmapValid: step34Plan.currentArcRoadmapValid !== undefined ? Boolean(step34Plan.currentArcRoadmapValid) : undefined,
          currentRoadmapValid: step34Plan.currentRoadmapValid !== undefined ? Boolean(step34Plan.currentRoadmapValid) : undefined,
          deductionReason: step34Plan.deductionReason ? String(step34Plan.deductionReason).trim() : undefined,
          criteriaEvaluation: step34Plan.criteriaEvaluation ? String(step34Plan.criteriaEvaluation).trim() : undefined,
          execute: Boolean(step34Plan.execute)
        } : undefined,
        step5_invariants: normalizedStep5Plan,
        step6_7_activeSequences: normalizedStep67Plan,
        // Backward compatibility
        step5_6_activeSequences: normalizedStep67Plan,
        step7_invariants: normalizedStep5Plan
      } : undefined;

      const milestoneProgress = step1.milestoneProgressAnalysis;
      const normalizedMilestoneProgress: MilestoneProgressAnalysis | undefined = milestoneProgress ? {
        currentMilestone: milestoneProgress.currentMilestone ? String(milestoneProgress.currentMilestone).trim() : undefined,
        milestonePhase: milestoneProgress.milestonePhase ? String(milestoneProgress.milestonePhase).trim() : undefined,
        isTransitionBridgeRequired: milestoneProgress.isTransitionBridgeRequired !== undefined ? Boolean(milestoneProgress.isTransitionBridgeRequired) : undefined,
        bridgeTargetMilestone: milestoneProgress.bridgeTargetMilestone ? String(milestoneProgress.bridgeTargetMilestone).trim() : undefined,
        deductionReason: milestoneProgress.deductionReason ? String(milestoneProgress.deductionReason).trim() : undefined
      } : undefined;

      const draftLogicRaw = step5Raw.draftOperationalLogicAndInvariants || {};
      const hardLogicCritiqueRaw = step5Raw.hardLogicSelfCritique || {};
      const patchedLogicRaw = step5Raw.patchedOperationalLogic || {};

      const normalizedDraftLogic: DraftOperationalLogicAndInvariants | undefined = (draftLogicRaw.operationalBlueprints || draftLogicRaw.diegeticConstraintsAndInvariants || draftLogicRaw.latentForeshadowingAndClues) ? {
        operationalBlueprints: Array.isArray(draftLogicRaw.operationalBlueprints) ? draftLogicRaw.operationalBlueprints.map((bp: any) => ({
          blueprintTitle: bp.blueprintTitle ? String(bp.blueprintTitle).trim() : undefined,
          coreChallengeAndConstraints: (bp.coreChallengeAndConstraints || bp.threatAndConstraint) ? String(bp.coreChallengeAndConstraints || bp.threatAndConstraint).trim() : undefined,
          threatAndConstraint: (bp.threatAndConstraint || bp.coreChallengeAndConstraints) ? String(bp.threatAndConstraint || bp.coreChallengeAndConstraints).trim() : undefined,
          keyLeverageAndAdvantage: (bp.keyLeverageAndAdvantage || bp.informationAsymmetry) ? String(bp.keyLeverageAndAdvantage || bp.informationAsymmetry).trim() : undefined,
          informationAsymmetry: (bp.informationAsymmetry || bp.keyLeverageAndAdvantage) ? String(bp.informationAsymmetry || bp.keyLeverageAndAdvantage).trim() : undefined,
          stepByStepProgression: (bp.stepByStepProgression || bp.preparatoryInductionSteps) ? String(bp.stepByStepProgression || bp.preparatoryInductionSteps).trim() : undefined,
          preparatoryInductionSteps: (bp.preparatoryInductionSteps || bp.stepByStepProgression) ? String(bp.preparatoryInductionSteps || bp.stepByStepProgression).trim() : undefined,
          decisiveMechanism: (bp.decisiveMechanism || bp.executionMechanism) ? String(bp.decisiveMechanism || bp.executionMechanism).trim() : undefined,
          executionMechanism: (bp.executionMechanism || bp.decisiveMechanism) ? String(bp.executionMechanism || bp.decisiveMechanism).trim() : undefined,
          costsAndAftermath: (bp.costsAndAftermath || bp.costAndCounteraction) ? String(bp.costsAndAftermath || bp.costAndCounteraction).trim() : undefined,
          costAndCounteraction: (bp.costAndCounteraction || bp.costsAndAftermath) ? String(bp.costAndCounteraction || bp.costsAndAftermath).trim() : undefined,
        })) : undefined,
        diegeticConstraintsAndInvariants: Array.isArray(draftLogicRaw.diegeticConstraintsAndInvariants) ? draftLogicRaw.diegeticConstraintsAndInvariants.map(String) : undefined,
        latentForeshadowingAndClues: draftLogicRaw.latentForeshadowingAndClues ? (
          typeof draftLogicRaw.latentForeshadowingAndClues === 'object' && !Array.isArray(draftLogicRaw.latentForeshadowingAndClues) ? {
            recalledForeshadowing: draftLogicRaw.latentForeshadowingAndClues.recalledForeshadowing ? String(draftLogicRaw.latentForeshadowingAndClues.recalledForeshadowing).trim() : undefined,
            plantedForeshadowing: draftLogicRaw.latentForeshadowingAndClues.plantedForeshadowing ? String(draftLogicRaw.latentForeshadowingAndClues.plantedForeshadowing).trim() : undefined,
          } : draftLogicRaw.latentForeshadowingAndClues
        ) : undefined
      } : undefined;

      const normalizedHardLogicCritique: HardLogicSelfCritique | undefined = (hardLogicCritiqueRaw.antiConvenienceAndPlausibility || hardLogicCritiqueRaw.antiConvenienceAndFakeTactics || hardLogicCritiqueRaw.causalFeasibility || hardLogicCritiqueRaw.causalInevitabilityAndPhysics || hardLogicCritiqueRaw.processDensity || hardLogicCritiqueRaw.maneuveringDensity || hardLogicCritiqueRaw.consequenceAndConsistency || hardLogicCritiqueRaw.costAndCounteraction) ? {
        antiConvenienceAndPlausibility: (hardLogicCritiqueRaw.antiConvenienceAndPlausibility || hardLogicCritiqueRaw.antiConvenienceAndFakeTactics) ? String(hardLogicCritiqueRaw.antiConvenienceAndPlausibility || hardLogicCritiqueRaw.antiConvenienceAndFakeTactics).trim() : undefined,
        antiConvenienceAndFakeTactics: (hardLogicCritiqueRaw.antiConvenienceAndFakeTactics || hardLogicCritiqueRaw.antiConvenienceAndPlausibility) ? String(hardLogicCritiqueRaw.antiConvenienceAndFakeTactics || hardLogicCritiqueRaw.antiConvenienceAndPlausibility).trim() : undefined,
        causalFeasibility: (hardLogicCritiqueRaw.causalFeasibility || hardLogicCritiqueRaw.causalInevitabilityAndPhysics) ? String(hardLogicCritiqueRaw.causalFeasibility || hardLogicCritiqueRaw.causalInevitabilityAndPhysics).trim() : undefined,
        causalInevitabilityAndPhysics: (hardLogicCritiqueRaw.causalInevitabilityAndPhysics || hardLogicCritiqueRaw.causalFeasibility) ? String(hardLogicCritiqueRaw.causalInevitabilityAndPhysics || hardLogicCritiqueRaw.causalFeasibility).trim() : undefined,
        processDensity: (hardLogicCritiqueRaw.processDensity || hardLogicCritiqueRaw.maneuveringDensity) ? String(hardLogicCritiqueRaw.processDensity || hardLogicCritiqueRaw.maneuveringDensity).trim() : undefined,
        maneuveringDensity: (hardLogicCritiqueRaw.maneuveringDensity || hardLogicCritiqueRaw.processDensity) ? String(hardLogicCritiqueRaw.maneuveringDensity || hardLogicCritiqueRaw.processDensity).trim() : undefined,
        consequenceAndConsistency: (hardLogicCritiqueRaw.consequenceAndConsistency || hardLogicCritiqueRaw.costAndCounteraction) ? String(hardLogicCritiqueRaw.consequenceAndConsistency || hardLogicCritiqueRaw.costAndCounteraction).trim() : undefined,
        costAndCounteraction: (hardLogicCritiqueRaw.costAndCounteraction || hardLogicCritiqueRaw.consequenceAndConsistency) ? String(hardLogicCritiqueRaw.costAndCounteraction || hardLogicCritiqueRaw.consequenceAndConsistency).trim() : undefined,
      } : undefined;

      const normalizedPatchedLogic: PatchedOperationalLogic | undefined = (patchedLogicRaw.patchedBlueprintsAndInvariants || patchedLogicRaw.scratchpads) ? {
        patchedBlueprintsAndInvariants: patchedLogicRaw.patchedBlueprintsAndInvariants ? String(patchedLogicRaw.patchedBlueprintsAndInvariants).trim() : undefined,
        scratchpads: Array.isArray(patchedLogicRaw.scratchpads) ? patchedLogicRaw.scratchpads : undefined
      } : undefined;

      const normalizedInvariants: StepInvariantsAndForeshadowing = {
        isBypassed: Boolean(step5Raw.isBypassed),
        bypassReason: step5Raw.bypassReason ? String(step5Raw.bypassReason).trim() : undefined,
        antiDuplicationAndGraduationAudit: step5Raw.antiDuplicationAndGraduationAudit ? {
          section1DirectingLeakCheck: step5Raw.antiDuplicationAndGraduationAudit.section1DirectingLeakCheck ? String(step5Raw.antiDuplicationAndGraduationAudit.section1DirectingLeakCheck).trim() : undefined,
          codexOverlapFilter: step5Raw.antiDuplicationAndGraduationAudit.codexOverlapFilter ? String(step5Raw.antiDuplicationAndGraduationAudit.codexOverlapFilter).trim() : undefined,
          graduationPruningList: Array.isArray(step5Raw.antiDuplicationAndGraduationAudit.graduationPruningList) ? step5Raw.antiDuplicationAndGraduationAudit.graduationPruningList.map(String) : undefined
        } : undefined,
        draftOperationalLogicAndInvariants: normalizedDraftLogic,
        hardLogicSelfCritique: normalizedHardLogicCritique,
        patchedOperationalLogic: normalizedPatchedLogic,
        priorLogicAndForeshadowingStrategy: (priorLogic.recalledForeshadowing || priorLogic.plantedForeshadowing || priorLogic.diegeticLogicConstraints) ? {
          recalledForeshadowing: priorLogic.recalledForeshadowing ? String(priorLogic.recalledForeshadowing).trim() : undefined,
          plantedForeshadowing: priorLogic.plantedForeshadowing ? String(priorLogic.plantedForeshadowing).trim() : undefined,
          diegeticLogicConstraints: priorLogic.diegeticLogicConstraints ? String(priorLogic.diegeticLogicConstraints).trim() : undefined
        } : undefined,
        scratchpad: step5Raw.scratchpad ? String(step5Raw.scratchpad).trim() : undefined,
        scratchpads: Array.isArray(step5Raw.scratchpads) ? step5Raw.scratchpads : (normalizedPatchedLogic?.scratchpads || [])
      };

      const normalizedSequencesData = {
        isBypassed: Boolean(step67Raw.isBypassed),
        bypassReason: step67Raw.bypassReason ? String(step67Raw.bypassReason).trim() : undefined,
        episodeIncident: String(episodeIdeation.episodeIncident || step67Raw.episodeIncident || '').trim(),
        episodeIdeation: step67Raw.episodeIdeation ? {
          narrativeIntent: String(episodeIdeation.narrativeIntent || '').trim(),
          characterInertia: String(episodeIdeation.characterInertia || '').trim(),
          plausibleDelta: String(episodeIdeation.plausibleDelta || '').trim(),
          structuralDestination: String(episodeIdeation.structuralDestination || '').trim(),
          episodeIncident: String(episodeIdeation.episodeIncident || step67Raw.episodeIncident || '').trim()
        } : undefined,
        sequences: Array.isArray(step67Raw.sequences) ? step67Raw.sequences : [],
        customCritiqueVectors: Array.isArray(step67Raw.customCritiqueVectors) ? step67Raw.customCritiqueVectors : [],
        selfCritiqueFlaws: {
          causality: String(selfCritique.causality || selfCritique.causalityAndLogicFulfillment || '').trim(),
          causalityAndLogicFulfillment: selfCritique.causalityAndLogicFulfillment ? String(selfCritique.causalityAndLogicFulfillment).trim() : undefined,
          characterOOC: String(selfCritique.characterOOC || '').trim(),
          entertainment: String(selfCritique.entertainment || selfCritique.entertainmentAndPayoff || '').trim(),
          entertainmentAndPayoff: selfCritique.entertainmentAndPayoff ? String(selfCritique.entertainmentAndPayoff).trim() : undefined,
          pacingDensity: String(selfCritique.pacingDensity || '').trim(),
          historicalFactAndTimeline: selfCritique.historicalFactAndTimeline ? String(selfCritique.historicalFactAndTimeline).trim() : undefined,
          foreshadowingAndLogicFulfillment: (selfCritique.foreshadowingAndLogicFulfillment || selfCritique.causalityAndLogicFulfillment) ? String(selfCritique.foreshadowingAndLogicFulfillment || selfCritique.causalityAndLogicFulfillment).trim() : undefined,
          customVectors: Array.isArray(selfCritique.customVectors) ? selfCritique.customVectors : []
        },
        patchedSolutions: String(step67Raw.patchedSolutions || '').trim()
      };
      
      const updatePlanRaw = thought.updatePlan;
      const normalizedUpdatePlan: PlotUpdatePlan | undefined = updatePlanRaw ? {
        section1: updatePlanRaw.section1 ? String(updatePlanRaw.section1).trim() : undefined,
        section2: updatePlanRaw.section2 ? String(updatePlanRaw.section2).trim() : undefined,
        section4: updatePlanRaw.section4 ? String(updatePlanRaw.section4).trim() : undefined,
        prunedItems: Array.isArray(updatePlanRaw.prunedItems) ? updatePlanRaw.prunedItems.map(String) : []
      } : undefined;

      const preWriteCheckRaw = thought.preWriteCheck;
      const normalizedPreWriteCheck: PlotPreWriteCheck | undefined = preWriteCheckRaw ? {
        consistency: preWriteCheckRaw.consistency ? String(preWriteCheckRaw.consistency).trim() : undefined,
        character: preWriteCheckRaw.character ? String(preWriteCheckRaw.character).trim() : undefined,
        logic: preWriteCheckRaw.logic ? String(preWriteCheckRaw.logic).trim() : undefined,
        densityAndPayoff: preWriteCheckRaw.densityAndPayoff ? String(preWriteCheckRaw.densityAndPayoff).trim() : undefined,
      } : undefined;

      const resolvedContextAnalysis = thought.contextAnalysis
        ? String(thought.contextAnalysis).trim()
        : (step1.contextAnalysis ? String(step1.contextAnalysis).trim() : undefined);

      const thoughtProcess: PlotThoughtProcess = {
        contextAnalysis: resolvedContextAnalysis,
        step1_diagnosis: {
          contextAnalysis: resolvedContextAnalysis,
          plotType: String(thought.plotType || step1.plotType || 'AUTO_UPDATE').trim(),
          plotDirection: String(thought.plotDirection || step1.plotDirection || '').trim(),
          reasoning: step1.reasoning ? String(step1.reasoning).trim() : undefined,
          milestoneProgressAnalysis: normalizedMilestoneProgress,
          stepExecutionPlan: normalizedPlan
        },
        updatePlan: normalizedUpdatePlan,
        preWriteCheck: normalizedPreWriteCheck,
        step2_directingConstitution: {
          isBypassed: Boolean(step2.isBypassed),
          bypassReason: step2.bypassReason ? String(step2.bypassReason).trim() : undefined,
          directingRules: step2.directingRules ? String(step2.directingRules).trim() : undefined
        },
        step3_4_macro: {
          isBypassed: Boolean(step34.isBypassed),
          bypassReason: step34.bypassReason ? String(step34.bypassReason).trim() : undefined,
          preliminaryIdeation: step34.preliminaryIdeation ? {
            narrativeIntent: String(step34.preliminaryIdeation.narrativeIntent || '').trim(),
            characterInertia: String(step34.preliminaryIdeation.characterInertia || '').trim(),
            plausibleDelta: String(step34.preliminaryIdeation.plausibleDelta || '').trim()
          } : undefined,
          macroRoadmap: step34.macroRoadmap ? String(step34.macroRoadmap).trim() : undefined,
          macroCritiqueAndPatch: (step34.macroCritiqueAndPatch && typeof step34.macroCritiqueAndPatch === 'object') ? {
            logicalFlow: String(step34.macroCritiqueAndPatch.logicalFlow || '').trim(),
            pacingAndPayoff: String(step34.macroCritiqueAndPatch.pacingAndPayoff || '').trim(),
            characterInertiaAndDelta: step34.macroCritiqueAndPatch.characterInertiaAndDelta ? String(step34.macroCritiqueAndPatch.characterInertiaAndDelta).trim() : undefined,
            timelineAndCanonConsistency: step34.macroCritiqueAndPatch.timelineAndCanonConsistency ? String(step34.macroCritiqueAndPatch.timelineAndCanonConsistency).trim() : undefined,
            customVectors: Array.isArray(step34.macroCritiqueAndPatch.customVectors) ? step34.macroCritiqueAndPatch.customVectors : [],
            patchedSolutions: String(step34.macroCritiqueAndPatch.patchedSolutions || '').trim()
          } : (typeof step34.macroCritiqueAndPatch === 'string' && step34.macroCritiqueAndPatch.trim() !== '') ? step34.macroCritiqueAndPatch.trim() : undefined
        },
        // Step 5 (Pre-Inference Foreshadowing & Invariants)
        step5_invariantsAndForeshadowing: normalizedInvariants,
        // Step 6-7 (Active Sequences and Self-Critique)
        step6_7_activeSequences: normalizedSequencesData,
        // Backward compatibility mappings
        step5_6_activeSequences: normalizedSequencesData,
        step7_invariantsAndForeshadowing: normalizedInvariants
      };

      const blueprint = parsed.plotBlueprint || {};
      const micro = blueprint.microPlot || {};
      
      const rawSequences = Array.isArray(micro.sequences) ? micro.sequences : [];
      const sequences: PlotSceneSequence[] = rawSequences.map((seq: any, idx: number) => {
        const directingText = String(seq.dialogueAndActionDirecting || seq.dialogueDirecting || seq.dialogue || '').trim();
        const isBridge = Boolean(seq.isBridgeSequence || /가교|Bridge/i.test(seq.title || ''));
        return {
          title: String(seq.title || `시퀀스 ${idx + 1}`).trim(),
          narrativeFlow: String(seq.narrativeFlow || seq.description || '').trim(),
          dialogueAndActionDirecting: directingText,
          dialogueDirecting: directingText,
          directingCraft: String(seq.directingCraft || seq.craft || '').trim(),
          sequenceHook: String(seq.sequenceHook || seq.hook || '').trim(),
          isBridgeSequence: isBridge ? true : undefined,
        };
      }).filter((s: any) => s.narrativeFlow || s.dialogueAndActionDirecting || s.directingCraft);

      const resolvedIncident = String(micro.incident || episodeIdeation.episodeIncident || step67Raw.episodeIncident || micro.objective || '').trim();
      const resolvedNarrativeIntent = String(micro.narrativeIntent || episodeIdeation.narrativeIntent || '').trim();
      const resolvedCharacterInertia = String(micro.characterInertia || episodeIdeation.characterInertia || '').trim();
      const resolvedRelationshipShift = String(micro.incrementalRelationshipShift || episodeIdeation.plausibleDelta || micro.relationshipDelta || micro.characterDirectives || '').trim();
      const resolvedDestination = String(micro.structuralDestination || episodeIdeation.structuralDestination || '').trim();

      const plotBlueprint: PlotBlueprintStructure = {
        themeAndGenreDirectives: String(blueprint.themeAndGenreDirectives || '').trim(),
        macroPlot: String(blueprint.macroPlot || '').trim(),
        microPlot: {
          incident: resolvedIncident,
          narrativeIntent: resolvedNarrativeIntent || undefined,
          characterInertia: resolvedCharacterInertia || undefined,
          incrementalRelationshipShift: resolvedRelationshipShift,
          relationshipDelta: resolvedRelationshipShift,
          structuralDestination: resolvedDestination || undefined,
          sequences: sequences.length > 0 ? sequences : []
        },
        persistentLogicFramework: String(blueprint.persistentLogicFramework || parsed.persistentLogicFramework || '').trim()
      };

      const finalPlotText = String(parsed.finalPlotText || '').trim();
      if (finalPlotText) {
        validatePlotCompleteness(finalPlotText, sequences.length);
        return { thoughtProcess, plotBlueprint, finalPlotText };
      }
    } else {
      // Legacy Structure Fallback
      const longTerm = thought.longTermInertiaBaseline || thought.longTermInertia || thought.narrativeInertiaAssessment || thought.narrativeInertia;
      const shortTerm = thought.shortTermSituationalDynamics || thought.shortTermDynamics || thought.situationalDynamics;

      const thoughtProcess: PlotThoughtProcess = {
        readerPayoffDynamics: String(
          thought.readerPayoffDynamics || thought.narrativeState || ''
        ).trim(),
        longTermInertiaBaseline: longTerm ? String(longTerm).trim() : undefined,
        shortTermSituationalDynamics: shortTerm ? String(shortTerm).trim() : undefined,
        narrativeInertiaAssessment: thought.narrativeInertiaAssessment
          ? String(thought.narrativeInertiaAssessment).trim()
          : longTerm
          ? String(longTerm).trim()
          : undefined,
        relationshipDeltaAnalysis: String(
          thought.relationshipDeltaAnalysis || thought.characterDynamics || ''
        ).trim(),
        incrementalRelationalShiftAnalysis: String(
          thought.incrementalRelationalShiftAnalysis || thought.relationshipDeltaAnalysis || thought.characterDynamics || ''
        ).trim(),
        clicheAndPacingControl: String(
          thought.clicheAndPacingControl || thought.clicheTrapAnalysis || ''
        ).trim(),
        directingTechniques: String(
          thought.directingTechniques || thought.pacingAndTone || ''
        ).trim(),
      };

      // 2. plotBlueprint 검증
      const blueprint = parsed.plotBlueprint || {};
      const micro = blueprint.microPlot || {};
      
      const rawSequences = Array.isArray(micro.sequences) ? micro.sequences : [];
      const sequences: PlotSceneSequence[] = rawSequences.map((seq: any, idx: number) => {
        const directingText = String(seq.dialogueAndActionDirecting || seq.dialogueDirecting || seq.dialogue || '').trim();
        return {
          title: String(seq.title || `시퀀스 ${idx + 1}`).trim(),
          narrativeFlow: String(seq.narrativeFlow || seq.description || '').trim(),
          dialogueAndActionDirecting: directingText,
          dialogueDirecting: directingText,
          directingCraft: String(seq.directingCraft || seq.craft || '').trim(),
          sequenceHook: String(seq.sequenceHook || seq.hook || '').trim(),
        };
      }).filter((s: any) => s.narrativeFlow || s.dialogueAndActionDirecting || s.directingCraft);

      const sceneBeatsRaw = Array.isArray(micro.sceneBeats) ? micro.sceneBeats : [];
      const sceneBeats = sceneBeatsRaw.map((b: any) => String(b).trim()).filter(Boolean);

      const plotBlueprint: PlotBlueprintStructure = {
        themeAndGenreDirectives: String(blueprint.themeAndGenreDirectives || '').trim(),
        macroPlot: String(blueprint.macroPlot || '').trim(),
        microPlot: {
          incident: String(micro.incident || micro.objective || '').trim(),
          relationshipDelta: String(micro.relationshipDelta || micro.characterDirectives || '').trim(),
          incrementalRelationshipShift: String(micro.incrementalRelationshipShift || micro.relationshipDelta || micro.characterDirectives || '').trim(),
          sequences: sequences.length > 0 ? sequences : sceneBeats.map((beat: any, idx: number) => ({
            title: `시퀀스 ${idx + 1}`,
            narrativeFlow: beat,
            dialogueAndActionDirecting: '',
            dialogueDirecting: '',
            directingCraft: '',
            sequenceHook: ''
          })),
          objective: String(micro.objective || micro.incident || '').trim(),
          sceneBeats,
          characterDirectives: String(micro.characterDirectives || micro.relationshipDelta || '').trim(),
          antiDirectives: String(micro.antiDirectives || '').trim(),
        },
        persistentLogicFramework: String(blueprint.persistentLogicFramework || parsed.persistentLogicFramework || '').trim()
      };

      // 3. finalPlotText 검증 및 엄격한 완결성 체크
      const finalPlotText = String(parsed.finalPlotText || '').trim();
      if (finalPlotText) {
        validatePlotCompleteness(finalPlotText, sequences.length);
        return {
          thoughtProcess,
          plotBlueprint,
          finalPlotText
        };
      }
    }
  }

  // --- 2-Pass: Raw Text 4대/3대 헤더 직접 정규식 복원 Fallback (완전성 통과 시에만 허용) ---
  const fallbackResult = extractPlotDirectlyFromRawText(rawResponse);
  if (fallbackResult) {
    return fallbackResult;
  }

  // JSON 파싱도 실패하고 완전한 텍스트도 복원할 수 없는 경우 Fail-Fast
  if (jsonParseError) {
    throw new Error(
      `플롯 생성 JSON 파싱 실패: ${jsonParseError}\n(생성이 도중에 잘렸거나 유효하지 않습니다. Max Tokens 설정을 확인하세요.)`
    );
  } else {
    throw new Error("플롯 4대 필수 계층 헤더 또는 시퀀스를 온전히 식별할 수 없습니다.");
  }
}

/**
 * 상태 머신 기반: 따옴표 내부의 unescaped raw newline 및 제어문자를 \n으로 안전하게 치환
 */
function sanitizeJsonStringLiterals(jsonStr: string): string {
  let inString = false;
  let isEscaped = false;
  let result = '';

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === '\\') {
        result += char;
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
        result += char;
      } else if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }

  return result;
}

/**
 * 원본 텍스트에서 4대/3대 필수 헤더를 정규식으로 직접 추출하여 finalPlotText를 복원합니다.
 */
function extractPlotDirectlyFromRawText(rawText: string): ParsedPlotResponse | null {
  if (!rawText) return null;

  // 1. 서술 방향 및 연출 디렉팅
  const h1Match = rawText.match(/\[(?:1\.\s*)?(?:서술\s*방향\s*및\s*연출\s*디렉팅|작품의\s*테마\s*및\s*장르상\s*유의점)\]/i);
  // 2. 장기 대서사 플롯
  const h2Match = rawText.match(/\[(?:2\.\s*)?(?:장기\s*대서사\s*플롯(?:\s*\(.*?\))?|장기\s*플롯)\]/i);
  // 3. 현재 진행 중인 사건 플롯
  const h3Match = rawText.match(/\[(?:3\.\s*)?(?:현재\s*진행\s*중인\s*(?:사건\s*)?플롯|진행중인\s*플롯)\]/i);

  if (!h1Match || !h2Match || !h3Match) {
    return null;
  }

  const h1Index = h1Match.index ?? -1;
  const h2Index = h2Match.index ?? -1;
  const h3Index = h3Match.index ?? -1;

  if (h1Index === -1 || h2Index === -1 || h3Index === -1 || !(h1Index < h2Index && h2Index < h3Index)) {
    return null;
  }

  // 1번 헤더 시작부터 텍스트 추출
  let extractedPlot = rawText.substring(h1Index).trim();

  // 만약 뒤에 JSON 닫는 괄호/따옴표/마크다운 블록이 붙어있다면 제거
  extractedPlot = extractedPlot.replace(/["'}\s]*```[\s\S]*$/, '').replace(/["'}\s]+$/, '').trim();

  // 이스케이프된 \n을 실제 개행으로 복원
  extractedPlot = extractedPlot.replace(/\\n/g, '\n').replace(/\\"/g, '"');

  try {
    validatePlotCompleteness(extractedPlot);
  } catch {
    return null;
  }

  return {
    thoughtProcess: {
      readerPayoffDynamics: "텍스트 직접 복원 모드로 생성되었습니다.",
      longTermInertiaBaseline: "텍스트 직접 복원 모드로 생성되었습니다.",
      shortTermSituationalDynamics: "텍스트 직접 복원 모드로 생성되었습니다.",
      narrativeInertiaAssessment: "텍스트 직접 복원 모드로 생성되었습니다.",
      relationshipDeltaAnalysis: "텍스트 직접 복원 모드로 생성되었습니다.",
      incrementalRelationalShiftAnalysis: "텍스트 직접 복원 모드로 생성되었습니다.",
      clicheAndPacingControl: "텍스트 직접 복원 모드로 생성되었습니다.",
      directingTechniques: "텍스트 직접 복원 모드로 생성되었습니다."
    },
    plotBlueprint: {
      themeAndGenreDirectives: "복원된 플롯 텍스트를 참조하십시오.",
      macroPlot: "복원된 플롯 텍스트를 참조하십시오.",
      microPlot: {
        incident: "현재 진행 중인 사건",
        relationshipDelta: "인물 관계 변곡점",
        incrementalRelationshipShift: "미세한 심리 변화",
        sequences: extractSequencesFromPlotText(extractedPlot)
      },
      persistentLogicFramework: ""
    },
    finalPlotText: extractedPlot
  };
}
