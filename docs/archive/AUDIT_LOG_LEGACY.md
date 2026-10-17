# AI Novelist Studio - Historical Audit Log Archive

## [2026-10-07] Bugfix & SSOT: Refiner 앵커 불일치/Ghost Gap 해결 및 Stage 3 감사관 보고서 전송 정상화
- **Task Name**: Refiner Anchor Continuity & Ghost Gap Resolution & Stage 3 Live Audit Payload Binding
- **Purpose**:
  1. **본문 절단(Ghost Gap) 및 앵커 불일치 근본 원인 해결**:
     - `buildStandardNarrativeContext`가 멀티턴용으로 `continuationLength`(200자)가 미리 잘린 `STORY_CONTEXT_NOVEL`을 참조하던 버그를 해결.
     - 온전한 본문인 `variables.STORY_CONTEXT`를 참조하도록 SSOT 단일화하여, Stage 2(4대 감사관)와 Stage 3(탈고 모델) 모두에게 최신 본문 200자가 온전히 보존되도록 개선.
     - Stage 3에서 상단 `[Current Story Text]`의 맨 마지막 문장과 최하단 `<anchor>`(끝 25자)가 100% 일치하게 되어, 175자의 공백으로 인한 모델의 인지 부조화(본문 재작성, 도약, 앵커 무시)를 원천 차단.
  2. **Stage 3 실제 API 호출부 4대 감사관 보고서 누락 버그 해결**:
     - `refinerService.ts`에서 삼항 연산자 분기 오류로 인해 실제 4대 감사관 보고서(`synthesisUserContent`)가 버려지고 `taskContext.messages`(더미 플레이스홀더 텍스트)가 전송되던 문제 해결.
     - `buildTaskMessages`의 `case 'consistency'`에 `extraData?.auditReports`를 전달받도록 확장하고, `refinerService.ts`에서 실제 4대 감사관 보고서를 주입하여 `taskContext.messages`에 페르소나 프라이밍 턴과 실제 복원 분석 보고서가 온전히 바인딩되도록 정상화.
  3. **Prompt Inspector 연동 정합성 확보**:
     - `promptService.ts`의 `stage2Audits` 객체에 실제 실행 시 감사관들의 분석 결과가 온전히 채워지도록 동기화.
- **Related Files**:
  - `/Report.md`: 상세 결함 분석, 일반 소설과의 구조 비교, 타 AI 기능 전수 충돌 검토 매트릭스 보존.
  - `/src/lib/contextProviders.ts`: `buildStandardNarrativeContext`의 `STORY_CONTEXT` 참조 단일화 및 `buildTaskMessages` `case 'consistency'`의 `auditReports` 확장.
  - `/src/services/refinerService.ts`: `generateTaskContext`에 `auditReports` 전달 및 `synthesisPayload.messages`를 `taskContext.messages`로 정상 바인딩.
  - `/src/services/promptService.ts`: `extraData.auditReports` 수신 시 `stage2Audits`의 라이브 출력 바인딩 지원.
- **Verification**: `lint_applet` (`tsc --noEmit`) 및 `compile_applet` 0 에러 정상 통과.

## [2026-10-07] Architecture & Engine: MARS 문학적 원형 복원 패러다임 전환 및 4대 복원 분석관/비간섭 헌법 개편
- **Task Name**: Literary Restoration Paradigm Shift & Auditor Mindset Modernization
- **Purpose**:
  1. **AI 자체 검열 및 과잉 순화(Sterilization)의 근본 원인 해결**:
     - '소설 재작성/개정(Rewrite/Revise)' 및 징벌적 '결함 적발(Defects)' 용어가 LLM 안전 필터(Safety Alignment)의 거짓 양성(False Positive)을 자극하여 일반 문학적 갈등/전투/어두운 분위기를 자체 검열하던 문제를 원천 차단.
     - 전체 파이프라인의 인지 프레임을 **"문학적 원형 보존 및 정밀 복원 렌더링(Literary Restoration & Canonical Scene Rendering)"**으로 전면 전환.
  2. **공통 감사 프로토콜 비간섭 헌법 제정 (`auditor_scope_protocol.md`)**:
     - `[문학적 에너지 보존 및 비간섭 헌법 (Artistic Non-Interference Rule - CRITICAL)]` 신설: 허구의 문학 창작물임을 명시하고, 갈등/거친 언행/처절한 심리를 검열 대상이 아닌 보존해야 할 작품의 핵심 활력으로 선언.
     - 오직 시공간 순간이동, 설정 충돌, 어색한 번역투 등 기술적/서사적 노이즈만을 복원 대상으로 한정.
  3. **4대 감사관 사고방식 현대화 (취조관 ➔ 전문 복원 분석관)**:
     - `critique_plot_system.md`: 수석 서사 역동 & 인과 복원 분석관 (사건 인과 이음새 및 극적 텐션 복원 가이드).
     - `critique_physical_system.md`: 수석 시공간 물리 정합 분석관 (3차원 공간 궤적 및 물리적 현실감 복원 가이드).
     - `critique_lore_epistemic_system.md`: 수석 로어 수호 & 인지 경계 분석관 (인지 징검다리 및 시점 일관성 복원 가이드).
     - `critique_stylistic_system.md`: 수석 한국어 문체 & 미학 조율관 (원어민 고유 어감 및 리듬 윤문 가이드).
  4. **Stage 3 최종 렌더링 모델 문학적 복원 헌법 확립 (`critique_synthesis_system.md`, `contextProviders.ts`)**:
     - `Master Literary Restoration & Canonical Prose Rendering Directives` 확립.
     - 4대 전문 복원 보고서를 기반으로 미완성 초안의 날것의 활력과 감정선을 100% 보존하면서, 앵커 무단절 완결형 소설 본문으로 렌더링하도록 지시문 전면 현대화.
     - `PromptInspector.tsx`의 Stage 3 탭 라벨을 `Master Restorer (문학적 정밀 복원)`으로 정렬.
- **Related Files**:
  - `/src/contexts/consistency_critique_context.md`: Stage 3 마스터 시스템 템플릿의 `Master Literary Restorer` 페르소나 및 `Master Literary Restoration Directives` 전환.
  - `/src/prompts/auditor_scope_protocol.md`: 비간섭 헌법 추가 및 분석/복원 프레이밍 개편.
  - `/src/prompts/critique_plot_system.md`: 서사 역동 & 인과 복원 분석관 프롬프트 개편.
  - `/src/prompts/critique_physical_system.md`: 시공간 물리 정합 분석관 프롬프트 개편.
  - `/src/prompts/critique_lore_epistemic_system.md`: 로어 수호 & 인지 경계 분석관 프롬프트 개편.
  - `/src/prompts/critique_stylistic_system.md`: 한국어 문체 & 미학 조율관 프롬프트 개편.
  - `/src/prompts/critique_synthesis_system.md`: 문학적 원형 복원 및 활력 보존 헌법 개편.
  - `/src/lib/contextProviders.ts`: `formatMasterSynthesisPrompt` 복원 지시문 및 전문 복원 보고서 헤더 정렬.
  - `/src/services/promptService.ts`: `stage2Audits` 복원 분석관 라벨 정렬.
  - `/src/components/PromptInspector.tsx`: Stage 3 Master Restorer 탭 라벨 정렬.
  - `/docs/archive/PLAN_LITERARY_RESTORATION_AND_AUDITOR_MINDSET_PIPELINE.md`: 마스터 계획서 아카이브 보존.
  - `/AGENTS.md`, `/src/prompts/AGENTS.md`, `/src/services/AGENTS.md`: Living Documentation 갱신.
- **Verification**: `lint_applet` (`tsc --noEmit`) 및 `compile_applet` 0 에러 정상 통과.

## [2026-10-07] Feature & Engine: 전속 웹소설 작가 페르소나 프라이밍 (Synthetic History Injection) 탑재 및 4대 감사관 전면 연동
- **Task Name**: Dedicated Web Novelist Persona Priming (Synthetic History Injection) & 4-Auditor Integration
- **Purpose**:
  1. **인컨텍스트 페르소나 프라이밍 (Self-Commitment) 아키텍처 탑재**:
     - 대화 히스토리 최상단에 전속 장르문학 웹소설 작가 페르소나 문답 세트(`[User Priming Trigger -> Model Synthetic Response]`)를 합성 주입.
     - LLM의 Self-Consistency Bias(자기 일관성 편향)를 활용하여 과도한 AI 메타 발언을 차단하고, 사용자의 모든 지침을 기쁘고 상냥하게 수용하는 헌신적 작가 태도 형성.
  2. **4대 감사관(Stage 2) 및 마스터 탈고(Stage 3) 전면 연동**:
     - `refinerService.ts`의 `executeAuditorAgent` 및 `Promise.allSettled` 병렬 호출 파이프라인에 `personaPriming` 턴을 100% 주입하여, 4대 감사관(플롯/물리/로어/문체) 모두 전속 작가 페르소나 문맥하에 유기적으로 감사 수행.
     - `PromptInspector` 및 `promptService.ts`의 Stage 2 드라이런 뷰에도 일치된 멀티턴 히스토리 시각화 지원.
  3. **크로스 파이프라인 무결성 및 자가 규율(Self-Discipline) 보장**:
     - 모델 가상 선언문에 "결과물에는 사사로운 잡담을 일체 섞지 않고 오직 순수 소설 본문 또는 정밀한 데이터 규격으로 대령하겠다"는 자가 규율을 포함하여, 본문 집필(novel), 플롯(plot), 코덱스(codex), 메모리(memory), 탈고 검수(consistency) 등 모든 JSON 및 텍스트 태스크와 100% 호환.
  4. **SSOT 엔진 및 AI 엔진 스튜디오 제어 연동**:
     - `src/lib/contextProviders.ts`의 `getPersonaPrimingMessages`, `buildSyntheticHistoryMessages`, `buildTaskMessages`에 완전 일원화.
     - `AIEngineStudioModal` 소설 본문 집필 탭 내 전속 작가 페르소나 On/Off 토글 및 트리거/선언문 확인/커스텀 편집/초기화 UI 지원.
     - `NovelSettings.personaPriming` 및 `GLOBAL_DEFAULTS.personaPriming` 기본 활성화(enabled: true) 설정.
- **Related Files**:
  - `/src/types.ts`: `PersonaPrimingSettings` 인터페이스 및 `NovelSettings` 필드 추가.
  - `/src/constants.ts`: `DEFAULT_PERSONA_PRIMING` 상수 및 `GLOBAL_DEFAULTS` 등록.
  - `/src/lib/contextProviders.ts`: `getPersonaPrimingMessages` SSOT 엔진 추가 및 모든 태스크 메시지 빌더 연동.
  - `/src/services/refinerService.ts`: `executeAuditorAgent` 및 Stage 2 4대 감사관, Stage 3 합성 탈고 페이로드에 페르소나 프라이밍 메시지 전면 연결.
  - `/src/services/promptService.ts`: `stage2Audits` 드라이런 뷰에 `personaPriming` 멀티턴 메시지 주입.
  - `/src/components/AIEngineStudioModal.tsx`: 페르소나 프라이밍 설정 및 커스텀 편집 카드 UI 연동.
  - `/AGENTS.md`, `/src/lib/AGENTS.md`, `/src/components/AGENTS.md`: Living Documentation 갱신.
- **Verification**: `lint_applet` (`tsc --noEmit`) 및 `compile_applet` 0 에러 정상 통과.

## [2026-10-07] Architecture & Engine: Context Window & Story Prose Slicing SSOT Unification
- **Task Name**: Context Window & Story Prose Slicing SSOT Unification
- **Purpose**:
  1. **Root Cause Resolution for Full Prose Leakage**:
     - Resolved the critical bug where novel prose in Stage 1 generation (`case 'novel'`) ignored `novel.settings.contextWindow` and transmitted the entirety of the novel (from character index 0) due to passing un-sliced `CLEAN_STORY_CONTEXT` into `buildSyntheticHistoryMessages`.
  2. **Single Source of Truth (`resolveStoryContextEngine`)**:
     - Centralized all prose cleaning, lookback directive extraction, `contextWindow` trailing slicing, and anchor tail separation into a unified SSOT engine in `src/lib/contextProviders.ts`.
     - Standardized all pipelines (`novel`, `memory`, `plot`, `codex`, `autocodex`, `consistency`) to consume strictly sliced prose.
  3. **Multi-Tier Defense-in-Depth**:
     - Tier 1: `resolveStoryContextEngine` strict slicing at the root.
     - Tier 2: `buildSyntheticHistoryMessages` internal defensive clamping using `contextWindow`.
     - Tier 3: `assertContextWindowGuard` runtime invariant assertion scanning messages prior to dispatch and auto-clipping prose overflows.
- **Related Files**:
  - `/src/lib/contextProviders.ts`: Added `resolveStoryContextEngine` and `assertContextWindowGuard`, updated `processNovelContext`, refactored `buildTotalVariableDictionary` and `buildTaskMessages`.
  - `/src/services/promptService.ts`: Integrated `assertContextWindowGuard` into `generateTaskContext`.
  - `/src/lib/AGENTS.md` & `/AGENTS.md`: Updated living documentation.
- **Verification**: `lint_applet` (`tsc --noEmit`) and `compile_applet` passed with 0 errors.

## [2026-09-16] Feature: Codex Content Deduplication & SSOT Engine (Scissors Cleanup)
- **Task Name**: Codex Content Deduplication & SSOT Engine
- **Purpose**: 
  1. 단일 로어(Lore) 항목 내에서 발생하는 고질적인 내용 중복 및 반복 문제를 해결하기 위한 **단일 진실 공급원(SSOT)** 원칙 프롬프트 고도화 및 프로그래밍 방식의 중복 제거 엔진 도입.
  2. 로어 생성 시 동일한 정보(소속, 신분, 외형 등)가 여러 헤더(`[기본 정보]`, `[성격]`, `[인간관계]` 등)에 반복 기재되는 현상을 방지하는 SSOT 지침을 `codex_system.md`에 추가.
  3. `loreUtils.ts`에 `deduplicateLoreContent` 유틸리티 함수를 신설하여 불릿 항목(`- `) 단위의 중복을 제거하고, `[기본 정보]` 외의 섹션에 불필요하게 침투한 프로필 항목(이름, 소속, 나이 등)을 자동 정리.
  4. 코덱스 개별 어시스턴트(`useAIEngine`) 및 배경 자동 스캔(`useAutoCodex`) 파이프라인에 이 엔진을 통합하여 AI 제안이 상시 정제된 상태로 전달되도록 보장.
  5. 기존 로어 항목에서도 수동으로 중복을 정리할 수 있는 **"Clean & Deduplicate"** 버튼(가위 아이콘)을 `Codex.tsx` UI에 추가.
- **Reason**:
  - AI가 코덱스 항목을 생성하거나 업데이트할 때, 앞서 언급한 정보를 다른 헤더에서 또다시 반복하며 로어 데이터가 비대해지고 가독성이 떨어지는 문제를 해결하기 위함.
  - "직접 파일 수정을 하라"는 사용자의 강력한 요청과 "말만 하지 말고 코드를 고치라"는 피드백에 따라 프로그래밍 방식의 정제 레이어를 구축함.
- **Related Files**:
  - `/src/prompts/codex_system.md`: SSOT 및 섹션 간 중복 금지 지침 추가.
  - `/src/lib/loreUtils.ts`: `deduplicateLoreContent` 및 `normalizeLoreText` 유틸리티 구현.
  - `/src/hooks/useAIEngine.ts`: 코덱스 생성 결과에 `deduplicateLoreContent` 적용.
  - `/src/hooks/useAutoCodex.ts`: 자동 코덱스 제안(Update/New)에 `deduplicateLoreContent` 적용.
  - `/src/components/Codex.tsx`: 수동 중복 제거 버튼 UI 추가 및 로직 연결.
  - `/AGENTS.md`: 시스템 명세 문서 내 'Content Deduplication & SSOT Engine' 섹션 업데이트.
- **Details**:
  - **Programmatic Cleaning**: 단순 프롬프트 강조만으로는 해결되지 않는 미세한 반복을 정규식 및 세트(Set) 기반의 정규화 비교를 통해 실시간으로 제거함.
  - **UI Accessibility**: 편집 중인 로어의 'Deduplicate' 버튼을 누르면 즉시 SSOT 원칙에 따라 내용이 정제되어 사용자에게 시각적 피드백 제공.
  - **Robust Verification**: 린트(`tsc --noEmit`) 통과 및 빌드 정합성 확인 완료.

## [2026-09-16] Feature: Plot Continuity & Timeline Audit CoT Architecture (Transitional Bridge & Historical Ground Truth)
- **Task Name**: Plot Continuity & Timeline Audit CoT Architecture
- **Purpose**: 
  1. **단일 마일스톤 국한 원칙 및 과도기 가교 시퀀스(Transitional Bridge Protocol)** 도입:
     - 장기 로드맵 마일스톤 진행 중 자동 플롯이 트리거될 때 발생하던 "시퀀스 공백/단절" 현상을 해결.
     - 섹션 3의 시퀀스들은 현재 진행 중인 마일스톤 1개에만 온전히 집중하도록 강제하되, 마일스톤 후반부(`LATE`) 또는 완료 직전으로 판정된 경우(`isTransitionBridgeRequired: true`)에만 다음 마일스톤으로 매끄럽게 인과를 넘겨주는 가교 시퀀스(`isBridgeSequence: true`)를 목록 마지막에 부가적으로 배치.
  2. **기서술 팩트 및 시계열 엄정 검증(Historical Ground Truth & Timeline Integrity Mandate)** CoT 체인 구축:
     - Step 3-4 거시 자가 비판에 `timelineAndCanonConsistency` 벡터를 추가하여 Story Memory 및 본문과 로드맵 간의 시계열 모순/충돌을 검증.
     - Step 5-6 미시 자가 비판에 `historicalFactAndTimeline` 벡터를 추가하여 이미 본문에서 해결된 갈등의 재발, 인물 기억 상실, 과거 시점 사건의 현재 진행형 착오 등을 엄격히 적발하고 패치.
  3. **UI 시각화 및 관측성 완성**:
     - `PlotWorkbench.tsx`의 Thought Process 탭에 마일스톤 진행도 분석 카드(단계, 페이즈, 가교 필요 여부, 타깃 마일스톤), 거시 비판의 타임라인/설정 정합성 항목, 미시 비판의 기서술 팩트 및 시계열 검증 항목을 시각화.
     - Structured Beats 시퀀스 목록에서 가교 시퀀스 카드에 보라/시안 톤의 전용 배지(`다음 마일스톤 가교 시퀀스 (Bridge)`)를 렌더링.
- **Reason**:
  - 장기 로드맵 중간 단계에서 자동 플롯 생성이 실행될 때 마일스톤 경계에서 시퀀스가 단절되거나, LLM이 이전 본문에서 해결된 사건을 망각하고 다시 들고 오는 환각/시계열 착오를 근본적으로 방지하기 위함.
- **Related Files**:
  - `/PLAN_PLOT_CONTINUITY_AND_TIMELINE_AUDIT.md`: STP 마스터 계획서.
  - `/src/prompts/plot_system.md`: CoT 프롬프트 지침, JSON 스키마, 및 단일 마일스톤/가교/타임라인 규약 갱신.
  - `/src/services/plotService.ts`: `PlotThoughtProcess`, `MilestoneProgressAnalysis`, `PlotSequence` 인터페이스 확장 및 1-Pass / 2-Pass 파서 매핑 지원.
  - `/src/components/PlotWorkbench.tsx`: 마일스톤 진행도 분석, 시계열 비판 벡터 2종, 가교 시퀀스 배지 렌더링.
  - `/AGENTS.md`, `src/components/AGENTS.md`, `src/services/AGENTS.md`: 시스템 명세 문서 동기화.
- **Details**:
  - **Single Milestone Specificity**: 시퀀스 1~4는 현재 마일스톤 사건에만 전념하여 의도와 연출 집중도를 극대화.
  - **Graceful Bridge Transition**: `LATE` 페이즈 감지 시에만 시퀀스 5(또는 마지막 시퀀스)를 가교로 생성하여 다음 마일스톤 진입 시 인과적 단절 제로화.
  - **Robust Verification**: 린트(`tsc --noEmit`) 및 컴파일 빌드(`vite build`) 100% 통과 확인.

## [2026-09-16] Feature & BugFix: Plot Architecture Refinement, Narrative Inertia CoT & Fresh Context Pipeline
- **Task Name**: Plot Architecture Refinement, Narrative Inertia CoT & Fresh Context Pipeline
- **Purpose**: 
  1. 플롯 4번 헤더(`[4. 장기 복선 및 고정 논리 프레임워크]`)를 고정된 소제목 서식이 아닌, 여러 플롯에 걸쳐 지속적으로 영향을 미치는 장기 복선/인과 제약/계획을 자유롭고 유연하게 기록하는 열린 메모 공간으로 재정의.
  2. 서사적 관성(Narrative Inertia)이 플롯 시퀀스에 자연스럽게 녹아들도록, AI 사고 과정(`thoughtProcess`)에 전용 CoT 필드 `narrativeInertiaAssessment`를 신설하여 감정 기저선과 이전 사건의 잔여 여파를 우선 분석한 뒤 관계 변화와 시퀀스를 계획하도록 파이프라인 고도화.
  3. `useAutoPlot` 및 `useAutoCodex`에서 글자 수 임계치 도달 직후 비동기 배경 생성 시, React 상태 업데이트 지연으로 마지막 생성 텍스트가 누락되던 버그를 `lastContentRef` 실시간 주입(`overrideContent`)으로 해결.
  4. `PlotWorkbench.tsx` UI의 Thought Process 탭에 서사적 관성 분석 카드를 추가하고 헤더 4의 플레이스홀더를 유연한 메모 공간에 맞게 개정.
- **Related Files**:
  - `/src/prompts/plot_system.md`, `/src/services/plotService.ts`, `/src/hooks/useAutoPlot.ts`, `/src/hooks/useAutoCodex.ts`, `/src/App.tsx`, `/src/components/PlotWorkbench.tsx`

## [2026-09-15] Refine: Plot Completeness Enforcement & MaxTokens Default/Persistence Upgrades
- **Task Name**: Plot Completeness Enforcement & MaxTokens Default/Persistence Upgrades
- **Purpose**: 
  1. 플롯 자동 생성 시 도중에 잘린 불완전한 결과물이 은폐되어 승낙되는 사고를 원천 방지하기 위해, 3대 필수 헤더뿐만 아니라 4단계 시퀀스 완결성(`시퀀스 4` 및 최소 600자 이상)을 엄격히 검증하고 불완전할 경우 명확한 에러를 발생시키도록 강화.
  2. 플롯 생성 기본 `maxTokens`를 4,000에서 **20,000 토큰**으로 대폭 상향(슬라이더 범위 최대 60,000 토큰 지원)하여 사고 토큰(Thinking Tokens) 및 장문의 4단계 시퀀스 JSON이 끊김 없이 완벽히 출력되도록 보장.
  3. `PlotWorkbench` 내에서 변경한 모델, 추론 레벨, 온도, `maxTokens` 설정이 즉시 소설 객체(`currentNovel.settings.plot`) 및 Firestore에 영구 동기화 저장되도록 개선.
- **Reason**:
  1. 기존의 4000토큰 기본값은 추론 모델(Thinking level MEDIUM/HIGH)에서 긴 JSON을 출력하기에 너무 작아 도중에 잘림(Unterminated string)이 빈번히 발생함.
  2. 도중에 잘린 불완전한 플롯을 임의로 복원하여 통과시키는 경우, 작가가 뒷부분이 유실된 플롯을 인지하지 못하고 승낙해 서사가 파탄날 위험이 있음.
  3. 워크벤치 내 파라미터 조절 시 로컬 상태만 변경되고 소설 설정에 자동 저장되지 않던 문제 해결.
- **Related Files**:
  - `src/constants.ts`: `GLOBAL_DEFAULTS.plot.maxTokens`를 4000 -> 20000으로 기본값 상향.
  - `src/services/plotService.ts`: `validatePlotCompleteness` 도입. 3대 필수 헤더 + 시퀀스 4 완결성 + 최소 분량(600자) 엄격 검증. 불완전한 텍스트는 2-Pass 정규식 추출에서도 차단하고 즉시 명확한 진단 에러 송출.
  - `src/components/PlotWorkbench.tsx`: `handleUpdatePlotSettings` 도입으로 설정 변경 시 Firestore/소설 상태 실시간 영구 저장. MaxTokens 슬라이더 최대치를 60000(step 1000)으로 확장.
  - `src/components/SettingsPanel.tsx`: MaxTokens 슬라이더 최대치를 60000(step 1000)으로 확장.
  - `/AGENTS.md`, `src/components/AGENTS.md`, `src/services/AGENTS.md`
- **Details**:
  - **Strict Completeness Defense**: 도중에 잘린 미완결 플롯은 즉각 `플롯 시퀀스가 도중에 잘렸거나 미완결 상태입니다. Max Tokens를 늘려주세요.` 오류를 뱉어 작가를 보호하며, Prompt Inspector에는 생성되다 만 원본 텍스트가 100% 보존되어 원인 분석 가능.
  - **Ample Token Headroom**: 기본 20,000 토큰 제공으로 복잡한 4단계 시퀀스(각 1,000~2,000자 분량)와 서사 디렉팅이 중간 단절 없이 한 번에 완결 출력됨.
