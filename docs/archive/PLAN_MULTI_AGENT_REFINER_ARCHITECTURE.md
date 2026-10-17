# Master Blueprint: Multi-Agent Parallel Refiner & Dual-Tier Model Configuration Pipeline

> **문서 상태**: MASTER BLUEPRINT (Final Approval Pending)  
> **최초 작성일**: 2026-09-26  
> **최종 개정일**: 2026-09-26  
> **관련 문서**: `/AGENTS.md`, `/src/services/AGENTS.md`, `/src/prompts/AGENTS.md`, `docs/SYSTEM_SPECIFICATION.md`

---

## 1. 철학적 맥락 및 아키텍처 비전 (Philosophy & Vision)

소설의 개정(Refinement)은 단순한 오탈자 교정기(Linter)가 아닙니다.  
소설 창작에서 가장 높은 수준의 문학적 완성도를 달성하기 위해서는 다음 두 가지 상반된 인지 능력이 동시에 요구됩니다:
1. **냉철하고 집요한 비판적 감사(Critical Audit)**: 사건의 거시적 템포, 물리적 시공간 인과, 인물의 인지적 출처(지식 경계), 원어민 문체 규범을 현미경처럼 검증하는 능력.
2. **몰입감 넘치고 유려한 예술적 집필(Literary Synthesis)**: 온갖 비판과 결함 지침을 바탕으로, 딱딱한 수정을 넘어 감정선과 리듬감이 살아 숨쉬는 생생한 문장으로 직조해내는 능력.

과거의 **'단일 거대 CoT(Monolithic CoT)'** 방식은 하나의 모델 인스턴스에게 이 두 가지 상반된 페르소나를 한 호흡에 강제함으로써, **어텐션 감쇠(Attention Dilution)**와 **비판적 관성에 의한 문체 메마름(Prose Sterilization)**이라는 치명적인 구조적 한계에 부딪혔습니다.

본 **MARS(Multi-Agent Review & Synthesis)** 아키텍처는 이 두 인지 과정을 완전히 물리적으로 분리합니다:
- **감사(Audit)**는 4개의 고도로 특화된 독립 에이전트가 병렬로 심층 전개하고,
- **집필(Synthesis)**은 앞선 분석의 정수를 책상 위에 올려놓은 순수 소설가 모델이 100% 문학적 직관으로 완성합니다.

---

## 2. 폐기된 대안과 그 이유 (Discarded Alternatives & Rationale)

본 설계에 도달하기 전 검토되고 기각된 대안들과 그 명확한 기술적 사유는 다음과 같습니다:

### 2.1 대안 A: Monolithic 2-Stage CoT 유지 (현행 유지)
- **폐기 사유**:
  - 단일 모델이 수십 가지의 복합 제약 조건(소지품 파지, 지식 경계 역추적, 번역투 척결, 플롯 이행 등)을 한 번에 처리하면서 어텐션이 필연적으로 분산됨.
  - 모델이 앞단에서 장문의 비판적 CoT를 쓰면서 형성된 분석적 페르소나가 최종 소설 본문에도 남아 문학적 정취가 건조해짐.
  - 거대한 JSON 출력으로 인한 토큰 초과 및 파싱 실패율 증가.

### 2.2 대안 B: 초경량 축약 JSON 구조체로 감사 결과 압축 (Linting 도구화)
- **폐기 사유**:
  - 4개 에이전트의 출력을 단순히 구절 인용과 한 줄 수정 권고로 줄여버리면, 에이전트가 "서사의 거시적 템포"나 "복선과 감정선의 유기적 연결", "지식 획득의 장기적 인과 사슬"을 사고하지 못함.
  - 단순 구절 꼬투리 잡기(Superficial nitpicking)로 퇴화하여, 입력 토큰을 4배 쓰면서도 소설의 본질적인 퀄리티 향상에는 아무런 도움이 되지 않음.

### 2.3 대안 C: Flash-Lite (Gemini 3.5 Lite 등) 모델을 감사 에이전트로 투입
- **폐기 사유**:
  - Flash-Lite 계열은 문맥 파악 및 고차 인과 추론(Higher-order Causal Reasoning)의 체급 한계로 인해, 멀쩡한 복선이나 인물의 행동에 대해 "설정 오류"라고 엉뚱한 결함을 지적하는 **오탐(False Positive)**을 대량 양산함.
  - 다중 에이전트 구조에서 감사관의 엉터리 보고서는 최종 개정 모델에게 전달되어 **초안에서 가장 훌륭했던 문장들을 오히려 괴작으로 훼손하는 치명적 결과**를 초래함.
  - 따라서 감사 에이전트는 최소 `Gemini 3.8 Flash` 이상의 온전한 추론 체급이 필수적임.

