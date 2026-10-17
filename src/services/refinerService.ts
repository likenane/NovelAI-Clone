import { generateGeminiContent, generateOpenRouterContent } from './aiService';
import { generateTaskContext } from './promptService';
import { 
  processNovelContext, 
  formatActiveLore, 
  formatStoryMemory, 
  buildTotalVariableDictionary,
  buildStandardNarrativeContext,
  formatAuditorPrompt,
  formatMasterSynthesisPrompt,
  getPersonaPrimingMessages
} from '../lib/contextProviders';
import {
  extractMentionedEntities,
  searchRelevantMemoryCards,
  formatArchiveCardsForPrompt
} from '../lib/memoryArchiveUtils';
import { 
  Novel, 
  CharacterAuditItem, 
  LoreAuditItem, 
  LinguisticAnalysisStructured,
  InformationOrderAudit,
  RefinerChangeLogItem,
  RefinerChangeVector,
  RefinerGlobalContextAudit,
  RefinerGlobalPlotAudit,
  RefinerSliceItem,
  RefinerSliceStageAudits,
  RefinerSliceDefect,
  MultiAgentAuditReports
} from '../types';
import { GLOBAL_DEFAULTS } from '../constants';
import { sliceProseByTokens, sliceProseIntoInspectionWindows, formatDraftWithSliceTags } from '../lib/tokenSlicer';
import { stitchAndTrimAnchor } from '../lib/utils';

export interface ConsistencyResponse {
  analysisLanguage?: string;
  globalContextAudit?: RefinerGlobalContextAudit;
  slices?: RefinerSliceItem[];
  physicalLogicAnalysis?: string;
  loreSystemAnalysis?: string;
  loreAudits?: LoreAuditItem[];
  characterDynamicsAnalysis?: string;
  characterAudits?: CharacterAuditItem[];
  plotAndDirectiveAnalysis?: string;
  linguisticAnalysis?: string;
  structuredLinguisticAnalysis?: LinguisticAnalysisStructured;
  informationOrderAudit?: InformationOrderAudit;
  narrativeAnalysis: string;
  conflicts: string[];
  hasConflicts: boolean;
  refinedText: string;
  changeLog?: RefinerChangeLogItem[];
  rawResponseText?: string;
  parseError?: string;
}

/**
 * Extracts structured JSON critique response from the model's text output.
 */