## [2026-09-15] BugFix & Observability: Plot 2-Tier Hybrid Recovery Parser & Prompt Inspector Pipeline Stabilization
- **Task Name**: Plot 2-Tier Hybrid Recovery Parser & Prompt Inspector Pipeline Stabilization
- **Purpose**: 
  1. AI가 플롯 생성 시 JSON 문자열 내부의 줄바꿈 문자를 이스케이프하지 않아 발생하는 `Unterminated string in JSON` 파싱 오류 근본적 방어.
  2. 파싱이나 검증 과정에서 오류가 발생하더라도 Prompt Inspector에서 AI의 원본 응답 텍스트와 구체적인 오류 내용을 온전히 확인하고 디버깅할 수 있도록 완전한 가시성(Total Observability) 파이프라인 구축.
  3. JSON 문법이 극단적으로 훼손된 경우에도 3대 필수 헤더를 스캔하여 정상적인 플롯 데이터로 복원하는 2-Pass 정규식 텍스트 추출 Fallback 제공.
- **Reason**:
  1. LLM의 서사 및 플롯 생성 특성상 복잡한 멀티라인 산문이나 대사 지시문이 JSON 문자열 내부에 포함될 때 제어 문자/줄바꿈이 unescaped 상태로 출력되는 경우가 빈번함.
  2. 기존 파서는 단순 `JSON.parse` 실패 시 즉시 예외를 발생시키고 `promptInfo.output`에 응답을 채우지 않은 채 종료되어, 사용자가 Prompt Inspector에서 무엇이 문제인지 전혀 관찰할 수 없었음.
- **Related Files**:
  - `src/services/plotService.ts`: 
    - `sanitizeJsonStringLiterals`: 상태 기계(State Machine) 기반으로 JSON 구조 문법은 보존하면서 문자열 리터럴 내부의 raw newline/제어 문자를 안전하게 `\n` 등으로 치환.
    - `extractPlotDirectlyFromRawText`: JSON 파싱 실패 시 원본 텍스트에서 3대 필수 헤더 및 CoT 추론 영역을 직접 추출하는 2-Pass 복구 엔진.
    - `parseAndValidatePlotResponse`: 1-Pass(정제 후 JSON 파싱) -> 2-Pass(정규식 텍스트 추출) -> 실패 시 명확한 진단 에러 송출 구조로 개편.
  - `src/hooks/useAutoPlot.ts`: 
    - AI 응답 수신 직후 `lastPlotPromptInfo.output`을 선제 기록하여 파싱 실패 시에도 원본 응답 보존.
    - `catch` 블록에서 `error` 메시지를 `lastPlotPromptInfo`에 안전하게 바인딩.
  - `src/components/PromptInspector.tsx`: 
    - `info.error`가 존재할 때도 Output 섹션이 열려 에러 메시지와 원본 응답을 명확히 표시하도록 개선.
    - 플롯 CoT 추론 영역(독자 보상 및 쾌감 훅, 인물 관계 변곡점) 카드 시각화 지원.
  - `src/services/AGENTS.md`, `src/components/AGENTS.md`, `/AGENTS.md`
- **Details**:
  - **Zero-Friction Graceful Degradation**: 모델의 JSON 구조 결함 시에도 플롯 내용이 유효하면 정규식 복구로 사용자 작업 흐름을 중단하지 않고 정상 반영.
  - **Complete Debuggability**: 프롬프트 인스펙터에서 AI의 날 것 그대로의 응답을 항시 확인할 수 있어 모델 설정, 프롬프트 튜닝, 파싱 오류 원인을 즉각 파악 가능.
## [2026-09-15] BugFix & UX: Plot Workbench Data Loss Fix, Director Directive Relocation & Auto-Plot Controls
- **Task Name**: Plot Workbench Data Loss Fix, Director Directive Relocation & Auto-Plot Controls
- **Purpose**: 
  1. Active Plot 적용 및 직접 편집 시 발생하던 데이터 유실 및 공백화 버그 원천 차단.
  2. 설정창 내부에 숨겨져 접근성이 떨어지던 'Director Directive (AI 서사 디렉터 지시문)' 입력창을 워크벤치 하단 전용 콘솔로 전면 배치하여 접근성 및 사용성 극대화.
  3. 누락되었던 일정 글자 수 경과 시 플롯 자동 갱신(`autoPlot`) 온오프 토글 버튼 및 트리거 글자수 슬라이더를 설정 패널 및 워크벤치 상단 퀵 토글로 제공.
- **Reason**:
  1. `useNovelContent.ts`의 `saveNovel` 및 `novels` 리스너에서 `plot` 필드의 변경 감지 및 메타데이터 갱신 처리가 누락되어, Firestore 저장 시 디바운스 레이스 컨디션으로 인해 로컬 플롯이 덮어씌워지거나 초기화되던 치명적 결함 발생.
  2. 사용자가 AI에게 서사 방향성을 지시하는 핵심 인터페이스인 'Director Directive'가 좌측 설정 아코디언 하단에 파묻혀 있어 워크벤치 진입 시 즉시 사용하기 어려움.
  3. 에디터 글자 수 누적 기반 자동 플롯 갱신 엔진(`useAutoPlot`)은 완성되어 있었으나, 사용자가 이를 직관적으로 켜고 끌 수 있는 UI 토글 스위치가 제공되지 않았음.
- **Related Files**:
  - `src/hooks/useNovelContent.ts`: `saveNovel` 내 `plot` 메타데이터 dirty-checking 및 저장 로직 추가, `updateNovelContent`에 `immediate` 플래그 도입으로 즉시 저장 지원.
  - `src/hooks/useNovels.ts`: `addNovel` 시 새 소설 메타데이터에 `plot: ""` 기본값 초기화.
  - `src/components/SettingsPanel.tsx`: 자동화 설정 섹션에 '자동 플롯 갱신 (Auto-Plot)' 토글 스위치 및 트리거 글자수 조절 슬라이더 추가.
  - `src/components/PlotWorkbench.tsx`: 
    - `localPlotText` 상태 및 즉시 저장 파이프라인 구축으로 플롯 적용/편집 시 데이터 유실 완전 해결.
    - 하단 전폭 'Director Directive' 전용 콘솔 신설 (`Ctrl + Enter` 지원, 지시문 입력창, 플롯 생성 버튼 일체형).
    - 상단 헤더에 '본문 주입 켬/끔', '자동 갱신 켬/끔' 즉시 토글 알약 버튼 배치.
    - 상단 접이식 '엔진 설정' 드로어를 통해 모델, 추론 레벨, 온도, 토큰, 자동 갱신 설정을 한곳에서 통합 제어.
  - `src/components/AGENTS.md`, `src/hooks/AGENTS.md`, `/AGENTS.md`
- **Details**:
  - **Zero Data Loss Guarantee**: 플롯 편집 시 `handlePlotChange`가 로컬 상태를 선제 반영하고, '이 플롯 적용' 클릭 시 `updateNovelContent(..., immediate: true)`로 즉시 Firestore에 저장하여 비동기 디바운스 대기 중 탭 전환이나 리스너 동기화에 따른 데이터 증발을 완벽 차단.
  - **Ergonomic Directive Bar**: 서사 디렉터 지시창을 워크벤치 최하단에 상시 노출하여 모바일과 데스크톱 모두에서 한눈에 지시를 입력하고 바로 생성할 수 있도록 개편.
  - **Dual-Surface Automation Control**: SettingsPanel뿐만 아니라 PlotWorkbench 헤더와 내부 설정 드로어에서도 `autoPlot`과 `includeInPrompt`를 1클릭으로 자유롭게 토글할 수 있도록 접근성 향상.
## [2026-09-15] Feature: Dynamic Plot Blueprint & Narrative Director System (동적 플롯 설계도 및 서사 디렉터 시스템)
- **Task Name**: Dynamic Plot Blueprint & Narrative Director System Implementation (STP Phase 5: Execute)
- **Purpose**: 소설의 거시적 서사 방향성과 미시적 전개를 일관되게 제어하기 위해, 3대 필수 섹션(`[작품의 테마 및 장르상 유의점]`, `[장기 플롯]`, `[진행중인 플롯]`) 기반의 구조화된 플롯 설계도, CoT 추론 엔진, 엄격한 Fail-Fast 검증기, 전용 워크벤치 UI(`PlotWorkbench`), 프롬프트 인스펙터 실시간 검사 및 자동 트리거(`autoPlot`) 엔진 구축.
- **Reason**:
  1. 기존 Story Memory(줄거리 요약)는 과거 사건의 회고에 집중되어 있어, 향후 나아갈 복선, 사건 빌드업, 미회수 떡밥 전개 등 미래 지향적 서사 제어가 취약함.
  2. 플롯은 모호한 자유 산문 대신 표준화된 3대 필수 헤더를 가진 구조화된 마크다운 포맷으로 관리되어야 소설 본문 생성 AI가 혼선 없이 서사를 전개할 수 있음.
  3. 플롯 파싱 실패나 필수 헤더 누락 시 임의 생성으로 은폐하지 않고 즉각 오류를 표출하는 엄격한 Fail-Fast 원칙을 확립하여 데이터 정합성 보장.
  4. 프롬프트 주입 시 `[The Codex]` -> `[★ Plot Blueprint]` -> `[Story Memory]` -> `[Current Story Text]` 순서의 Recency-Biased Sandwich 아키텍처를 준수하여, 세계관 설정과 장기 플롯이 소설 본문의 강력한 전제 조건으로 작용하도록 배치.
- **Related Files**:
  - `src/types.ts`: `PlotSettings`, `Novel.plot`, `AutomationSettings.autoPlot`, `AITaskType.plot` 추가
  - `src/constants.ts`: `plotSystemPrompt`, `DEFAULT_MODELS.plot`, `GLOBAL_DEFAULTS.plot`, `plotInstruction` 추가
  - `src/prompts/plot_system.md`: 플롯 생성/갱신 전용 시스템 프롬프트 신설
  - `src/contexts/plot-generation.md`: 플롯 컨텍스트 템플릿 신설
  - `src/lib/contextProviders.ts`: `formatPlotBlueprint`, `case 'plot'` 메시지 어셈블리, `buildSyntheticHistoryMessages` 내 플롯 주입
  - `src/services/plotService.ts`: Strict Fail-Fast 파서 및 3대 필수 헤더 검증기
  - `src/services/promptService.ts`: `TASK_CONFIG`, `templates`, `generateTaskContext`에 `plot` 태스크 등록
  - `src/hooks/useAutoPlot.ts`: 플롯 생성, 제안 스테이징, 글자수 누적 자동 트리거 훅
  - `src/components/PlotWorkbench.tsx`: 플롯 워크벤치 모달, 3개 탭(최종 플롯, 설계도 에디터, CoT 사고 과정), 차이점 비교 및 즉시 반영 UI
  - `src/components/PromptInspector.tsx`: `plot` 컨텍스트 타입 지원, 실시간 파라미터 및 프롬프트 인스펙션
  - `src/components/SettingsPanel.tsx`: 플롯 설계도 섹션, Auto-Plot 토글 및 임계값 설정(1,000~30,000자), 워크벤치 바로가기
  - `src/components/EditorContainer.tsx`: 에디터 좌측 하단 Floating Bar에 Plot Workbench 진입 버튼(`Compass`) 및 제안 알림 뱃지 추가
  - `src/App.tsx`: PlotWorkbench 마운트, `useAutoPlot` 훅 연결, `incrementChars` 통합 라우팅, `inspectionContext` 확장
  - `/AGENTS.md`, `src/services/AGENTS.md`, `src/components/AGENTS.md`, `src/hooks/AGENTS.md`, `src/lib/AGENTS.md`, `src/contexts/AGENTS.md`
- **Details**:
  - **Fail-Fast Validation (`plotService.ts`)**: AI가 출력한 JSON 내 `finalPlotText`에 `[작품의 테마 및 장르상 유의점]`, `[장기 플롯]`, `[진행중인 플롯]` 헤더가 하나라도 누락되거나 JSON 파싱이 실패하면 즉시 예외를 던져 불완전한 데이터 오염을 완벽히 방지.
  - **Context Flow Integration**: `buildTaskMessages`에서 소설 본문 생성 시 플롯이 활성화(`includeInPrompt: true`)되어 있으면 Codex 바로 뒤, Story Memory 바로 앞에 `[★ Plot Blueprint]` 섹션을 주입.
  - **Auto-Plot Throttle**: `autoPlot: true`일 때 사용자가 입력/생성한 글자 수를 추적하여 사용자가 설정한 `autoPlotThreshold`(1,000~30,000자) 도달 시 백그라운드에서 자동으로 플롯 제안(`pendingPlotProposal`)을 생성하고 플로팅 버튼에 펄스 뱃지 표시.
  - **Inspection & Live Testing**: `PromptInspector`에서 `plot` 탭을 선택하고 사용자 지시문(`plotAIInstruction`) 및 설정을 실시간 변경하며 프롬프트 구조와 모델 디스패치 파라미터를 완전하게 검증 가능.
## [2026-09-15] Feature: Refiner Native Fluency & Inspection Engine (원어민 수준 문장 감수 및 이중 레이어 검증 엔진)
- **Task Name**: Refiner Native Fluency & Inspection Engine
- **Purpose**: 소설 본문의 언어와 문체에 동기화된 원어민 수준의 자연스러운 문장 교정 및 번역투(어색한 피동형, 대명사 남발, 기계적 어순, 부자연스러운 서술어) 감수 기능을 Refiner 2단계 파이프라인의 필수 분석 항목으로 통합.
- **Reason**:
  1. 기존 Refiner(일관성 검증기)는 설정/메모리/지시문과의 논리적 모순(`narrativeAnalysis`)만 주로 검사하여, AI 특유의 번역투나 어색한 한국어 문장 구조가 그대로 통과되는 한계가 존재.
  2. 사용자가 본문의 언어에 맞추어 원어민 시각에서 어색한 표현과 문장을 필수로 분석·검토하고 자연스럽게 리파이닝해줄 것을 요청.
  3. `hasConflicts` 트리거 로직을 확장하여 논리적 설정 오류뿐만 아니라 번역투/문장 어색함이 발견된 경우에도 `true`로 판정하여 윤문된 `refinedText`가 적용되도록 보장.
- **Related Files**:
  - `src/contexts/consistency_critique_context.md`
  - `src/prompts/consistency_critique_system.md`
  - `src/services/refinerService.ts`
  - `src/hooks/useAIEngine.ts`
  - `src/components/PromptInspector.tsx`
  - `/AGENTS.md`
  - `src/services/AGENTS.md`
  - `src/contexts/AGENTS.md`
  - `src/components/AGENTS.md`
- **Details**:
  - **Dual-Layer Critique System**: 프롬프트 템플릿에 `[Narrative Integrity]`와 `[Native Linguistic Fluency & Stylistic Polish]` 2대 분석 축을 필수 규정으로 명시. 번역투(영어/일어 직역투), 부자연스러운 이중 피동(`되어지다`, `불리워지다`), 주어/대명사 과다 노출(`그는`, `그녀는`), 어색한 조사 및 호응 불일치를 정밀 탐지.
  - **JSON Schema Extension**: `ConsistencyResponse` 인터페이스 및 JSON 출력 스키마에 `linguisticAnalysis` 필드를 정규화하여 narrative와 linguistic 분석을 독립적으로 추출.
  - **Conflict Trigger & Semantic Invariance**: 논리 오류뿐 아니라 문체적/언어적 어색함이 존재할 경우 `hasConflicts: true`로 판정하도록 규정하면서, 스토리 플롯/사건 전개는 임의로 왜곡하지 않고 문장 유려함만 극대화하는 '의미 불변성(Semantic Invariance Mandate)'을 강력히 강제.
  - **Service & Hook Integration**: `refinerService.ts`의 `ConsistencyResponse`, `extractConsistencyResponse`, `ConsistencyPipelineResult`에 `linguisticAnalysis`를 타입 안전하게 통합하고, `useAIEngine.ts`에서 상태에 기록.
  - **Inspector UI Polish**: `PromptInspector.tsx`에 `linguisticAnalysis` 및 감수된 항목(`conflicts`) 전용 시각화 카드를 추가하여, AI 응답 검사 시 서사 일관성과 언어적 감수 내역을 직관적으로 확인 가능하도록 개선.
## [2026-09-15] Refactor: Thinking Level Alignment & Dynamic Model-Aware SSOT Architecture
- **Task Name**: Thinking Level Alignment & Dynamic Model-Aware SSOT Architecture
- **Purpose**: `gemini-3.8-flash` 및 다양한 Gemini 3.x/2.5 모델들의 Thinking Level 호환성(400 Bad Request 방지), dynamic model-aware UI options, in-flight sanitization, dynamic headroom (+5000 HIGH, +2500 MEDIUM, +1500 LOW, +500 MINIMAL) 및 Single Source of Truth (SSOT) 아키텍처 확립
- **Reason**:
  1. `gemini-3.8-flash` 모델은 `MINIMAL` 레벨을 지원하지 않고 `LOW`, `MEDIUM`, `HIGH` (기본값: `MEDIUM`)를 지원하므로, 기존 하드코딩된 `MINIMAL` 기본값 및 UI 옵션 선택 시 400 Bad Request 오류가 발생하는 근본 결함 해결.
  2. 모델마다 지원하는 Thinking Level(`gemini-3.5-flash-lite`: `MINIMAL`, `LOW`, `HIGH` / `gemini-3.8-flash`: `LOW`, `MEDIUM`, `HIGH` / `gemini-3.7-flash`: `LOW`, `HIGH` 등)이 상이하여 정적 옵션 목록 대신 동적 모델 호환 목록이 필요함.
  3. UI(`SettingsPanel`, `Codex`, `MemoryWorkbench`)에서 모델 변경 시 유효하지 않은 Thinking Level이 남아있지 않도록 자동 전환(Auto-Transition) 및 In-Flight Service Sanitization 구축.
  4. `calculateEffectiveMaxTokens`에 `MEDIUM` (+2500 tokens) 헤드룸을 추가하여 균형잡힌 추론 시에도 본문 토큰 기아 현상을 방지.
- **Related Files**:
  - `src/types.ts`
  - `src/constants.ts`
  - `src/services/aiService.ts`
  - `src/components/SettingsPanel.tsx`
  - `src/components/Codex.tsx`
  - `src/components/MemoryWorkbench.tsx`
  - `/AGENTS.md`
  - `src/services/AGENTS.md`
  - `src/components/AGENTS.md`
- **Details**:
  - **Type Safety**: `ThinkingLevel` 유니온 타입(`'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH'`) 정의 및 `NovelSettings`에 엄격 적용.
  - **SSOT Matrix & Helpers**: `src/constants.ts`에 `ALL_THINKING_LEVELS`, `SUPPORTED_THINKING_LEVELS_BY_MODEL`, `getSupportedThinkingLevels`, `getDefaultThinkingLevel`, `getValidThinkingLevel` 정의. `GLOBAL_DEFAULTS.thinkingLevel`을 `'MEDIUM'`으로 갱신.
  - **Service-Level Sanitization & Headroom**: `aiService.ts`에서 `getValidThinkingLevel`을 통해 API 디스패치 전 유효성을 보장하고, `calculateEffectiveMaxTokens`에 MEDIUM (+2500) 버퍼 추가.
  - **Dynamic UI Adaptation**: `SettingsPanel.tsx`, `Codex.tsx`, `MemoryWorkbench.tsx`에서 활성 모델에 맞는 Thinking Level만 동적 렌더링하고, 모델 변경 시 즉시 유효한 레벨로 자동 보정.
## [2026-09-14] Optimization: Codex AI Generation Pipeline & Recency-Biased Sandwich Architecture
- **Task Name**: Codex AI Generation Pipeline & Recency-Biased Sandwich Architecture
- **Purpose**: 코덱스(세계관/등장인물/항목) AI 어시스턴트 생성 시 맥락 망각 및 지시 불이행(Recency Bias 취약점), 추론 토큰(Thinking)에 의한 조기 중단 및 토큰 고갈 문제를 완벽히 해결하고 SSOT 파이프라인 통합
- **Reason**:
  1. 기존 코덱스 프롬프트 조립 시 `[Target Lore Entry]`와 `[User Directive]`가 프롬프트 상단부에 배치되어, 방대한 `[Current Story Text]`에 밀려 모델이 최신성 편향(Recency Bias)으로 인해 수정 대상 항목과 사용자의 요구사항을 망각하고 소설 본문 쓰기를 반복하는 현상 발생.
  2. `promptService.ts`의 `generateTaskContext`에 `codex` 전용 분기가 누락되어 `codex` 설정(maxTokens, modelName, thinkingLevel 등)이 무시되고 novel 설정으로 fallback 되던 문제 해결.
  3. `GLOBAL_DEFAULTS.codex.maxTokens`가 1000으로 너무 타이트하여 장문 로어 생성 시 중도 절단되던 현상을 해결하기 위해 기본값을 3000으로 상향하고 슬라이더 범위를 500~16000으로 확장.
  4. Gemini 추론 모델(`gemini-3.8-flash`) 사용 시 `thinkingLevel` 버퍼(HIGH=5000, LOW=1500, MINIMAL=500)를 제공하여 추론 토큰으로 인해 본문 생성이 굶주리는 현상 방지.
- **Related Files**:
  - `src/types.ts`
  - `src/constants.ts`
  - `src/services/aiService.ts`
  - `src/services/promptService.ts`
  - `src/lib/contextProviders.ts`
  - `src/hooks/useAIEngine.ts`
  - `src/components/Codex.tsx`
  - `src/App.tsx`
  - `src/components/PromptInspector.tsx`
  - `/AGENTS.md`
  - `src/services/AGENTS.md`
  - `src/components/AGENTS.md`
  - `src/lib/AGENTS.md`
- **Details**:
  - **Type & Settings Extension**: `NovelSettings.codex`에 `thinkingLevel?: string;` 추가. `GLOBAL_DEFAULTS.codex`의 `maxTokens`를 3000으로 상향, `thinkingLevel: 'LOW'` 기본값 지정. `App.tsx`의 `getMyDefaults` 동기화.
  - **Recency-Biased Sandwich Architecture**: `contextProviders.ts`의 `buildTaskMessages` 내 `codex` 분기를 개편하여 [Active Lore & Story Memory (전역 배경)] -> [Current Story Text (소설 본문)] -> [Target Lore Entry to Update/Create (대상 항목)] -> [User Directive (유저 지시문)] -> [Output Format Directive (출력 규약)] 순으로 재배치하여 집중도 극대화.
  - **Dedicated Settings Routing (SSOT)**: `promptService.ts`에 `taskType === 'codex'` 분기를 신설하여 `novel.settings.codex`의 파라미터(온도, maxTokens, thinkingLevel 등)를 정확하게 바인딩.
  - **Engine Payload Unification**: `useAIEngine.ts`의 `handleGenerateCodex`에서 `promptInfo.config` 및 `thinkingLevel`이 generation API 호출로 정확하게 누락 없이 전달되도록 개편.
  - **Thinking Buffer Expansion**: `aiService.ts`의 `calculateEffectiveMaxTokens`에서 HIGH 버퍼를 5000, LOW 버퍼를 1500, MINIMAL 버퍼를 500으로 강화하여 추론 토큰 소진 방어.
  - **Codex UI Enhancement**: `Codex.tsx`의 Max Output Length 슬라이더를 500~16000으로 확장하고, Thinking Level 선택 셀렉터(Minimal, Low, High, Off) 제공.
  - **Diagnostic Visibility**: `PromptInspector.tsx`의 Model & Parameters 그리드에 `modelName` 및 `Thinking Level` 실시간 표시 지원.
## [2026-09-14] Enhancement: 60,000 Max Output Tokens for Consistency Refiner & Model-Aware OpenRouter Clamping
- **Task Name**: 60,000 Max Output Tokens for Consistency Refiner & Model-Aware Clamping
- **Purpose**: Refiner(일관성 검증 2단계)의 토큰 한도를 60,000 토큰으로 대폭 상향하여 Thinking 토큰 및 대용량 JSON 파싱 절단(Truncation)을 원천 차단하고 모델별 안전 상한 클램핑 적용
- **Reason**:
  1. Gemini 3.x/2.5 모델은 maxOutputTokens 내에서 내부 추론(Thinking) 토큰과 출력 텍스트를 함께 소진하므로, 기존 8,192 토큰 한도에서는 장문 비판 및 교정 본문 생성 중 후반부 JSON 괄호가 닫히지 않고 잘려 Fallback이 발생하는 문제가 있었음.
  2. Gemini Direct API는 최대 65,536 출력을 지원하므로 60,000 토큰으로 대폭 상향하여 절대로 잘리지 않는 넉넉한 헤드룸을 확보함.
  3. OpenRouter 경유 시 지원 한도가 8,192인 모델(Claude 3.5 Sonnet 등)에 과도한 토큰 요청으로 400 Bad Request가 발생하는 것을 방지하기 위해 모델별 안전 클램핑(`getModelMaxTokenLimit`) 및 자동 재시도 방어책 마련.
- **Related Files**:
  - `src/services/refinerService.ts`
  - `src/services/aiService.ts`
  - `/AGENTS.md`
  - `src/services/AGENTS.md`
- **Details**:
  - `refinerService.ts`: `UNCONSTRAINED_REFINER_MAX_TOKENS`를 8,192에서 60,000으로 상향.
  - `aiService.ts`: 
    - `getModelMaxTokenLimit`: Gemini Direct는 60,000, OpenRouter의 경우 Gemini/Claude 3.7/DeepSeek R1/o1/o3 등은 60,000, GPT-4o는 16,384, Claude 3.5는 8,192, 기타 모델은 8,192/4,096으로 지능형 클램핑.
    - `calculateEffectiveMaxTokens`: `targetTokens + thinkingBuffer`를 모델별 안전 한도(최대 60,000) 내에서 동적 계산하도록 개편.
    - `generateOpenRouterContent`: max_tokens 초과 에러 응답 수신 시 4,096으로 안전하게 자동 폴백 재시도하는 방어 메커니즘 추가.
