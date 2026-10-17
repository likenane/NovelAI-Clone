import { Novel, LoreEntry, AITaskType } from '../types';
import { GLOBAL_DEFAULTS } from '../constants';
import autoCodexSystemPromptRaw from '../prompts/auto-codex-system.md?raw';
import novelTemplateRaw from '../contexts/novel-generation.md?raw';
import codexTemplateRaw from '../contexts/codex-generation.md?raw';
import memoryTemplateRaw from '../contexts/memory-generation.md?raw';
import autocodexTemplateRaw from '../contexts/autocodex-generation.md?raw';
import consistencyCritiqueTemplateRaw from '../contexts/consistency_critique_context.md?raw';
import plotTemplateRaw from '../contexts/plot-generation.md?raw';
import { buildAIContext } from './contextBuilder';
import { buildTotalVariableDictionary, buildTaskMessages, formatAuditorPrompt, assertContextWindowGuard, getPersonaPrimingMessages } from '../lib/contextProviders';
import { GenerationMessage } from './aiService';

export type { AITaskType };

export const TASK_CONFIG: Record<AITaskType, { preserveLoreComments: boolean }> = {
  novel: { preserveLoreComments: false },
  memory: { preserveLoreComments: false },
  codex: { preserveLoreComments: true },
  autocodex: { preserveLoreComments: true },
  consistency: { preserveLoreComments: false },
  plot: { preserveLoreComments: false },
  critique_plot: { preserveLoreComments: false },
  critique_physical: { preserveLoreComments: false },
  critique_lore: { preserveLoreComments: false },
  critique_stylistic: { preserveLoreComments: false },
  critique_synthesis: { preserveLoreComments: false },
};

