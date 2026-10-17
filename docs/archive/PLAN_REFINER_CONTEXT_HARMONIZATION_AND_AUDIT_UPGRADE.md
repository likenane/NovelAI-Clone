# [Master Blueprint] Novel Refiner Context Harmonization & MARS Audit Upgrade Architecture

> **Status**: MASTER BLUEPRINT REVISED (Incorporating Context/Prompt Separation & Anchor Overlap Unification)  
> **Target Version**: v27 MARS Multi-Agent Architecture  
> **Single Source of Truth (SSOT)**: This document governs the unified context pipeline, context/prompt architectural separation, anchor overlap continuity mechanics, and holistic 4-Auditor review charter for the entire MARS (Multi-Agent Review & Synthesis) engine.

---

## 1. Executive Summary & Philosophical Analysis

### 1.1 Core Problems Identified by Author Critique
1. **Context와 Prompt의 역할 혼재 및 페르소나 충돌 (Persona Fragmentation)**:
   - `src/prompts/novel_system.md`에 서두 역할 정의(`You are an expert AI writer...`)와 세부 집필 헌법(`1. Input Structure...`)이 뒤섞여 있었음.
   - Refiner는 `novel_system.md`와 `critique_synthesis_system.md`를 단순 `---`로 이어 붙여, 모델이 서로 다른 두 개의 페르소나(`소설가` vs `통합 개정 전문 집필관`)를 동시에 부여받아 역할 혼선과 통일성 결여 발생.
   - `src/contexts/*.md` 파일들이 더미 껍데기(`{{SYSTEM_PROMPT_*}}`)로 방치되어 템플릿 엔진의 본래 목적(역할 부여 및 하위 프롬프트 모듈 조립)을 수행하지 못함.
2. **앵커(Anchor) 접합 메커니즘의 치명적 불일치**:
   - 시스템의 본질적인 소설 이어쓰기 메커니즘은 직전 문맥의 마지막 10~25자를 **동일하게 반복(Verbatim Echo/Overlap)**하게 한 후 자연스럽게 이어 쓰고, 클라이언트(`stitchAndTrimAnchor`)가 이를 잘라내어 접합하는 방식임.
   - 그러나 Refiner의 탈고 프롬프트에 "앵커 텍스트 중복 출력 엄금"이라는 모순된 지시를 주입하여, 초안 작성과 탈고 간의 앵커 처리 기준이 충돌하고 모델에게 극심한 혼란을 초래함.
3. **코드 중복(Duplication) 위험**:
   - 앵커 반복 지시문이나 서사 컨텍스트 조립을 여러 파일에 별도로 하드코딩하면 유지보수 시 무조건 드리프트가 발생하므로, 반드시 **단일 함수(SSOT Helper)를 호출하는 구조**로 통합해야 함.

---

## 2. Status Matrix: Completed vs New Action Items

### ✅ [COMPLETED] 이미 검증 및 완료된 영역 (Phase 1 & Phase 2)
1. **포괄적 4대 감찰 헌법 확립 및 번호표 제거**:
   - `[Agent N]`, `[Stage 3]` 번호표 전면 퇴출.
   - `critique_plot_system.md`, `critique_physical_system.md`, `critique_lore_epistemic_system.md`, `critique_stylistic_system.md`를 협소한 예시가 아닌 전방위 감찰 헌법으로 재정비.
2. **마크다운 헤더(`#`) 원천 차단 이중 방어벽 구축**:
   - 4대 감사관 프롬프트에서 `#`, `##` 헤더 생성을 엄격 금지하고 `[1. 대괄호]` 및 `- 블릿` 포맷 강제.
   - `refinerService.ts`에 `sanitizeAuditReport` 런타임 정규화 필터를 탑재하여 Stage 3 프롬프트 경계 오염 차단.