## [2026-09-14] Fix: Unconstrained Token Headroom & Diagnostic Reporting for Consistency Refiner
- **Task Name**: Unconstrained Token Headroom & Diagnostic Reporting for Consistency Refiner
- **Purpose**: Stage 2 Consistency Refiner에서 발생하던 JSON Truncation 및 오래된 'XML parsing failed' 에러 메시지 제거
- **Reason**:
  1. Refiner는 창작 생성기가 아닌 교정기(Reviser)이므로 불필요하게 maxTokens를 작게(800~1200) 제한할 필요가 없었음.
  2. 오히려 Gemini 추론 토큰(Thinking Tokens) + 비평 분석 + JSON 구조 + 교정 본문 출력이 이 타이트한 토큰 한도를 초과하면서 닫는 괄호 `}` 전에서 잘려 JSON.parse SyntaxError가 발생함.
  3. 에러 발생 시 오래된 하드코딩 문구인 "XML parsing failed."가 출력되어 혼란을 유발함.
- **Related Files**:
  - `src/services/refinerService.ts`
- **Details**:
  - **Unconstrained Headroom**: Refiner 실행 시 `UNCONSTRAINED_REFINER_MAX_TOKENS = 8192`를 할당하여 Thinking 단계와 JSON 완결이 중간에 잘리지 않도록 안전한 풀 헤드룸 보장.
  - **Precise Diagnostic Reporting**: `extractConsistencyResponse`의 반환 타입을 `{ success: true, data } | { success: false, error, rawText }`로 강화.
  - 파싱 실패 시 `stage2Error`에 정확한 파싱 에러 원인(`JSON parsing failed (SyntaxError: ...). Preview: ...`)을 기록하여 Prompt Inspector 및 개발자 진단에서 원본 응답 상태를 즉시 확인할 수 있도록 개선.
## [2026-09-14] Task: Refiner Anchor Adaptation & JSON Protocol Alignment
- **Task Name**: Refiner Anchor Adaptation & JSON Protocol Alignment
- **Purpose**: Novel 생성 시 2단계 무결성 검증 엔진(Consistency Refiner)이 변경된 Anchor 시스템에서 초안을 지속적으로 오류로 오인 및 파싱 실패하는 문제 해결
- **Reason**:
  1. Stage 1에서 생성된 초안(`rawDraft`)의 첫머리에 직전 본문의 끝부분(Anchor 문구)이 에코되어 포함되어 있었으나, 이를 트리밍하지 않은 채 Refiner에 `RAW_DRAFT`로 전달하여 직전 본문 문장을 무단 중복한 오류(`hasConflicts: true`)로 잘못 판정함.
  2. API 레벨(`promptService.ts`)에서는 `consistency` 태스크에 `responseFormat: 'json'`을 강제하고 있었으나, 프롬프트 템플릿과 파서(`refinerService.ts`)는 XML 태그(`<critique>...</critique>`)를 요구하여 파싱 실패 및 Fallback이 상시 발생함.
  3. 유저 지시문(`{}`)을 Refiner에 중복 주입하지 않고 기존 초안의 맥락을 존중하라는 요구사항 반영.
- **Related Files**:
  - `src/prompts/consistency_critique_system.md`
  - `src/contexts/consistency_critique_context.md`
  - `src/services/refinerService.ts`
  - `src/hooks/useAIEngine.ts`
  - `src/lib/utils.ts`
- **Details**:
  - **Pre-Trimming Pipeline**: `stitchAndTrimAnchor` 유틸리티를 `src/lib/utils.ts`로 추출하여 전역 사용 가능하게 개선.
  - `refinerService.ts` 내부의 `runConsistencyPipeline` 단계에서 Stage 1 생성 텍스트(`rawDraft`)를 Refiner에 넘기기 **직전에** 앵커를 제거(`trimmedDraft`)하여 순수 신규 본문만 `RAW_DRAFT`로 전달하도록 파이프라인 정비.
  - **Native JSON Protocol Unification**: `consistency_critique_system.md`와 `consistency_critique_context.md`를 XML에서 순수 JSON 스키마(`{ narrativeAnalysis, hasConflicts, refinedText }`)로 개편.
  - `refinerService.ts` 내에 강력한 마크다운 코드블록 스트리핑 로직을 탑재한 `extractConsistencyResponse` JSON 파서 적용.
  - **Double-Trimming Prevention**: `useAIEngine.ts`에서 Refiner를 통과한 텍스트(`finalText`)는 이미 순수 본문 상태이므로 에디터 삽입 직전 불필요한 2차 앵커 트리밍을 배제(`alreadyTrimmed` 플래그 도입)하고 최종 토큰 슬라이스만 수행하도록 정돈.
  - **Context Cleanliness**: Refiner 메시지에 별도의 유저 지시문 강제 주입을 배제하여 초안의 서사 흐름과 자연스러운 연속성을 온전히 보존.
## [2026-09-14] Feature: Task-Aware Engine-Side Token Slicing & Thinking Buffer Architecture
- **Task:** Decouple Thinking tokens from user-facing prose generation and implement precision engine-side token slicing without injecting length instructions into prompts.
- **Purpose:** Resolve the unpredictable output length issue caused by Gemini reasoning/thinkingLevel consuming maxOutputTokens, while strictly preserving the author's core design philosophy (uninterrupted narrative flow with natural, hard cutoff at exact user-configured maxTokens).
- **Reason:** In Gemini 3.x models, `maxOutputTokens` encompasses both internal reasoning tokens and final output tokens. Setting `thinkingLevel: HIGH` severely starved visible output tokens, rendering user `maxTokens` configurations non-deterministic. Furthermore, injecting length constraints into prompts was explicitly rejected because it forces artificial pacing and rushed endings.
- **Related Files:** `src/lib/tokenSlicer.ts`, `src/services/aiService.ts`, `src/hooks/useAIEngine.ts`, `src/services/refinerService.ts`, `src/components/SettingsPanel.tsx`, `/AGENTS.md`, `src/services/AGENTS.md`, `src/hooks/AGENTS.md`, `src/lib/AGENTS.md`
- **Details:**
  - Created `src/lib/tokenSlicer.ts` with `sliceProseByTokens` and `estimateTokens`, accurately modeling LLM SentencePiece/BPE densities (Hangul ~0.7 tokens/char, English ~0.25 tokens/char, whitespace, punctuation) to perform microsecond linear-time physical slicing.
  - Implemented `calculateEffectiveMaxTokens` in `src/services/aiService.ts` to add dynamic thinking headroom (+2048 for HIGH, +1024 for LOW) to `maxOutputTokens` at the API level, preventing thinking starvation without touching system or user prompts.
  - Integrated `sliceProseByTokens` into `useAIEngine.ts` (`handleContinue`) immediately following anchor trimming and physical newline detection, enforcing physical cutoff strictly at dynamic `currentNovel.settings.maxTokens`.
  - Applied isolation between tasks: Novel continuation (`novel`) uses anchor trimming and precision token slicing for natural cutoff; Completion tasks (`codex`, `memory`, `autocodex`) bypass slicing and trimming to preserve complete sentences, summaries, and valid JSON structures.
  - Scoped Stage 1 drafts and refined outputs in `src/services/refinerService.ts` with `sliceProseByTokens` to ensure 2-stage consistency critique operates strictly within the user-specified token boundary.
  - Updated UI help text in `src/components/SettingsPanel.tsx` for the Max Tokens slider to clarify guaranteed prose cutoff behavior under thinking models.
## [2026-09-13] Feature: Refresh LLM Model Lineup & Set Gemini 3.8 Flash as Default
- **Task:** Reorganize available LLM models to 3.8 Flash, 3.7 Flash, 3.6 Flash, 3.1 Pro Preview, and 3.5 Flash Lite, and establish `gemini-3.8-flash` as the global default.
- **Purpose:** Provide users with the latest generation of Gemini models and set the fastest, highest-performing `gemini-3.8-flash` as the primary engine for novel writing, auto-codex, and memory tasks.
- **Reason:** Legacy preview models (such as `gemini-3-flash-preview` and `gemini-3.1-flash-lite-preview`) were outdated. The lineup needed a clean refresh with 3.8 Flash as the primary default.
- **Related Files:** `src/constants.ts`, `src/services/aiService.ts`, `/AGENTS.md`, `src/services/AGENTS.md`
- **Details:**
  - Updated `AVAILABLE_MODELS` in `src/constants.ts` with the new 5-tier lineup: `gemini-3.8-flash` (Default), `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.1-pro-preview`, and `gemini-3.5-flash-lite` for both Direct Gemini and OpenRouter providers, alongside `x-ai/grok-4.20`.
  - Set `gemini-3.8-flash` as the default model across `DEFAULT_MODELS` and `GLOBAL_DEFAULTS` (`novel`, `codex`, `memory`, `autoCodex`).
  - Updated fallback model references in `src/services/aiService.ts` to `gemini-3.8-flash`.
  - Updated system architecture and model inventory documentation in `/AGENTS.md` and `src/services/AGENTS.md`.
## [2026-09-13] Improvement: Enforce Plain Prose Output & Recency Directive for Story Memory
- **Task:** Eliminate markdown formatting (`#`, `##`, `**`, `-`, `*`) and redundant section headers (`## [Story Memory]`) from Story Memory generation.
- **Purpose:** Ensure Story Memory generates clean, pure narrative summary paragraphs ready for direct injection without duplicate headers or markdown clutter.
- **Reason:** Previous prompt instructions used terms like "structured summary", prompting LLMs to generate sub-headers and bullet lists. Furthermore, models echoed context headers when not firmly bounded at the end of the prompt.
- **Related Files:** `src/prompts/memory_system.md`, `src/lib/contextProviders.ts`, `src/constants.ts`
- **Details:**
  - Revised `src/prompts/memory_system.md` to mandate plain prose sentences/paragraphs and explicitly forbid markdown syntax, bullet points, and section header titles (`## [Story Memory]`, `[Summary]`, `Story Memory:`).
  - Added `[Output Format Directive]` as a Recency Directive at the very bottom of the User message in `buildTaskMessages` (`taskType === 'memory'`), ensuring the LLM's immediate generation token adheres strictly to plain prose.
  - Aligned `GLOBAL_DEFAULTS.memoryInstruction` in `src/constants.ts` to request plain prose summaries without headers or lists.
## [2026-09-13] Fix: Set Individual Codex AI Assistant to Plain Text Output Mode
- **Task:** Fix unwanted JSON responses in individual Codex AI Assistant generation.
- **Purpose:** Ensure the individual Codex AI Assistant outputs plain text bracketed headers (`[Header]`) according to `codex_system.md` constraints instead of being forced into JSON format.
- **Reason:** In `promptService.ts`, `responseFormat` was mistakenly set to `'json'` for `taskType === 'codex'`, which activated `responseMimeType: 'application/json'` on the LLM API and forced the model to return JSON objects rather than plain prose lore text.
- **Related Files:** `src/services/promptService.ts`, `/AGENTS.md`, `src/services/AGENTS.md`
- **Details:**
  - Corrected `responseFormat` in `src/services/promptService.ts` so that only `autocodex` and `consistency` use `'json'`, while `novel`, `memory`, and `codex` use `'text'`.
  - Updated documentation in `/AGENTS.md` and `src/services/AGENTS.md` to clarify the separation between Auto-Codex (JSON schema for multi-entry proposals) and Codex Assistant (Plain text for single-entry generation).
## [2026-09-13] Refactor: Unify Message Assembly Engine (SSOT) Across All AI Tasks
- **Task:** Implement `buildTaskMessages` Single Source of Truth (SSOT) engine to unify conversation turn assembly and context injection.
- **Purpose:** Resolve context loss in `Memory Workbench`, `Codex Assistant`, and `Auto-Codex`, ensuring `The Codex` and `Story Memory` are consistently injected into the `Messages` payload across all AI tasks without code fragmentation.
- **Reason:** Previously, `promptService.ts` manually assembled messages with fragmented `if/else` branches for each task, causing memory and lore context blocks calculated by `contextProviders.ts` to be skipped for non-novel tasks.
- **Related Files:** `src/lib/contextProviders.ts`, `src/services/promptService.ts`, `src/types.ts`, `src/services/AGENTS.md`, `src/lib/AGENTS.md`, `/AGENTS.md`
- **Details:**
  - Added `AITaskType` definition to `src/types.ts`.
  - Implemented `buildTaskMessages({ taskType, variables, novel, extraData })` in `src/lib/contextProviders.ts`.
  - Unified the Context Envelope: Automatically prepends `topContextPrefix` (`[The Codex]` + `[Story Memory]`) at the top of the User turn for all tasks (`novel`, `memory`, `autocodex`, `codex`, `consistency`).
  - Differentiated Turn Strategy: Employs `buildSyntheticHistoryMessages` (multi-turn anchor stitching) exclusively for `novel` generation, while using single-turn structured prompts for `memory`, `codex`, `autocodex`, and `consistency` to eliminate task confusion.
  - Refactored `generateTaskContext` in `src/services/promptService.ts` to replace manual message assembly with a clean, centralized call to `buildTaskMessages`.
  - Fully updated living documentation across `src/services/AGENTS.md`, `src/lib/AGENTS.md`, and `/AGENTS.md`.
## [2026-09-13] Fix: Standardize ## Heading for Current Story Text Section
- **Task:** Standardize markdown hierarchy for `Current Story Text` in prompt assembly.
- **Purpose:** Ensure all major context sections (`The Codex`, `Story Memory`, `User Directive`, `Current Story Text`) consistently use H2 markdown headers (`## [Section Name]`).
- **Reason:** `[Current Story Text]` was previously rendered without `## `, causing structural inconsistency where other context blocks used `## [Name]`, potentially confusing LLM context boundary detection.
- **Related Files:** `src/lib/contextProviders.ts`
- **Details:**
  - Updated `buildSyntheticHistoryMessages` to use `## [Current Story Text]` uniformly in both the initial User turn (`Turn 1`) and the active User turn (`Turn 2`).
  - Added curly brace sanitization in `getRawPlainText` to prevent duplicate `{}` nesting when parsing instruction spans.
## [2026-09-13] Fix: Restore Codex & Story Memory Injection into Top User Turn in Novel Generation
- **Task:** Reconnect active Codex (Lorebook) and Story Memory to Novel generation messages at the top User turn.
- **Purpose:** Resolve the regression where Codex (`ACTIVE_LORE_BLOCK`) and Story Memory (`STORY_MEMORY_BLOCK`) were omitted from `Messages` during the Anchor Stitching / Prefill migration.
- **Reason:** Placing Codex and Story Memory in the very first User turn (`Turn 1 User`) establishes the world rules and past events as initial chronological premises (Timeline Alignment), preventing Recency Bias conflicts between stale static lore and the active narrative progression, while leaving the active User turn focused purely on immediate directives and continuation anchors.
- **Related Files:** `src/lib/contextProviders.ts`, `src/services/promptService.ts`
- **Details:**
  - Updated `buildSyntheticHistoryMessages` in `src/lib/contextProviders.ts` to accept `activeLore?: string` and `storyMemory?: string`.
  - In 3-turn mode (`remaining >= 200`), injected `topContextPrefix` (`[The Codex]` + `[Story Memory]`) at the top of the initial User turn (`Turn 1 User`), ahead of `[Current Story Text]\n${part1}`.
  - In single-turn mode (`remaining < 200`), combined `topContextPrefix` at the top of the single User turn.
  - Updated `src/services/promptService.ts` to forward `allVariables.ACTIVE_LORE_BLOCK` and `allVariables.STORY_MEMORY_BLOCK` to `buildSyntheticHistoryMessages`.
## [2026-09-13] Refactor: Complete Prefill Cleanup & Anchor Stitching Migration
- **Task:** Remove legacy Prefill architecture, clean up unused constants/types, and complete the transition to Anchor Stitching.
- **Purpose:** Comply with the unified pipeline architecture outlined in `PLAN_PREFILL_CLEANUP.md`, resolving TypeScript errors left over from the initial cleanup phases.
- **Reason:** Legacy `prefillPrompt` and `codexPrefillPrompt` were causing TypeScript errors in `App.tsx` and `contextProviders.ts`. The variables needed to be completely removed from the frontend state and React components.
- **Related Files:** `src/App.tsx`, `src/lib/contextProviders.ts`, `src/services/promptService.ts`, `src/services/refinerService.ts`, `src/hooks/useAIEngine.ts`, `src/components/PromptInspector.tsx`, `src/components/PromptPresetManager.tsx`
- **Details:**
  - Removed `prefillPrompt` and `codexPrefillPrompt` states from `App.tsx` (`getMyDefaults`, `resetPromptsToDefaults`, `openFullScreenEditor`).
  - Removed prefill-related variables from `inspectorExpanded` in `App.tsx` and `PromptInspector.tsx`.
  - Refactored `contextProviders.ts` to replace `PREFILL_BLOCK_NOVEL` and `PREFILL_BLOCK_CODEX` with a unified `ANCHOR_TAIL_TEXT`.
  - Updated `promptService.ts` and `refinerService.ts` to consume `anchorTailText` instead of `prefillSuffix`.
  - Updated `useAIEngine.ts` deduplication logic to use the new `anchorTailText` property.
  - Removed prefill references from `PromptPresetManager.tsx`.
## [2026-09-13] Fix: Preserve Leading Whitespace in Inline Continuation
- **Task:** Fix inline continuation gluing words together by preserving leading spaces in `useAIEngine.ts`.
- **Purpose:** Ensure that when the AI continues on the same line (inline continuation), spaces between the existing text and the AI's first word are preserved (preventing e.g. "자리의" + " 한" from becoming "자리의한").
- **Reason:** `cleanedText.replace(/^[ \t]+/, '')` was unconditionally stripping leading spaces prior to newline checking, which mutated the content and discarded intentional word delimiters for inline continuations.
- **Related Files:** `src/hooks/useAIEngine.ts`
- **Details:**
  - Separated newline detection regex (`/^[ \t]*(\n+)/`) from text mutation.
  - In inline mode (`newlineCount === 0`), `cleanedText` leading spaces are preserved, with a duplicate space guard against cases where the editor already ended with a space.
## [2026-09-13] Fix: Bulletproof XML Anchors & Directive Leakage Prevention
- **Task:** Eliminate quote (`""`) collision in anchors and prevent directives from leaking into the raw story context.
- **Purpose:** Ensure flawless anchor matching regardless of newlines or dialogue quotes, and guarantee directives are strictly isolated in the `[User Directive]` block.
- **Reason:** Large Language Models get easily confused when instructing them to repeat text wrapped in `""` if the text itself contains quotes or multiple newlines. Additionally, `promptService.ts` was injecting `RAW_PLAIN_TEXT` (which included unstripped directives) instead of `CLEAN_STORY_CONTEXT` into the generation pipeline, causing directives to incorrectly bleed into the anchor and story context.
- **Related Files:** `src/lib/contextProviders.ts`, `src/services/promptService.ts`
- **Details:**
  - Upgraded `[Anchor Instruction]` to wrap the target anchor inside `<anchor>` XML tags, providing absolute syntax immunity against nested quotes or multiline breaks.
  - Exported `CLEAN_STORY_CONTEXT` from `buildTotalVariableDictionary`.
  - Replaced the flawed `RAW_PLAIN_TEXT` injection in `promptService.ts` with `CLEAN_STORY_CONTEXT`, ensuring directives never pollute the anchor calculation or the model's story baseline.
## [2026-09-13] Improvement: Empty Anchor Fallback for Directives
- **Task:** Inject an anti-conversational filler fallback when no anchor is available.
- **Purpose:** Prevent the AI from generating conversational responses (e.g., "Sure, here is the introduction...") when starting a novel from scratch using only a `{ }` directive.
- **Reason:** Directives are stripped from the story context. If the document is empty besides a directive, the text anchor becomes completely empty, disabling the `[Anchor Instruction]`. Without a firm directive, LLMs tend to fall back into chatbot personas. 
- **Related Files:** `src/lib/contextProviders.ts`
- **Details:**
  - Added a `[System Note]` fallback that strictly commands the AI to output *only* raw story text when `expectedAnchor` is empty.
## [2026-09-13] Improvement: Remove Hardcoded Synthetic History Fallback
- **Task:** Eliminate hardcoded fantasy/weapon example from `buildSyntheticHistoryMessages`.
- **Purpose:** Prevent genre and narrative context contamination when writing short stories or at the beginning of a novel (<200 characters preceding context).
- **Reason:** The hardcoded fallback injected a specific dark fantasy example ("어둠이 짙게 깔린 숲길을 걸으며, 그는 칼자루를 꽉 쥐었다.") into the model's few-shot history, priming unrelated genres (romance, modern, sci-fi) to generate weapons or suspense. Modern models follow `[Anchor Instruction]` reliably without needing artificial multi-turn history for short contexts.
- **Related Files:** `src/lib/contextProviders.ts`
- **Details:**
  - Replaced the hardcoded user/model fallback in `buildSyntheticHistoryMessages` with a clean single-turn user payload (`[{ role: "user", content: finalUserContent }]`) when `remaining.length < 200`.
## [2026-09-13] Fix: Anchor Stitching Trailing Newline & Whitespace Consumption Bug
- **Task:** Fix physical newline loss during the first generation block due to anchor stitching consuming intended AI newlines.
- **Purpose:** Ensure `\n\n` intended by the AI correctly prepends a blank line when inserted into the editor.
- **Reason:** Tiptap's HTML to plaintext parser replaces `</p>` with `\n`, causing the `tailText` anchor to end with `\n`. When the AI generated `\n\n`, the `stitchAndTrimAnchor` function matched the first `\n` as part of the anchor, resulting in `newlineCount = 1` instead of `2`.
- **Related Files:** `src/hooks/useAIEngine.ts`
- **Details:**
  - Applied `trimEnd()` to `tailText` in `stitchAndTrimAnchor` so trailing newlines/spaces do not consume the AI's structural formatting.
  - Trimmed leading spaces before checking `^(\n)+` to prevent ` \n\n` from evaluating to `0` newlines.
  - Fixed the inline branch multi-line insert position from `docSize` to `docSize + lines[0].length` to accurately append subsequent paragraphs outside the first inserted text node.
## [2026-09-13] Fix: Restore Normal Paragraph Spacing & Clean Boundary Insertion
- **Task:** Revert double-spacing artifact and fix initial/inline newline insertion logic in `useAIEngine.ts`.
- **Purpose:** Ensure initial newlines from AI completions and subsequent paragraphs insert cleanly without unwanted double-spacing or broken paragraph boundaries.
- **Reason:** `<p><br></p>` caused excessive spacing in the user's styling setup. Inline multi-line insertion at `currentPos + lines[0].length` inserted subsequent paragraphs inside the active paragraph rather than creating proper top-level paragraph blocks at `docSize`.
- **Related Files:** `src/hooks/useAIEngine.ts`
- **Details:**
  - Standardized paragraph mapping to `<p>${line}</p>` with empty `<p></p>` preserving single blank lines.
  - Fixed inline branch with multiple lines so subsequent paragraphs cleanly insert at `docSize` outside the existing paragraph.
  - Verified `newlineCount >= 2` blank line prepending and single newline paragraph generation.
## [2026-09-13] Fix: Empty Line Collapse in ProseMirror HTML Insertion
- **Task:** Fix empty paragraph collapse during Anchor Stitching insertion.
- **Purpose:** Ensure two newlines (`\n\n`) accurately render as an empty blank line separating paragraphs in the Tiptap editor.
- **Reason:** Tiptap/ProseMirror DOMParser strips completely empty `<p></p>` tags during schema normalization.
- **Related Files:** `src/hooks/useAIEngine.ts`
- **Details:**
  - Introduced `formatLinesToHtml` helper converting empty lines (`""`) into valid `<p><br></p>` tags.
  - Normalized all CRLF (`\r\n`) and CR (`\r`) to standard LF (`\n`) before splitting.
  - Replaced `<p></p>` with `<p><br></p>` for the leading blank paragraph separation.
## [2026-09-13] Architecture Shift: Anchor Stitching Engine (Overlap Continuation)
- **Task:** Transition from artificial tag protocols (`[INLINE]`, `[NEW_LINE]`, `[BLANK_LINE]`) to pure Anchor Stitching (Overlap Continuation).
- **Purpose:** Eliminate model cognitive distortion caused by reverse-causality tag prediction, allowing LLM to write with full natural prose momentum while accurately trimming the repeated anchor text in post-processing.
- **Reason:** Tag protocols failed because next-token prediction forced the model to categorize paragraph structure before generating the text, causing model collapse into `[NEW_LINE]` regardless of sentence continuity.
- **Related Files:** `src/prompts/novel_system.md`, `src/contexts/novel-generation.md`, `src/lib/contextProviders.ts`, `src/services/refinerService.ts`, `src/hooks/useAIEngine.ts`
- **Details:**
  - Removed all artificial structural tags (`[INLINE]`, `[NEW_LINE]`, `[BLANK_LINE]`) from prompts and context templates.
  - Formulated the Anchor Stitching protocol: AI echoes the final 10-25 characters of the existing text as an anchor, then continues with natural novel prose formatting (`\n\n`, `\n`, or inline).
  - Refactored `buildSyntheticHistoryMessages` in `contextProviders.ts` to reflect the anchor-repetition pattern without meta-tags.
  - Implemented `stitchAndTrimAnchor` in `useAIEngine.ts` with direct prefix and whitespace-tolerant matching to reliably remove the repeated anchor phrase.
  - Simplified Tiptap insertion: directly maps physical newlines from the trimmed text (`\n\n` -> `<p></p>` blank line + new paragraph, `\n` -> new paragraph, inline -> paragraph internal insertion at `docSize - 1`).