export const generateTaskContext = (taskType: AITaskType, novel: Novel, extraData?: any) => {
  const taskConfig = TASK_CONFIG[taskType] || { preserveLoreComments: false };

  // 1. 모든 변수를 담은 거대한 사전 구축 (안정적인 번역기)
  const allVariables = buildTotalVariableDictionary(novel, extraData, {
    preserveLoreComments: taskConfig.preserveLoreComments
  });

  // 2. 태스크별 템플릿 선택
  const templates = {
    novel: novelTemplateRaw,
    codex: codexTemplateRaw,
    memory: memoryTemplateRaw,
    autocodex: autocodexTemplateRaw,
    consistency: consistencyCritiqueTemplateRaw,
    plot: plotTemplateRaw,
  };

  // 3. 빌드 (템플릿에 선언된 변수만 추출하여 주입됨)
  const payload = buildAIContext({
    templateRaw: templates[taskType],
    variables: allVariables
  });

  // 4. 모델 및 파라미터 설정 조립
  let modelName = novel.settings.modelName || GLOBAL_DEFAULTS.modelName;
  let config = {
    temperature: novel.settings.temperature ?? GLOBAL_DEFAULTS.temperature,
    maxTokens: novel.settings.maxTokens ?? GLOBAL_DEFAULTS.maxTokens,
    topP: novel.settings.topP ?? GLOBAL_DEFAULTS.topP,
    topK: novel.settings.topK ?? GLOBAL_DEFAULTS.topK,
    repetitionPenalty: novel.settings.repetitionPenalty ?? GLOBAL_DEFAULTS.repetitionPenalty,
    thinkingLevel: novel.settings.thinkingLevel ?? GLOBAL_DEFAULTS.thinkingLevel
  };

  if (taskType === 'memory') {
    const memoryWorkbenchSettings = extraData?.memoryWorkbenchSettings || {};
    modelName = memoryWorkbenchSettings.modelName || novel.settings.memory?.modelName || GLOBAL_DEFAULTS.memory.modelName;
    config = {
      temperature: memoryWorkbenchSettings.temperature ?? novel.settings.memory?.temperature ?? GLOBAL_DEFAULTS.memory.temperature,
      maxTokens: memoryWorkbenchSettings.maxTokens ?? novel.settings.memory?.maxTokens ?? GLOBAL_DEFAULTS.memory.maxTokens,
      topP: memoryWorkbenchSettings.topP ?? novel.settings.memory?.topP ?? GLOBAL_DEFAULTS.memory.topP,
      topK: memoryWorkbenchSettings.topK ?? novel.settings.memory?.topK ?? GLOBAL_DEFAULTS.memory.topK,
      repetitionPenalty: memoryWorkbenchSettings.repetitionPenalty ?? 1.0,
      thinkingLevel: memoryWorkbenchSettings.thinkingLevel ?? novel.settings.memory?.thinkingLevel ?? GLOBAL_DEFAULTS.memory.thinkingLevel
    };
  } else if (taskType === 'autocodex') {
    const autoCodexSettings = novel.settings.autoCodex || GLOBAL_DEFAULTS.autoCodex;
    modelName = autoCodexSettings.modelName || GLOBAL_DEFAULTS.autoCodex.modelName;
    config = {
      temperature: autoCodexSettings.temperature ?? GLOBAL_DEFAULTS.autoCodex.temperature,
      maxTokens: autoCodexSettings.maxTokens ?? GLOBAL_DEFAULTS.autoCodex.maxTokens,
      topP: (autoCodexSettings as any).topP ?? GLOBAL_DEFAULTS.autoCodex.topP,
      topK: (autoCodexSettings as any).topK ?? GLOBAL_DEFAULTS.autoCodex.topK,
      repetitionPenalty: (autoCodexSettings as any).repetitionPenalty ?? GLOBAL_DEFAULTS.autoCodex.repetitionPenalty,
      thinkingLevel: (autoCodexSettings as any).thinkingLevel ?? GLOBAL_DEFAULTS.autoCodex.thinkingLevel
    };
  } else if (taskType === 'codex') {
    const codexSettings = novel.settings.codex || GLOBAL_DEFAULTS.codex;
    modelName = codexSettings.modelName || GLOBAL_DEFAULTS.codex.modelName;
    config = {
      temperature: codexSettings.temperature ?? GLOBAL_DEFAULTS.codex.temperature,
      maxTokens: codexSettings.maxTokens ?? GLOBAL_DEFAULTS.codex.maxTokens,
      topP: codexSettings.topP ?? GLOBAL_DEFAULTS.codex.topP,
      topK: codexSettings.topK ?? GLOBAL_DEFAULTS.codex.topK,
      repetitionPenalty: (codexSettings as any).repetitionPenalty ?? 1.0,
      thinkingLevel: codexSettings.thinkingLevel ?? GLOBAL_DEFAULTS.codex.thinkingLevel
    };
  } else if (taskType === 'plot') {
    const plotSettings = extraData?.plotWorkbenchSettings || novel.settings.plot || GLOBAL_DEFAULTS.plot;
    modelName = plotSettings.modelName || GLOBAL_DEFAULTS.plot.modelName;
    config = {
      temperature: plotSettings.temperature ?? GLOBAL_DEFAULTS.plot.temperature,
      maxTokens: plotSettings.maxTokens ?? GLOBAL_DEFAULTS.plot.maxTokens,
      topP: plotSettings.topP ?? GLOBAL_DEFAULTS.plot.topP,
      topK: plotSettings.topK ?? GLOBAL_DEFAULTS.plot.topK,
      repetitionPenalty: 1.0,
      thinkingLevel: plotSettings.thinkingLevel ?? GLOBAL_DEFAULTS.plot.thinkingLevel
    };
  }

  // 5. Messages 조립 및 JSON 모드 설정 (SSOT 통합 엔진 사용)
  // Auto-Codex(목록 제안), Codex(개별 어시스턴트 적응형 CoT), Plot(3단계 플롯 JSON), Memory(5단계 CoT JSON)는 구조화된 JSON 모드를 사용하고,
  // 소설(novel) 및 MARS 일관성 리파이너(consistency)는 순수 텍스트(text) 모드를 사용합니다.
  const responseFormat: 'text' | 'json' = (taskType === 'autocodex' || taskType === 'codex' || taskType === 'plot' || taskType === 'memory') ? 'json' : 'text';
  const rawMessages = buildTaskMessages({
    taskType,
    variables: allVariables,
    novel,
    extraData
  });

  // 3차 심층 방어: Invariant Assertion Guard 적용
  const targetWindowLimit = (taskType === 'autocodex')
    ? (novel.settings.autoCodexContextWindow || GLOBAL_DEFAULTS.autoCodexContextWindow)
    : (novel.settings.contextWindow || GLOBAL_DEFAULTS.contextWindow);
  const messages = assertContextWindowGuard(rawMessages, targetWindowLimit);

  let stage2Audits: any = undefined;
  if (taskType === 'consistency') {
    const rawDraft = extraData?.rawDraft || "[Stage 1 초안(rawDraft) 자리표시자 - 실제 생성 실행 시 동적으로 주입됨]";
    const auditorSharedContent = formatAuditorPrompt(allVariables, rawDraft);
    const buildAuditorSystem = (domainPrompt: string) => {
      if (domainPrompt.includes('{{AUDITOR_SCOPE_PROTOCOL}}')) {
        return domainPrompt.replace('{{AUDITOR_SCOPE_PROTOCOL}}', GLOBAL_DEFAULTS.auditorScopeProtocolPrompt);
      }
      return [GLOBAL_DEFAULTS.auditorScopeProtocolPrompt, domainPrompt].filter(Boolean).join('\n\n');
    };
    const auditorModelName = novel.settings.auditor?.modelName || GLOBAL_DEFAULTS.auditor.modelName;
    const personaPriming = getPersonaPrimingMessages(novel.settings);

    stage2Audits = {
      plot: {
        name: 'Agent 1: 플롯 & 서사 인과 복원관',
        system: buildAuditorSystem(GLOBAL_DEFAULTS.critiquePlotPrompt),
        user: auditorSharedContent,
        messages: [...personaPriming, { role: 'user', content: auditorSharedContent }],
        output: "(라이브 드라이런 뷰: 실제 실행 시 서사 인과 복원관의 심층 분석 보고서가 여기에 실시간 표시됩니다)",
        modelName: auditorModelName
      },
      physical: {
        name: 'Agent 2: 물리 & 시공간 정합 복원관',
        system: buildAuditorSystem(GLOBAL_DEFAULTS.critiquePhysicalPrompt),
        user: auditorSharedContent,
        messages: [...personaPriming, { role: 'user', content: auditorSharedContent }],
        output: "(라이브 드라이런 뷰: 실제 실행 시 시공간 물리 정합 복원관의 심층 분석 보고서가 여기에 실시간 표시됩니다)",
        modelName: auditorModelName
      },
      lore: {
        name: 'Agent 3: 세계관 & 지식경계 복원관',
        system: buildAuditorSystem(GLOBAL_DEFAULTS.critiqueLoreEpistemicPrompt),
        user: auditorSharedContent,
        messages: [...personaPriming, { role: 'user', content: auditorSharedContent }],
        output: "(라이브 드라이런 뷰: 실제 실행 시 로어 수호 복원관의 심층 분석 보고서가 여기에 실시간 표시됩니다)",
        modelName: auditorModelName
      },
      stylistic: {
        name: 'Agent 4: 한국어 문체 & 미학 조율관',
        system: buildAuditorSystem(GLOBAL_DEFAULTS.critiqueStylisticPrompt),
        user: auditorSharedContent,
        messages: [...personaPriming, { role: 'user', content: auditorSharedContent }],
        output: "(라이브 드라이런 뷰: 실제 실행 시 한국어 문체 조율관의 심층 분석 보고서가 여기에 실시간 표시됩니다)",
        modelName: auditorModelName
      }
    };

    if (extraData?.auditReports) {
      if (extraData.auditReports.plotReport) stage2Audits.plot.output = extraData.auditReports.plotReport;
      if (extraData.auditReports.physicalReport) stage2Audits.physical.output = extraData.auditReports.physicalReport;
      if (extraData.auditReports.loreReport) stage2Audits.lore.output = extraData.auditReports.loreReport;
      if (extraData.auditReports.stylisticReport) stage2Audits.stylistic.output = extraData.auditReports.stylisticReport;
    }
  }

  // 6. 반환 결과 어셈블
  return {
    type: taskType,
    system: payload.system,
    messages,
    responseFormat,
    modelName,
    config,
    anchorTailText: allVariables.ANCHOR_TAIL_TEXT, // For deduplication in useAIEngine
    stage2Audits
  };
};