### 2.4 대안 D: 직렬 순차 파이프라인 (Agent 1 $\rightarrow$ Agent 2 $\rightarrow$ Agent 3 $\rightarrow$ Agent 4)
- **폐기 사유**:
  - 에이전트들이 서로의 결과를 보며 순차적으로 감사하면 피드백이 정교해질 수 있으나, 소요 시간(Latency)이 4배로 누적되어 1회 생성에 40~60초 이상 소요됨. 인터랙티브 웹 소설 에디터의 실시간 사용성을 완전히 파괴함.
  - `Promise.allSettled` 기반의 **비동기 병렬 Fan-Out/Fan-In**만이 대기 시간을 단일 에이전트 수준(약 6~8초)으로 통제할 수 있는 유일한 해법임.

---

## 3. 종국적 해결 뼈대 (Final Architecture Framework)

```
                           [User Input / Novel Context]
                                         │
                                         ▼
                             ┌───────────────────────┐
                             │ Stage 1: Raw Drafting │ ◀── Primary Model (User Preferred)
                             └───────────┬───────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │ Base Context Cache (빌드 오버헤드 1회화)  │
                   └─────────────────────┬─────────────────────┘
                                         │
          ┌──────────────────────────────┼──────────────────────────────┬──────────────────────────────┐
          │ (Promise.allSettled 병렬 실행)│                              │                              │
          ▼                              ▼                              ▼                              ▼
┌───────────────────┐          ┌───────────────────┐          ┌───────────────────┐          ┌───────────────────┐
│ Agent 1: 플롯/디렉팅│          │ Agent 2: 물리/시공간│          │ Agent 3: 로어/지식│          │ Agent 4: 원어민   │
│   & 서사 템포     │          │   & 소지품 인과   │          │   경계 (Epistemic)│          │   문체 & 미적 감각│
└─────────┬─────────┘          └─────────┬─────────┘          └─────────┬─────────┘          └─────────┬─────────┘
          │ (Auditor Model)              │ (Auditor Model)              │ (Auditor Model)              │ (Auditor Model)
          │ 심층 Macro/Micro CoT         │ 심층 Macro/Micro CoT         │ 심층 Macro/Micro CoT         │ 심층 Macro/Micro CoT
          └──────────────────────────────┼──────────────────────────────┴──────────────────────────────┘
                                         │
                                         ▼ (Settled Reports Aggregator & Safe Fallback)
                             ┌───────────────────────┐
                             │ Stage 3: 통합 개정본   │ ◀── Primary Model (User Preferred)
                             │   최종 탈고 및 재창조 │     (100% 프로 소설가 페르소나)
                             └───────────┬───────────┘
                                         │
                                         ▼
                                 [Final Prose Output]
```

### 3.1 듀얼 티어 모델 설정 시스템 (Dual-Tier Model Architecture)
- **Primary Model (초안 및 최종 집필)**:
  - 사용자의 선호에 따라 창의성과 문체력이 뛰어난 모델을 지정 (`novel.settings.model`, `novel.settings.modelName`).
- **Auditor Model (4대 전문 감사관 병렬 구동)**:
  - 정밀하고 흔들림 없는 논리 분석을 위해 독립적으로 모델 및 파라미터를 지정 (`novel.settings.auditor`).
  - 기본값: `Gemini 3.8 Flash`, `temperature: 0.3`, `thinkingLevel: 'MEDIUM'`.

### 3.2 4대 전문 감사 에이전트 명세
1. **Agent 1: 플롯 & 디렉팅 감사관 (`src/prompts/critique_plot_system.md`)**:
   - **사고 스코프**: 전역 서사 아크, 사용자 인라인 `{}` 지시사항의 맥락적 이행, 긴장감 완급 조절(Pacing), 사건 인과 결속.
   - **CoT 구조**: `[서사 거시 진단]` $\rightarrow$ `[지시사항 이행 감사]` $\rightarrow$ `[서사적 재배치 및 템포 지침]`.
