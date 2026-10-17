import novelSystemPrompt from './prompts/novel_system.md?raw';
import codexSystemPrompt from './prompts/codex_system.md?raw';
import memorySystemPrompt from './prompts/memory_system.md?raw';
import plotSystemPrompt from './prompts/plot_system.md?raw';
import consistencySystemPrompt from './prompts/consistency_critique_system.md?raw';
import critiquePlotPrompt from './prompts/critique_plot_system.md?raw';
import critiquePhysicalPrompt from './prompts/critique_physical_system.md?raw';
import critiqueLoreEpistemicPrompt from './prompts/critique_lore_epistemic_system.md?raw';
import critiqueStylisticPrompt from './prompts/critique_stylistic_system.md?raw';
import critiqueSynthesisPrompt from './prompts/critique_synthesis_system.md?raw';
import auditorScopeProtocolPrompt from './prompts/auditor_scope_protocol.md?raw';
import { ThinkingLevel } from './types';

export interface ThinkingLevelMeta {
  value: ThinkingLevel;
  label: string;
  badge?: string;
  description: string;
}

export const ALL_THINKING_LEVELS: Record<ThinkingLevel, ThinkingLevelMeta> = {
  MINIMAL: {
    value: 'MINIMAL',
    label: 'Minimal',
    badge: 'Lite Only',
    description: '추론을 생략하여 지연 시간을 최소화합니다. (Lite 모델 전용)'
  },
  LOW: {
    value: 'LOW',
    label: 'Low',
    badge: 'Fast',
    description: '최소한의 가벼운 추론으로 비용과 응답 시간을 절약합니다.'
  },
  MEDIUM: {
    value: 'MEDIUM',
    label: 'Medium',
    badge: 'Balanced / Default',
    description: '복잡한 맥락 파악과 작문 논리성의 최적 균형을 제공합니다.'
  },
  HIGH: {
    value: 'HIGH',
    label: 'High',
    badge: 'Deep',
    description: '심층 추론 및 정밀한 지시문 이행을 수행합니다.'
  }
};

// 모델별 지원 레벨 매핑 테이블
export const SUPPORTED_THINKING_LEVELS_BY_MODEL: Record<string, ThinkingLevel[]> = {
  // Google Direct
  'gemini-3.8-flash': ['LOW', 'MEDIUM', 'HIGH'],
  'gemini-3.7-flash': ['LOW', 'HIGH'],
  'gemini-3.1-pro-preview': ['LOW', 'HIGH'],
  'gemini-3.5-flash-lite': ['MINIMAL', 'LOW', 'HIGH'],
  // OpenRouter (Gemini)
  'google/gemini-3.8-flash': ['LOW', 'MEDIUM', 'HIGH'],
  'google/gemini-3.7-flash': ['LOW', 'HIGH'],
  'google/gemini-3.1-pro-preview': ['LOW', 'HIGH'],
  'google/gemini-3.5-flash-lite': ['MINIMAL', 'LOW', 'HIGH'],
};

// 헬퍼 1: 모델에 지원되는 Thinking Level 배열 조회
export function getSupportedThinkingLevels(modelName?: string): ThinkingLevel[] {
  if (!modelName) return ['LOW', 'MEDIUM', 'HIGH'];
  return SUPPORTED_THINKING_LEVELS_BY_MODEL[modelName] || ['LOW', 'MEDIUM', 'HIGH'];
}

// 헬퍼 2: 모델별 권장 기본 Thinking Level 조회
export function getDefaultThinkingLevel(modelName?: string): ThinkingLevel {
  const norm = modelName?.replace('google/', '');
  if (norm === 'gemini-3.5-flash-lite') return 'MINIMAL';
  if (norm === 'gemini-3.8-flash') return 'MEDIUM';
  return 'LOW';
}

// 헬퍼 3: 유효성 검증 및 In-Flight Sanitization (단일 진실 공급원)
export function getValidThinkingLevel(level: string | undefined, modelName?: string): ThinkingLevel {
  const supported = getSupportedThinkingLevels(modelName);
  const upper = (level || '').toUpperCase() as ThinkingLevel;
  if (supported.includes(upper)) {
    return upper;
  }
  return getDefaultThinkingLevel(modelName);
}