export function extractConsistencyResponse(text: string, rawDraft?: string): { success: true; data: ConsistencyResponse } | { success: false; error: string; rawText: string } {
  const rawText = text || "";
  try {
    let processedText = text.trim();
    
    // Strip markdown code block wrappers if any
    if (processedText.startsWith('```')) {
      const match = processedText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        processedText = match[1].trim();
      } else {
        // Just remove the starting ```json if there's no ending
        processedText = processedText.replace(/^```(?:json)?\s*/, '');
        processedText = processedText.replace(/\s*```$/, '');
      }
    }
    
    // Find the first { and last } in case there is text outside the JSON
    const jsonStart = processedText.indexOf('{');
    const jsonEnd = processedText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      processedText = processedText.slice(jsonStart, jsonEnd + 1);
    }
    
    const parsed = JSON.parse(processedText);
    
    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: "Parsed JSON is not an object", rawText };
    }
    
    const analysisLanguage = typeof parsed.analysisLanguage === 'string' ? parsed.analysisLanguage : undefined;

    // 1. Extract Global Context Audit (Refiner: Global Plot & Directive Audit + Active Codex Scope)
    let globalContextAudit: RefinerGlobalContextAudit | undefined = undefined;
    if (typeof parsed.globalContextAudit === 'object' && parsed.globalContextAudit !== null) {
      const pG = parsed.globalContextAudit;
      const activeCodexScope: string[] = Array.isArray(pG.activeCodexScope)
        ? pG.activeCodexScope.map(String).filter(Boolean)
        : [];

      // Parse globalPlotAndDirectiveAudit (SSOT)
      let globalPlotAndDirectiveAudit: RefinerGlobalPlotAudit | undefined = undefined;
      if (typeof pG.globalPlotAndDirectiveAudit === 'object' && pG.globalPlotAndDirectiveAudit !== null) {
        globalPlotAndDirectiveAudit = {
          narrativeArcAndPacing: String(pG.globalPlotAndDirectiveAudit.narrativeArcAndPacing || ''),
          directiveFulfillmentStatus: String(pG.globalPlotAndDirectiveAudit.directiveFulfillmentStatus || ''),
          causalLogicAndProgression: String(pG.globalPlotAndDirectiveAudit.causalLogicAndProgression || '')
        };
      }

      // Parse plotDefectsIdentified (SSOT)
      const plotDefectsIdentified: RefinerSliceDefect[] = Array.isArray(pG.plotDefectsIdentified)
        ? pG.plotDefectsIdentified.map((d: any, dIdx: number) => ({
            ruleId: String(d.ruleId || `PLOT_RULE_${dIdx + 1}`),
            category: String(d.category || 'DIRECTIVE'),
            citedProse: String(d.citedProse || ''),
            issueDescription: String(d.issueDescription || ''),
            correctionDirective: String(d.correctionDirective || '')
          }))
        : [];

      // Legacy globalDefects fallback
      const globalDefects = Array.isArray(pG.globalDefects)
        ? pG.globalDefects.map((gd: any, gdIdx: number) => ({
            ruleId: String(gd.ruleId || `GLOBAL_RULE_${gdIdx + 1}`),
            category: String(gd.category || 'DIRECTIVE_OMISSION'),
            issue: String(gd.issue || ''),
            correctionDirective: String(gd.correctionDirective || '')
          }))
        : undefined;

      globalContextAudit = {
        activeDirectivesSummary: String(pG.activeDirectivesSummary || pG.activeDirectives || ''),
        activeCodexScope,
        globalPlotAndDirectiveAudit,
        plotDefectsIdentified: plotDefectsIdentified.length > 0 ? plotDefectsIdentified : undefined,
        globalFulfillmentAssessment: String(pG.globalFulfillmentAssessment || pG.overallNarrativeGoal || ''),
        // Backward compatibility
        relevantCodexCandidates: pG.relevantCodexCandidates,
        globalDefects: globalDefects as any
      };
    }

    // 2. Extract Sequential Slices (4-Tier Micro-Continuity & Backward Compatibility)
    const slices: RefinerSliceItem[] = Array.isArray(parsed.slices)
      ? parsed.slices.map((s: any, idx: number) => {
          // Normalize stageAudits (4-Tier Micro Continuity with legacy fallback)
          const rawStage = s.stageAudits || {};
          const stage1_PhysicalAndSituational = String(
            rawStage.stage1_PhysicalAndSituational ||
            rawStage.stage2_PhysicalAndSituational ||
            rawStage.stage1_Physical ||
            s.physicalLogicAudit?.spatialAndActorContinuity ||
            ''
          );
          const stage2_LoreCanonAndVoice = String(
            rawStage.stage2_LoreCanonAndVoice ||
            rawStage.stage2_LoreAndCharacter ||
            rawStage.stage3_LoreAndCharacter ||
            ''
          );
          const stage3_EpistemicBoundaryAndPOV = String(
            rawStage.stage3_EpistemicBoundaryAndPOV ||
            (rawStage.stage2_LoreAndCharacter ? '기존 3-Tier 로어/인물 감사 항목에 포함됨' : '') ||
            ''
          );
          const stage4_NativeLinguisticAndStyle = String(
            rawStage.stage4_NativeLinguisticAndStyle ||
            rawStage.stage3_NativeLinguisticAndStyle ||
            rawStage.stage4_Linguistic ||
            s.stylisticAudit?.macroFlowEvaluation?.rhythmAndPacing ||
            ''
          );

          const stageAudits: RefinerSliceStageAudits = {
            stage1_PhysicalAndSituational,
            stage2_LoreCanonAndVoice,
            stage3_EpistemicBoundaryAndPOV,
            stage4_NativeLinguisticAndStyle,
            // Preserve legacy keys for backward compatibility
            stage2_LoreAndCharacter: rawStage.stage2_LoreAndCharacter || stage2_LoreCanonAndVoice,
            stage3_NativeLinguisticAndStyle: rawStage.stage3_NativeLinguisticAndStyle || stage4_NativeLinguisticAndStyle,
            stage1_DirectiveAndPlot: rawStage.stage1_DirectiveAndPlot,
            stage2_Directive: rawStage.stage2_Directive,
            stage1_Physical: rawStage.stage1_Physical,
            stage2_PhysicalAndSituational: rawStage.stage2_PhysicalAndSituational,
            stage3_LoreAndCharacter: rawStage.stage3_LoreAndCharacter,
            stage4_Linguistic: rawStage.stage4_Linguistic
          };

          // Extract newDefectsIdentified (Defects specific to this slice)
          const newDefectsIdentified: RefinerSliceDefect[] = Array.isArray(s.newDefectsIdentified)
            ? s.newDefectsIdentified.map((def: any, defIdx: number) => ({
                ruleId: String(def.ruleId || `RULE_${idx + 1}_${defIdx + 1}`),
                category: String(def.category || 'PHYSICAL'),
                citedProse: String(def.citedProse || ''),
                issueDescription: String(def.issueDescription || ''),
                correctionDirective: String(def.correctionDirective || '')
              }))
            : [];

          // Synthesize defects from legacy stylisticDefects or incidentAudits if newDefectsIdentified is empty
          if (newDefectsIdentified.length === 0) {
            if (Array.isArray(s.incidentAudits)) {
              for (const inc of s.incidentAudits) {
                if (inc.verdict === 'FAIL') {
                  newDefectsIdentified.push({
                    ruleId: String(inc.incidentId || `RULE_${idx + 1}`),
                    category: 'LORE',
                    citedProse: Array.isArray(inc.citedPassages) ? inc.citedPassages.join(' / ') : String(inc.citedPassages || ''),
                    issueDescription: String(inc.causalAnalysis || inc.observedAnomaly || ''),
                    correctionDirective: String(inc.correctionDirective || '')
                  });
                }
              }
            }
            if (Array.isArray(s.stylisticAudit?.stylisticDefects)) {
              for (const def of s.stylisticAudit.stylisticDefects) {
                newDefectsIdentified.push({
                  ruleId: `STYLE_${idx + 1}`,
                  category: 'LINGUISTIC',
                  citedProse: String(def.targetPassage || ''),
                  issueDescription: String(def.critique || ''),
                  correctionDirective: String(def.polishSuggestion || '')
                });
              }
            }
          }

          const sliceItem: RefinerSliceItem = {
            sliceIndex: typeof s.sliceIndex === 'number' ? s.sliceIndex : idx + 1,
            textExcerpt: String(s.textExcerpt || ''),
            flaggedProseQuotes: Array.isArray(s.flaggedProseQuotes) ? s.flaggedProseQuotes.map(String) : undefined,
            inheritedFixesApplied: Array.isArray(s.inheritedFixesApplied) ? s.inheritedFixesApplied.map(String) : [],
            stageAudits,
            newDefectsIdentified
          };

          // Attach legacy properties dynamically for UI backward compatibility
          if (s.factCensus) (sliceItem as any).factCensus = s.factCensus;
          if (s.holisticStateSummary) (sliceItem as any).holisticStateSummary = s.holisticStateSummary;
          if (s.physicalLogicAudit) (sliceItem as any).physicalLogicAudit = s.physicalLogicAudit;
          if (s.incidentAudits) (sliceItem as any).incidentAudits = s.incidentAudits;
          if (s.stylisticAudit) (sliceItem as any).stylisticAudit = s.stylisticAudit;

          return sliceItem;
        })
      : [];

    let physicalLogicAnalysis = typeof parsed.physicalLogicAnalysis === 'string' ? parsed.physicalLogicAnalysis : '';
    let plotAndDirectiveAnalysis = typeof parsed.plotAndDirectiveAnalysis === 'string' ? parsed.plotAndDirectiveAnalysis : '';

    // Synthesize physical analysis from slices if not explicitly provided at root
    if (!physicalLogicAnalysis && slices.length > 0) {
      physicalLogicAnalysis = slices
        .map(s => s.stageAudits?.stage1_PhysicalAndSituational ? `[Slice ${s.sliceIndex} 물리/공간]\n${s.stageAudits.stage1_PhysicalAndSituational}` : '')
        .filter(Boolean)
        .join('\n\n');
    }

    // Synthesize directive & plot analysis from globalPlotAndDirectiveAudit (SSOT)
    if (!plotAndDirectiveAnalysis && globalContextAudit) {
      const parts = [
        globalContextAudit.activeDirectivesSummary ? `[지시/목표 요약]: ${globalContextAudit.activeDirectivesSummary}` : '',
        globalContextAudit.globalPlotAndDirectiveAudit?.directiveFulfillmentStatus
          ? `[지시 이행도]: ${globalContextAudit.globalPlotAndDirectiveAudit.directiveFulfillmentStatus}`
          : (globalContextAudit.globalFulfillmentAssessment ? `[전역 이행도]: ${globalContextAudit.globalFulfillmentAssessment}` : ''),
        globalContextAudit.globalPlotAndDirectiveAudit?.narrativeArcAndPacing
          ? `[서사 호흡 및 템포]: ${globalContextAudit.globalPlotAndDirectiveAudit.narrativeArcAndPacing}`
          : '',
        globalContextAudit.globalPlotAndDirectiveAudit?.causalLogicAndProgression
          ? `[인과 논리 및 전개]: ${globalContextAudit.globalPlotAndDirectiveAudit.causalLogicAndProgression}`
          : '',
        globalContextAudit.plotDefectsIdentified && globalContextAudit.plotDefectsIdentified.length > 0
          ? `[전역 플롯 결함]:\n` + globalContextAudit.plotDefectsIdentified.map(d => `- (${d.ruleId}) [${d.category}] "${d.citedProse}" => ${d.issueDescription} (지침: ${d.correctionDirective})`).join('\n')
          : ''
      ].filter(Boolean);
      plotAndDirectiveAnalysis = parts.join('\n\n');
    }

    // Extract per-lore / worldbuilding deep audits (Synthesized from stage2_LoreAndCharacter if missing)
    let loreAudits: LoreAuditItem[] = Array.isArray(parsed.loreAudits)
      ? parsed.loreAudits.map((item: any) => ({
          loreName: String(item.loreName || 'Unknown Lore'),
          citedProse: item.citedProse ? String(item.citedProse) : undefined,
          codexRule: String(item.codexRule || ''),
          complianceAudit: String(item.complianceAudit || ''),
          verdict: String(item.verdict || 'PASS')
        }))
      : [];

    if (loreAudits.length === 0 && slices.length > 0) {
      loreAudits = slices
        .filter(s => s.stageAudits?.stage2_LoreAndCharacter)
        .map(s => {
          const defects = s.newDefectsIdentified.filter(d => d.category === 'LORE' || d.category === 'CHARACTER_SPEECH');
          const isFail = defects.length > 0;
          return {
            loreName: `Slice ${s.sliceIndex} 로어/인물 정합성`,
            citedProse: defects.map(d => d.citedProse).filter(Boolean).join(' / ') || undefined,
            codexRule: '시스템 활성 코덱스 기준',
            complianceAudit: s.stageAudits.stage2_LoreAndCharacter + (isFail ? `\n[결함 지침]: ${defects.map(d => d.correctionDirective).join('; ')}` : ''),
            verdict: isFail ? 'LORE_CONTRADICTION' : 'PASS'
          };
        });
    }

    let loreSystemAnalysis = typeof parsed.loreSystemAnalysis === 'string' ? parsed.loreSystemAnalysis : '';
    if (!loreSystemAnalysis && loreAudits.length > 0) {
      loreSystemAnalysis = loreAudits.map(la => 
        `[${la.loreName}] (${la.verdict})\n- 기준 원문: ${la.codexRule}\n- 인과 추론: ${la.complianceAudit}`
      ).join('\n\n');
    }

    // Extract per-character deep audits
    let characterAudits: CharacterAuditItem[] = Array.isArray(parsed.characterAudits)
      ? parsed.characterAudits.map((item: any) => ({
          characterName: String(item.characterName || 'Unknown'),
          actionsAndDialogue: item.actionsAndDialogue ? String(item.actionsAndDialogue) : undefined,
          epistemicAudit: String(item.epistemicAudit || ''),
          personalityAndValuesAudit: item.personalityAndValuesAudit ? String(item.personalityAndValuesAudit) : undefined,
          speechAndToneAudit: item.speechAndToneAudit ? String(item.speechAndToneAudit) : undefined,
          authenticityAudit: String(item.authenticityAudit || item.personalityAndValuesAudit || item.speechAndToneAudit || ''),
          verdict: String(item.verdict || 'PASS')
        }))
      : [];

    let characterDynamicsAnalysis = typeof parsed.characterDynamicsAnalysis === 'string' ? parsed.characterDynamicsAnalysis : '';

    // Extract linguistic analysis from 3-Tier stage3_NativeLinguisticAndStyle
    let linguisticAnalysis = typeof parsed.linguisticAnalysis === 'string' ? parsed.linguisticAnalysis : '';
    if (!linguisticAnalysis && slices.length > 0) {
      linguisticAnalysis = slices.map(s => {
        const styleDefects = s.newDefectsIdentified.filter(d => d.category === 'LINGUISTIC');
        const parts = [
          `[Slice ${s.sliceIndex} 한국어 문체/윤문]`,
          s.stageAudits?.stage3_NativeLinguisticAndStyle ? `- 문체 진단: ${s.stageAudits.stage3_NativeLinguisticAndStyle}` : '',
          styleDefects.length > 0
            ? `- 결함 목록:\n` + styleDefects.map(d => `  * [${d.ruleId}] "${d.citedProse}" => ${d.issueDescription} (대안: "${d.correctionDirective}")`).join('\n')
            : ''
        ].filter(Boolean);
        return parts.join('\n');
      }).filter(Boolean).join('\n\n');
    }

    const conflicts = Array.isArray(parsed.conflicts) ? parsed.conflicts.map(String) : [];

    // Comprehensive hasConflicts determination:
    let hasConflicts = Boolean(parsed.hasConflicts);
    if (conflicts.length > 0) {
      hasConflicts = true;
    }
    if (globalContextAudit?.plotDefectsIdentified && globalContextAudit.plotDefectsIdentified.length > 0) {
      hasConflicts = true;
    }
    if (slices.some(s => s.newDefectsIdentified.length > 0)) {
      hasConflicts = true;
    }
    if (characterAudits.some(ca => ca.verdict && ca.verdict !== 'PASS')) {
      hasConflicts = true;
    }
    if (loreAudits.some(la => la.verdict && la.verdict !== 'PASS')) {
      hasConflicts = true;
    }

    // Backward compatibility: If legacy narrativeAnalysis is passed or construct synthetic combined narrativeAnalysis
    let narrativeAnalysis = typeof parsed.narrativeAnalysis === 'string' ? parsed.narrativeAnalysis : '';
    if (!narrativeAnalysis) {
      const parts = [
        plotAndDirectiveAnalysis ? `[전역 지시 및 플롯]\n${plotAndDirectiveAnalysis}` : '',
        physicalLogicAnalysis ? `[물리 및 공간 논리]\n${physicalLogicAnalysis}` : '',
        loreSystemAnalysis ? `[설정 및 인물 사건]\n${loreSystemAnalysis}` : '',
        linguisticAnalysis ? `[원어민 문체 및 윤문]\n${linguisticAnalysis}` : ''
      ].filter(Boolean);
      narrativeAnalysis = parts.join('\n\n');
    }
    
    let refinedText = "";
    if (typeof parsed.refinedText === 'string') {
      refinedText = parsed.refinedText;
      
      if (hasConflicts && rawDraft !== undefined) {
        const leadingWhitespaceMatch = rawDraft.match(/^\s*/);
        const originalLeadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : "";
        refinedText = originalLeadingWhitespace + refinedText.trimStart();
      }
    } else if (hasConflicts && rawDraft !== undefined) {
      // Fallback
      refinedText = rawDraft;
    }

    // Extract change log if provided
    const changeLog: RefinerChangeLogItem[] = Array.isArray(parsed.changeLog)
      ? parsed.changeLog.map((item: any) => ({
          before: String(item.before || ''),
          after: String(item.after || ''),
          vector: (item.vector ? String(item.vector) : 'LINGUISTIC') as RefinerChangeVector
        }))
      : [];
    
    return {
      success: true,
      data: {
        analysisLanguage,
        globalContextAudit,
        slices: slices.length > 0 ? slices : undefined,
        physicalLogicAnalysis,
        loreSystemAnalysis,
        loreAudits: loreAudits.length > 0 ? loreAudits : undefined,
        characterDynamicsAnalysis,
        characterAudits: characterAudits.length > 0 ? characterAudits : undefined,
        plotAndDirectiveAnalysis,
        linguisticAnalysis,
        narrativeAnalysis,
        hasConflicts,
        conflicts,
        refinedText,
        changeLog: changeLog.length > 0 ? changeLog : undefined,
        rawResponseText: text
      }
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[extractConsistencyResponse] Failed to parse JSON critique:", errMsg, "Raw text:", text);
    return {
      success: false,
      error: errMsg,
      rawText
    };
  }
}