2. **Agent 2: 물리 & 시공간 연속성 감사관 (`src/prompts/critique_physical_system.md`)**:
   - **사고 스코프**: 3차원 공간 좌표, 인물 시선/동선, 손에 쥔 물건(파지/수납/양손 상태), 상처/피로도 누적, 지형지물 상호작용.
   - **CoT 구조**: `[공간 좌표 및 동선 역추적]` $\rightarrow$ `[소지품 및 신체 상태 연속성 검증]` $\rightarrow$ `[물리 법칙 복구 지침]`.
3. **Agent 3: 로어 & 지식 경계/인지 출처 감사관 (`src/prompts/critique_lore_epistemic_system.md`)**:
   - **사고 스코프**: 코덱스 설정(고유명사, 마법체계 등) 부합성, **지식 경계(Epistemic Boundary)** 및 외적 단서 없는 독심술 척결, 인지 출처(Provenance) 검증.
   - **CoT 구조**: `[코덱스 정합성 심층 검증]` $\rightarrow$ `[지식 출처 및 POV 경계 역추적]` $\rightarrow$ `[인지적 징검다리 묘사 보강 지침]`.
4. **Agent 4: 한국어 원어민 문체 & 미적 감각 감사관 (`src/prompts/critique_stylistic_system.md`)**:
   - **사고 스코프**: 번역투(영어/일본어식 직역), 프롬프트 인물 딱지(`~한 소녀는`), 어미 단조로움, 감각 시계열 순서(접촉 $\rightarrow$ 온도 $\rightarrow$ 통증), 문장의 호흡과 리듬.
   - **CoT 구조**: `[번역투 및 관용구 오용 전수조사]` $\rightarrow$ `[시각/감각 시계열 및 어미 리듬 진단]` $\rightarrow$ `[한국어 고유 어감 윤문 지침]`.

### 3.3 Stage 3: 통합 개정 집필관 (`src/prompts/critique_synthesis_system.md`)
- **입력**: 원작 맥락 + 초안 원문(`scopedDraft`) + **[4대 심층 감사 보고서 종합본]**.
- **역할**: 감사관들의 지적을 바탕으로, 기계적인 땜질이 아니라 문맥 속에 자연스럽게 녹아들도록 소설 본문을 다시 집필.
- **상충 지침 중재 헌법**: `[플롯/지시사항] >= [물리적 인과] > [로어/지식 경계] > [문체 윤문]`.
- **출력 안전성**: 장황한 CoT JSON 대신 깔끔한 순수 텍스트(또는 직관적인 최소 구조체)로 출력하여 파싱 실패율 0% 달성.

---

## 4. 극도로 세부적인 코드 실행 로직 (Detailed Implementation Logic)

### 4.1 데이터 모델 및 타입 정의 (`src/types.ts`)
```typescript
export interface AuditorModelSettings {
  model: 'gemini' | 'openrouter';
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  thinkingLevel?: ThinkingLevel;
}

export interface NovelSettings {
  // Primary Model Configs
  model: 'gemini' | 'openrouter';
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  thinkingLevel?: ThinkingLevel;
  // ... existing fields ...

  // Auditor Model Config (신설)
  auditor?: AuditorModelSettings;
}

export interface MultiAgentAuditReports {
  plotAudit?: string;
  physicalAudit?: string;
  loreAudit?: string;
  stylisticAudit?: string;
  failedAudits?: string[];
}
```

### 4.2 글로벌 기본값 및 설정 병합 (`src/constants.ts`, `src/lib/novelIO.ts`)
- `GLOBAL_DEFAULTS.auditor`:
  ```typescript
  auditor: {
    model: 'gemini' as const,
    modelName: 'gemini-3.8-flash',
    temperature: 0.3,
    maxTokens: 8000,
    topP: 0.95,
    topK: 40,
    thinkingLevel: 'MEDIUM' as ThinkingLevel
  }
  ```
- `deepMergeNovelSettings`에 `auditor` 객체의 안전한 병합 로직 추가.

### 4.3 신규 프롬프트 정의 (`src/prompts/` 및 `src/prompts.d.ts`)
- `src/prompts/critique_plot_system.md`: 플롯 및 지시사항 심층 감사 프롬프트
- `src/prompts/critique_physical_system.md`: 물리/공간/소지품 심층 감사 프롬프트
- `src/prompts/critique_lore_epistemic_system.md`: 로어 및 지식 경계 심층 감사 프롬프트
- `src/prompts/critique_stylistic_system.md`: 한국어 원어민 문체 및 감각 심층 감사 프롬프트
- `src/prompts/critique_synthesis_system.md`: 4대 보고서 융합 및 최종 탈고 프롬프트
- `src/prompts.d.ts`에 신규 모듈 타입 선언 추가.