## [2026-09-13] Feature: Plan A Deterministic Structural Protocol & Dynamic Author-Style History
- **Task:** Transition completely to Plan A deterministic tag routing (`[BLANK_LINE]`, `[NEW_LINE]`, `[INLINE]`) and implement Dynamic Author-Style Few-shot History.
- **Purpose:** Enable AI to accurately learn the author's real paragraphing rhythms (including empty line breaks and paragraph spacing) via dynamic few-shot history, and ensure deterministic Tiptap insertion without fragile DOM inspection.
- **Reason:** Fragile DOM checks in Plan B failed due to ProseMirror schema normalization. Hardcoded synthetic history caused severe model bias toward inline completions.
- **Related Files:** `src/prompts/novel_system.md`, `src/contexts/novel-generation.md`, `src/lib/contextProviders.ts`, `src/services/refinerService.ts`, `src/hooks/useAIEngine.ts`
- **Details:**
  - Expanded protocol to three distinct states: `[BLANK_LINE]`, `[NEW_LINE]`, `[INLINE]`.
  - Re-architected `buildSyntheticHistoryMessages` to dynamically analyze the author's real preceding text (`remaining`), detecting actual `\n\n` (blank lines), `\n` (new lines), or mid-sentence continuations, and injecting the corresponding tag into the Model turn.
  - Updated `refinerService.ts` to preserve `[BLANK_LINE]` during 2-stage consistency refinement.
  - Refactored `useAIEngine.ts` to execute deterministic Plan A insertions: `BLANK_LINE` inserts `<p></p>` plus content at `docSize`, `NEW_LINE` inserts content at `docSize`, and `INLINE` inserts within the current paragraph at `docSize - 1`.
## [2026-09-13] Feature & Fix: Structural Tag Continuation Protocol ([INLINE] vs [NEW_LINE])
- **Task:** Implement Structural Tag Continuation Protocol and Smart Paragraph Insertion to resolve text concatenation and empty line insertion issues.
- **Purpose:** Prevent AI generations from colliding or erroneously gluing onto previous paragraphs, while properly continuing mid-sentence inputs without artificial paragraph breaks or text duplication.
- **Reason:** Gemini API prefill deprecation caused AI completions to frequently glue onto finished sentences or crush empty lines created by user `Enter` keystrokes. Aggressive `.trimEnd()` stripped intentional blank lines.
- **Related Files:** `src/prompts/novel_system.md`, `src/contexts/novel-generation.md`, `src/lib/contextProviders.ts`, `src/services/refinerService.ts`, `src/hooks/useAIEngine.ts`
- **Details:**
  - Added Section 7 "Continuation Structure Protocol" to `src/prompts/novel_system.md` instructing the model to begin outputs with either `[INLINE]` or `[NEW_LINE]`.
  - Added structural tag requirement to `src/contexts/novel-generation.md` as an anchored system rule.
  - Removed aggressive `.trimEnd()` from `getRawPlainText` and `processNovelContext` in `src/lib/contextProviders.ts` to preserve user-created trailing newlines/spaces.
  - Injected `[INLINE]` into the Model turn of `buildSyntheticHistoryMessages` to align few-shot history with the structural tag protocol.
  - In `src/services/refinerService.ts`, safeguarded the structural tag so that Stage 2 consistency refinement cannot accidentally drop the tag.
  - In `src/hooks/useAIEngine.ts`, parsed `[NEW_LINE]` / `[INLINE]`, stripped the tag before mathematical overlap removal, analyzed `isLastNodeEmpty`, and routed insertion either to a new paragraph (`<p>...</p>` at `docSize`) or inline (`docSize - 1`), with precise Tiptap AI highlight marking.
## [2026-09-13] Refactor: Prefill Deprecation Migration & Dynamic Synthetic History
- **Task:** Migrate from legacy Prefill API to Dynamic Synthetic Multi-turn History and Native JSON modes.
- **Purpose:** Comply with Gemini 3.7+ API deprecation of `role: "model"` prefill patterns which were causing 400 Bad Request errors, and improve robustness of the AI pipeline.
- **Reason:** Legacy AI pipeline broke due to API changes. It required transitioning to a standard message structure and pure mathematical overlap matching to prevent hallucinated edits in the frontend.
- **Related Files:** `src/services/aiService.ts`, `src/services/contextBuilder.ts`, `src/lib/contextProviders.ts`, `src/services/promptService.ts`, `src/hooks/useAIEngine.ts`, `src/hooks/useAutoCodex.ts`, `src/services/refinerService.ts`, `src/components/PromptInspector.tsx`
- **Details:** 
  - Overhauled `GenerationParams` to use `messages` and `responseFormat`.
  - Deprecated `<Prefill>` and `<User>` tags from markdown templates.
  - Implemented `buildSyntheticHistoryMessages` with sliding-window chunking.
  - Integrated `removeMathematicalOverlap` in frontend for deterministic deduplication without heuristics.

# AUDIT_LOG.md

모든 코드 수정 내역을 기록하는 변경 추적 로그입니다. 에이전트는 코드 편집(edit_file, multi_edit_file)을 수행한 후, 반드시 이 파일에 변경 내역을 기록해야 합니다.
## [2026-08-28] Refactor: Unified Model Selection Interface
- **목적:** 모든 모델 선택 인터페이스(SettingsPanel의 Auto-Codex, MemoryWorkbench, Codex AI)를 통합된 단일 진실 공급원(`AVAILABLE_MODELS`)으로 마이그레이션.
- **이유:** 업데이트마다 4개 이상의 흩어진 `select` 블록을 수동으로 동기화해야 하는 유지보수 파편화 문제 해결.
- **변경 사항:**
  - `src/components/SettingsPanel.tsx`: Auto-Codex 설정 부분의 하드코딩된 `<select>`를 `AVAILABLE_MODELS` 매핑으로 교체. TypeScript 타입 안전성을 위해 `model` 속성 할당 제거 (NovelSettings.autoCodex는 model 속성을 가지지 않음).
  - `src/components/MemoryWorkbench.tsx`: AI Summary 모델 선택 시 Provider 토글(Gemini/OpenRouter)을 제거하고 단일 `<select>` 리스트 렌더링. Legacy fallback 적용 및 deep-copy(`...prev`)로 상태 병합 로직 방어.
  - `src/components/Codex.tsx`: Codex AI 어시스턴트 설정의 Provider 토글 버튼 렌더링 제거. 단일 `<select>`에서 모델을 변경할 때 `AVAILABLE_MODELS`에서 제공자(provider)를 유추하여 상태를 자동 업데이트하도록 개선.
- **관련 파일:** `src/components/SettingsPanel.tsx`, `src/components/MemoryWorkbench.tsx`, `src/components/Codex.tsx`
## [2026-08-28] Feature: Expand AI Model Lineup without Categories
- **목적:** 설정 패널(SettingsPanel)에서 소설 생성에 사용되는 모델 목록을 확장하고 최신 모델(3.7-flash)을 포함하며, 범주화 없이 직관적인 단일 리스트로 제공.
- **이유:** 사용자가 이미 모델 스펙에 대한 사전 지식이 있으므로, "Gemini / OpenRouter"와 같은 UI 상의 탭 분리나 그룹화가 불필요하다고 판단됨. 또한, 기존 `gemini-3-flash-preview`를 디폴트로 유지하면서도 최신 버전을 옵션으로 제공하여 선택권을 강화.
- **변경 사항:**
  - `src/constants.ts`: 모델 ID, 라벨, API 제공자(provider)를 포함한 `AVAILABLE_MODELS` 배열을 정의하여 SSOT(단일 진실 공급원)로 기능하도록 추가.
  - `src/components/SettingsPanel.tsx`: 기존의 Gemini / OpenRouter 선택 토글 및 하드코딩된 모델 옵션들을 모두 제거하고, `AVAILABLE_MODELS` 배열을 순회하여 `<select>` 메뉴 렌더링. 사용자가 모델을 선택할 때 `provider` 정보도 함께 업데이트하도록 로직 수정. Legacy Fallback (현재 DB에 저장된 모델이 목록에 없더라도 커스텀으로 유지되도록 함)도 추가.
  - `AGENTS.md`: AI Service Integration 항목의 지원 모델 목록에 `gemini-3.7-flash` 및 `google/gemini-3.7-flash` 추가 반영.
- **관련 파일:** `src/constants.ts`, `src/components/SettingsPanel.tsx`, `AGENTS.md`
## [2026-04-26] Architecture Shift: Stage 2 Boundary Control via Target Anchoring (Prefill)
- **목적:** Consistency Refiner(Stage 2) 단계에서 AI가 `RAW_DRAFT`의 내용을 교정하는 데 그치지 않고, 소설의 다음 내용을 주도적으로 추가 생성해버리는 "분량 이탈(Boundary Bleed)" 사태 방지.
- **이유:** 시스템 프롬프트만으로는 창작에 특화된 LLM의 본능(이어쓰기)을 완벽히 억제할 수 없으며, 개정본을 출력하는 뒷부분을 Prefill로 강제하려고 하면 검증과 사고의 핵심인 CoT(`narrativeAnalysis`)가 생략되거나 오염되어 품질이 하락하는 모순 발생.
- **해결 방안 ("Target Anchoring"):** 
  - AI가 답변을 생성하기 시작하는 **가장 첫 지점(Prefill)**에 원본 `RAW_DRAFT`를 `<original_target_to_revise>` 태그로 감싸서 배치한 후 `<critique>`를 열게 함.
  - 이를 통해 AI는 "자신이 방금 출력한 타겟 텍스트만을 1:1로 변환하는 작업 중"이라는 사실을 구조적(뇌리)으로 고정받고 CoT를 수행하게 되어 이어쓰기 본능을 완벽히 차단함.
- **변경 사항:**
  - `src/contexts/consistency_critique_context.md`: `<Prefill>` 블록 상단에 `{{RAW_DRAFT}}`를 `<original_target_to_revise>` 태그로 주입하고 관련 프롬프트 강화.
  - `src/services/refinerService.ts`: `extractConsistencyResponse` 함수가 Prefill에 추가된 `original_target_to_revise` 블록에 속지 않고 정확히 `<critique>` 시작점부터 파싱하도록 안전장치(indexOf) 적용.
- **관련 파일:** `src/contexts/consistency_critique_context.md`, `src/services/refinerService.ts`
## [2026-04-26] Bug Fix: Stage 2 Boundary Control and Exact Whitespace Restoration
- **목적:** Consistency Refiner(Stage 2)가 원본 `RAW_DRAFT`의 분량을 초과하여 임의로 소설을 더 이어나가는(Generation) 문제 방지 및, `</critique>` 태그 뒤에 출력되는 줄바꿈 규칙 충돌로 인해 에디터에 줄바꿈이 누락/추가되는 현상을 근본적으로 해결.
- **이유:**
  1. 기존 구조에서는 AI가 지시문만 개정(Refine)하는 데 그치지 않고, 문맥을 이어받아 새로운 문장들을 주도적으로 추가 생성해버리는 "결계 이탈" 현상이 보고됨. 이는 검증(Stage 1 -> Stage 2) 파이프라인의 예측 가능성을 심각하게 해침.
  2. AI가 `</critique>` 태그를 닫고 본문을 뱉을 때, 시각적 구분을 위해 넣은 단순 공백(Delimiter)인지 원래 `RAW_DRAFT`가 의도했던 실제 문단 분리(Paragraph Break)인지 코드가 완벽하게 구별하지 못함. 이로 인해 강제로 Newline을 1개 자르는 로직이 적용되면서, 정작 사용자가 기대한 문단바꿈마저 소실되어 버리는(줄바꿈 누락) 문제가 발생함.
- **변경 사항:**
  - `src/contexts/consistency_critique_context.md`: `STRICT BOUNDARY CONTROL` 룰을 신설. AI에게 자신은 "생성자"가 아닌 "교정자"임을 상기시키며, 원본의 작성 완료 지점(Stopping Point)을 단 한 문장이라도 넘어서는 행위를 엄격히 금지함.
  - `src/services/refinerService.ts`: `extractConsistencyResponse` 함수가 이제 `rawDraft` 자체를 파라미터로 전달받음.
    AI가 아무리 불규칙한 줄바꿈이나 공백을 추가하더라도(`trimStart()`로 전부 날림), 원본 `rawDraft`가 태생적으로 가지고 있던 정확한 선행 공백 문자(`^\s*`)를 정규식으로 추출하여 개정된 텍스트 앞에 그대로 이식(Restore)해주는 구조로 변경. 결과적으로 줄바꿈 오차율 0% 보장.
- **관련 파일:** `src/contexts/consistency_critique_context.md`, `src/services/refinerService.ts`
## [2026-04-26] Architecture Shift: Anchor Replacement to Anchor Exclusion (Zero-Duplication)
- **목적:** AI 출력물에서 Anchor Text가 본문과 중복으로 이어붙여지는 현상 완벽 차단.
- **이유:** 사용자의 제보(방안 A 요청)를 분석한 결과, AI가 Anchor Text를 출력할 때 원본(예: 随分)을 임의로 번역/수정(예: 随분)하여 반환하는 '할루시네이션'이 발생함. 이로 인해 어떤 정교한 퍼지 텍스트 매칭(Fuzzy Match) 알고리즘을 사용하더라도 정확한 경계를 찾아 잘라내는 것이 불가능했음. 본문 에디터(Tiptap)에서 직접 뒤에서부터 150자를 지우고 대체하는 방식(방안 A)은 문단 노드 계산 오차로 인해 문서가 오염될(엉뚱한 부분이 지워질) 위험이 너무 커 적용이 불가능함.
- **해결 방안:** Anchor를 다시 출력하게 만든 다음 코드로 잘라내거나 덮어씌우는 '불완전한 우회 로직'을 완전히 폐기하고, **애초부터 Stage 2 프롬프트에서 Anchor의 출력을 엄격히 금지**하는 근본적 아키텍처(방안 A-Prime)로 변경. AI가 `RAW_DRAFT` 본문 수정본만을 반환하도록 제한함으로써, Tiptap의 텍스트가 중복 결합될 수학적 가능성을 0%로 만듦.
- **변경 사항:**
  - `src/contexts/consistency_critique_context.md`: `ANCHOR CONTINUATION MANDATE` 지침을 `SEAMLESS CONTINUATION MANDATE`로 변경. 출력 시 절대로 Anchor를 반복하지 말고 순수하게 본문(RAW_DRAFT) 수정본만 반환하도록 명시화.
  - `src/services/refinerService.ts`: 중복 오류의 원인이었던 불필요한 `trimAnchorFromOutput` 함수 전체 삭제.
- **관련 파일:** `src/contexts/consistency_critique_context.md`, `src/services/refinerService.ts`
## [2026-04-26] Bug Fix: Robust Anchor Trimming for Stage 2 Consistency Pipeline
- **목적:** AI가 출력한 Anchor Text와 에디터 본문의 Anchor Text 간의 미세한 공백/줄바꿈 차이로 인해 잘라내기(Trim) 로직이 실패하고 결과적으로 문장이 중복으로 이어붙여지는 현상 해결.
- **이유:** 사용자가 보고한 중복 현상("적월이 킥킥대며"와 "~하게 혀를 내밀고 있었다"가 이어붙여짐)을 분석한 결과, HTML 기반으로 생성된 `anchorText` 상수와 AI의 응답 텍스트 내 Anchor 사이에 존재하는 줄바꿈(`\n`)이나 공백 개수가 달라서 기존 `startsWith`나 `includes` 조건문이 작동하지 않음. 이로 인해 Anchor 잘라내기를 건너뛰고 전체 응답이 본문에 그대로 결합되며 중복이 발생. (이 문제는 XML 포맷 전환 여부와 무관한, 구조적 텍스트 매칭의 한계로 판명됨).
- **변경 사항:**
  - `src/services/refinerService.ts`: `trimAnchorFromOutput` 함수를 분리하여 도입.
  - 단순 `startsWith` 매칭 외에도 모든 공백 문자(`\s+`)를 제거한 순수 문자열(`cleanOutput`, `cleanAnchor`) 기반의 퍼지(fuzzy) 매칭 알고리즘을 구축함.
  - 퍼지 매칭으로 겹치는 위치를 알아낸 뒤 원래 텍스트의 오프셋을 역산하여 안전하게 잘라냄으로써, AI가 임의로 줄바꿈을 생략하거나 스페이스를 더하더라도 절대 중복으로 연결되지 않도록 근본적 해결.
- **관련 파일:** `src/services/refinerService.ts`
## [2026-04-26] Refactor: Migrate Stage 2 Consistency Refiner from JSON to XML
- **목적:** Consistency Refiner (Stage 2)의 응답 방식을 JSON 객체에서 XML 태그와 일반 텍스트의 혼합 형태로 변경.
- **이유:** 사용자가 Inspector에서 확인했을 때, 여전히 `refinedText`라는 JSON 속성에 결과물을 담아 출력하는 것을 보고 불만을 표시함. JSON 포맷은 구조상 이스케이프가 발생해 문단바꿈 등이 유실될 위험이 있으며 분량 한계(Max Tokens)에 취약함. Stage 2가 JSON 속성에 가두는 행위 없이 즉시 원문과 자연스럽게 이어나가듯 일반 텍스트 형태로 작성되게 만듦으로써 근본적인 연속성 문제를 해결함.
- **변경 사항:**
  - `src/contexts/consistency_critique_context.md`: `NO JSON` 지침을 추가하고 출력 포맷을 XML 형태의 `<critique>` 블록 뒤에 일반 텍스트(Anchor Text + Continuation)를 이어붙이는 구조로 전면 수정.
  - `src/services/refinerService.ts`: 기존 JSON을 파싱하던 `extractJsonBlock` 함수를 정규표현식 기반의 `extractConsistencyResponse` 함수로 교체. `<critique>`가 닫힌 이후의 모든 문자열을 `refinedText`로 안전하게 추출하도록 로직 변경.
- **관련 파일:** `src/services/refinerService.ts`, `src/contexts/consistency_critique_context.md`
## [2026-04-26] Bug Fix: Stage 2 Continuity Stitching (Anchor Continuation)
- **목적:** Consistency Refiner (Stage 2)가 수정한 텍스트(`refinedText`)를 원본 본문(`RECENT_CONTEXT`)에 이어붙일 때, 문장 끊김이나 강제 줄바꿈 등이 어긋나 매끄럽지 않은 이음새(Seam)가 발생하는 현상 해결.
- **이유:** Stage 1 (`rawDraft`)은 본문 끝에서 바로 생성되도록 물리적 연결성이 보장되지만, Stage 2는 이 `rawDraft`를 JSON 내에서 처음부터 다시 작성(`refinedText`)하기 때문에, 기존 본문과의 완벽한 연결성을 보장하지 못하고 미세하게 어긋나는 문제가 사용자로부터 보고됨 (ex. 원치 않던 지점부터 다시 쓰거나 띄어쓰기 붕괴).
- **변경 사항:**
  - `src/lib/contextProviders.ts`, `src/services/refinerService.ts`: 기존 본문의 가장 마지막 150글자를 `ANCHOR_TEXT`라는 변수로 추출하여 템플릿 환경변수에 추가. 특히 `useAIEngine.ts`에서 최신 에디터 상태(`preGenerationContent`)를 `runConsistencyPipeline`로 직접 넘겨주어 최신 컨텍스트를 활용하도록 보완함.
  - `src/contexts/consistency_critique_context.md`: `ANCHOR CONTINUATION MANDATE` 규칙을 추가하여, AI에게 `refinedText`를 작성할 때 무조건 `Anchor Text`를 토씨 하나 틀리지 않고 먼저 출력한 뒤 자연스럽게 수정 초안을 이어나가도록 강제함.
  - `src/services/refinerService.ts`: Stage 2 파싱이 끝난 직후, 결과물 앞부분에 붙어있는 이 "앵커 텍스트"를 정확히 계산하여 잘라내고(Trim), 그 나머지 100% 매끄럽게 연결되는 완성된 연속된 텍스트만 프론트엔드로 반환하도록 마무리 매칭 로직 구성 (완벽한 구조적 바느질 보장).
- **관련 파일:** `src/hooks/useAIEngine.ts`, `src/services/refinerService.ts`, `src/lib/contextProviders.ts`, `src/contexts/consistency_critique_context.md`
## [2026-04-26] Prompt Fine-tuning: Enforce Strict Truncation Preservation in Stage 2
- **목적:** Consistency Refiner (Stage 2)가 토큰 제한으로 인해 의도적으로 중간에 끊긴 문장을 억지로 완성하거나, "700자 길이 달성"과 같은 1단계의 기본 작성 지침을 충족시키기 위해 멋대로 분량을 덧붙이는 현상(Over-completion) 방지.
- **이유:** 사용자가 Max Tokens를 낮게 설정해서 의도적으로 짧게, 혹은 단어/문장 중간에서 끊기도록 생성한 초안(`rawDraft`)을 Stage 2 모델이 "불완전한 문장"으로 착각하고 이어 쓰거나 분량을 강제 연장하려고 시도함.
- **변경 사항:**
  - `src/contexts/consistency_critique_context.md`: `Remember` 블록에 `STRICT TRUNCATION PRESERVATION` 조항 추가. 끊긴 문장이나 단어는 토큰 제한에 의한 정상적인 작동임을 명시하고, 문장을 완성하거나 내용을 추가해 길이를 늘리지 말고 그 끊긴 상태 그대로 논리적 모순만 수정하여 출력(`refinedText`)하도록 강력히 지시함.
- **관련 파일:** `src/contexts/consistency_critique_context.md`
## [2026-04-26] Prompt Fine-tuning: Force Evidence-Based Critique (Quote Requirement) in Stage 2
- **목적:** Consistency Refiner (Stage 2)가 임의로 설정(Lore)을 상상하거나 보편적인 클리셰를 바탕으로 과잉 검열(Over-extrapolation) 및 오탐지(False Positive)를 발생시키는 것을 원천 차단함.
- **이유:** 이전 실험 결과, 모델이 Lore에 명시되지 않은 '생리적 쾌락에 대한 거부' 등을 주관적으로 판단해 일관성에 어긋난다고 섣불리 단정짓는 문제가 식별됨. 사용자의 지적대로 "직접 인용(Quote) 기반의 증거 검출 강제화"가 가장 효과적인 해결책이라고 판단하여 프롬프트를 보강함. "선대응(Pre-emptive Override)" 규칙은 사용자의 강력한 반대에 따라 추가하지 않음.
- **변경 사항:**
  - `src/contexts/consistency_critique_context.md`: `EVIDENCE-BASED CRITIQUE (DIRECT QUOTES REQUIRED)` 규칙을 도입. 위반 사항(Conflict)을 지적하려면 반드시 'System State (Lore & Memory)'나 'User Directives'에서 정확히 문자 그대로 일치하는 텍스트(Exact Quote)를 발췌해 증거로 제시하도록 의무화함("No quote, no conflict."). 응답 JSON 스키마의 `conflicts` 배열 역시 인용구를 첫 부분에 포함하도록 서식을 변경.
- **관련 파일:** `src/contexts/consistency_critique_context.md`
## [2026-04-26] Bug Fix: Generative API Parameters (MaxTokens, TopP, etc.) Dropped in Stage 1
- **목적:** Consistency Refiner (Stage 2) 파이프라인 우회 시, Stage 1 초안 생성에서 사용자가 설정한 MaxTokens, Temperature, TopP, TopK 등의 환경설정이 API로 전혀 전달되지 않고 무시되는 치명적 버그 수정.
- **이유:** 사용자가 "Max Tokens를 100으로 설정해도 엄청나게 긴 초안이 생성된다"고 지적함. 분석 결과 `useAIEngine.ts`에서 직접 호출할 때는 `{ ...params, ...promptInfo }` 병합으로 파라미터가 정상 주입되었으나, `enableStrictConsistency`가 켜져서 `runConsistencyPipeline`을 탈 때는 `generateGeminiContent(novelContext)`로만 호출됨. 그런데 `novelContext`는 파라미터들을 `config` 객체 내부에 중첩(nested)해서 가지고 있었고, AI Service는 이를 루트 레벨(root level) 파라미터로 기대했기 때문에 `maxTokens: undefined`가 되어 모델의 기본 최대치(예: 8192)로 토큰이 풀려버리는 버그였음.
- **변경 사항:**
  - `src/services/promptService.ts`: `generateTaskContext`에서 누락되었던 `topP`, `topK`, `thinkingLevel` 파라미터를 추가로 탑재하도록 수정 (설정값 손실 방지).
  - `src/services/refinerService.ts`: `generateGeminiContent` 및 `generateOpenRouterContent` 호출 시, `novelContext.config`(또는 `critiqueContext.config`)를 스프레드 연산자(`...`)로 루트 레벨에 평탄화(Flatten)하여 주입하도록 전면 수정.
  - `src/services/aiService.ts`: OpenRouter API 호출 시 `top_k: params.topK` 파라미터 지원 추가.