export interface ConsistencyPipelineResult {
  finalText: string;
  fallbackOccurred: boolean;
  stage2Error?: string;
  stage2Output?: string;
  stage2RefinedText?: string;
  analysisLanguage?: string;
  globalContextAudit?: RefinerGlobalContextAudit;
  slices?: RefinerSliceItem[];
  physicalLogicAnalysis?: string;
  loreSystemAnalysis?: string;
  loreAudits?: LoreAuditItem[];
  characterDynamicsAnalysis?: string;
  characterAudits?: CharacterAuditItem[];
  plotAndDirectiveAnalysis?: string;
  linguisticAnalysis?: string;
  structuredLinguisticAnalysis?: LinguisticAnalysisStructured;
  informationOrderAudit?: InformationOrderAudit;
  narrativeAnalysis?: string;
  conflicts?: string[];
  changeLog?: RefinerChangeLogItem[];
  multiAgentAudits?: MultiAgentAuditReports;
  rawDraft?: string;
}

/**
 * 감사관 보고서에서 혹시 모를 마크다운 헤더(#, ##, ### 등)를 안전하게 정규화하여
 * Stage 3 최종 탈고 프롬프트의 상위 구조 교란을 원천 방어합니다.
 */
export function sanitizeAuditReport(report: string): string {
  if (!report) return "";
  return report
    .split('\n')
    .map(line => {
      const headerMatch = line.match(/^#{1,6}\s*(.+)$/);
      if (headerMatch) {
        return `**[${headerMatch[1].replace(/[[\]]/g, '').trim()}]**`;
      }
      return line;
    })
    .join('\n');
}

/**
 * Executes a single auditor agent call with the configured Auditor Model and In-Context Persona Priming.
 */
async function executeAuditorAgent(
  agentName: string,
  systemPrompt: string,
  userContent: string,
  auditorSettings: {
    model: 'gemini' | 'openrouter';
    modelName: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    topK: number;
    thinkingLevel?: any;
  },
  openRouterKey: string | null,
  personaPrimingMessages: any[] = []
): Promise<string> {
  const isDirectGemini = auditorSettings.model === 'gemini';
  const payload = {
    system: systemPrompt,
    messages: [
      ...personaPrimingMessages,
      { role: 'user' as const, content: userContent }
    ],
    modelName: auditorSettings.modelName || 'gemini-3.8-flash',
    responseFormat: 'text' as const,
    config: {
      temperature: auditorSettings.temperature ?? 0.3,
      maxTokens: auditorSettings.maxTokens ?? 8000,
      topP: auditorSettings.topP ?? 0.95,
      topK: auditorSettings.topK ?? 40,
      thinkingLevel: auditorSettings.thinkingLevel ?? 'MEDIUM'
    }
  };

  if (isDirectGemini) {
    return await generateGeminiContent({ ...payload, ...payload.config });
  } else {
    if (!openRouterKey) throw new Error(`OpenRouter API Key is required for ${agentName}`);
    return await generateOpenRouterContent({ ...payload, ...payload.config }, openRouterKey);
  }
}

/**
 * The Multi-Agent Consistency & Refinement Pipeline.
 * 
 * Stage 1: Drafting - Generates the raw draft using the Primary Model.
 * Stage 2: Parallel Deep Audit - 4 specialized agents review the draft simultaneously via Promise.allSettled using the Auditor Model:
 *   - Agent 1: Plot & Directives (Macro Narrative, Directing Fulfillment, Pacing)
 *   - Agent 2: Physical & Spatiotemporal Continuity (3D Coordinates, Grasp, Inventory, Fatigue)
 *   - Agent 3: Lore & Epistemic Boundary (Codex, Telepathy / Provenance Tracking)
 *   - Agent 4: Korean Stylistic Aesthetics (Translationese, Tagging, Rhythm, Sensory Order)
 * Stage 3: Synthesis & Final Refinement - Pure Master Novelist writes the final prose using the Primary Model.
 * 
 * @param novel The current novel document.
 * @param preGenerationContent The fresh HTML content from the editor before generation.
 * @param openRouterKey The API key for OpenRouter if applicable.
 */
export async function runConsistencyPipeline(
  novel: Novel,
  preGenerationContent: string,
  openRouterKey: string | null,
  onStage1Context: (context: any) => void,
  onStage2Context: (context: any) => void
): Promise<ConsistencyPipelineResult | null> {
  const isPrimaryDirectGemini = novel.settings.model === 'gemini';

  // Extract Anchor Text for mechanical continuation stitching
  const contextWindow = novel.settings.contextWindow || GLOBAL_DEFAULTS.contextWindow;
  const continuationLength = novel.settings.continuationLength || GLOBAL_DEFAULTS.continuationLength;
  const novelContextVars = processNovelContext(preGenerationContent, contextWindow, continuationLength);
  const anchorText = novelContextVars.anchorTailText.slice(-150);

  // Build unified SSOT variables for absolute consistency across Drafting, Auditing, and Synthesis
  const totalVariables = buildTotalVariableDictionary(novel, { overrideContent: preGenerationContent }, { preserveLoreComments: false });

  // ----------------------------------------------------
  // Stage 1: Drafting (Generate raw draft via Primary Model)
  // ----------------------------------------------------
  const novelContext = generateTaskContext('novel', novel, { overrideContent: preGenerationContent });
  onStage1Context(novelContext);
  
  let rawDraft = "";
  if (isPrimaryDirectGemini) {
    rawDraft = await generateGeminiContent({ ...novelContext, ...novelContext.config });
  } else {
    if (!openRouterKey) throw new Error("OpenRouter API Key is required.");
    rawDraft = await generateOpenRouterContent({ ...novelContext, ...novelContext.config }, openRouterKey);
  }

  if (!rawDraft) {
    return null;
  }

  // Pre-trim the anchor echoed by the model BEFORE feeding it to Stage 2
  const trimmedDraft = stitchAndTrimAnchor(novelContextVars.anchorTailText, rawDraft);

  // Pre-slice rawDraft at user-configured maxTokens
  const targetTokens = novel.settings.maxTokens || 500;
  const { slicedText: scopedDraft } = sliceProseByTokens(trimmedDraft, targetTokens);

  // ----------------------------------------------------
  // Stage 2: 4-Agent Parallel Deep Audit (Auditor Model via Promise.allSettled)
  // ----------------------------------------------------
  const auditorConfig = {
    model: novel.settings.auditor?.model || GLOBAL_DEFAULTS.auditor.model,
    modelName: novel.settings.auditor?.modelName || GLOBAL_DEFAULTS.auditor.modelName,
    temperature: novel.settings.auditor?.temperature ?? GLOBAL_DEFAULTS.auditor.temperature,
    maxTokens: novel.settings.auditor?.maxTokens ?? GLOBAL_DEFAULTS.auditor.maxTokens,
    topP: novel.settings.auditor?.topP ?? GLOBAL_DEFAULTS.auditor.topP,
    topK: novel.settings.auditor?.topK ?? GLOBAL_DEFAULTS.auditor.topK,
    thinkingLevel: novel.settings.auditor?.thinkingLevel ?? GLOBAL_DEFAULTS.auditor.thinkingLevel
  };

  // Extract entities from scopedDraft + tail context to ensure Auditors inspect against past archive facts
  const draftEntities = extractMentionedEntities(scopedDraft, novel.loreEntries || []);
  const novelTailScanText = (novelContextVars.anchorTailText || "") + '\n' + (novel.plot || '');
  const tailEntities = extractMentionedEntities(novelTailScanText, novel.loreEntries || []);
  const allAuditorEntities = Array.from(new Set([...tailEntities, ...draftEntities]));
  const auditorCards = searchRelevantMemoryCards(novel.memoryCards || [], allAuditorEntities, 20);
  const auditorArchiveCardsBlock = auditorCards.length > 0
    ? `## [관련 보관소 과거 사실 (검수 기준표: 과거 사실 및 설정 충돌 대조용)]\n${formatArchiveCardsForPrompt(auditorCards)}\n`
    : "";

  const auditorVariables = {
    ...totalVariables,
    RELEVANT_ARCHIVE_CARDS_NOVEL_BLOCK: auditorArchiveCardsBlock || totalVariables.RELEVANT_ARCHIVE_CARDS_NOVEL_BLOCK
  };

  // 100% Harmonized Standard Narrative Context for all 4 Auditors (SSOT)
  // CRITICAL: Auditors MUST NOT receive anchor repetition instructions to prevent prose output corruption
  const auditorSharedContent = formatAuditorPrompt(auditorVariables, scopedDraft);

  // Helper to compose SSOT Auditor System Prompt (Scope Protocol + Domain Specific Rules)
  const buildAuditorSystem = (domainPrompt: string) => {
    if (domainPrompt.includes('{{AUDITOR_SCOPE_PROTOCOL}}')) {
      return domainPrompt.replace('{{AUDITOR_SCOPE_PROTOCOL}}', GLOBAL_DEFAULTS.auditorScopeProtocolPrompt);
    }
    return [GLOBAL_DEFAULTS.auditorScopeProtocolPrompt, domainPrompt].filter(Boolean).join('\n\n');
  };

  // In-Context Persona Priming for all 4 Auditor Agents (SSOT)
  const personaPriming = getPersonaPrimingMessages(novel.settings);

  // Notify UI of Stage 2 Context (Synthesized inspector view)
  onStage2Context({
    type: 'consistency',
    modelName: auditorConfig.modelName,
    config: auditorConfig,
    system: GLOBAL_DEFAULTS.critiqueSynthesisPrompt,
    messages: [
      ...personaPriming,
      { role: 'user', content: auditorSharedContent }
    ]
  });

  // Run 4 Auditor Agents concurrently with Promise.allSettled for maximum resilience
  const [plotSettled, physicalSettled, loreSettled, stylisticSettled] = await Promise.allSettled([
    executeAuditorAgent('PlotAuditor', buildAuditorSystem(GLOBAL_DEFAULTS.critiquePlotPrompt), auditorSharedContent, auditorConfig, openRouterKey, personaPriming),
    executeAuditorAgent('PhysicalAuditor', buildAuditorSystem(GLOBAL_DEFAULTS.critiquePhysicalPrompt), auditorSharedContent, auditorConfig, openRouterKey, personaPriming),
    executeAuditorAgent('LoreAuditor', buildAuditorSystem(GLOBAL_DEFAULTS.critiqueLoreEpistemicPrompt), auditorSharedContent, auditorConfig, openRouterKey, personaPriming),
    executeAuditorAgent('StylisticAuditor', buildAuditorSystem(GLOBAL_DEFAULTS.critiqueStylisticPrompt), auditorSharedContent, auditorConfig, openRouterKey, personaPriming)
  ]);

  const failedAudits: string[] = [];
  const plotAudit = plotSettled.status === 'fulfilled' ? plotSettled.value : (() => {
    failedAudits.push(`PlotAuditor: ${plotSettled.reason}`);
    return "[PlotAuditor: 일시적 응답 지연으로 폴백 적용]";
  })();

  const physicalAudit = physicalSettled.status === 'fulfilled' ? physicalSettled.value : (() => {
    failedAudits.push(`PhysicalAuditor: ${physicalSettled.reason}`);
    return "[PhysicalAuditor: 일시적 응답 지연으로 폴백 적용]";
  })();

  const loreAudit = loreSettled.status === 'fulfilled' ? loreSettled.value : (() => {
    failedAudits.push(`LoreAuditor: ${loreSettled.reason}`);
    return "[LoreAuditor: 일시적 응답 지연으로 폴백 적용]";
  })();

  const stylisticAudit = stylisticSettled.status === 'fulfilled' ? stylisticSettled.value : (() => {
    failedAudits.push(`StylisticAuditor: ${stylisticSettled.reason}`);
    return "[StylisticAuditor: 일시적 응답 지연으로 폴백 적용]";
  })();

  const multiAgentAudits: MultiAgentAuditReports = {
    plotAudit,
    physicalAudit,
    loreAudit,
    stylisticAudit,
    failedAudits: failedAudits.length > 0 ? failedAudits : undefined
  };

  const stage2Audits = {
    plot: {
      name: 'Agent 1: 플롯 & 인과 감사관',
      system: buildAuditorSystem(GLOBAL_DEFAULTS.critiquePlotPrompt),
      user: auditorSharedContent,
      messages: [...personaPriming, { role: 'user', content: auditorSharedContent }],
      output: plotAudit,
      modelName: auditorConfig.modelName
    },
    physical: {
      name: 'Agent 2: 물리 & 시공간 감사관',
      system: buildAuditorSystem(GLOBAL_DEFAULTS.critiquePhysicalPrompt),
      user: auditorSharedContent,
      messages: [...personaPriming, { role: 'user', content: auditorSharedContent }],
      output: physicalAudit,
      modelName: auditorConfig.modelName
    },
    lore: {
      name: 'Agent 3: 세계관 & 지식경계 감사관',
      system: buildAuditorSystem(GLOBAL_DEFAULTS.critiqueLoreEpistemicPrompt),
      user: auditorSharedContent,
      messages: [...personaPriming, { role: 'user', content: auditorSharedContent }],
      output: loreAudit,
      modelName: auditorConfig.modelName
    },
    stylistic: {
      name: 'Agent 4: 한국어 문체 감사관',
      system: buildAuditorSystem(GLOBAL_DEFAULTS.critiqueStylisticPrompt),
      user: auditorSharedContent,
      messages: [...personaPriming, { role: 'user', content: auditorSharedContent }],
      output: stylisticAudit,
      modelName: auditorConfig.modelName
    }
  };

  // If all 4 auditors completely failed, safely return the scopedDraft
  if (failedAudits.length === 4) {
    console.warn("[runConsistencyPipeline] All 4 auditor agents failed. Returning scopedDraft.", failedAudits);
    return {
      finalText: scopedDraft,
      rawDraft: scopedDraft,
      fallbackOccurred: true,
      stage2Error: `All 4 auditor agents failed: ${failedAudits.join('; ')}`,
      stage2Output: `[검증 실패 (All Auditors Failed)]\n${failedAudits.join('\n')}`,
      multiAgentAudits
    };
  }

  // ----------------------------------------------------
  // Stage 3: Synthesis & Final Refinement (Primary Model as Master Novelist)
  // ----------------------------------------------------
  // Sanitize audit reports to prevent any rogue # headers from leaking into Stage 3 prompt
  const sanitizedPlot = sanitizeAuditReport(plotAudit);
  const sanitizedPhysical = sanitizeAuditReport(physicalAudit);
  const sanitizedLore = sanitizeAuditReport(loreAudit);
  const sanitizedStylistic = sanitizeAuditReport(stylisticAudit);

  // Single Source of Truth Synthesis Prompt Formatting with 4 Specialist Restoration Reports
  const auditReports = {
    plotReport: sanitizedPlot,
    physicalReport: sanitizedPhysical,
    loreReport: sanitizedLore,
    stylisticReport: sanitizedStylistic
  };

  // Single Source of Truth System Instruction & Messages: Ingests consistency_critique_context.md
  // which unifies Master Novelist Persona + [1. Core Directives] + [2. Master Synthesis Directives] + Persona Priming (SSOT)
  const taskContext = generateTaskContext('consistency', novel, { 
    overrideContent: preGenerationContent,
    rawDraft: scopedDraft,
    auditReports
  });
  const synthesisSystemPrompt = taskContext.system;

  const synthesisPayload = {
    system: synthesisSystemPrompt,
    messages: taskContext.messages,
    modelName: novel.settings.modelName || GLOBAL_DEFAULTS.modelName,
    responseFormat: 'text' as const,
    config: {
      temperature: novel.settings.temperature ?? GLOBAL_DEFAULTS.temperature,
      maxTokens: 30000,
      topP: novel.settings.topP ?? GLOBAL_DEFAULTS.topP,
      topK: novel.settings.topK ?? GLOBAL_DEFAULTS.topK,
      repetitionPenalty: novel.settings.repetitionPenalty ?? 1.0,
      thinkingLevel: novel.settings.thinkingLevel ?? GLOBAL_DEFAULTS.thinkingLevel
    }
  };

  // Pass Stage 3 synthesis context and Stage 2 multi-agent audits to Prompt Inspector
  onStage2Context({
    type: 'consistency',
    system: synthesisPayload.system,
    messages: synthesisPayload.messages,
    modelName: synthesisPayload.modelName,
    responseFormat: synthesisPayload.responseFormat,
    config: synthesisPayload.config,
    anchorTailText: totalVariables.ANCHOR_TAIL_TEXT,
    multiAgentAudits,
    stage2Audits
  });

  let refinedText = "";
  try {
    if (isPrimaryDirectGemini) {
      refinedText = await generateGeminiContent({ ...synthesisPayload, ...synthesisPayload.config });
    } else {
      if (!openRouterKey) throw new Error("OpenRouter API Key is required for Synthesis.");
      refinedText = await generateOpenRouterContent({ ...synthesisPayload, ...synthesisPayload.config }, openRouterKey);
    }
  } catch (synthErr) {
    const errMsg = synthErr instanceof Error ? synthErr.message : String(synthErr);
    console.error("[runConsistencyPipeline] Stage 3 synthesis failed:", errMsg);
    return {
      finalText: scopedDraft,
      rawDraft: scopedDraft,
      fallbackOccurred: true,
      stage2Error: `Stage 3 synthesis failed: ${errMsg}`,
      stage2Output: `[탈고 모델 실패 (Synthesis Failed)]\n${errMsg}`,
      plotAndDirectiveAnalysis: plotAudit,
      physicalLogicAnalysis: physicalAudit,
      loreSystemAnalysis: loreAudit,
      linguisticAnalysis: stylisticAudit,
      multiAgentAudits
    };
  }

  // Strip accidental markdown block quotes if any
  refinedText = refinedText.trim();
  if (refinedText.startsWith('```')) {
    refinedText = refinedText.replace(/^```(?:markdown|text)?\s*/, '').replace(/\s*```$/, '').trim();
  }

  // Pre-trim the anchor echoed by Stage 3 as well
  const trimmedRefined = stitchAndTrimAnchor(novelContextVars.anchorTailText, refinedText);

  // Corrupted / Empty validation check
  const isInvalidRefinedText = !trimmedRefined || trimmedRefined.length < scopedDraft.length * 0.4;
  if (isInvalidRefinedText) {
    console.warn("[runConsistencyPipeline] Refined text too short or empty, falling back to scopedDraft.", {
      rawLength: scopedDraft.length,
      refinedLength: trimmedRefined.length
    });
    return {
      finalText: scopedDraft,
      rawDraft: scopedDraft,
      fallbackOccurred: true,
      stage2Error: "Refined text too short or empty compared to raw draft.",
      stage2Output: trimmedRefined || refinedText || "(Empty Response)",
      stage2RefinedText: trimmedRefined || refinedText,
      plotAndDirectiveAnalysis: plotAudit,
      physicalLogicAnalysis: physicalAudit,
      loreSystemAnalysis: loreAudit,
      linguisticAnalysis: stylisticAudit,
      multiAgentAudits
    };
  }

  // Refiner 결과물은 초안의 사건 지평선(Event Horizon) 내에서 완결되었으므로,
  // 종결 문장/마침표를 보존하기 위해 사후 기계적 절단을 적용하지 않고 온전히 반환합니다.
  return {
    finalText: trimmedRefined,
    rawDraft: scopedDraft,
    fallbackOccurred: false,
    stage2Output: trimmedRefined,
    stage2RefinedText: trimmedRefined,
    plotAndDirectiveAnalysis: plotAudit,
    physicalLogicAnalysis: physicalAudit,
    loreSystemAnalysis: loreAudit,
    linguisticAnalysis: stylisticAudit,
    multiAgentAudits
  };
}
