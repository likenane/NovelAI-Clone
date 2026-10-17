# MASTER BLUEPRINT: MARS 리파이너 소설 본문 연속성(Anchor Continuation) 복원 및 인스펙터 연동 정상화

## 1. 지금 우리는 왜 이 작업을 하고 있는가? (철학적 배경 및 존재 이유)

### 1.1 프로젝트의 본질적 사명
AI Novelist Studio의 핵심 가치는 **"작가의 집필 흐름을 단 1글자의 어긋남이나 비약 없이 자연스럽게 계승하여 확장하는 무결한 이어쓰기 경험"**입니다.
소설에서 직전 문장이 끝난 지점(인물의 시선, 호흡, 미완의 대사, 감정의 여운)에서 다음 문장이 물 흐르듯 이어지는 것은 그 어떤 고급 기능보다 우선하는 절대적 존립 기반입니다.

### 1.2 MARS(Multi-Agent Review & Synthesis) 전환의 원래 목적
* **기존 구조의 한계**:
  단일 LLM에게 소설 초안 작성과 거대한 CoT JSON(플롯/물리/로어/문체 감사)을 한 번에 시키다 보니, 모델의 인지 과부하(Attention Dilution)로 인해 JSON 파싱 오류와 피로도가 누적되었습니다.
* **MARS의 원래 의도**:
  이를 해결하기 위해 **1단계(순수 초안 작성)** $\rightarrow$ **2단계(4개 감사관 병렬 심층 진단)** $\rightarrow$ **3단계(마스터 소설가의 최종 문학적 탈고)**로 역할을 분리하여, 토큰 경제성과 문학적 완성도를 극대화하려 했습니다.

### 1.3 발생한 치명적인 부작용과 퇴행 (The Regressions)
MARS 아키텍처 도입 과정에서 세 가지 중대한 결함이 발생했습니다:

1. **소설 본문과의 물리적/시간적 접점(Seamless Anchor Continuation)의 소실**:
   * 초안 작성 단계(`novel_system.md`)에 있던 `ANCHOR_TAIL_TEXT`(직전 본문의 마지막 1~2문장) 기반 앵커 헌법이 Stage 3 프롬프트에서 누락되어, 모델이 초안만 보고 고치느라 **이전 소설 본문이 끝난 접합부를 무시하고 씬을 새로 시작하거나 요약해 버리는 현상** 발생.
2. **컨텍스트 누락 및 파편화 (Context Fragmentation & Inconsistency)**:
   * 기존 시스템은 `src/lib/contextProviders.ts`의 `buildTotalVariableDictionary`라는 단일 진실 공급원(SSOT)에서 모든 컨텍스트(Plot, Memory, Codex, Anchor)를 통일되게 주입하고 있었으나,
   * 리파이너가 자체적으로 문자열을 따로 조립하면서 `Plot Blueprint`와 `Story Memory`가 누락되고 `Active Lore`가 잘려 나가는 파편화 발생.
3. **프롬프트 인스펙터 Output 누락 (Inspector Data Pipeline Bug)**:
   * 탈고는 되었는데 `refinerService.ts`의 리턴 객체에 `stage2Output` 필드가 누락되어, UI의 `useAIEngine.ts` 및 `PromptInspector.tsx`가 데이터를 전달받지 못해 Output 아코디언이 통째로 숨겨짐.

---

## 2. 핵심 아키텍처 원칙 (Core Architectural Principles)

### 2.1 단일 진실 공급원 기반 컨텍스트 파이프라인 (Unified SSOT Context Pipeline)
- 리파이너를 위해 별도의 컨텍스트 조립 코드를 중복 하드코딩하지 않습니다.
- 기존의 `buildTotalVariableDictionary`에서 정식으로 산출된 `variables`(`CLEAN_STORY_CONTEXT`, `ACTIVE_LORE_BLOCK`, `STORY_MEMORY_BLOCK`, `PLOT_BLUEPRINT`, `ANCHOR_TAIL_TEXT`, `USER_DIRECTIVE_BLOCK`)를 100% 동일하게 활용합니다.
- 초안 작성 시 사용되는 모든 서사 자산(플롯, 메모리, 코덱스, 직전 본문, 앵커)이 Stage 3 마스터 소설가에게도 **단 1글자의 차이도 없이 동일한 데이터 소스**로부터 전달됩니다.