3. **서사 컨텍스트 위계 순서 일원화**:
   - `buildStandardNarrativeContext` 헬퍼 함수를 통해 `[The Codex]` $\rightarrow$ `[Plot Blueprint]` $\rightarrow$ `[Story Memory]` $\rightarrow$ `[Current Story Text]` $\rightarrow$ `[User Directive]` 순서 정립.
4. **4대 감사관 앵커 지시문 격리 (`includeAnchor: false`)**:
   - 감사관 호출 시 소설 생성용 앵커 반복 지시문(`<anchor>`)을 완전히 배제하여 감사관의 소설 작성 및 앵커 낭독 오염 원천 차단.
5. **Stage 3 Synthesis 감사 보고서 H3 마크다운 위계 확립 및 최근성(Recency) 앵커 배치**:
   - `formatMasterSynthesisPrompt`의 상위 보고서 래퍼를 `### 1. 플롯 및 사건 인과 심층 감사 보고서` 등 H3 마크다운으로 정렬.
   - 최하단 `## [Final Directing for Master Novelist]` 내부에 `### [Immediate Stitching Anchor]`와 `<anchor>`를 직접 배치하여 원거리 참조 페널티 0화.
6. **Context와 Prompt의 명확한 역할 분리 및 단일 페르소나 조립**:
   - `novel_system.md` 순수 헌법화 + `novel-generation.md` 소설가 페르소나 조립.
   - `critique_synthesis_system.md` 순수 탈고 헌법화 + `consistency_critique_context.md` 수석 탈고 작가 페르소나 조립.
7. **Verbatim Anchor Repeat 메커니즘 SSOT 단일화**:
   - `formatAnchorBlock`을 통한 단일 진실 공급원 앵커 지시문 일원화 및 탈고 헌법 100% 동기화.

---

### 🚀 [NEW ACTION ITEMS] Phase 4: Clean XML `<RAW_DRAFT>` Boundary, Token Cutoff Grace & Unified Auditor Hierarchy

#### 1. `<RAW_DRAFT>` 엄격한 순수 XML 태깅 및 군더더기 배제
- **원인 분석**:
  - 기존에는 `## [Draft to Audit (<RAW_DRAFT>)]`처럼 마크다운 헤더와 유사 XML 태그가 뒤섞여 있어, LLM 입장에서 명확한 컨테이너 경계로 인지하기 어려웠음.
- **해결책**:
  - 유저 메시지(`formatAuditorPrompt` 및 `formatMasterSynthesisPrompt`)에서 초안을 순수한 `<RAW_DRAFT>` XML 태그로 감싸 명확한 경계를 부여:
    ```xml
    <RAW_DRAFT>
    {{RAW_DRAFT_CONTENT}}
    </RAW_DRAFT>
    ```
  - 장황한 수식어(`REFERENCE CONTEXT: IMMUTABLE...` 등)를 추가하지 않고, 직관적인 본문 구조(`The Codex` -> `Plot Blueprint` -> `Story Memory` -> `Current Story Text` -> `User Directive` -> `<RAW_DRAFT>`)를 유지.

#### 2. 감사관 공통 프로토콜에 [초안 말미 절단 허용 (Token Cutoff Grace)] 신설
- **원인 분석**:
  - LLM 이어쓰기 특성상 `maxTokens`에 도달하면 초안의 마지막 문장이 도중에 끊길 수 있음.
  - 감사관들이 이를 "문장 미완성", "인과 단절"로 오판하여 불필요하게 결함으로 지적함.
- **해결책**:
  - 감사관 헌법에 명시적인 토큰 절단 예외 조항 추가:
    ```markdown
    2. [초안 말미 절단 허용 (Token Cutoff Grace)]
    - <RAW_DRAFT>의 끝부분은 토큰 생성 제한에 따라 문장이 진행 도중 끊겨 있을 수 있습니다. 이는 정상적인 이어쓰기 동작이므로, 말미 문장의 미완성 절단을 결함으로 지적하지 마십시오.
    ```