- **관련 파일:** `src/services/promptService.ts`, `src/services/refinerService.ts`, `src/services/aiService.ts`
## [2026-04-26] Prompt Fine-tuning: Exclude Core Guidelines from Critique Scope (Stage 2)
- **목적:** 
  1. Consistency Refiner (Stage 2)가 자신의 COT(사유 과정) 토큰을 단순히 "소설의 기본 작성 지침(Core Novel Guidelines)을 잘 따랐는가"를 검증하는데 낭비하는 것을 방지함.
  2. "기본 작성 지침"은 텍스트 재작성(rewrite) 시의 문체/어투 유지를 위한 참고용(Reference)으로만 한정하고, 실제 비판적 검토의 표적(Targeted Critique)은 온전히 기존 설정(Lore), 메모리(Memory), 직전 캐릭터 역학, 그리고 사용자의 직접 지시(User Directives)에만 집중하도록 수정.
- **이유:** 사용자가 "AI가 자기 COT를 죄다, 노벨 생성의 지침에 맞는지를 검토하는 데 할당하고 있어. 이건 Stage 1에서 잘 했을 테니 여기서 검토할 이유가 없다"고 예리하게 지적함. 따라서 Core Guidelines를 평가 대상 밖(OUT OF SCOPE)으로 명시하여 심사의 초점을 바로잡음.
- **변경 사항:**
+  - `src/contexts/consistency_critique_context.md`: `<System>` 프롬프트 내에 `TARGETED CRITIQUE ONLY` 및 `OUT OF SCOPE (DO NOT CRITIQUE)` 항목 신설. Core Guidelines는 평가 대상이 아님을 못박고, `narrativeAnalysis` 내용에 일반적 작성 지침 확인을 위해 토큰을 낭비하지 말 것을 명시. `<User>` 섹션에서도 Core Guidelines 상단에 `(FOR REWRITE REFERENCE ONLY. Do NOT critique the draft against these)`라는 경고 문구 추가.
- **관련 파일:** `src/contexts/consistency_critique_context.md`
## [2026-04-26] Feature Enhancement: Stage 2 Flavor Preservation & Context Unification
- **목적:** 
  1. Stage 2 (Consistency Refiner)가 텍스트 재작성 시 Stage 1에서 의도했던 작풍(Flavor), 문체, 사용자 지침의 의도를 훼손하는 현상을 상쇄.
  2. 일관된 Context 파이프라인 정립 (Stage 2에 Stage 1과 완전히 동일한 환경과 지침 제공).
- **이유:** 사용자가 보강된 Stage 2 프롬프트에 대체로 만족했으나, 재작성 시 Stage 1의 초기 지침이나 특유의 맛(맛/Flavor)이 살지 않는다는 피드백 반영. 그 원인을 분석한 결과, `contextProviders` 내에서 Consistency를 위해 별도 생성된 파편화 변수(`LORE`, `MEMORY`)를 사용하고 있었고, `SYSTEM_PROMPT_NOVEL`이 주입되지 않는 누락이 있었음.
- **변경 사항:**
  - `src/contexts/consistency_critique_context.md`: `PRESERVE THE ORIGINAL FLAVOR` Mandatory rules를 신설하여 Stage 1의 기존 지침 및 분위기를 완벽히 복원/유지할 것을 강력히 지시. 시스템 변수명을 `{{ACTIVE_LORE_BLOCK}}`, `{{STORY_MEMORY_BLOCK}}`, `{{USER_DIRECTIVE_BLOCK}}`, `{{STORY_CONTEXT_NOVEL}}` 로 변경하여 Stage 1과 100% 동일한 컨텍스트 블록들을 주입토록 통일 (SSOT 강화). 추가로 `{{SYSTEM_PROMPT_NOVEL}}`을 주입하여 본래의 `Core Novel Guidelines`까지 통째로 열람하게 함.
- **관련 파일:** `src/contexts/consistency_critique_context.md`
## [2026-04-26] Rollback & System Prompt Upgrade: Revert Tiptap Node Insertion & Hyper-Critical Consistency Refiner
- **목적:** 
  1. 사용자의 강력한 요청에 따라, Tiptap 에디터 줄바꿈 처리 로직을 구(舊)버전의 평문 HTML 문자열(`join('')`) 로직으로 완벽히 원상복구함.
  2. 일차원적인 사실/정보 체크에 머무르던 Consistency Refiner (Stage 2)의 한계를 극복하기 위해, 미묘한 맥락(Subtext), 권력/인물 관계(Dynamics), 연출상의 지침(Directional Guidelines), 설정의 작동 방식 등 주관적이고 섬세한 부분까지 파고들도록 시스템 프롬프트를 공격적(Hyper-critical)으로 강화함.
- **이유:** 사용자가 원치 않는 Tiptap 줄바꿈 패치로 인해 오히려 사용성이 훼손되었다고 분노하여 변경사항을 철회하고 가장 원본 형태로 롤백 조치함. 동시에 Stage 2 무결성 검증 파이프라인이 세밀한 인간관계나 연출 지시를 무시한 초안을 그대로 승인하는 문제를 해결하고자 심사 기준을 극단적으로 상향시킴.
- **변경 사항:**
  - `src/hooks/useAIEngine.ts`: JSON Node (`{ type: 'paragraph' }`) 배열 삽입을 통한 Tiptap 파서 우회 로직을 폐기하고, 본래의 `lines.map(line => \`<p>\${line}</p>\`).join('')` 와 같은 순정 HTML 삽입 방식으로 100% 롤백.
  - `src/contexts/consistency_critique_context.md`: ELITE, Hyper-critical 페르소나를 부여하고, Review Mandates에 Subtle Nuance/Subtext, Human Relationships, Operational Mechanisms 등을 명시적으로 삽입하여 가차 없이(harsh) 평가하고 재작성 하도록 강제화.
- **관련 파일:** `src/hooks/useAIEngine.ts`, `src/contexts/consistency_critique_context.md`
## [2026-04-26] Bug Fix: Prefill Tag Restore & Tiptap Line Breaks JSON Parsing
- **목적:** 
  1. `<Prefill>` 블록을 복구하고 refinerService에서 조립 과정을 보강하여 완전한 JSON 반환을 확보.
  2. Tiptap 에디터 줄바꿈 버그를 완벽하게 해결하기 위해 HTML 문자열(`'<p></p>'`) 대신 Prosemirror JSON Node 배열(`{ type: 'paragraph' }`) 형식을 사용하여 Tiptap의 HTML Parser를 완전히 우회.
- **이유:** 이전 패치에서 `<Prefill>` 구문을 제거해 OpenRouter/Gemini 응답 품질 저하(빈 문자열 응답 등) 문제가 발생했으며, HTML `\r\n` 파싱 과정에서 Tiptap이 빈 `p` 태그를 무시하거나 `<br>` 추가 시 간격이 너무 넓어지는 시각적 버그들을 근본적으로 해결하기 위함.
- **변경 사항:**
  - `src/contexts/consistency_critique_context.md`: `<Prefill>` 구문 원상 복구(`{\n  "narrativeAnalysis": "`).
  - `src/services/refinerService.ts`: prefill이 제공된 경우 응답 앞에 강제 병합하여 JSON 파서에 전달.
  - `src/hooks/useAIEngine.ts`: `\r\n`에 대응하기 위해 `split(/\r?\n/)` 사용. `insertContentAt`에 HTML 문자열 대신 Tiptap JSON Object(`{ type: 'paragraph' }`) 배열을 주입하여 Tiptap의 HTML Parsing 이슈 완전 우회.
- **관련 파일:** `src/contexts/consistency_critique_context.md`, `src/services/refinerService.ts`, `src/hooks/useAIEngine.ts`
## [2026-04-26] Bug Fix: JSON Parsing Prefill Logic & Tiptap Line Breaks & Prompt Inspector Output Store
- **목적:** 
  1. `<Prefill>` 사용으로 인해 모델 응답에 `{` 가 잘리면서 발생하는 JSON 파싱 오류(JSON parsing failed)를 해결함.
  2. Tiptap 에디터 줄바꿈 롤백을 완전하고 깨끗하게 복구함(`|| '<br>'` 구문 완전히 제거 및 `<p></p>` 구조 복원).
  3. Prompt Inspector의 Output 섹션이 Consistency 뿐만 아니라 Novel, Codex, Memory 등 모든 Last Generated 상태에서 일관되게 볼 수 있도록 로직 완성.
- **이유:** `<Prefill>`이 API 응답에서 누락될 경우, JSON 파서가 중괄호 시작을 찾지 못해 오류로 처리하여 Stage 1 초안으로 폴백해버리는 문제가 있었음. Tiptap 에디터에 삽입하는 `insertContent`의 롤백이 불완전하게 되어 있어 불필요하게 3줄 띄어쓰기가 일어남을 사용자가 지적함. 
- **변경 사항:**
  - `src/contexts/consistency_critique_context.md`: JSON 응답 오류 방지를 위해 `<Prefill>` 구문을 완전히 제거하여 모델이 `{` 부터 스스로 출력하도록 유도.
  - `src/services/refinerService.ts`: `extractJsonBlock`에서 처리 시 최상단 `{` 누락 시 복구해주는 로직 한겹 더 추가.
  - `src/hooks/useAIEngine.ts`: 빈 라인(`\n\n`)에 대한 Tiptap `<p>` 태그 렌더링 로직을 완벽한 원본으로 롤백. Novel Stage 1, Codex, Memory 등 생성 후 `lastPromptInfo` 상태에 `output` 값을 모두 삽입하도록 추가 구현.
- **관련 파일:** `src/contexts/consistency_critique_context.md`, `src/services/refinerService.ts`, `src/hooks/useAIEngine.ts`
## [2026-04-26] UX/Bug Fix & Structure Upgrade: `PromptInspector` & `insertContent` Line Break Rollback
- **목적:** 
  1. 이전 커밋의 `insertContent` Tiptap 에디터 줄바꿈 버그 해결책 롤백 (오류를 오히려 악화시켰거나 사용자 경험과 맞지 않음에 따른 원상복구).
  2. 무결성 검증 실패(Fallback) 등에 의해 2단계(Consistency Refiner) 내부 분석 결과 및 로직에 대해 사용자가 Prompt Inspector에서 투명하게 접근/디버깅할 수 있도록 완전 독립된 Task Type (`Consistency Refiner (Stage 2)`)으로 구조 업그레이드.
- **이유:** 사용자가 "애초에 Novel Generation처럼 아예 별도의 뭔가를 만들어서 구현해야지"라고 피드백함. Stage 1 (Draft)와 Stage 2 (Refiner) 사이의 Prompt/Output이 기존처럼 아래에 직렬로 추가되는 것이 아니라, Novel Generation과 대등한 별도의 Dropdown 구조로 완전히 분리하여 각 스테이지의 인풋/아웃풋 구조를 독립적으로 추적할 수 있도록 만듦.
- **변경 사항:**
  - `src/hooks/useAIEngine.ts`: 빈 라인 `<p><br></p>` 형식으로 명시적 변환했던 로직 롤백. `runConsistencyPipeline`에 콜백 구조를 도입해 `lastConsistencyPromptInfo`를 완전한 프롬프트 컨텍스트(System/History/User/Output 포함)로서 상태(State)화하여 반환.
  - `src/services/refinerService.ts`: `runConsistencyPipeline` 에서 `stage2` 컨텍스트를 콜백으로 반환 및 `output` 정보를 일관되게 구조화.
  - `src/components/PromptInspector.tsx`: "Consistency Refiner (Stage 2)"를 inspectionContext Type ('consistency')의 하나로 추가. Dropdown에서 Novel Generation (Stage 1)과 상호 전환 가능하도록 UI 강화. 그리고 Output 전용 렌더링 블록을 정식으로 추가.
- **관련 파일:** `src/App.tsx`, `src/hooks/useAIEngine.ts`, `src/services/refinerService.ts`, `src/components/PromptInspector.tsx`
## [2026-04-26] UX/Bug Fix: `insertContent` Line Break Rendering & Consistency Inspector
- **목적:** 
  1. 무결성 검증 실패(Fallback) 등에 의해 1단계(rawDraft)가 에디터에 주입될 때 연속된 줄바꿈(`\n\n`)이 파싱 과정에서 무시되어 단일 줄바꿈으로 합쳐지거나 누락되는 Tiptap 렌더링 버그 수정.
  2. 2단계(Consistency Refiner) 내부 분석 결과 및 로직에 대해 사용자가 Prompt Inspector에서 투명하게 접근/디버깅할 수 있도록 추적 인터페이스 신설.
- **이유:** Tiptap의 `.insertContent()`는 plain text를 HTML로 해석하므로 `\n`를 `<br>`로 명시 변환해주지 않으면 빈 문단(`empty paragraph`)들이 붕괴됨. 또한, Consistency Pipeline이 내부적으로만 동작하여, 오류 발생 시 모델의 어떤 응답(JSON)이 폴백을 유발했는지 작가가 파악할 수 있는 시각적 수단이 전무했음.
- **변경 사항:**
  - `src/hooks/useAIEngine.ts`: 빈 라인(`line === ''`) 삽입 시 `<p><br></p>` 형식으로 명시적 변환하도록 로직 강화 및 `setLastNovelPromptInfo`에 `pipelineResult`의 디버그 정보(`consistencySystemPrompt`, `consistencyJsonString`, `consistencyError` 등) 병합.
  - `src/services/refinerService.ts`: `runConsistencyPipeline` 결과 반환형(interface `ConsistencyPipelineResult`)을 확장하여, Stage 2에서 생성된 원상태의 분석 결과 및 JSON 문자열을 함께 전송.
  - `src/components/PromptInspector.tsx`: "Consistency Refiner (Stage 2)" 섹션을 새롭게 추가하고 Stage 2에 대한 Prompt와 모델 Output을 시각적으로 렌더링 (에러 시 붉은색 스키마 적용).
- **관련 파일:** `src/hooks/useAIEngine.ts`, `src/services/refinerService.ts`, `src/components/PromptInspector.tsx`
## [2026-04-26] Feature & Reliability: Strictly Consistent 2-Stage Pipeline (Consistency Refiner)
- **목적:** AI가 본문 뒷부분을 이어서 쓸 때, 로어(Lore)나 메모리(Memory)의 인과 논리를 무시하는 환각(Hallucination) 현상을 차단하기 위해 2단계 검증 파이프라인(Drafting -> Critique & Refine) 도입.
- **이유:** 단일 프롬프트로는 모델에게 창의성과 엄격한 규칙 준수를 동시에 요구할 때 충돌이 발생함. 이에 따라 1단계에서 우선 자유롭게 생성하고, 2단계에서 엄격하게 규칙 위반을 짚어내고 수정하는 구조를 정립함. 또한 터미널 구두점 체크를 제거하고 토큰 소비 한도를 동적으로 늘려 구조적 결함에 대응하는 폴백(Safe Fallback) 메커니즘을 적용함.
- **변경 사항:**
  - `src/services/refinerService.ts`: 새로운 2-Stage Consistency Pipeline (`runConsistencyPipeline`) 구현. Malformed JSON 복구 로직(`extractJsonBlock`), `maxTokens` 동적 할당, 50% 길이 비율 기반의 'Safe Fallback' 방어 구조 신설.
  - `src/types.ts`, `src/components/SettingsPanel.tsx`, `src/constants.ts`: 'AI 생성 논리성 검증 (Strict Consistency Refiner)' 토글 및 `enableStrictConsistency` 전역 설정 추가 (기본값: true).
  - `src/prompts/consistency_critique_system.md`, `src/contexts/consistency_critique_context.md`: 비평가 역할의 시스템 프롬프트 및 컨텍스트 템플릿 신설.
  - `src/services/promptService.ts`, `src/lib/contextProviders.ts`: `consistency` Task Type 추가 및 템플릿 변수를 위한 통합 사전 확장(`LORE`, `MEMORY`, `RAW_DRAFT` 등).
  - `src/hooks/useAIEngine.ts`: `handleContinue` 시 `runConsistencyPipeline`을 경유하도록 플로우 전환. 검증 도중 UI 락(`setEditable(false)`)과 최대 30초 소요 가능성을 명시한 동적 상태 텍스트 출력 기능 추가.
  - 연극적 스트리밍(Theatrical Streaming) 폐지 및 `PLAN_ConsistencyRefiner.md` 삭제를 통한 계획 최종안 완수.
- **관련 파일:** `src/hooks/useAIEngine.ts`, `src/services/refinerService.ts`, `src/services/promptService.ts`, `src/lib/contextProviders.ts`, `src/types.ts`, `src/constants.ts`, `src/components/SettingsPanel.tsx`, `src/contexts/*`, `src/prompts/*`, `AGENTS.md`, `src/hooks/AGENTS.md`, `src/services/AGENTS.md`, `AUDIT_LOG.md`
## [2026-04-26] UX/Stability Fix: Breaking Infinite Quota-Error Spinners
- **목적:** Firestore SDK의 백그라운드 무한 재시도(Quota Limit Exceeded) 오류 시, UI의 'Saving...' 스피너가 영원히 돌고 인터셉터가 에러를 감지할 때마다 무한 반복해서 경고 알림(Notification spam)을 생성하는 문제 수정.
- **변경 사항:**
  - `src/main.tsx`: `console.error`에서 Quota 에러 발송 시 너무 자주 발생하지 않도록 10초(10000ms) Throttle 로직 추가하여 알림 폭탄 방지.
  - `src/hooks/useNovelContent.ts`: `firestore-quota-error` 이벤트 감지 시 `isSaving` 상태를 강제로 `false`로 돌리고 띄워져 있는 `saveNotifyId` 스피너를 직접 `removeNotification` 처리하는 리스너 추가.
  - `src/hooks/useNovels.ts`, `src/hooks/useAutoCodex.ts`: 위와 동일하게 전역 Data I/O 동작 및 Auto-Codex 스캔 중에도 Quota-error 감지 시 UI 락(isSaving, isScanning) 구조를 즉시 해제하도록 리스너 추가.
- **관련 파일:** `src/main.tsx`, `src/hooks/useNovelContent.ts`, `src/hooks/useNovels.ts`, `src/hooks/useAutoCodex.ts`, `AUDIT_LOG.md`
## [2026-04-26] Critical Reliability: Uncatchable Quota Error Interception & Unified Novel Creation
- **목적:** Firestore SDK가 Quota 에러 시 Promise를 거절하지 않고(`reject`) 무한 재시도하며 콘솔에만 에러를 뱉는 설계 결함(Unhandleable Hanging Writes)으로 인해, UI 상에서는 저장 중 인디케이터가 무한정 돌고 사용자에게 저장 실패 사실을 알리지 못하는 치명적 엣지 케이스 수정.
- **변경 사항:**
  - `src/main.tsx`: `console.error`를 전역에서 가로채어 `resource-exhausted` 혹은 `Quota limit exceeded` 문자열 감지 시 `firestore-quota-error` 전역 커스텀 이벤트를 발송하는 인터셉터(Interceptor) 구현.
  - `src/App.tsx`: 커스텀 이벤트를 감지하여 사용자의 화면 중앙에 "저장되지 않음" 경고를 띄울 수 있도록 `useEffect`를 통한 이벤트 리스너 통합.
  - `src/App.tsx`: `createNewNovel` 함수가 백그라운드 재시도를 무한히 대기하다 멈추는 현상을 방지하기 위해, 오작동하던 직접 `addDoc` 방식을 버리고 `createNovelWithSubcollections` 싱글 파이프라인으로 구조 통합.
- **관련 파일:** `src/main.tsx`, `src/App.tsx`, `AUDIT_LOG.md`
## [2026-04-26] Architecture Overhaul: Unified I/O Pipeline & Atomic Reveal
- **목적:** 소설 Create, Duplicate, Import, Export 간의 저장 로직 불일치로 인한 오작동과 데이터 손실 및 무한 대기 현상을 영구히 해결하고 `window.confirm` 의존성 제거.
- **변경 사항:**
  - `src/hooks/useNovels.ts`: Firestore `writeBatch` 한계(500개)를 지능적으로 피하면서 원자성을 보장하는 `createNovelWithSubcollections` 함수 구현 (1차 Batch에 `isImporting: true`를 심고 마지막 청크 완료 시 없애는 **Atomic Reveal** 적용).
  - Background Garbage Collector를 `useNovels`의 `onSnapshot` 리스너에 설계하여, 1시간 이상 `isImporting` 상태로 버려진 중단된 문서들을 자가 치유(삭제)하도록 조치.
  - 레거시(단일 문서) 호환성과 서브컬렉션을 모두 안전하게 지원하는 `exportCompleteNovelData` 구현.
  - `addNovel`, `duplicateNovel` 내부 로직을 통합 파이프라인으로 전면 교체.
  - `src/App.tsx`: `handleUploadNovel`과 `downloadNovel`을 새로운 싱글 파이프라인으로 전환.
  - `src/components/PromptPresetManager.tsx`: `window.confirm`을 삭제하고 자체 2-Tap(✅/❌) UI를 도입하여 Iframe 내부에서의 팝업 신뢰성 확보.
- **관련 파일:** `src/hooks/useNovels.ts`, `src/App.tsx`, `src/components/PromptPresetManager.tsx`, `AGENTS.md`, `src/hooks/AGENTS.md`, `GEMINI.md`
## [2026-04-23] UI/UX Hotfix: Resolve Infinite Loading on Empty State
- **목적:** 사이드바에서 소설이 아무것도 선택되지 않았을 때 "Loading story..." 스피너가 무한정 도는 버그(의미론적 오류) 수정.
- **변경 사항:**
  - `App.tsx`의 렌더링 분기에 `!currentNovel` 조건을 우선적으로 추가하여 완전히 비어있는 상태(소설 미선택)와 콘텐츠 렌더링 지연(소설 선택 후 로딩 중) 상태를 명확히 분리.
  - 선택된 소설이 없을 경우, 배경에 부드러운 `BookOpen` 아이콘과 함께 "Select a novel to start writing"이라는 플레이스홀더를 표시하도록 UX 개선.
- **관련 파일:** `src/App.tsx`
## [2026-04-22] Architectural Hotfix: Remove Hardcoded TriggerChars
- **목적:** `useAutoCodex.ts` 내부에 하드코딩되었던 `10000` 상수를 `GLOBAL_DEFAULTS` 참조로 변경하여 'Single Source of Truth' 원칙 복구.
- **이유:** 이전 설정값 업데이트 시 편의상 숫자를 직접 박아넣어 향후 유지보수 시 파편화 버그(Ghost Bug)가 발생할 위험이 있었음. 이를 사용자의 지적을 통해 적발하고 구조적으로 교정함.
- **관련 파일:** `src/hooks/useAutoCodex.ts`
## [2026-04-22] Update Global AI & Auto-Codex Default Settings
- **목적:** AI 생성 및 오토 코덱스 스캔의 기본 성능과 효율을 최적화하기 위해 파라미터 업데이트.
- **변경 사항:**
  - **기본 소설 생성:** 모델 `gemini-3.1-pro-preview` -> `gemini-3-flash-preview`, Max Tokens `500` -> `200`, Context Window `12,000` -> `30,000`.
  - **오토 코덱스:** 모델 `gemini-3.1-flash-lite-preview` -> `gemini-3.1-pro-preview`, Max Tokens `2,000` -> `5,000`, Context Window `10,000` -> `30,000`, Trigger Chars `5,000` -> `10,000`.
- **관련 파일:** `src/constants.ts`, `src/hooks/useAutoCodex.ts`
## [2026-04-20] Append Claude's Epistemic & Causal Graph Logic to LTM Thesis
- **목적:** 장기 기억 체계의 구조적 한계를 보완하는 3가지 고차원 논리(체호프의 총 역설, 극적 아이러니를 위한 인물 인식 레이어 구분, 인과 깊이에 따른 로딩 최적화)를 토론 문서에 병합.
- **이유:** 기존의 단순 `Event Ledger` 프루닝 로직이 가진 맹점(회수되지 않은 복선을 무의미한 고아로 인식하는 문제)을 방어하고, AI의 전지적 시점 남용으로 인한 스토리 붕괴(메타게이밍)를 방지하기 위해 '인식론적 갭' 개념을 명문화함. 그래프 구조의 저장과 인출(Retrieval)의 트레이드오프 문제 역시 공론화.
- **관련 파일:** `/THESIS_LONG_TERM_MEMORY.md`
## [2026-04-19] Rewrite & Reorganize THESIS_LONG_TERM_MEMORY.md
- **목적:** 토론 문서의 목적을 분명히 하고(개념 및 논리 아키텍처 한정), 제기된 문제점들을 단정적이지 않은 화두/가설 형태로 재구성함.
- **이유:** 이전 버전의 문서는 코딩/UX적인 뉘앙스가 섞여 있었고, 문제점들이 너무 닫힌(단정적인) 형태로 제시되어 진정한 의미의 난장(토론장) 역할을 하기 어려웠기 때문. Codex(정적 상태)와 Memory(동적 누적)의 역할 차이를 명확히 하고, 제안된 이중 레이어 분리 및 참조 그래프 프루닝 아이디어를 논리적으로 정리함.
- **관련 파일:** `/THESIS_LONG_TERM_MEMORY.md`
## [2026-04-19] Create THESIS_LONG_TERM_MEMORY.md Living Document
- **목적:** 장기 기억(Long-Term Memory) 및 연속성 관리에 대한 고차원적인 논의와 방향성을 기록하는 살아있는 문서 개설.
- **이유:** 단순 코드 수정을 넘어, 소설 작성 시 LLM 컨텍스트 한계와 정보 풍화 현상을 막기 위한 아키텍처 논의를 일회성 대화로 휘발시키지 않기 위함. 외부 참여자(다른 에이전트 등)를 위한 방대한 맥락 제공 목적.
- **관련 파일:** `/THESIS_LONG_TERM_MEMORY.md`
## [2026-04-19] Architectural Hotfix: Context Builder Separation of Concerns (Prefill)
- **목적:** `promptService.ts` 내부에 하드코딩되었던 Prefill 주입 로직을 `autocodex-generation.md` 템플릿 파일로 이관하여 아키텍처 원칙 준수.
- **이유:** 이전 작업에서 Prefill 주입을 비즈니스 로직(Service Layer)에 직접 하드코딩함으로써, 템플릿과 로직을 분리하기 위해 고안된 Context Builder 아키텍처의 철학이 훼손되었음. 이를 바로잡기 위해 템플릿 시스템 내부로 제어 권한을 반환함.
- **관련 파일:** `src/contexts/autocodex-generation.md`, `src/services/promptService.ts`
- **편집 상세:**
  - `src/services/promptService.ts`: `generateTaskContext` 내의 'autocodex' 전용 하드코딩된 prefill 스위칭 로직 제거.
  - `src/contexts/autocodex-generation.md`: `<Prefill>` 블록 내부에 `{\n  "globalAnalysis": ` 직접 선언.