### 4.4 리파이너 파이프라인 엔진 개편 (`src/services/refinerService.ts`)
```typescript
export async function runMultiAgentConsistencyPipeline(
  novel: Novel,
  preGenerationContent: string,
  openRouterKey: string | null,
  onStatusUpdate?: (step: string) => void,
  onStage1Context?: (ctx: any) => void,
  onAuditsComplete?: (audits: MultiAgentAuditReports) => void,
  onStage3Context?: (ctx: any) => void
): Promise<ConsistencyPipelineResult | null>
```
1. **Base Context 생성 (1회 빌드)**:
   - `processNovelContext`로 앵커 텍스트와 본문 컨텍스트 1회 계산.
2. **Stage 1 (초안 작성)**:
   - Primary Model(`novel.settings`)로 `rawDraft` 생성.
   - `stitchAndTrimAnchor` 및 `sliceProseByTokens`로 `scopedDraft` 확보.
3. **Stage 2 (4대 에이전트 병렬 감사 - Fan-Out)**:
   - Auditor Model(`novel.settings.auditor || GLOBAL_DEFAULTS.auditor`) 설정 로드.
   - `Promise.allSettled`로 4개 에이전트 비동기 호출.
   - 개별 에이전트 실패 시 `failedAudits`에 기록하되 성공한 보고서들은 안전하게 취합.
4. **Stage 3 (통합 개정본 집필 - Fan-In)**:
   - Primary Model(`novel.settings`)을 호출하여 `critique_synthesis_system.md` 실행.
   - 취합된 4대 심층 보고서 + `scopedDraft`를 바탕으로 최종 완성본 도출.
5. **결과 패키징**:
   - `ConsistencyPipelineResult` 형태로 구조화하여 기존 UI(프롬프트 인스펙터, 변경 내역)와의 100% 하위 호환 보장.

### 4.5 UI 통합 (`src/components/SettingsPanel.tsx`, `src/components/GlobalSettings.tsx`)
- 기존 "소설 생성 모델" 하단에 **"리파이너 전문 감사 모델 (4대 병렬 에이전트)"** 섹션 신설.
- Provider 선택, Model Dropdown(Gemini 3.8 Flash 기본), Thinking Level, Temperature 조절 슬라이더 제공.
- 툴팁 및 가이드: *"4개의 병렬 감사관(플롯, 물리, 로어, 문체)이 사용할 AI 모델을 지정합니다. 정밀한 결함 감사를 위해 Flash 체급 및 낮은 온도를 권장합니다."*

---

## 5. 단계별 실행 계획 (Execution Phases)

| Phase | 내용 | 타겟 파일 |
| :--- | :--- | :--- |
| **Phase 1** | 타입 정의 및 기본 설정 SSOT 구축 | `src/types.ts`, `src/constants.ts`, `src/lib/novelIO.ts` |
| **Phase 2** | 4대 전문 감사관 및 합성 프롬프트 작성 | `src/prompts/*.md`, `src/prompts.d.ts` |
| **Phase 3** | 다중 에이전트 파이프라인 엔진 구현 | `src/services/refinerService.ts`, `src/services/promptService.ts` |
| **Phase 4** | UI 설정 패널 및 모델 셀렉터 연동 | `src/components/SettingsPanel.tsx`, `src/components/GlobalSettings.tsx` |
| **Phase 5** | 훅 및 상태 연동, 프롬프트 인스펙터 호환 | `src/hooks/useAIEngine.ts`, `src/components/PromptInspector.tsx` |
| **Phase 6** | 빌드 검증(`lint_applet`, `compile_applet`) 및 종합 검수 | 전체 |

---

## 6. 최종 승인 대기 (Final Approval Request)
본 Master Blueprint는 설계 철학, 폐기된 대안의 논리적 사유, 종국적 아키텍처 뼈대 및 구체적인 코드 실행 로직을 모두 포괄합니다.  
사용자님의 최종 승인이 완료되면 즉시 Phase 1부터 순차적으로 구현을 개시하겠습니다.