#### 3. 4대 감사관 시스템 프롬프트의 통일된 3계층 마크다운 헌법 구조화
- **원인 분석**:
  - `auditor_scope_protocol.md`와 개별 도메인 프롬프트 간의 헤더 레벨(# vs 대괄호), 제목 서식, 위계 순서가 일치하지 않아 시스템 프롬프트가 지저분하게 결합됨.
- **해결책**:
  - 4개 감사관 모두 완벽하게 동일한 3계층 마크다운 구조로 통일:
    - `# [Auditor Name Constitution]` (H1 최상위 역할 선언)
    - `## 1. [Audit Protocol & Operational Scope / 감찰 범위 헌법]` (H2 공통 서두 프로토콜: 불변 배경 vs `<RAW_DRAFT>` 경계 + 말미 절단 허용)
    - `## 2. [Domain Directives / 전문 감찰 헌법]` (H2 각 감사관별 심층 검수 항목)
    - `## 3. [Report Protocol & Strict Header Prohibition / 보고서 작성 규약]` (H2 마크다운 헤더 금지 및 대괄호 출력 양식)

---

### 🚀 [NEW ACTION ITEMS] 새로 구현 및 정비할 영역 (Phase 2)

#### 1. `contexts/`와 `prompts/`의 명확한 역할 분리 및 합성 템플릿 아키텍처
- **`src/prompts/novel_system.md` 순수화**:
  - 서두의 `You are an expert AI writer...` 페르소나 정의를 제거하고, 오직 **`1. Input Structure & Execution Hierarchy`부터 시작하는 순수한 소설 집필 세부 헌법**만 유지.
- **`src/contexts/novel-generation.md` (초안 집필 헌법 템플릿)**:
  - 상단에 **초안 작성을 위한 단일 페르소나/역할 정의**를 선언.
  - 본문에서 `{{SYSTEM_PROMPT_NOVEL}}` 변수를 호출하여 집필 세부 헌법을 자연스럽게 포함·조립.
- **`src/contexts/consistency_critique_context.md` (리파이너 탈고 헌법 템플릿)**:
  - 상단에 초안과 감사관 보고서를 종합하는 **수석 탈고 작가(Master Prose Synthesizer)의 단일 페르소나/역할 정의**를 선언.
  - 내부에서 `{{SYSTEM_PROMPT_NOVEL}}` (기본 집필 헌법)과 `{{CRITIQUE_SYNTHESIS_SYSTEM}}` (탈고 전문 헌법)을 유기적으로 호출·결합하여 단일 통합 시스템 프롬프트로 완성.
  - `contextProviders.ts`의 `SYSTEM_PROMPT_CONSISTENCY`를 조립할 때도 난잡한 문자열 덧붙이기 대신 이 템플릿 구조를 온전히 활용.

#### 2. 앵커 접합(Anchor Overlap) 메커니즘의 완벽한 SSOT 단일화
- **단일 진실 공급원 헬퍼 함수 신설/통합 (`src/lib/contextProviders.ts`)**:
  - `formatAnchorBlock(anchorText: string): string` 헬퍼 함수를 신설.
  - 초안 작성, 4대 감사관, 리파이너 탈고 모두 이 단일 함수를 호출하여 100% 동일한 앵커 지시문 주입:
    ```markdown
    ## [Immediate Preceding Anchor]
    To ensure seamless continuity, start your response by naturally repeating the EXACT final 10 to 25 characters of the anchor text below, and then smoothly continue the prose.
    
    <anchor>
    {{ANCHOR_TAIL_TEXT}}
    </anchor>
    ```
- **`critique_synthesis_system.md` 헌법 전면 개정**:
  - 기존의 잘못된 "앵커 중복 출력 엄금 / 0.1초 뒤부터 쓰기" 조항을 즉시 폐기.
  - `novel_system.md`의 `Section 8. Natural Continuity via Anchor Stitching (Overlap Continuation)`과 완벽히 동일하게 **"직전 앵커 문구를 그대로 반복하며 시작하여 완벽한 접합을 이루어라"**는 단일 헌법으로 동기화.
- **클라이언트 접합 파이프라인 무결성**:
  - 초안 생성과 리파이너 생성 모두 동일한 `stitchAndTrimAnchor(text, anchorText)` 함수를 통과하여 에디터 본문과 1글자의 오차도 없이 무결점 접합.

---

## 3. Detailed File Modification Specifications (구체적 파일 수정 계획)

### 3.1 `src/prompts/novel_system.md`
- 1행의 `You are an expert AI writer specialized in continuing Japanese-style light novels...` 페르소나 서두 삭제.
- `1. Input Structure & Execution Hierarchy`부터 시작하도록 정리.

### 3.2 `src/contexts/novel-generation.md`
- 초안 작성을 위한 상위 페르소나 역할 부여:
  ```markdown
  <!-- 소설 본문 생성/이어쓰기를 위한 메인 시스템 템플릿입니다. -->
  <System>
  You are an expert AI novelist specialized in writing and continuing high-velocity, visually immersive, and emotionally dynamic web novels and light novels. You capture the raw energy, dramatic tension, and fast-paced reading experience of modern serialized fiction.

  {{SYSTEM_PROMPT_NOVEL}}
  </System>
  ```

### 3.3 `src/prompts/critique_synthesis_system.md`
- 서두 페르소나 선언을 세부 집필 헌법으로 정제.
- `1. 개정 집필 헌법`의 1조를 **`Anchor Overlap Continuation (앵커 반복 및 무결점 접합)`**으로 개정 (`novel_system.md` 8조와 100% 일치).

### 3.4 `src/contexts/consistency_critique_context.md`
- 단일 수석 탈고 작가 페르소나 선언 및 하위 헌법 조립:
  ```markdown
  <!-- MARS Refiner 최종 탈고 작가를 위한 메인 시스템 템플릿입니다. -->
  <System>
  You are a Master Prose Synthesizer and Senior Novelist. Your supreme mission is to ingest the raw draft along with multi-agent audit reports, masterfully rewriting and refining the prose into an artistic masterpiece while strictly adhering to the novel's core writing directives.

  [1. Core Novel Writing Directives]
  {{SYSTEM_PROMPT_NOVEL}}

  [2. Master Synthesis & Refinement Directives]
  {{CRITIQUE_SYNTHESIS_SYSTEM}}
  </System>
  ```

### 3.5 `src/lib/contextProviders.ts`
- `formatAnchorBlock(anchorText: string): string` 신설.
- `buildStandardNarrativeContext` 내 앵커 블록 조립 시 `formatAnchorBlock` 호출.
- `SYSTEM_PROMPT_CONSISTENCY` 조립 및 `formatMasterSynthesisPrompt`가 일관된 템플릿 변수를 반영하도록 동기화.

### 3.6 `src/services/refinerService.ts`
- Stage 3 시스템 프롬프트 조립 시 중복 하드코딩 제거 및 `generateTaskContext('consistency', ...)` 템플릿 파이프라인과 완벽 동기화.

---

## 4. Verification Matrix

1. **빌드 및 린트 검증**: `tsc --noEmit` (`lint_applet`) 및 `compile_applet` 오류 0건 확인.
2. **Prompt Inspector 페르소나 검증**:
   - `Live (Novel)` 탭: 단일 소설가 페르소나 + 집필 헌법이 깔끔하게 결합되어 표시되는지 확인.
   - `Live (Consistency)` 탭: 단일 수석 탈고 작가 페르소나 아래 `[1. Core Novel Writing Directives]`와 `[2. Master Synthesis Directives]`가 층위별로 아름답게 조립되는지 확인.
3. **Anchor Overlap 생성 및 접합 검증**:
   - 초안 생성 및 Refiner 실행 시 모두 모델이 직전 앵커를 반복하며 시작하고, 프론트엔드가 이를 깔끔하게 접합하여 본문에 중복 없이 들어가는지 확인.