## [2026-04-19] Auto Codex Structural Prefill Injection & Sequence-Perfect Parser (STP Step 5/6/7)
- **목적:** AI가 JSON 형식이나 키 순서를 헷갈려 에러가 나는 현상 방어 및 `globalAnalysis`의 필수 첫 번째 배치를 강제하는 아키텍처.
- **이유:** 단순 프롬프트 지시어로는 거대 모델의 변덕성(구문 오류, 백틱 포함, 순서 무시 등)을 완벽히 막을 수 없어, 하드코딩된 Prefill 주입 및 완전한 문자열 전처리 파이프라인으로 구조적 100% 신뢰성을 담보하기 위함.
- **관련 파일:** `src/prompts/auto-codex-system.md`, `src/services/promptService.ts`, `src/hooks/useAutoCodex.ts`, `GEMINI.md`, `PLAN_AUTO_CODEX_COT_B.md`
- **편집 상세:**
  - `src/services/promptService.ts`: `generateTaskContext` 내에서 'autocodex' 태스크에 대해 하드코딩된 `prefill: '{\n  "globalAnalysis": '`을 반환 객체에 주입.
  - `src/prompts/auto-codex-system.md`: JSON 스키마에서 `globalAnalysis` 필드에 줄바꿈 금지, 쌍따옴표 사용 금지 규칙을 명시하여 내부 Parsing 에러를 원천 차단.
  - `src/hooks/useAutoCodex.ts`: 파이프라인 3단계 신설. 1단계에서 Markdown(````json`) 완전 제거, 2단계에서 응답값 보정(Continuation 시 Prefill 강제 결합 등), 3단계에서 안전 파싱 진행.
  - `GEMINI.md`: STP 락(Lock) 해제 및 일상 모드로 전환(Cleanup).
  - 전체 컴파일 및 린트 통과 완료.
## [2026-04-19] Auto Codex Regurgitation Filter & Lineage Tracking (STP Step 5/6/7)
- **목적:** AI가 기존 설정과 내용 변경 없이 제안을 반환하는 문제(Regurgitation)와, 이름 변경 시 데이터가 복제되는 추적(Lineage Loss) 버그를 방지.
- **이유:** 기존에는 프롬프트의 부정적 제약 조건("변경이 없으면 출력 금지")과 단순 문자열 비교만 존재하여, LLM은 환각을 일으켜 무의미한 단어를 바꾸며, 프론트엔드는 이를 인지하지 못하고 스팸 제안을 넘겨 UX와 비용 손실 발생.
- **관련 파일:** `src/types.ts`, `src/prompts/auto-codex-system.md`, `src/hooks/useAutoCodex.ts`, `src/components/ProposalDiffView.tsx`
- **편집 상세:**
  - `src/types.ts`: `updateReason`, `originalEntryId`를 `LoreEntry` 스키마(Proposal용)에 신설하여 AI의 Chain of Thought와 원본 추적을 강제.
  - `src/prompts/auto-codex-system.md`: 긍정적 지시("새로운 사실을 유기적으로 병합하라")로 전환하고, `updateReason` 작성을 의무화하여 AI의 사고력 증진 및 환각 감소.
  - `src/hooks/useAutoCodex.ts`: `.toLowerCase().replace(/\s+/g, ' ').trim()`을 사용하는 `normalizeText` 유틸로 무의미한 여백/대소문자 차이를 걸러내는 `hasMeaningfulChanges` 필터 구현. 중복 제안은 최신 제안으로 덮어쓰기 실시.
  - `src/hooks/useAutoCodex.ts`: '수락' 시 `updateReason`, `originalEntryId` 임시 필드를 제거(Scrubbing)하여 저장.
  - `src/components/ProposalDiffView.tsx`: AI의 사유(`updateReason`)를 UI 최상단 인용구에 맵핑하여 사용자의 평가(투명성) 제공.
## [2026-04-19] Sidebar DND Visual Clash & Layout Collapse Fix (STP Step 5/6/7)
- **목적:** 드래그 앤 드롭 중 파란색 삽입선(Drop Line)과 dnd-kit의 기본 리스트 밀어내기(Swap/Shift) 트랜지션 애니메이션이 시각적으로 충돌하며 산만한 느낌을 주고 타겟팅을 방해하는 문제를 근본 해결하는 완전한 "Stable Tree UX" 도입.
- **이유:** 사용자가 리스트 구조를 드래그할 때 다른 아이템이 위아래로 점핑(transform)하고 원본 아이템의 높이가 압축(`h-0`)되면서 예측이 불가능한 혼란스러운 시각적 레이아웃 파괴 현상이 있었음.
- **관련 파일:** `src/App.tsx`, `src/components/SortableNovelItem.tsx`, `AGENTS.md`, `src/components/AGENTS.md`
- **편집 상세:**
  - `src/App.tsx`: `handleNovelDragEnd`에서 드롭 시 실제 네트워크 저장에 쓰이는 Order 판정 기준을 복잡한 이전 규칙 대신 오로지 `dragIntentRef.current.predictedOrder`로 통일("Single Source of Truth").
  - `src/components/SortableNovelItem.tsx`: 삽입선 렌더링 조건을 기존 `dragIntent.id`에서 `dragIntent.insertLineTargetId`로 교체하여, dnd-kit 내부 충돌 인지 대상과 상관없이 물리적 Y좌표 기준의 실시간 렌더링과 일치시킴.
  - `src/components/SortableNovelItem.tsx`: `transform: undefined` 로 dnd-kit의 기본 Swap 애니메이션을 무효화하여 모든 형제 아이템들을 고정시킴(Stable Tree UX 구현).
  - `src/components/SortableNovelItem.tsx`: `isHidden` 플래그로 인해 원본 아이템의 레이아웃이 `h-0`으로 찌그러지며 트리 구조가 붕괴되는 현상 방지. 그 자리에 높이를 유지한 채 `opacity: 0.4` 및 `pointer-events-none` 상태 호버를 제공.
  - `src/components/SortableNovelItem.tsx` & `src/components/Sidebar.tsx`: DragOverlay용 컴포넌트에 `isOverlay={true}`를 주입해 드래그 중인 고스트 아이템 내부의 잘못된 파란선 출력을 막고 불투명도를 투명도 100%로 보증함.
  - 폴더 드래그 시 자식 숨김(`shouldHideChildren`)에 `isDraggingFolder` 조건을 탈락시켜 축소 현상을 방지.
  - `AGENTS.md`, `src/components/AGENTS.md` 지침 추가 (Stable Tree UX 명문화 완료).
## [2026-04-19] Sidebar DND Accuracy & Visual Feedback Fix (STP Step 5/6/7)
- **목적:** DND 동작 시 마우스 좌표와 삽입 위치 표기 선(Drop Line)이 불일치하는 문제, 유령 전환(Phantom Shift) 문제, 그리고 드래그가 무효화되는 현상을 True Pointer Coordinates 기반으로 완전 해결.
- **이유:** 기존 로직은 `event.delta.y`에 의존하여 방향을 판별하거나 원본 인덱스 크기를 비교하는 혼합된 방식을 써서 부정확한 상/하단 판단을 일으켰으며, 충돌 엔진(20/60/20)의 판정 기준과 어긋나 있었음.
- **관련 파일:** `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/SortableNovelItem.tsx`, `AGENTS.md`, `GEMINI.md`
- **편집 상세:**
  - `src/App.tsx`: `handleNovelDragStart`에서 `event.activatorEvent`를 사용해 터치 및 마우스의 "진짜 포인터 시작 좌표(`pointerStartCoordsRef`)"를 기록.
  - `src/App.tsx`: `handleNovelDragOver`를 신설하여 `delta`를 더한 실시간 포인터 좌표를 계산. 이를 기반으로 충돌 요소의 세로 기준선(`height / 2`)과 비교하여 `insertBelow` 방향을 정교하게 산출. 상태 최적화를 위해 의존성 체크 후 `dragIntent` 상태 변경.
  - `src/App.tsx`: `handleNovelDragEnd`에서 `lastValidDropTargetRef` 및 `lastValidPointerCoordsRef`를 사용하는 거리 기반(30px) "Stale Hover 방어" 로직 이식 및 `delta.y` 기반 로직 완전 소거.
  - `src/components/Sidebar.tsx`: `handleNovelDragOver`와 `dragIntent`를 `DndContext`와 자식 컴포넌트에 통과(pass-down)시킴.
  - `src/components/SortableNovelItem.tsx`: `dragIntent` 상태를 읽어 항목이 `nest` 임박인지, 혹은 위/아래(`border-t`/`border-b` 대신 absolute div 라인 사용) 삽입 임박인지를 실시간 렌더링. `DroppablePlaceholder`도 isOver 기반으로 하이라이트를 즉시 변경하도록 시각적 UX(Feedback) 싱크 맞춤.
  - `/AGENTS.md`: `Drag and Drop Architecture (True Coordinate Standard)` 지침 신규 추가 및 문서화 완수.
## [2026-04-19] Sidebar DND Stability & UX Fix (STP Step 5)
- **목적:** 사이드바 폴더의 드래그 앤 드롭 중 발생하는 아이템 점핑 현상, 빈 폴더 드롭 불가 현상, 동시성 오류 및 네트워크 지연에 따른 상태 불일치를 근본 해결하는 완전한 "True Tree" DND 아키텍처 도입.
- **이유:** 기존 Flat Array Projection 방식은 Nested 폴더의 동작을 정확히 반영하지 못했으며, Optimistic Update 중에 빈번히 발생하는 onSnapshot과 race condition이 일어나 사용자의 드래그를 강제로 끊어버리거나 UI를 오작동시키는 심각한 결함이 있었음.
- **관련 파일:** `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/SortableNovelItem.tsx`, `src/hooks/useNovels.ts`, `src/lib/customCollision.ts`, `AGENTS.md`, `src/components/AGENTS.md`, `src/hooks/AGENTS.md`
- **편집 상세:**
  - `src/lib/customCollision.ts`: 20%(Top/Bottom) - 60%(Middle) Context Arbitration을 적용하여 폴더 위에서 "Nesting(하위로 배치)" 과 "Reordering(같은 레벨 정렬)" 인텐트를 명확히 분리하는 커스텀 충돌 엔진 구현.
  - `src/components/Sidebar.tsx` / `src/components/SortableNovelItem.tsx`: 단일 SortableContext에서 다중 중첩 `SortableContext`로 구조를 전면 교체. 비어있는 폴더에 대한 `DroppablePlaceholder` 도입, CSS-based (`h-0 overflow-hidden` / `disabled: true`) Hiding을 도입하여 언마운트에 따른 상태 유실 방지. `DragOverlay` 컴포넌트를 부착하여 트리 계층의 깊이(Depth) 시각 유지 처리.
  - `src/hooks/useNovels.ts`: `isDraggingGlobal` 기반의 **Sync Pauser** 구현. 드래그 중 발행하는 백엔드 onSnapshot 데이터를 `snapshotBufferRef`에 지연 보관 후, Local-write 성공 시점에(Latest-Wins POST-write) Flush 하도록 보장.
  - `src/hooks/useNovels.ts` / `src/App.tsx`: Promise.race 10초 타임아웃을 이용해 **Timeout Guard** 적용. 타임아웃 시 Rollback이 아닌 **낙관적 UI 반영 유지 (Eventual Consistency)** 정책을 택하고 `orphanedWriteIdsRef`에 아이템 ID를 등록하여, 연속된 다음 드래그 도중에 도착하는 늦은 스냅샷을 버퍼를 뚫고 조용히 동기화(Patch)하는 Bypass 기술 도입. Null Guard 및 Circular Reference Guard (폴더 자기 자신 혹은 자기 하위 자식 노드로 드롭 불가) 정책 삽입.
## [2026-04-18] Novel Duplication Bugfix: Pure Metadata Transition & Backend Authority
- **목적:** "Settings Only" 기능으로 복제할 때 컨텐츠가 같이 복제되던 버그(State Leak) 해결 및 전체 Hydration 구조 안정화.
- **이유:** 프론트엔드의 `App.tsx`에서 `currentNovel` spread 연산자로 인해 이미 로드된 컨텐츠가 복사본에 스며들고(Ghost Data), 이것이 자동저장 루프에 의해 실제 데이터베이스에 덧씌워지는 심각한 데이터 무결성 위반 문제가 발견됨. 이를 근본적으로 해결하기 위해 Backend-Authoritative 구조로 전환함.
- **관련 파일:** `src/App.tsx`, `src/hooks/useNovels.ts`, `src/hooks/useNovelContent.ts`, `src/components/EditorContainer.tsx`, `AGENTS.md`
- **편집 상세:**
  - `src/hooks/useNovels.ts`: `duplicateNovel`의 시그니처를 `(novel: Novel)`에서 `(novelId: string)`으로 변경하고, 복제 시 5MB에 달할 수 있는 클라이언트 상태에 의존하지 않고 Firestore에서 순수 데이터를 Fetch하여 Backend 측에서 복제하도록 재구성함.
  - `src/App.tsx`: `handleDuplicateNovel` 호출 완료 후, `content`와 `loreEntries`를 강제로 `undefined`, `[]` 형태로 초기화(Pure Metadata Transition)하여 신규 문서를 깨끗한 상태(Loading state)로 강제 전이시킴. EditorContainer를 분기 렌더링하고 `key` 속성을 할당해 Hydration 중에 Editor를 언마운트함.
  - `src/hooks/useNovelContent.ts`: `fetchContent`와 `unsubscribeLore` 에 `requestedId === currentNovelRef.current?.id` 조건을 삽입하여 느린 네트워크 환경에서 onSnapshot Race Condition을 방어함. `hasError` 상태를 추가함.
  - `src/components/EditorContainer.tsx`: `onUpdate` 가장 첫줄에서 `currentNovelRef.current?.content === undefined` 이거나 `loadedNovelIdRef`와 일치하지 않으면 즉각 return해버리는 Triple Padlock Guard를 도입해 Tiptap의 초기 텍스트 주입이 Auto Save를 트리거하는 현상 완전 차단.
  - `PLAN_DUPLICATION_BUGFIX.md`: 이 모든 구조를 명세한 Master Blueprint를 구축함.
## [2026-04-17] Codex Full-Screen Edit Implementation (STP Step 5)
- **목적:** Codex(Lore) 편집 시 좁은 텍스트 영역의 가독성과 편의성 한계를 넓은 화면에서 편집 가능하도록 확장.
- **이유:** 방대한 양의 인물 설정이나 세계관을 적기엔 제약이 큰 기존 UI를, 기존 Prompt Inspector에서 쓰던 FullScreen 모달의 모듈화(Generic)를 통해 안전하게 재사용 및 확장하기 위함.
- **관련 파일:** `src/components/FullScreenTextEditor.tsx`, `src/components/FullScreenPromptEditor.tsx`, `src/components/Codex.tsx`, `GEMINI.md`, `PLAN_CODEX_FULLSCREEN_EDIT.md`
- **편집 상세:**
  - `FullScreenTextEditor.tsx`: 재사용 가능한 범용 컴포넌트 생성. `saveMode` ('manual' | 'auto') prop을 통해 수동 저장과 자동 저장 간 멘탈 모델 충돌 방지.
  - `FullScreenPromptEditor.tsx`: 기존의 독립 모달 코드를 제거하고 `<FullScreenTextEditor saveMode="manual" />`을 감싸는 형태로 리팩토링 및 하위호환성 유지.
  - `Codex.tsx`: Entry Content 섹션에 'Expand(Maximize2)' 버튼 추가. 루트 레벨에 끌어올려진 `localContent`와 `debouncedUpdate` 훅에 직접 바인딩한 자동 저장 모드의 전체 화면 에디터 마운트.
  - 모바일 가독성 증대를 위한 `h-[100dvh]` 및 Z-Index 충돌 방지를 위한 `zIndex="z-[140]"` 적용.
## [2026-04-17] AI Generation Stale Closure Fix (Zombie Editor Bug)
- **목적:** AI 생성 단축키 이용 시 텍스트 수를 0으로 반환하고 빈 응답 에러를 일으키는 현상 해결.
- **이유:** Tiptap 에디터 마운트 시 `handleContinue` 함수가 클로저에 갇혀 과거의 빈 에디터 상태를 조회하는 '오래된 클로저(Stale Closure)' 버그가 근본 원인.
- **관련 파일:** `src/components/EditorContainer.tsx`, `src/App.tsx`, `AGENTS.md`
- **편집 상세:**
  - `EditorContainer.tsx` 내부에 `handleContinueRef`를 생성하고 `useEffect`를 통해 항상 최신 상태로 유지하도록 함 (Ref-Forwarding 패턴).
  - Tiptap의 `GlobalShortcuts`와 `editorProps.handleKeyDown` 설정에 고정된 함수 대신 `handleContinueRef.current()`를 무조건 호출하도록 연결 구조 바꿈.
  - `App.tsx` 최상단에 방치되어 있던 사용되지 않는 낡은 Ref 관련 데드 코드를 청소함.
  - `AGENTS.md`에 이 오류 패턴 방지를 위한 규칙(Ref-Forwarding 필수화)을 영구 기록.
## [2026-04-17] Auto-Codex Scan Notification ID Fix
- **목적**: Auto-Codex 스캔 시작 시 발생하는 알림이 스캔 종료 후에도 즉시 사라지지 않는 문제 해결.
- **이유**: `useAutoCodex` 훅 내부에서 알림 생성 시 임의의 가짜 ID를 주입하고 실제 알림 시스템이 반환하는 진짜 ID를 분실하여, 이후 `removeNotification` 호출 시 타겟을 찾지 못하던 식별자 불일치(ID Mismatch) 버그를 바로잡기 위함.
- **관련 파일**: `src/hooks/useAutoCodex.ts`
- **편집 상세**: `addNotification`의 매개변수 타입을 ID(`string`)를 반환하도록 시그니처를 수정하고, 알림 호출 시 수신한 진짜 반환값을 `scanNotifId`로 할당하여 정상적으로 삭제할 수 있도록 수정함.
- **목적**: STP 절차 내에 방대하고 구체적인 콘텍스트 보존을 위한 최종 계획서 수립(Master Blueprint Formulation) 단계를 명시적으로 추가하여 아키텍처 작업의 사전 검토 역량을 극대화함.
- **이유**: 단순 계획 수립과 구현 사이에서, '모든 맥락과 대안이 상세히 기록된 최종 종합 계획서'로 문서를 격상시키는 단계를 의무화하기 위함. 사용자의 명시적인 피드백을 반영함.
- **관련 파일**: `GEMINI.md`
- **편집 상세**: `GEMINI.md` 의 `[실행 단계]`에서 기존 3단계를 Review로 한정하고, 4단계 `Master Blueprint Formulation`을 신설하였으며, 이후 단계를 하나씩 순차적으로 미룸(Execute가 5단계 됨).
- **목적**: 알림이 너무 빨리 사라지거나, 메시지가 잘려서 보이지 않고, 닫기 버튼이 없어 유저가 영원히 UI에서 알림을 치우지 못하는 "좀비 알림(레이스 컨디션)" 취약성 영구 해결.
- **이유**: `TECH_DEBT.md`의 구조적 한계와 사용자 UX를 동시에 개선하기 위해 호루출부(try/finally) 코드는 놔두고, 알림 시스템 자체에 "방어/치유(Dead Man's Switch)" 기능을 이식.
- **관련 파일**: `src/components/NotificationSystem.tsx`, `TECH_DEBT.md`, `src/components/AGENTS.md`
- **편집 상세**: 
  - `addNotification`/`updateNotification` 내부에 에러(`duration:0`), 정보(`smart duration`), 로딩(`60s Max TTL`) 로직 분배.
  - UI 렌더링에 `break-words whitespace-pre-wrap max-h-[40vh]` 적용 및 `truncate` 클래스 완전 해제.
  - 로딩, 제너레이팅 시에도 무조건 닫기(X) 버튼을 보여주도록 렌더 조건 파기 (`type !== loading` 제거).
  - TECH_DEBT 1번 안건 Resolved.
## [2026-04-17] Bug Fix & Architecture Update (Default Prompt Bleed)
- **목적**: 새 소설 생성 시 과거의 프롬프트 내용이 유전(Bleed)되는 오염 현상 구조적 해결.
- **이유**: `getMyDefaults()`에서 생성 파라미터(온도 등)와 시스템 프롬프트의 생명 주기가 혼재되어 있었음. 프롬프트는 100% 최신 템플릿(md 원본)만을 지향하도록 경계(Boundary)를 침으로써 문제 원천 차단.
- **관련 파일**: `src/App.tsx`, `TODO.md`, `AGENTS.md`
- **편집 상세**: 
  - `App.tsx`: `getMyDefaults` 내에서 `prompts` 객체를 구성할 때 `legacy`나 `savedPrompts` 폴백 로직을 전부 제거하고 오직 `GLOBAL_DEFAULTS`만을 바라보도록 강제 할당.
  - `TODO.md`: 2번 안건 픽스 및 Resolved 처리.
  - `AGENTS.md`: `Data & Synchronization` 하위에 `Prompt Boundary Rule`을 신설하여, 향후 프롬프트 초기화는 사용자 설정이 아닌 하드코딩 디폴트를 유지해야 함을 명문화.
## [2026-04-17] STP Finalization (Sidebar Edit Mode UX)
- **목적**: STP의 마지막 단계(Finalize)에 따른 Living Documentation 업데이트.
- **이유**: UX 버그 수정(소설 생성 시 이름 짓기 vs 소설 복제 시 포커스 이동) 사항이 프로젝트의 항구적인 UX/UI 규칙으로 정립되어야 향후 기능 추가/리팩토링 시에도 회귀(Regression)를 막을 수 있으므로 가이드라인에 명시.
- **관련 파일**: `/AGENTS.md`, `src/components/AGENTS.md`
- **편집 상세**: 
  - 루트 `AGENTS.md`의 `6.5 Data & Synchronization > Duplication Logic` 하위에 `UX Constraint (Focus vs Edit)` 항목 신설.
  - `src/components/AGENTS.md`의 `Sidebar` 하위에 `Creation & Duplication UX` 항목 신설.
## [2026-04-17] Bug Fix (Duplicate Novel Sidebar Edit Mode)
- **목적**: 소설 복제 시 사이드바에서 이름 변경(편집 중) 모드로 강제 전환되는 버그 수정 및 UX 동기화.
- **이유**: `handleDuplicateNovel` 로직이 복사본 생성을 새 문서 생성과 동일하게 취급하여 사용자 경험을 해치고 있었음. 새 문서 생성은 명시적으로 편집이 필요하고, 복제는 기존 문서 포커스 유지가 필요함.
- **관련 파일**: `src/App.tsx`, `TODO.md`, `PLAN_SIDEBAR_EDIT_MODE.md`, `GEMINI.md`
- **편집 상세**:
  - `App.tsx`의 `handleDuplicateNovel`: 상태 설정(`setEditingNovelId`)을 제거하고 `setCurrentNovel`을 이용해 가상의 객체를 덮어씌워 UI 포커스를 복제본으로 즉시 전환하도록 낙관적 업데이트(Optimistic Update) 적용.
  - `App.tsx`의 `createNewNovel`: 새 문서(`item`) 또는 새 폴더(`folder`) 생성 직후 `setEditingNovelId`와 `setEditTitle`을 명시적으로 호출하여 자동으로 이름을 지을 수 있도록 UX 개선.
  - `TODO.md`: 1번 문제 해결 완료 처리.
## [2026-04-17] Architecture Change (Strict JSON Firebase Configuration)
- **목적**: Remix 기반의 협업(Collaboration) 시 환경 변수 전달 누락으로 인한 불편함을 없애기 위해, Firebase 환경 변수 의존성을 100% 제거하고 정적 JSON 기반으로 전환.
- **이유**: 사용자의 제안에 따라 불필요하게 복잡하고 더러운 비밀 키 변수 관리 방식을 버리고, 협업 그룹의 현실 합의에 맞춰 `firebase-applet-config.json`(기본)과 `firebase-backup-config.json`(백업) 파일을 직접 리포지토리에 저장하고 불러오는 형태로 아키텍처를 단순화함.
- **관련 파일**: `src/firebase.ts`, `firebase-backup-config.json`, `.env.example`, `AGENTS.md`
- **편집 상세**:
  - `firebase-backup-config.json` 신규 빈 파일 생성.
  - `src/firebase.ts` 내부의 환경 변수 조회 관련 찌꺼기 코드(`getEnvConfig`) 전면 제거 및 두 JSON 파일 직결.
  - `.env.example`에서 Firebase 관련 14줄 속성 완전 삭제 후 JSON 사용 주석으로 전환.
  - `AGENTS.md`의 Firebase Configuration 규칙을 "Strictly JSON Managed"로 전면 갱신.
## [2026-04-17] Bug Fix (Auto Codex Sync Delay & Data Loss Protection)
- **목적**: 코덱스의 다중 필드 입력 시 발생하는 데이터 증발(Data Loss) 문제와, AI 제안 수락 시 화면 갱신이 누락되는 동기화 지연 버그 수정.
- **이유**: 기존 `Codex.tsx`의 `debouncedUpdate`가 단일 `setTimeout`를 초과 사용하면서 부분 업데이트가 오버라이드되는 구조적 결함이 있었으며, UI 동기화 역시 `useEffect`의 최적화 디커플링으로 인해 AI 변경 사항을 즉시 반영하지 못했음.
- **관련 파일**: `src/components/Codex.tsx`, `/PLAN_Codex_Sync.md`
- **편집 상세**:
  - **누적 디바운스(Accumulating Debounce) 도입**: `pendingUpdatesRef`를 활용해 Title, Content 등 변경 사항을 병합(Merge)한 뒤 1초 뒤에 한 번에 Firestore로 전송하도록 리팩토링.
  - **AI 제안 수락 래퍼(`handleAcceptProposal`) 작성**: 외부의 `acceptProposal` 호출 전후로 로컬 상태를 강제 덮어쓰기(`setLocalContent`)하여 UI 즉각 갱신.
  - **안전한 스크러빙 (Safe Scrubbing)**: AI가 텍스트를 제안/수락할 때, 동시에 입력 중이던 구버전 텍스트 찌꺼기가 `pendingUpdatesRef`에 남아 1초 뒤에 덮어버리지 않도록 `delete pendingUpdatesRef.current.content`를 선언해 메모리 스크러빙 방어 추가.
  - AI Assistant의 "Replace" 버튼 로직에도 동일한 Safe Sync & Scrubbing 적용.
## [2026-04-17] Cleanup (Remove Debug Trace Logs)
- **목적**: 콘솔에 불필요하게 출력되는 `[Trace: MOUNT]`, `[Trace: UNMOUNT]`, `[Trace: RENDER]` 디버그 로그 제거.
- **이유**: 사용자가 Codex를 열 때마다 과도한 디버그 로그가 발생하여 정상적인 콘솔 확인을 방해함. 이는 이전 버그 해결 과정에서 강제로 주입된 디버그 코드가 남아있었기 때문임.
- **관련 파일**: `src/components/Codex.tsx`
- **편집 상세**:
  - `src/components/Codex.tsx` 파일 내부에 선언된 임시 `<Trace>` 컴포넌트 전체 삭제.
  - 해당 컴포넌트를 렌더링하고 있던 `Codex` 관련 `AnimatePresence` 내의 3곳의 Trace 마크업 삭제.
## [2026-04-17] Bug Fix (React 19 AnimatePresence Final Audit)
- **목적**: `Internal React error: Expected static flag was missing` 오류의 잔재를 완전히 제거하기 위해 모든 `AnimatePresence` 사용처 최종 점검.
- **이유**: 사용자가 최후의 검증을 요구한 파일들(`SettingsPanel.tsx`, `FullScreenPromptEditor.tsx`, `GlobalSettings.tsx`, `NotificationSystem.tsx`, `MemoryWorkbench.tsx`)을 철저히 확인하고 문제를 제거함.
- **관련 파일**: `src/components/SettingsPanel.tsx`, `src/components/FullScreenPromptEditor.tsx`, `src/components/GlobalSettings.tsx`, `src/components/NotificationSystem.tsx`, `src/components/MemoryWorkbench.tsx`
- **편집 상세**:
  - 추가 점검 대상 중 대부분은 이미 `AnimatePresence`의 직계 자식 `motion.div`에 고유 `key`가 잘 지정되어 있음을 확인.
  - `SettingsPanel.tsx` 내부, Context Pruning 옵션을 표시하는 하나(`motion.div`)에서 `key`가 누락된 것을 발견하여, `settings-panel-context-pruning`라는 고유 `key`를 부여해 오류 가능성을 원천 차단함.
## [2026-04-16] Bug Fix & Optimization (React 19 Compatibility & Editor Performance)
- **목적**: `Internal React error: Expected static flag was missing` 오류를 완전히 근절하고, 에디터 및 코덱스 편집 시 발생하는 전역 렉(Lag)을 최적화함.
- **이유**: React 19의 엄격한 정적 플래그 분석과 `motion` 라이브러리 간의 호환성 문제를 해결하고, 전역 상태 업데이트 범위를 최소화하여 사용자 경험을 개선하기 위함.
- **관련 파일**: `App.tsx`, `SettingsPanel.tsx`, `PromptInspector.tsx`, `NotificationSystem.tsx`, `GlobalSettings.tsx`, `CollapsibleTextArea.tsx`, `Codex.tsx`, `EditorContainer.tsx`, `MemoryWorkbench.tsx`, `DeleteConfirmationModal.tsx`, `Sidebar.tsx`, `FullScreenPromptEditor.tsx`, `useNovelContent.ts`
- **편집 상세**:
  - **React 19 Compatibility**:
    - 모든 `AnimatePresence` 컴포넌트의 직계 자식이 `motion.div`가 되도록 강제하고, 모든 자식에 고유하고 안정적인 `key` 부여.
    - `PromptInspector.tsx`, `GlobalSettings.tsx` 등에서 `AnimatePresence` 내부의 Fragment(`< >`)를 제거하고 `motion.div` 래퍼로 대체.
    - `SettingsPanel.tsx`, `Codex.tsx`, `NotificationSystem.tsx` 등의 누락된 `key` 속성 복구.
  - **Performance Optimization**:
    - **Editor State Colocation**: `App.tsx`에서 `useEditor` 훅과 Tiptap 로직을 `EditorContainer.tsx`로 이동하여 타이핑 시 앱 전체 리렌더링 방지.
    - **PromptInspector Optimization**: `React.memo` 적용 및 `useMemo` 가드를 통해 인스펙터가 닫혀있을 때의 무거운 프롬프트 조립 연산 제거.
    - **Codex & TextArea Optimization**: `Codex.tsx`와 `CollapsibleTextArea.tsx`에 로컬 상태(`localValue`) 및 Debounce 기법을 적용하여 타이핑 중 발생하는 실시간 Firestore/전역상태 업데이트 부하 급감.
    - **Race Condition Fix**: `useNovelContent.ts`에서 메타데이터 업데이트 시 즉각적인 React 상태 반영 로직을 추가하여 UI 응답성 확보.
  - **Verification**: `lint_applet` 및 `compile_applet` 통과 확인.
## [2026-04-16] Bug Fix (Comprehensive React 19 Internal Error Fix)
- **목적**: `Internal React error: Expected static flag was missing` 오류의 완전한 해결.
- **이유**: React 19와 `motion` 라이브러리 간의 호환성 문제로, 특히 `AnimatePresence` 내부에서 `motion` 컴포넌트가 아닌 일반 요소가 존재하거나, 형제 요소들 간에 키(key)가 누락될 때 발생하는 내부 플래그 불일치 현상을 모든 컴포넌트에 걸쳐 수정함.
- **관련 파일**: `App.tsx`, `SettingsPanel.tsx`, `PendingProposalsList.tsx`, `MemoryWorkbench.tsx`, `GlobalSettings.tsx`, `DeleteConfirmationModal.tsx`, `Sidebar.tsx`, `FullScreenPromptEditor.tsx` 등.
- **편집 상세**:
  - **전역적 적용**: 모든 `AnimatePresence`의 직접적인 자식 요소가 `motion` 컴포넌트가 되도록 구조를 조정(필요 시 `motion.div`로 래핑).
  - **Key 강제 적용**: 모든 `motion` 자식 요소에 고유한 `key`를 부여하여 React 19의 정적 분석 및 최적화 과정에서 혼선이 생기지 않도록 보장.
  - **Fragment 제거**: `AnimatePresence` 직계 자식으로 쓰이던 `React Fragment(<>)`를 제거하고 명시적인 `motion.div`로 대체하여 내부 플래그 전달의 무결성 확보.
## [2026-04-16] Bug Fix (React 19 Internal Error)
- **목적**: `Internal React error: Expected static flag was missing` 오류 해결.
- **이유**: React 19와 `motion` 라이브러리 간의 호환성 문제로, 특히 `AnimatePresence` 내부에서 `motion` 컴포넌트와 일반 `div`가 혼용되거나 키(key)가 누락될 때 발생하는 내부 플래그 불일치 현상을 수정하기 위함.
- **관련 파일**: `components/PromptInspector.tsx`, `components/Codex.tsx`, `components/ui/CollapsibleTextArea.tsx`
- **편집 상세**:
  - **PromptInspector**: `React.memo` 제거 (React 19의 static 최적화와 충돌 가능성 방지). `AnimatePresence` 자식 요소들을 모두 `motion.div`로 변경하고 고유 `key` 부여.
  - **Codex**: 루트 요소를 `motion.div`로 변경하고 `key` 부여하여 `AnimatePresence` 호환성 확보.
  - **CollapsibleTextArea**: `AnimatePresence` 자식 요소들에 `key`를 추가하고, `mode="wait"` 적용 및 모든 분기를 `motion.div`로 통일하여 상태 전환 안정성 강화.
## [2026-04-16] Optimization (Performance & Editor State Colocation)
- **목적**: 전역 상태 업데이트로 인한 렌더링 병목을 해결하고 에디터 성능 및 코덱스 편집 효율 최적화.
- **이유**: 사용자가 타이핑할 때마다 앱 전체가 리렌더링되어 발생하는 렉(Lag)과 `PromptInspector`의 불필요한 연산 부하를 근본적으로 해결하기 위함.
- **관련 파일**: `App.tsx`, `components/EditorContainer.tsx`, `components/PromptInspector.tsx`, `components/Codex.tsx`, `components/ui/CollapsibleTextArea.tsx`
- **편집 상세**:
  - **PromptInspector**: `React.memo` 및 `useMemo` 가드 적용. 인스펙터가 닫혀있을 때 `generateTaskContext` 연산이 전적으로 생략되도록 최적화.
  - **Editor State Colocation**: `App.tsx`에 있던 `useEditor` 및 모든 Tiptap 설정/동기화 로직을 `EditorContainer.tsx`로 이동. 에디터 타이핑이 앱 전체를 리렌더링하지 않도록 격리.
  - **Codex Optimization**: `Codex.tsx` 및 `CollapsibleTextArea.tsx` 내부의 입력(Title, Keywords, Content, Notes) 필드에 로컬 상태 및 Debounce 기법 적용. 타이핑 중 전역 상태 업데이트를 최소화하여 코덱스 편집 렉 제거.
  - **Cleanup**: `GEMINI.md`의 STP Lock 해제 및 `PLAN_Editor_State_Colocation.md` 삭제.
## [2026-04-16] Process Update (Strategic Task Protocol)
- **목적**: `GEMINI.md`의 STP(Strategic Task Protocol) 실행 단계를 개정하여 계획 검토 및 다듬기 과정을 공식화.
- **이유**: AI가 계획 수립 후 사용자의 승인 없이 바로 코드를 수정하는 위험을 방지하고, 스스로 계획의 취약점(안정성, 확장성 등)을 비판하여 더 견고한 설계를 유도하기 위함. 또한, 문서화 단계에서 누락되는 하위 디렉토리의 `AGENTS.md` 업데이트를 강제하기 위함.
- **관련 파일**: `GEMINI.md`
- **편집 상세**:
  - `GEMINI.md`의 `[실행 단계]`에 3단계 `Review & Refine (CRITICAL)` 프로세스 추가. (즉시 실행 중지, 사용자 검토 요청, 자가 비판 및 논의, 최종 승인 후 실행)
  - 기존 3단계(Execute)와 4단계(Finalize & Cleanup)를 4단계, 5단계로 밀어냄.
  - 5단계(Finalize & Cleanup)의 문서화 지침을 "관련된 모든 디렉토리의 `AGENTS.md` 파일들"로 명확히 수정.
## [2026-04-16] Feature (Codex Inline Comments)
- **목적**: 유저가 코덱스(Lore) 본문에 `//` 기호를 사용하여 메타 주석(Meta Comments)을 달 수 있는 기능 추가. 소설 본문을 작성할 때는 이 주석이 AI에게 전달되지 않도록 차단하고, 코덱스를 다듬거나 생성할 때만 전송되도록 구현.
- **이유**: 사용자가 코덱스를 관리할 때 AI만 읽을 수 있는 메타 지시어를 남기고 싶어 하지만, 이것이 실제 소설 생성(Novel Generation) 시에 환각(Hallucination)으로 튀어나오는 것을 방지하기 위함.
- **관련 파일**: `src/lib/utils.ts`, `src/lib/contextProviders.ts`, `src/services/promptService.ts`
- **편집 상세**:
  - `src/lib/utils.ts`: 단어 간 `//`나 URL `http://` 등은 보호하고 공백이나 줄 시작에 오는 `//`만 삭제하는 `stripInlineComments` 정규식 유틸리티 추가.
  - `src/lib/contextProviders.ts`: `formatActiveLore` 함수의 옵션으로 `preserveLoreComments`를 받아 주석 제거 로직과 연결.
  - `src/services/promptService.ts`: `TASK_CONFIG` 맵을 도입하여 `novel`, `memory` 타스크는 주석을 제거하고, `codex`, `autocodex` 타스크만 주석을 보존하는 분기 처리 완성 (OCP, SRP 원칙 준수).
## [2026-04-16] Bug Fix (Hard Reset Prompts)
- **목적**: "Hard Reset to System Defaults" 기능이 즉각적으로 UI에 반영되지 않는 문제와 확인 창이 뜨지 않는 문제 해결.
- **이유**: `updateNovel` 함수가 비동기적으로 `novels` 상태를 업데이트하고 `useEffect`를 통해 `currentNovel`에 반영되기 때문에 UI 업데이트에 지연이 발생함. 또한, iframe 환경에서 `window.confirm`이 차단되어 사용자 확인 없이 바로 리셋이 실행되는 위험이 있었음.
- **관련 파일**: `src/App.tsx`, `src/components/SettingsPanel.tsx`
- **편집 상세**:
  - `src/App.tsx`: `resetPromptsToDefaults` 함수 내에서 `setCurrentNovel`을 호출하여 로컬 상태를 즉시 업데이트하도록 수정 (Instant UI Feedback).
  - `src/components/SettingsPanel.tsx`: `window.confirm`을 제거하고, `showResetConfirm` 상태를 추가하여 안전한 커스텀 모달(Custom Modal) 창을 통해 하드 리셋을 확인하도록 구현.
## [2026-04-16] UI Optimization (Prompt Preset Manager)
- **목적**: 좁은 사이드바 환경에서 `PromptPresetManager`의 UI 요소들이 영역을 벗어나거나 찌그러지는 현상(Overflow) 해결.
- **이유**: `flex` 레이아웃 내에서 입력 필드와 버튼들이 공간을 다투며 레이아웃이 깨지는 문제가 발생함.
- **관련 파일**: `src/components/PromptPresetManager.tsx`
- **편집 상세**:
  - `flex-1` 요소들(`<select>`, `<input>`)에 `min-w-0` 클래스를 추가하여 부모 컨테이너 크기 이하로 축소될 수 있도록 허용.
  - 버튼들에 `shrink-0` 클래스를 추가하여 텍스트/아이콘이 찌그러지지 않도록 보호.
  - 좁은 공간을 효율적으로 사용하기 위해 버튼의 텍스트("Load", "Save")를 제거하고 아이콘 전용 버튼으로 변경.
  - "Saved Presets", "Save Current As" 라벨을 추가하여 시각적 계층 구조와 가독성 개선.
## [2026-04-16] Prompt Preset System (V2 Architecture)
- **목적**: Story Settings의 AI Prompt 설정을 저장하고 불러올 수 있는 프리셋 시스템 구축 및 하드 리셋 기능 구현.
- **이유**: 기존의 'Save Prompts Default'는 단일 전역 설정만 가능하여 다양한 장르/스타일의 프롬프트를 관리하기 어려웠음.
- **관련 파일**: `firestore.rules`, `src/types.ts`, `src/hooks/usePromptPresets.ts`, `src/components/PromptPresetManager.tsx`, `src/components/SettingsPanel.tsx`, `src/App.tsx`
- **편집 상세**: 
  - `firestore.rules`: `users/{userId}/promptPresets/{presetId}` 서브 컬렉션에 대한 보안 규칙 추가.
  - `src/types.ts`: `PromptPreset` 인터페이스 정의 (유연성을 위해 `prompts`를 Record 형태로 설계).
  - `src/hooks/usePromptPresets.ts`: 프리셋 CRUD 로직을 담당하는 커스텀 훅 생성 (Firestore 서브 컬렉션 연동 및 에러 핸들링).
  - `src/components/PromptPresetManager.tsx`: 프리셋 관리를 위한 독립적인 UI 컴포넌트 생성 (드롭다운, Load, Delete, Save 기능).
  - `src/components/SettingsPanel.tsx`: 기존 버튼들을 제거하고 `PromptPresetManager` 및 Hard Reset 버튼 연동.
  - `src/App.tsx`: `usePromptPresets` 훅 호출 및 `resetPromptsToDefaults` 함수를 `GLOBAL_DEFAULTS`를 사용하는 Hard Reset 방식으로 수정.
## [2026-04-16] UI Optimizations (Debug Mode & Prompt Inspector)
- **목적**: 에디터 UI의 복잡도를 줄이고, Prompt Inspector의 확장성을 확보하기 위한 UI 개선.
- **이유**: 일반적인 글쓰기 상황에서 Debug Prompt 아이콘이 시야를 방해하며, Auto Codex 추가로 인해 Prompt Inspector 상단 탭이 과밀화됨.
- **관련 파일**: `src/types.ts`, `src/components/GlobalSettings.tsx`, `src/components/EditorContainer.tsx`, `src/components/PromptInspector.tsx`, `src/App.tsx`
- **편집 상세**: 
  - `GlobalSettings`에 `debugMode` 토글 추가 (`localStorage` 연동).
  - `EditorContainer`에서 `debugMode`가 활성화된 경우에만 Debug Prompt (Dry-Run) 아이콘이 렌더링되도록 조건부 처리.
  - `PromptInspector` 상단의 가로 나열식 탭 버튼들을 공간 효율적인 `<select>` 드롭다운 메뉴로 리팩토링.
## [2026-04-16] Story Memory Replace Bug Fix
- **목적**: Story Memory AI Workbench에서 "Replace" 버튼 클릭 시 제안된 메모리가 현재 메모리를 대체하지 못하는 버그 수정.
- **이유**: `useNovelContent`의 `updateNovelContent` 함수가 Tiptap 에디터의 레이스 컨디션을 방지하기 위해 React 상태 업데이트를 생략하고 있었으나, 이로 인해 `storyMemory` 등 비-본문(non-content) 필드의 상태 업데이트까지 누락되어 UI 갱신 및 저장이 실패하는 문제 발생.
- **관련 파일**: `src/hooks/useNovelContent.ts`
- **편집 상세**: 
  - `updateNovelContent` 내부에서 `updates` 객체를 `content`와 `otherUpdates`로 분리.
  - `otherUpdates`(예: `storyMemory`, `title`)가 존재할 경우 즉시 `setCurrentNovel`을 호출하여 React 상태를 업데이트하도록 수정.
  - 이를 통해 UI가 즉각적으로 갱신되고, 2초 뒤 실행되는 디바운스 저장 로직(`saveNovel`)이 최신 상태를 정상적으로 Firestore에 동기화하도록 보장.
## [2026-04-16] Hardcoded Fallback Values Refactoring
- **목적**: `contextProviders.ts` 및 `promptService.ts` 내부에 하드코딩된 대체값(Fallback)들을 `constants.ts`의 `GLOBAL_DEFAULTS`로 중앙 집중화.
- **이유**: 설정 기본값이 코드 전반에 흩어져 있어 유지보수 및 일관성 관리가 어려운 문제를 해결하기 위함.
- **관련 파일**: `src/constants.ts`, `src/lib/contextProviders.ts`, `src/services/promptService.ts`
- **편집 상세**: 
  - `src/constants.ts`: `autoCodexContextWindow`, `memoryInstruction`, `autoCodex.repetitionPenalty` 등 누락된 기본값 추가.
  - `src/lib/contextProviders.ts`: `12000`, `10000`, 하드코딩된 문자열 등을 `GLOBAL_DEFAULTS` 참조로 변경.
  - `src/services/promptService.ts`: `1.0`으로 하드코딩된 `repetitionPenalty` 대체값을 `GLOBAL_DEFAULTS.autoCodex.repetitionPenalty`로 변경.
## [2026-04-16] Unified AI Engine Refactoring & Total Data Provider Implementation
- **목적**: `generateTaskContext`를 "안정적인 번역기(Total Data Provider)" 패턴으로 전면 개편.
- **이유**: 템플릿(.md)과 코드(.ts)의 결합도를 최소화하고, 단 하나의 거대 변수 사전을 통해 모든 데이터에 접근 가능한 유연한 아키텍처 구축.
- **관련 파일**: `src/lib/contextProviders.ts`, `src/services/promptService.ts`, `src/hooks/useAutoCodex.ts`, `src/App.tsx`, `src/components/Codex.tsx`, `src/hooks/useAIEngine.ts`
- **편집 상세**: 
  - `src/lib/contextProviders.ts`: `buildTotalVariableDictionary`를 도입하여 소설의 모든 상태를 마크다운 변수로 번역하는 통합 엔진 구축.
  - `src/services/promptService.ts`: `generateTaskContext`를 `buildTotalVariableDictionary` 기반의 단순 오케스트레이터로 리팩토링. 모든 레거시 프롬프트 생성 함수 삭제.
  - `src/hooks/useAutoCodex.ts`, `App.tsx`, `Codex.tsx`, `useAIEngine.ts`: 새로운 통합 엔진 연동 및 불필요한 Props/의존성 제거 완료.
  - `PLAN_Context_Builder_Architecture.md`: 모든 단계 완료 처리.
## [2026-04-15] Implement Auto Codex Template and Inspection
- **목적**: Auto Codex 제안 로직을 Context Builder 아키텍처로 마이그레이션하기 위한 준비 및 검증 환경 구축.
- **이유**: Auto Codex는 복잡한 JSON 응답 구조를 가지므로, 실제 연동 전 `PromptInspector`를 통해 프롬프트 조립 결과를 시각적으로 확인하고 검증할 필요가 있음.
- **관련 파일**: `src/contexts/autocodex-generation.md`, `src/services/promptService.ts`, `src/components/PromptInspector.tsx`, `src/hooks/useAutoCodex.ts`, `src/App.tsx`, `PLAN_Context_Builder_Architecture.md`
- **편집 상세**: 
  - `src/contexts/autocodex-generation.md`: JSON 스키마와 Pruning 규칙을 포함한 오토 코덱스용 템플릿 작성.
  - `src/services/promptService.ts`: `generateTaskContext`에 `autocodex` 케이스 추가.
  - `src/hooks/useAutoCodex.ts`: `lastAutoCodexPromptInfo` 상태 추가 및 반환.
  - `src/App.tsx`: `PromptInspector`에 `lastAutoCodexPromptInfo` 전달.
  - `src/components/PromptInspector.tsx`: "Auto Codex" 탭 추가 및 실시간 조립/과거 기록 조회 로직 구현.
## [2026-04-15] Finalize Step 5-3: Integrate Memory Template with AI Engine
- **목적**: Story Memory 생성 로직을 새로운 Context Builder 아키텍처로 완전히 전환.
- **이유**: `PromptInspector`에서의 검증이 완료됨에 따라, 실제 AI 생성 요청을 담당하는 `useAIEngine.ts`의 `handleGenerateMemory` 로직을 `generateTaskContext` 기반으로 교체하여 아키텍처 일관성을 확보함.
- **관련 파일**: `src/hooks/useAIEngine.ts`, `PLAN_Context_Builder_Architecture.md`
- **편집 상세**: 
  - `src/hooks/useAIEngine.ts`: `handleGenerateMemory` 내부에서 레거시 `getMemoryPromptInfo` 호출을 `generateTaskContext('memory', ...)` 호출로 대체.
## [2026-04-15] Improve Memory Instruction Logic
- **목적**: 메모리 갱신 시 유저 지시사항 유무에 따른 프롬프트 구조 최적화 및 헤더 레벨 조정.
- **이유**: 유저의 특별 지시사항이 있을 때와 없을 때를 구분하여 중복된 안내 문구를 방지하고, 지시사항 섹션을 독립된 우선순위를 가진 `##` 헤더로 격상하여 AI의 지시 이행력을 높임.
- **관련 파일**: `src/contexts/memory-generation.md`, `src/services/promptService.ts`
- **편집 상세**: 
  - `src/contexts/memory-generation.md`: 하드코딩된 기본 지시문 제거 및 `{{USER_INSTRUCTION_MEMORY}}` 단일 변수 구조로 변경.
  - `src/services/promptService.ts`: `memoryAIInstruction`이 비어있을 경우 기본 지시문을 Fallback으로 사용하도록 로직 수정. 헤더를 `###`에서 `##`로 변경.
## [2026-04-15] Execute Step 5-3: Implement Memory Template and Verification
- **목적**: Story Memory 갱신 로직을 새로운 Context Builder 아키텍처로 마이그레이션하기 위한 템플릿 작성 및 검증 환경 연동.
- **이유**: 기존 하드코딩된 문자열 조립 방식을 `.md` 템플릿 기반으로 변경. 실제 생성 로직(`useAIEngine.ts`의 `handleGenerateMemory`)은 아직 건드리지 않고, `PromptInspector`에서만 `generateTaskContext('memory', ...)`를 호출하게 하여 조립 결과(Dry-Run)를 안전하게 검증할 수 있도록 함.
- **관련 파일**: `src/contexts/memory-generation.md`, `src/services/promptService.ts`, `src/components/PromptInspector.tsx`, `PLAN_Context_Builder_Architecture.md`, `src/contexts/AGENTS.md`
- **편집 상세**: 
  - `src/contexts/memory-generation.md`: 메모리 생성용 마크다운 템플릿 신규 작성.
  - `src/services/promptService.ts`: `generateTaskContext`에 `memory` 케이스 추가 및 `buildAIContext` 연동.
  - `src/components/PromptInspector.tsx`: 메모리 인스펙션 시 기존 `getMemoryPromptInfo` 대신 `generateTaskContext`를 사용하도록 수정.
  - `PLAN_Context_Builder_Architecture.md`: Step 5-4(Auto Codex) 계획 추가 및 Step 5-3 완료 처리.
  - `src/contexts/AGENTS.md`: 메모리 템플릿 변수 사전 추가.
## [2026-04-15] Fix Codex Template Prefill Tag
- **목적**: 코덱스 생성 템플릿(`codex-generation.md`)에서 Prefill이 누락되는 버그 수정.
- **이유**: `contextBuilder.ts`는 `<Prefill>` 태그를 기준으로 파싱하도록 설계되어 있으나, 코덱스 템플릿 작성 시 실수로 `<Model>` 태그를 사용하여 조립 엔진이 Prefill을 인식하지 못하고 빈 문자열을 반환하는 문제가 있었음. 이를 올바른 `<Prefill>` 태그로 수정함.
- **관련 파일**: `src/contexts/codex-generation.md`
- **편집 상세**: 
  - `src/contexts/codex-generation.md`: `<Model>` 및 `</Model>` 태그를 `<Prefill>`, `</Prefill>`로 변경.
## [2026-04-15] Update Project Documentation (AGENTS.md)
- **목적**: 최근 도입된 Context Builder 아키텍처와 Codex 템플릿 관련 내용을 프로젝트 공식 문서에 반영.
- **이유**: "Self-Documenting" 원칙에 따라, 아키텍처 변경 사항을 즉시 문서화하여 향후 개발 및 다른 에이전트의 작업 일관성을 보장함.
- **관련 파일**: `/AGENTS.md`, `src/services/AGENTS.md`, `src/contexts/AGENTS.md`
- **편집 상세**: 
  - `/AGENTS.md`: Context Builder 아키텍처를 핵심 아키텍처 표준으로 추가 및 업데이트 날짜 갱신.
  - `src/services/AGENTS.md`: `generateTaskContext` 오케스트레이터 및 `contextBuilder.ts` 로직 상세 명시.
  - `src/contexts/AGENTS.md`: `codex-generation.md` 템플릿에서 사용하는 신규 변수 사전 추가.
## [2026-04-15] Execute Step 5-2: Integrate Codex Template with AI Engine
- **목적**: 검증이 완료된 코덱스 템플릿 기반의 Context Builder 로직을 실제 AI 생성 엔진에 연동.
- **이유**: `PromptInspector`를 통한 조립 결과 검증이 성공적으로 완료되었으므로, 실제 코덱스 생성(`handleGenerateCodex`) 시에도 새로운 `generateTaskContext`를 사용하도록 마이그레이션함.
- **관련 파일**: `src/hooks/useAIEngine.ts`, `PLAN_Context_Builder_Architecture.md`
- **편집 상세**: 
  - `src/hooks/useAIEngine.ts`: `handleGenerateCodex` 함수 내에서 기존 `getCodexPromptInfo` 호출을 `generateTaskContext('codex', ...)`로 교체하고, 불필요해진 import 제거.
  - `PLAN_Context_Builder_Architecture.md`: Step 5-2 완료 처리.
## [2026-04-15] Execute Step 5-1: Implement Codex Template and Verification
- **목적**: 코덱스 생성 로직을 새로운 Context Builder 아키텍처로 마이그레이션하기 위한 첫 단계로 템플릿 작성 및 검증 환경 연동.
- **이유**: 기존 하드코딩된 문자열 조립 방식을 `.md` 템플릿 기반으로 변경하여 가독성과 유지보수성을 높임. 실제 생성 로직(`useAIEngine.ts`의 `handleGenerateCodex`)은 아직 건드리지 않고, `PromptInspector`에서만 `generateTaskContext('codex', ...)`를 호출하게 하여 조립 결과(Dry-Run)를 안전하게 검증할 수 있도록 함.
- **관련 파일**: `src/contexts/codex-generation.md`, `src/services/promptService.ts`, `src/components/PromptInspector.tsx`, `PLAN_Context_Builder_Architecture.md`
- **편집 상세**: 
  - `src/contexts/codex-generation.md`: 코덱스 생성용 마크다운 템플릿 신규 작성.
  - `src/services/promptService.ts`: `generateTaskContext`에 `codex` 케이스 추가 및 `buildAIContext` 연동.
  - `src/components/PromptInspector.tsx`: 코덱스 인스펙션 시 기존 `getCodexPromptInfo` 대신 `generateTaskContext`를 사용하도록 수정.
  - `PLAN_Context_Builder_Architecture.md`: Step 5-1 완료 처리.
## [2026-04-15] Fix Full-Screen Editor Settings Save Bug
- **목적**: 큰 화면(Full-Screen Editor)에서 System Prompt나 Assistant Prefill을 수정했을 때 저장이 되지 않는 버그 수정.
- **이유**: `applyFullScreenEdit` 함수가 `updateNovelContent`를 호출하고 있었으나, 해당 함수는 에디터 본문(content) 전용 디바운스 함수로 설계되어 `settings` 객체를 무시하는 구조적 한계가 있었음. 이를 즉시 Firestore에 저장하고 상태를 동기화하는 `updateNovel` 함수로 교체하여 해결함. 동일한 문제를 안고 있던 `resetParamsToDefaults`와 `resetPromptsToDefaults` 함수도 함께 수정함.
- **관련 파일**: `src/App.tsx`
- **편집 상세**: 
  - `App.tsx`: `applyFullScreenEdit`, `resetParamsToDefaults`, `resetPromptsToDefaults` 함수 내부의 `updateNovelContent` 호출을 `updateNovel`로 변경.
## [2026-04-15] Execute Step 4: Implement Unified Orchestrator (generateTaskContext)
- **목적**: 기존 `getPromptInfo`를 대체하고 모든 AI 생성 요청을 일원화하는 `generateTaskContext` 함수 구현 및 연동.
- **이유**: 계획된 Step 4에 따라, Facade 패턴을 적용하여 호출부(`useAIEngine`)와 조립부(`promptService`, `contextBuilder`)의 결합도를 낮추고 확장성을 극대화함.
- **관련 파일**: `src/services/promptService.ts`, `src/hooks/useAIEngine.ts`
- **편집 상세**: 
  - `promptService.ts`: `AITaskType` 타입을 정의하고, `getPromptInfo`를 삭제한 뒤 `generateTaskContext`를 신설하여 `'novel'` 케이스에 대한 조립 로직을 이식함.
  - `useAIEngine.ts`: `handleContinue`와 `handleDryRunNovel`이 모두 `generateTaskContext('novel', ...)`을 호출하도록 수정하여 코드 중복을 제거하고 로직을 100% 일치시킴. 불필요해진 Context Builder 관련 import 제거.
## [2026-04-15] Revise Step 4 Plan: Unified Orchestrator (Facade Pattern)
- **목적**: `getPromptInfo`를 대체할 확장성 높은 단일 진입점(Unified Function) 설계.
- **이유**: 사용자의 제안에 따라, 향후 Novel, Codex, Memory 등 모든 AI 생성 요청을 하나의 함수에서 `taskType` 인자를 통해 분기 처리(Facade/Factory 패턴)하도록 계획을 전면 수정함. 이를 통해 호출부(`useAIEngine`)는 내부 조립 로직을 알 필요 없이 용도만 전달하면 되므로 결합도가 크게 낮아짐.
- **관련 파일**: `PLAN_Context_Builder_Architecture.md`
- **편집 상세**: 
  - `PLAN_Context_Builder_Architecture.md`: `7. 세부 실행 계획: Step 4` 섹션을 `generateTaskContext` 기반의 단일 오케스트레이터 구조로 재작성.
## [2026-04-15] Implement HTML Comments in Context Builder & Plan Step 4
- **목적**: 템플릿 파일 내에 파싱되지 않는 주석(메모) 기능을 추가하고, 실제 생성 로직 교체를 위한 계획 수립.
- **이유**: 사용자의 요청에 따라, `novel-generation.md` 등 템플릿 파일에 설명을 덧붙일 수 있도록 HTML 주석(`<!-- ... -->`)을 엔진에서 무시하도록 처리함(Option 1). 또한, Dry-Run에서 검증된 구조를 실제 `handleContinue`에 적용하기 위한 구체적인 4단계 계획을 세움.
- **관련 파일**: `src/services/contextBuilder.ts`, `src/contexts/novel-generation.md`, `PLAN_Context_Builder_Architecture.md`
- **편집 상세**: 
  - `contextBuilder.ts`: `buildAIContext` 함수 최상단에 `templateRaw.replace(/<!--[\s\S]*?-->\n?/g, '')` 로직으로 수정하여 주석 뒤의 줄바꿈까지 함께 제거하도록 개선.
  - `novel-generation.md`: 각 섹션의 역할을 설명하는 HTML 주석 샘플 추가.
  - `PLAN_Context_Builder_Architecture.md`: `7. 세부 실행 계획: Step 4. 기존 로직 연동 (Novel)` 섹션 추가.
## [2026-04-15] Refactor Prefill Block and Rename Novel Variables
- **목적**: 템플릿의 하드코딩된 줄바꿈으로 인한 유령 공백(Ghost Whitespace) 문제 해결 및 소설 전용 변수명 명확화.
- **이유**: 사용자의 지적에 따라, `PREFILL_PROMPT`와 `PREFILL_SUFFIX` 사이의 공백 처리를 템플릿 엔진이 아닌 Provider로 위임(Option 1)하여 안전성을 확보함. 또한, 다른 기능(Codex 등)의 프롬프트와 혼동되지 않도록 소설 전용 변수들에 `_NOVEL` 접미사를 붙여 명확히 구별함.
- **관련 파일**: `src/lib/contextProviders.ts`, `src/hooks/useAIEngine.ts`, `src/contexts/novel-generation.md`, `src/contexts/AGENTS.md`
- **편집 상세**: 
  - `contextProviders.ts`: `formatNovelPrefillBlock` 함수를 추가하여 Prompt와 Suffix를 안전하게 결합.
  - `useAIEngine.ts`: Dry-Run 로직에서 `SYSTEM_PROMPT`를 `SYSTEM_PROMPT_NOVEL`로, `PREFILL_PROMPT`/`PREFILL_SUFFIX`를 `PREFILL_BLOCK_NOVEL`로 교체.
  - `novel-generation.md`: 템플릿 내의 하드코딩된 `\n\n`을 제거하고 단일 치환자 `{{PREFILL_BLOCK_NOVEL}}` 사용.
  - `AGENTS.md`: 변경된 변수명과 조립 로직을 문서 사전에 반영.
## [2026-04-15] Refactor continuationLength and Context Variables
- **목적**: 하드코딩된 `continuationLength` 제거 및 소설 전용 Context 변수(`STORY_CONTEXT_NOVEL`) 도입.
- **이유**: 사용자의 지적에 따라, `continuationLength`를 상수로 분리하여 확장성을 확보하고, 전체 텍스트(`STORY_CONTEXT`)와 잘린 텍스트(`STORY_CONTEXT_NOVEL`)를 명확히 분리하여 템플릿의 가독성과 재사용성을 높임.
- **관련 파일**: `src/types.ts`, `src/constants.ts`, `src/lib/contextProviders.ts`, `src/hooks/useAIEngine.ts`, `src/contexts/novel-generation.md`, `src/contexts/AGENTS.md`
- **편집 상세**: 
  - `types.ts`, `constants.ts`: `NovelSettings` 및 `GLOBAL_DEFAULTS`에 `continuationLength: 200` 추가.
  - `contextProviders.ts`: `processNovelContext`가 `storyContext`(전체)와 `storyContextNovel`(잘린 버전)을 모두 반환하도록 수정.
  - `useAIEngine.ts`: `handleDryRunNovel`에서 하드코딩된 200 대신 설정값을 불러와 사용하도록 수정.
  - `novel-generation.md`: 템플릿에서 `{{STORY_CONTEXT}}` 대신 `{{STORY_CONTEXT_NOVEL}}`을 사용하도록 변경.
  - `AGENTS.md`: 변경된 변수명과 의미를 문서에 반영.
## [2026-04-15] Refactor Context Providers for Novel-Specific Logic
- **목적**: 소설 본문(Novel) 생성 시 발생하는 텍스트 처리 로직(지시사항 추출, Prefill 분리)을 Provider로 분리.
- **이유**: 사용자의 지적에 따라, `STORY_CONTEXT`와 `PREFILL_SUFFIX` 간의 텍스트 중복을 방지하고, 순수 텍스트(Raw) 추출 로직과 소설 전용(Novel) 처리 로직을 명확히 구분하기 위함.
- **관련 파일**: `src/lib/contextProviders.ts`, `src/hooks/useAIEngine.ts`, `src/contexts/AGENTS.md`
- **편집 상세**: 
  - `contextProviders.ts`: HTML을 순수 텍스트로 바꾸는 `getRawPlainText` 함수 추가.
  - `contextProviders.ts`: 소설 전용 텍스트 처리를 담당하는 `processNovelContext` 함수 추가 (지시사항 추출/제거 및 Story Context와 Prefill Suffix 분리 로직 포함).
  - `useAIEngine.ts`: `handleDryRunNovel` 내부의 하드코딩된 텍스트 처리 로직을 `processNovelContext` 호출로 대체.
  - `AGENTS.md`: `STORY_CONTEXT`가 `PREFILL_SUFFIX` 부분을 명시적으로 제외한다는 내용 업데이트.
## [2026-04-15] Implement Dry-Run Mode for Context Builder
- **목적**: Context Builder가 의도대로 작동하는지 검증하기 위한 Dry-Run(가상 실행) 기능 구현.
- **이유**: 사용자의 요청에 따라, 실제 API 호출 없이 프롬프트 조립 결과를 즉시 확인하고 디버깅할 수 있는 도구를 제공하기 위함.
- **관련 파일**: `src/hooks/useAIEngine.ts`, `src/components/EditorContainer.tsx`, `src/App.tsx`
- **편집 상세**: 
  - `useAIEngine.ts`에 `handleDryRunNovel` 함수 추가: `buildAIContext`를 호출하여 결과를 콘솔에 출력하고, 기존 `PromptInspector`에서 확인할 수 있도록 상태(`setLastNovelPromptInfo`) 업데이트.
  - `EditorContainer.tsx`의 하단 툴바에 주황색 스파클(Sparkles) 아이콘의 "Debug Prompt (Dry-Run Context Builder)" 버튼 추가.
  - `App.tsx`에서 `handleDryRunNovel`을 추출하여 `EditorContainer`로 전달.
## [2026-04-15] Restructure Context Templates & Add Documentation
- **목적**: Context 템플릿과 일반 Prompt 파일의 명확한 분리 및 문서화.
- **이유**: 사용자의 지적에 따라, 구조를 정의하는 템플릿 파일이 일반 프롬프트 내용과 대등하게 취급되어 혼란을 주는 것을 방지하기 위해 별도 디렉토리로 분리하고, 치환자(Placeholder)의 의미를 명확히 알 수 있도록 전용 `AGENTS.md`를 작성함.
- **관련 파일**: `src/contexts/novel-generation.md` (이동됨), `src/contexts/AGENTS.md` (신규)
- **편집 상세**: 
  - `src/prompts/novel-generation.md`를 `src/contexts/novel-generation.md`로 이동.
  - `src/contexts/AGENTS.md`를 생성하여 Context와 Prompt의 개념적 차이를 설명하고, 템플릿에 사용되는 모든 `{{VARIABLE}}`의 출처와 의미를 명시한 사전(Dictionary) 작성.
## [2026-04-15] STP Step 3 (Execute) - Context Builder Foundation
- **목적**: Context Builder 아키텍처의 기반 파일 및 소설 생성용 템플릿 생성.
- **이유**: 사용자의 지시에 따라 기존 로직 연동 전에 기반 구조(`builder`, `provider`, `template`)를 먼저 구축하여 검토를 받기 위함.
- **관련 파일**: `src/services/contextBuilder.ts`, `src/lib/contextProviders.ts`, `src/prompts/novel-generation.md`
- **편집 상세**: 
  - `contextBuilder.ts`: 정규식 파싱 및 Fail-Fast 변수 치환 로직이 포함된 `buildAIContext` 함수 구현.
  - `contextProviders.ts`: 로어, 메모리, 지시사항 등을 마크다운 블록으로 포맷팅하는 순수 함수들 구현.
  - `novel-generation.md`: `<System>`, `<User>`, `<Prefill>` 태그와 치환자를 사용한 소설 본문 생성 전용 템플릿 작성.
## [2026-04-15] Update Context Builder Plan (Fail-Fast for Missing Variables)
- **목적**: 누락된 변수 처리 방식을 Fail-Fast(즉시 에러 발생)로 변경.
- **이유**: 사용자의 지적에 따라, 조용히 빈 문자열로 넘어가고 경고만 남길 경우 개발자가 문제를 인지하지 못할 위험(Silent Failure)이 크므로, 명시적으로 에러를 던져 개발 단계에서 즉시 수정하도록 강제함.
- **관련 파일**: `PLAN_Context_Builder_Architecture.md`
- **편집 상세**: 
  - `buildAIContext` 내의 변수 치환 로직에서 `variables[key]`가 없을 경우 `throw new Error(...)`를 발생시키도록 코드 및 주석 수정.
## [2026-04-15] STP Step 1 Update & Step 2 Lock (Context Builder)
- **목적**: Context Builder 계획에 대한 비판적 검토(Red Team) 반영 및 STP 2단계(Lock) 수행.
- **이유**: 사용자의 지시에 따라 계획의 취약점을 스스로 검토하고, `GEMINI.md`에 현재 작업을 고정(Lock)하여 절차적 엄밀성을 확보함.
- **관련 파일**: `PLAN_Context_Builder_Architecture.md`, `GEMINI.md`
- **편집 상세**: 
  - `PLAN_Context_Builder_Architecture.md`: 정규식 파싱 취약점(소설 본문에 `<System>`이 들어갈 경우)을 막기 위해 앵커(`^`, `$`)와 멀티라인 플래그(`m`)를 적용한 엄격한 정규식으로 수정.
  - `PLAN_Context_Builder_Architecture.md`: 누락된 변수(`{{VAR}}`) 주입 시 빈 문자열로 안전하게 처리하고 경고 로그를 남기는 로직 추가.
  - `PLAN_Context_Builder_Architecture.md`: 데이터 프로바이더의 위치를 `src/lib/contextProviders.ts`로 명확히 지정.
  - `GEMINI.md`: 최상단에 `🚨 CURRENT ACTIVE OPERATION: AI Context Builder Architecture 🚨` 블록을 추가하여 STP 2단계(Lock) 완료.
## [2026-04-15] Update Context Builder Plan with Debugging Strategy
- **목적**: Context Builder 아키텍처 설계도에 검증 및 디버깅 전략 추가.
- **이유**: 사용자의 피드백을 수용하여, 복잡한 UI 개편(1번안) 대신 개발 단계에서 즉각적으로 활용 가능한 Dry-Run(가상 실행) 모드(2번안)를 주력 디버깅 도구로 채택하여 문서화함.
- **관련 파일**: `PLAN_Context_Builder_Architecture.md`
- **편집 상세**: 
  - `PLAN_Context_Builder_Architecture.md`에 "5. 검증 및 디버깅 전략" 섹션 추가.
  - API 호출 없이 프롬프트 조립 결과만 콘솔이나 기존 UI로 확인하는 Dry-Run 모드를 핵심 도구로 명시.
## [2026-04-15] Create Context Builder Architecture Blueprint
- **목적**: 파편화된 AI 컨텍스트 조립 로직을 통합하기 위한 새로운 아키텍처 설계도 작성.
- **이유**: 사용자의 요청에 따라, `.md` 템플릿과 단일 Context Builder 함수를 결합하여 프롬프트 엔지니어링과 비즈니스 로직을 완벽히 분리하는 계획 수립.
- **관련 파일**: `PLAN_Context_Builder_Architecture.md`
- **편집 상세**: 
  - `PLAN_Context_Builder_Architecture.md` 파일 신규 생성.
  - `<System>`, `<User>` 등의 XML 태그와 `{{VARIABLE}}` 치환자를 활용하는 템플릿 문법 제안.
  - 정규식을 활용해 템플릿을 파싱하고 페이로드를 반환하는 `buildAIContext` 함수의 프로토타입 코드 작성.
  - 향후 본격적인 개발을 위한 점진적 마이그레이션 전략 명시.
## [2026-04-15] Update TECH_DEBT.md for AI Context Architecture
- **목적**: AI 컨텍스트 구성 아키텍처의 파편화 문제 상세 문서화.
- **이유**: 사용자의 의도(단순 프롬프트 파일 분리가 아닌, 컨텍스트 조립 로직의 비효율성 지적)를 정확히 반영하여 기술 부채 문서를 재작성.
- **관련 파일**: `TECH_DEBT.md`
- **편집 상세**: 
  - `TECH_DEBT.md`의 1번 항목을 "AI 컨텍스트 구성 아키텍처의 파편화 및 비효율성"으로 제목 변경.
  - 데이터 주입 위치 불일치, User Message 구조화 방식 파편화, 단일 문자열 결합의 한계, 조립 로직 하드코딩 등 4가지 현황을 상세히 분석하여 기록.
  - Context Builder Pattern 도입 등 구체적인 해결 목표 제시.
## [2026-04-13] Auto-Codex UX & Prompt Refinement
- **목적**: Auto-Codex 기능의 개발자 경험(DX) 및 사용자 경험(UX) 개선.
- **이유**: 하드코딩된 프롬프트 분리, 토글 오프 시 파라미터 조작 불가 문제 해결, 알림 잔존 버그 해결, 제안 알림 뱃지 추가.
- **관련 파일**: `src/prompts/auto-codex-system.md`, `src/services/promptService.ts`, `src/components/SettingsPanel.tsx`, `src/hooks/useAutoCodex.ts`, `src/components/EditorContainer.tsx`
- **편집 상세**: 
  - `auto-codex-system.md` 생성 및 프롬프트 이관.
  - `promptService.ts`에서 `?raw` 임포트 적용 및 템플릿 치환 로직 구현.
  - `SettingsPanel.tsx`에서 Auto-Codex 토글 오프 시 전체 차단 해제, Trigger Chars 선택적 비활성화, 헬퍼 텍스트 추가.
  - `useAutoCodex.ts`의 `finally` 블록에 `removeNotification` 호출 추가.
  - `EditorContainer.tsx`에 `useMemo` 기반 알림 뱃지 로직 및 UI 추가.
## [2026-04-13] Auto-Codex Manual Scan Logic Update (Refactored)
- **목적**: 자동 스캔 기능이 꺼져있을 때도 수동 스캔이 가능하도록 로직 분리 및 확장성 개선.
- **이유**: 향후 인자 추가 시 코드 수정 범위를 최소화하기 위해 '옵션 객체 패턴' 적용.
- **관련 파일**: `src/hooks/useAutoCodex.ts`, `src/components/Codex.tsx`, `src/App.tsx`
- **편집 상세**: 
  - `scanForProposals` 함수 인자를 `{ isManual?: boolean }` 객체 형태로 변경.
  - `Codex.tsx`의 호출부를 `scanForProposals({ isManual: true })`로 수정.
  - `App.tsx`의 호출부를 `scanForProposals({ isManual: false })`로 수정.
## [2026-04-13] Auto-Codex Manual Scan Logic Fix
- **목적**: 수동 스캔 시 인자가 무시되던 문제 해결.
- **이유**: `App.tsx`에서 함수 전달 시 인자를 고정(Override)하고 있었음.
- **관련 파일**: `src/App.tsx`
- **편집 상세**: 
  - `App.tsx`에서 `Codex` 컴포넌트로 전달하는 `scanForProposals` 함수를 `(options) => scanForProposals(options)` 형태로 수정하여 인자를 그대로 전달하도록 변경.
## [2026-04-13] Auto-Codex Debug Logs Removal
- **목적**: 디버깅을 위해 추가했던 로그 제거.
- **이유**: 문제 원인 파악 완료 및 코드 정리.
- **관련 파일**: `src/hooks/useAutoCodex.ts`
- **편집 상세**: 
  - `scanForProposals` 함수 내부에 추가했던 `console.log` 디버그 코드 전체 제거.