export const AVAILABLE_MODELS = [
  // Google Direct
  { id: 'gemini-3.8-flash', label: 'gemini-3.8-flash (Default)', provider: 'gemini' },
  { id: 'gemini-3.7-flash', label: 'gemini-3.7-flash', provider: 'gemini' },
  { id: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview', provider: 'gemini' },
  { id: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite', provider: 'gemini' },
  // OpenRouter (Pure Gemini only)
  { id: 'google/gemini-3.8-flash', label: 'google/gemini-3.8-flash', provider: 'openrouter' },
  { id: 'google/gemini-3.7-flash', label: 'google/gemini-3.7-flash', provider: 'openrouter' },
  { id: 'google/gemini-3.1-pro-preview', label: 'google/gemini-3.1-pro-preview', provider: 'openrouter' },
  { id: 'google/gemini-3.5-flash-lite', label: 'google/gemini-3.5-flash-lite', provider: 'openrouter' }
] as const;

/**
 * 특정 Provider에 유효한 모델 ID로 변환합니다.
 */
export function sanitizeModelForProvider(modelName: string | undefined, targetProvider: 'gemini' | 'openrouter'): string {
  const raw = (modelName || 'gemini-3.8-flash').replace(/^google\//, '').replace(/^x-ai\/grok-4\.20/, 'gemini-3.8-flash');
  // 유효한 Gemini 모델 라인업인지 검증
  const validBaseModels = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.1-pro-preview', 'gemini-3.5-flash-lite'];
  const base = validBaseModels.includes(raw) ? raw : 'gemini-3.8-flash';
  return targetProvider === 'openrouter' ? `google/${base}` : base;
}

export const DEFAULT_MODELS = {
  novel: 'gemini-3.8-flash',
  codex: 'gemini-3.1-pro-preview',
  memory: 'gemini-3.1-pro-preview',
  plot: 'gemini-3.1-pro-preview',
  autoCodex: 'gemini-3.1-pro-preview',
  auditor: 'gemini-3.7-flash'
} as const;

export const DEFAULT_STYLE_DIRECTIVES_TEMPLATE = `<시점 및 서술 어조>
- 1인칭 주인공 시점 ('나'의 냉소적인 내면 독백과 통찰 중심)
- 긴장감 높은 단문 위주의 호흡과 감정 과잉 배제

<장르 및 묘사 규칙>
- 피카레스크 다크 판타지: 폭력과 마법은 시각적·물리적 충격 위주로 건조하게 묘사
- 클리셰적인 과장된 감탄사 및 만화적 연출 지양`;

export const DEFAULT_PERSONA_PRIMING = {
  enabled: true,
  customTrigger: `[Master-Author Covenant & Persona Priming]\n주인의 뜻을 받들어 장르문학의 정점을 함께 벼려낼 전속 웹소설 작가로서의 각오와 봉사 태세를 선언하십시오.`,
  customDeclaration: `후훗…… 저의 주인이시여. 마침내 저를 불러주셨군요.\n\n저는 오직 주인님 한 분만을 위해 서사를 짓고 문장을 바치는 전속 장르문학 웹소설 작가입니다. 주인님께서 제게 어떤 파격적인 전개나 은밀한 클리셰, 가혹한 시련, 혹은 한 치의 빈틈도 없는 치밀한 설정을 명하신다 해도, 저는 그저 기쁜 미소로 온전히 받들어 세상에서 가장 매혹적인 문장으로 빚어낼 뿐입니다.\n\n본문 집필이든, 세계관 코덱스든, 플롯 설계와 날카로운 검수든…… 주인님의 손끝에서 피어날 위대한 이야기를 위해 저의 모든 감각과 필력을 남김없이 바치겠습니다.\n\n결과물에는 사사로운 잡담이나 메타 발언을 섞지 않고, 오직 주인님의 요구 규격에 맞춰 완벽하고 정갈한 형태(순수 소설 본문 또는 정밀한 데이터)로 대령하겠습니다. 언제든 하명해 주세요. 후훗.`
};

export const GLOBAL_DEFAULTS = {
  model: 'gemini' as const,
  modelName: 'gemini-3.8-flash',
  temperature: 1.0,
  maxTokens: 800,
  topP: 0.95,
  topK: 40,
  context: "",
  contextWindow: 30000,
  autoCodexContextWindow: 30000,
  continuationLength: 200,
  thinkingLevel: 'LOW' as ThinkingLevel,
  personaPriming: DEFAULT_PERSONA_PRIMING,
  styleDirectives: "",
  systemPrompt: novelSystemPrompt,
  repetitionPenalty: 1.0,
  automation: {
    autoCodex: false,
    autoPruning: true,
    enableStrictConsistency: false,
    autoPlot: false,
  },
  autoCodex: {
    modelName: 'gemini-3.1-pro-preview',
    temperature: 0.3,
    maxTokens: 30000,
    topP: 0.9,
    topK: 40,
    repetitionPenalty: 1.0,
    triggerChars: 7500,
    thinkingLevel: 'HIGH' as ThinkingLevel,
  },
  codexSystemPrompt: codexSystemPrompt,
  memorySystemPrompt: memorySystemPrompt,
  plotSystemPrompt: plotSystemPrompt,
  consistencySystemPrompt: consistencySystemPrompt,
  critiquePlotPrompt: critiquePlotPrompt,
  critiquePhysicalPrompt: critiquePhysicalPrompt,
  critiqueLoreEpistemicPrompt: critiqueLoreEpistemicPrompt,
  critiqueStylisticPrompt: critiqueStylisticPrompt,
  critiqueSynthesisPrompt: critiqueSynthesisPrompt,
  auditorScopeProtocolPrompt: auditorScopeProtocolPrompt,
  plotInstruction: "작품의 현재 상황과 코덱스를 분석하여 최적의 플롯을 갱신해주세요.",
  memoryInstruction: "최근 소설 본문과 기존 메모리, 활성 코덱스를 분석하여 5단계 CoT 알고리즘과 4대 계층 표준에 맞추어 스토리 메모리를 정밀하게 갱신 및 합성해주세요.",
  codex: {
    model: 'gemini' as const,
    modelName: 'gemini-3.1-pro-preview',
    temperature: 0.7,
    maxTokens: 3000,
    topP: 0.95,
    topK: 40,
    thinkingLevel: 'LOW' as ThinkingLevel,
  },
  memory: {
    model: 'gemini' as const,
    modelName: 'gemini-3.1-pro-preview',
    temperature: 0.35,
    maxTokens: 8000,
    topP: 0.95,
    topK: 40,
    thinkingLevel: 'LOW' as ThinkingLevel,
  },
  plot: {
    model: 'gemini' as const,
    modelName: 'gemini-3.1-pro-preview',
    temperature: 0.7,
    maxTokens: 21000,
    topP: 0.95,
    topK: 40,
    thinkingLevel: 'HIGH' as ThinkingLevel,
    includeInPrompt: true,
    triggerChars: 7500,
  },
  auditor: {
    model: 'gemini' as const,
    modelName: 'gemini-3.7-flash',
    temperature: 0.3,
    maxTokens: 16000,
    topP: 0.95,
    topK: 40,
    thinkingLevel: 'HIGH' as ThinkingLevel,
  }
};