### 2.2 전역 마크다운 계층 컨벤션 준수 (Markdown Hierarchy Consistency)
- 임의의 XML 태그 문법을 도입하지 않고, 프로젝트 전역의 표준인 **`## [Header]` 최상위 섹션 및 `### [Subheader]` 하위 섹션, 구분선(`---`)** 컨벤션을 100% 준수합니다.
- 4대 감사 보고서는 `## [Multi-Agent Audit Reports]` 섹션 아래에 `### 1. 플롯`, `### 2. 물리`, `### 3. 로어`, `### 4. 문체`로 격리 배치하여 마크다운 계층 충돌(Heading Hierarchy Collapse)을 완벽하게 방지합니다.

### 2.3 프롬프트 단일 상속 (Prompt Composition & Anti-Duplication)
- 소설 집필의 헌법(문체, 시점, 번역투 척결, 쇼돈텔, 인라인 지시 등)은 오직 **`novel_system.md`**에만 존재하도록 유지합니다.
- Stage 3 시스템 프롬프트는 `novel_system.md`를 Base로 상속받고, 그 아래에 **"4대 감사관의 보고서를 바탕으로 초안을 탈고하여 최종 소설 본문만을 완성하라"**는 탈고 오버레이 지침만을 덧붙입니다.

### 2.4 완벽한 인스펙터 관측성 (Full Observability)
- `runConsistencyPipeline` 리턴 객체에 `stage2Output: refinedText`를 정확히 바인딩하여, 프롬프트 인스펙터의 Output 아코디언이 정상 활성화되고 4대 감사 보고서 및 최종 탈고본을 한눈에 확인할 수 있도록 복원합니다.

---

## 3. 정밀 실행 로드맵 (Execution Roadmap)

### Phase 1: `refinerService.ts` 컨텍스트 파이프라인 SSOT 일원화
- `buildTotalVariableDictionary`에서 추출된 `variables`를 Stage 3 호출 시 직접 활용:
  - `variables.CLEAN_STORY_CONTEXT` (직전 본문)
  - `variables.ANCHOR_TAIL_TEXT` (직전 앵커 텍스트)
  - `variables.PLOT_BLUEPRINT` (플롯 청사진)
  - `variables.STORY_MEMORY_BLOCK` (스토리 메모리)
  - `variables.ACTIVE_LORE_BLOCK` (활성 코덱스 전수)
  - `variables.USER_DIRECTIVE_BLOCK` (인라인 지시사항)
- 마크다운 표준 계층 구조로 `synthesisUserContent` 조립.

### Phase 2: Stage 3 시스템 프롬프트 상속 및 앵커 연속성 헌법 주입
- `synthesisPayload.system`을 구성할 때:
  - Base: `novel.settings.novelSystemPrompt || GLOBAL_DEFAULTS.novelSystemPrompt`
  - Overlay: `GLOBAL_DEFAULTS.critiqueSynthesisPrompt`
  - 앵커 연결 지침: "직전 본문의 마지막 문장(`ANCHOR_TAIL_TEXT`)의 호흡과 자세에서 0.1초의 공백도 없이 이어 쓸 것"을 헌법으로 결합.

### Phase 3: 데이터 바인딩 및 인스펙터 복원
- `refinerService.ts`에서 `stage2Output: refinedText` 반환.
- Stage 3 결과물에도 `stitchAndTrimAnchor`를 안전 적용하여 앵커 중복 복제 원천 차단.

---

## 4. 검증 체크리스트 (Verification Checklist)
1. 소설 본문의 미완성 문장 끝에서 생성을 실행했을 때, 새로운 씬을 시작하거나 이전 상황을 요약하지 않고 그 문장의 끝에서 즉시 매끄럽게 이어지는가?
2. 플롯, 스토리 메모리, 코덱스의 최신 설정이 Stage 3 탈고본에 충실히 반영되는가?
3. 생성 완료 후 Prompt Inspector를 열었을 때, `Refiner` 탭의 `Output` 영역에 최종 완성본과 4대 감사 보고서가 완벽히 출력되는가?
4. `lint_applet` (`tsc --noEmit`) 및 `compile_applet` 0 에러.
