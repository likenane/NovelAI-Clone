# AI Services & External Integrations - Development Guidelines

This document defines the standards for AI service integration and external API handling.

## 1. AI Service Architecture (`src/services/aiService.ts`)
- **Statelessness**: Service functions should be pure and stateless, taking all necessary parameters (API keys, model names, prompts) as arguments.
- **Thinking Token Headroom Decoupling (`calculateEffectiveMaxTokens`)**:
  - In Gemini 3.x models, `maxOutputTokens` includes both internal thinking/reasoning tokens and output text tokens.
  - `calculateEffectiveMaxTokens(targetTokens, thinkingLevel, modelName, isDirectGemini)` adds dynamic headroom (+5000 for `HIGH`, +2500 for `MEDIUM`, +1500 for `LOW`, +500 for `MINIMAL`) at the API call level, ensuring visible prose and lore output is never starved by thinking tokens.
  - In-flight sanitization with `getValidThinkingLevel` (SSOT from `src/constants.ts`) ensures only valid, model-supported thinking levels are dispatched to the API.
  - Dynamically clamps to model limits via `getModelMaxTokenLimit` (up to 60,000 for Direct Gemini, OpenRouter Gemini, Claude 3.7, DeepSeek R1; 16,384 for GPT-4o; 8,192 for Claude 3.5; 4,096 for Claude 3 Opus/Haiku) to prevent 400 Bad Request errors.
  - Applies to both Direct Gemini and OpenRouter handlers without modifying user or system prompts.
- **Error Handling**: 
  - Always catch and re-throw errors with descriptive messages.
  - **Thinking Level Fallback**: If a model does not support `thinkingLevel`, the service automatically retries without it to prevent 400 errors.
  - **Penalty Fallback**: Similarly, if penalties are not supported, it retries without them.
  - **Safety Settings**: Gemini API is configured with `BLOCK_NONE` for all categories to maximize creative freedom.
  - **Detailed Error Reporting & Fallback**: The service analyzes `finishReason` (including `SAFETY`, `RECITATION`, `PROHIBITED_CONTENT`, `MAX_TOKENS`, and `MALFORMED_RESPONSE`). For `MAX_TOKENS`, it attempts to return the partial response if available. For `MALFORMED_RESPONSE` in JSON mode, it extracts available candidate text or automatically executes a safe fallback retry in text mode with prompt-level JSON enforcement.
- **OpenRouter Integration**:
  - Use the standard `fetch` API for OpenRouter calls.
  - Ensure `repetition_penalty` is passed correctly according to OpenRouter's spec.

## 2. Model ID Management
- **Source of Truth**: The model IDs used in `aiService.ts` must match the values in the UI components (`App.tsx`, `SettingsPanel.tsx`, `Codex.tsx`) and `src/constants.ts`.
- **Default Task Models & Configurations (`DEFAULT_MODELS`, `GLOBAL_DEFAULTS`)**:
  - **Novel Continuation (Primary Model)**: `gemini-3.8-flash` (Thinking: `MEDIUM`, MaxTokens: 800, ContextWindow: 30,000 chars)
  - **Codex AI Assistant**: `gemini-3.8-flash` (Thinking: `LOW`, MaxTokens: 3,000)
  - **Story Memory Workbench**: `gemini-3.7-flash` (Thinking: `HIGH`, MaxTokens: 6,000)
  - **Plot Blueprint**: `gemini-3.7-flash` (Thinking: `HIGH`, MaxTokens: 21,000, Trigger: 7,500 chars)
  - **Auto-Codex**: `gemini-3.7-flash` (Thinking: `HIGH`, MaxTokens: 30,000, ContextWindow: 30,000 chars, Trigger: 10,000 chars)
  - **Refiner Auditor Model (MARS 4 Agents)**: `gemini-3.8-flash` (Thinking: `MEDIUM`, Temperature: 0.3, MaxTokens: 8,000)
- **Supported IDs (Pure Gemini Architecture)**:
  - `gemini-3.8-flash` (Direct - Default)
  - `gemini-3.7-flash` (Direct)
  - `gemini-3.6-flash` (Direct)
  - `gemini-3.1-pro-preview` (Direct)
  - `gemini-3.5-flash-lite` (Direct)
  - `google/gemini-3.8-flash` (OpenRouter)
  - `google/gemini-3.7-flash` (OpenRouter)
  - `google/gemini-3.6-flash` (OpenRouter)
  - `google/gemini-3.1-pro-preview` (OpenRouter)
  - `google/gemini-3.5-flash-lite` (OpenRouter)
  *(Non-Gemini models like Grok, Claude, etc. are strictly excluded in accordance with the Gemini-centric architecture).*

## 3. Prompt Engineering
- **Codex Prompt**: The target lore entry is presented using the format `### {title} - Target lore entry's existing content` followed by the content directly, to improve AI context recognition.
- **Directive Lookback**: The system extracts `{}` instructions from a range that is always twice the `continuationLength` (Prefill size). This ensures instructions are captured even if the user adds content after the directive.

## 4. AI Logic Specifications
- **Refiner Service (`src/services/refinerService.ts`)**:
  - **MARS (Multi-Agent Review & Synthesis) Architecture (`runConsistencyPipeline`)**:
    - **Stage 1 (Raw Drafting)**: Drafts `rawDraft` via standard novel continuation template using Primary Model.
    - **Pre-Trimming Protocol**: Receives pre-trimmed drafts (`RAW_DRAFT` with anchors cleanly removed) and pre-slices strictly at `targetTokens`.
    - **Stage 2 (4-Agent Parallel Diagnostic Analysis via `Promise.allSettled`)**:
      - 4 specialized diagnostic analysis agents evaluate the draft simultaneously using the dedicated Auditor Model (`auditor` settings, default `gemini-3.8-flash`, `temp: 0.3`):
        1. **Senior Narrative Dynamics & Causal Fidelity Analyst (`critique_plot_system.md`)**: Full author `{}` directive execution, macro arc pacing, narrative tension, and causal progression with Comprehensive Plot Lenses and elastic issue-driven reporting (Zero-Defect Bypass `[핵심 쟁점: 특이사항 없음]` or Elastic `[핵심 쟁점 1...N: 결함 원인 분석 및 교정 힌트]`) without sentence quoting or micro-copywriting.
        2. **Senior Spatial & Physical Fidelity Analyst (`critique_physical_system.md`)**: 3D spatial coordinates, eye contact, hands/grasp inventory invariants, and physiological wounds/fatigue with Comprehensive Physical Lenses and elastic issue-driven reporting without micro-copywriting.
        3. **Senior Lore & Epistemic Boundary Custodian (`critique_lore_epistemic_system.md`)**: Codex canon compliance, provenance tracking, epistemic boundary enforcement, and elimination of unobservable mind-reading with Comprehensive Lore Lenses and elastic issue-driven reporting without micro-copywriting.
        4. **Senior Korean Prose Stylistics & Aesthetics Stylist (`critique_stylistic_system.md`)**: Eradication of English/Japanese translationese, prompt character tags, sentence-ending monotony, and perceptual sensory order with Comprehensive Stylistic Lenses and elastic issue-driven reporting without micro-copywriting.
      - **Artistic Non-Interference Constitution & Elastic Zero-Defect Protocol (`auditor_scope_protocol.md`)**: Explicitly defines the text as pure literary fiction. Forbids sanitizing or sterilizing violent/dark/visceral elements, focusing purely on technical noise removal. Eliminates rigid 2-issue quota and 1~2 bullet limits: allows instant Zero-Defect pass when drafts are clean and dynamic unconstrained 1~N scaling with rich diagnostic depth when issues are found. Prohibits sentence quoting and micro-copywriting, saving 30-50% token overhead.
      - **100% Unified Standard Context Pipeline**: Ingests identical narrative context via SSOT `buildStandardNarrativeContext(totalVariables)` (`[The Codex]` -> `[Plot Blueprint]` -> `[Story Memory]` -> `[Current Story Text]` -> `[User Directive]` -> `<RAW_DRAFT>`), strictly injecting full recent prose (`STORY_CONTEXT`) to eliminate Ghost Gaps and guarantee 100% seamless continuity with stitching anchors.
    - **Stage 3 (Master Literary Restorer: Holistic Overhaul & Full Resynthesis)**:
      - Uses Primary Model to synthesize the 4 dynamic specialist diagnostic reports alongside `<RAW_DRAFT>` and `<anchor>` stitching tags.
      - **Masterful Holistic Literary Overhaul (Anti-Patching & Full Prose Resynthesis Constitution)**: Strictly forbids partial find-and-replace patching or surgical line edits. Absorbs the 4 diagnostic briefs as an executive dossier and rewrites, polishes, and elevates the entire continuation prose from start to finish into a high-fidelity, complete literary work with seamless momentum.
      - **Narrative Order Harmonization & Recency-Biased Anchor Architecture**: Places the complete prose (`Current Story Text`) ahead of `<RAW_DRAFT>` to preserve chronological narrative causality, while positioning the stitching anchor (`[Immediate Stitching Anchor]`) at the generation boundary (Recency Zone) at the bottom of the prompt, ensuring the model's immediate attention is locked on verbatim anchor continuation without narrative distortion.
      - **Live Story Content SSOT Injection**: Both Stage 1 (Drafting) and Stage 3 (Master Synthesis) strictly receive `overrideContent: preGenerationContent` resolved from the live Tiptap in-memory DOM via `resolveLiveStoryContent`. This guarantees that recent Undos (Ctrl+Z) or edits immediately before triggering generation are 100% harmonized across all stages, eliminating stale Firestore content leakage and anchor mismatches.
      - Enforces the **Literary Restoration & Anti-Sterilization Constitution**: 100% preserves and amplifies the raw vitality, emotional resonance, and distinct voice of the draft while rendering the complete, polished literary prose seamlessly without markdown code blocks.
      - **Clean XML `<RAW_DRAFT>` Boundary & Token Cutoff Grace**: Encapsulates the target draft in pure `<RAW_DRAFT>...</RAW_DRAFT>` XML tags. Grants explicit token cutoff grace in the auditor protocol so trailing incomplete sentences from token limits are never misclassified as defects.
      - **Dual-Layer Markdown Header Defense**: All 4 auditor prompts strictly prohibit markdown `#` headers (enforcing `[1. 대괄호]` and `- 블릿`). In-flight runtime sanitization via `sanitizeAuditReport` demotes any rogue `#` headers to bold inline headers to prevent Stage 3 prompt boundary pollution.
      - **Resilience & Safe Fallback**: Uses `Promise.allSettled`. If any agent experiences a transient timeout, the pipeline continues with the remaining fulfilled reports without failing the user.
      - Synthesizes all 4 diagnostic reports: factual conflict resolution (`[Plot/Directive] >= [Physical] > [Lore]`) combined with overarching Korean prose stylistics applied across the entire text to elevate the scene's cadence and natural dialogue.
      - **Complete Sentence Preservation & Post-Generation Slicing Bypass**: Because the Refiner model operates strictly within the Event Horizon of `<RAW_DRAFT>` and naturally concludes its prose at the draft's terminal scene, mechanical post-generation token slicing (`sliceProseByTokens`) is bypassed completely. This guarantees that refined endings, closing sentences, and final periods are never truncated, preserving 100% of the literary overhaul.
      - Produces pure prose output directly, achieving 0% JSON parsing crash rate and preventing prose sterilization.
    - **Inspector Observability & Data Binding**:
      - Binds `stage2Output` across all exit branches (`refinedText` or diagnostic fallbacks) ensuring the Prompt Inspector's Output accordion is reliably rendered.
      - Projects all audit reports into `plotAndDirectiveAnalysis`, `physicalLogicAnalysis`, `loreSystemAnalysis`, `linguisticAnalysis`, and `multiAgentAudits` for full PromptInspector backward compatibility.
- **Plot Service (`src/services/plotService.ts`)**:
  - **4-Tier Plot Blueprint Architecture & 5,000-Char Sequence Parsing**:
    - Generates and parses 4 distinct structural layers:
      1. `[1. 서술 방향 및 연출 디렉팅]`: Neutral 2-Tier directing structure dividing `### 작품 전역 지침` (POV, tone, prose style, absolute taboos; 100% immutable and frozen unless explicitly commanded by author) and `### 현재 아크 지침` (directorial pacing and focus adaptive to the active 5-stage roadmap).
      2. `[2. 장기 대서사 플롯 (아크 완결성 및 5단계 로드맵)]`: Macro trajectory covering `[서사적 의도 및 목적]`, `[캐릭터 심리 관성 및 개연적 변화 궤적]`, `[아크의 구조적 종착지]`, and 5-stage volume macro milestones (~20,000 chars each: 발단-전개-위기-절정-결말).
      3. `[3. 현재 진행 중인 사건 플롯]`: Episode incident with 6~8 dense Scene Sequences (~5,000 chars each). First 3~4 sequences are fully developed across all 4 elements ([서사 전개], [행동 및 대화 디렉팅], [연출 작법], [시퀀스 훅]); subsequent sequences are streamlined.
      4. `[4. 장기 복선 및 고정 논리 프레임워크]`: Dynamic Korean category tags (`[해결 논리 | 제목]`, `[불변 제약 | 이름]`, `[복선 | 이름]`, `[신규 설정 | 이름]`) designed to maintain causal plausibility and transparently document new settings.
    - **5-Tier Reader-Driven CoT Architecture**:
      - **1단계 (`diagnosis`)**: 상황 및 불일치 진단 (`contextAnalysis`, `plotType`, `mismatches`, `roadmapDecision`, `currentMilestone`, `section1Handling`).
      - **2단계 (`readerAnalysis`, `codexMaterial`)**: 독자 재미 분석 (재미 방향, 실시간 궁금증/보상, 미회수 복선) 및 설정집 갈등 재료 (약점, 이해관계, 제약).
      - **3단계 (`candidates`, `reverseReview`)**: 다방향 전개 후보군 도출 (C1~Cn, 평가 없는 순수 방향·사건) 및 역순 다차원 검토 (Cn→C1, `expectationRelation`(충족|지연|비틀기|뒤집기), 인물 부합, 설정/본문 정합, 독자 경험 `strengths`, `weaknesses`).
      - **4단계 (`selection`)**: 후보 상호 비교 분석 (`comparison`), 후보별 최종 판정 (`decisions`: `{ id, decision: '채택' | '조합' | '기각', reason }` 전단사 1:1 검증), 독자 경험 관점의 채택 사유 (`chosen`) 및 반전/신규 설정 (`twistAndNewSettings`) 점검.
      - **선택 단계 엄격 검증**: `decisions[].decision` 값이 ('채택' | '조합' | '기각') 중 하나인지 확인하고, `candidates[].id` 집합과 `decisions[].id` 집합이 누락 및 중복 없이 1:1 완전 대응하는지 엄격히 검증.
      - **5단계 (`verification`, `sequencePlan`, `section4Plan`)**: 사전 3대 정합성 검증, 6~8개 시퀀스 타임라인 로드맵, 4번 구역 갱신 계획.
      - Legacy 3-tier 및 8-step CoT 필드는 하위 호환성 정규화를 통해 100% 지원.
  - **2-Tier Hybrid Recovery & Strict Completeness Validation**:
    - **1-Pass (State-Machine JSON Sanitizer)**: Trims markdown blocks, slices outermost `{...}`, and uses `sanitizeJsonStringLiterals` to escape unescaped newline characters and tabs inside string literals to prevent parser crashes.
    - **2-Pass (Regex Direct Fallback)**: If JSON parsing fails due to severe syntax deformation, `extractPlotDirectlyFromRawText` recovers the required headers and extracts sequences via `extractSequencesFromPlotText`.
    - **Strict Completeness Defense (`validatePlotCompleteness`)**: Enforces required headers (1, 2, 3 required; 4 optional for legacy) AND sequence completion (Sequence 4+ or conclusion text indicators) with minimum 800 characters. If the model truncates output, it strictly throws a diagnostic error.
  - **Diagnostic Error Reporting**: If all recovery mechanisms fail, throws a clean diagnostic error and records the exact cause, with the raw output preserved in the caller's context state.
- **Story Memory Service (`src/services/memoryService.ts`)**:
  - Implements the 2-Tier Hierarchical Story Memory & Deterministic Archive Pipeline (`parseAndValidateMemoryResponse`).
  - **Tier 1 (Core Memory & JSON Schema Parsing)**: Strips markdown wrappers and parses `{ thoughtProcess, finalMemoryText, archiveEntries }`.
  - **Tier 2 (Fallback Regex & Text Recovery)**: Recovers memory output if standard JSON parsing fails while ensuring all 5 mandatory headers are present (with soft backward compatibility for legacy formats):
    1. `[1. 이야기의 뿌리]` (Root causes & covenants, ~400 chars)
    2. `[2. 지난 경과]` (3 subheadings: `◇ 전체 흐름`, `◇ 막 요약`, `◇ 진행 중인 막`, ~1,600 chars)
    3. `[3. 미해결 단서]` (Unresolved clues & promises, ~500 chars)
    4. `[4. 인물 상태와 관계]` (Actor states, epistemic asymmetry, relationship deltas, ~1,100 chars)
    5. `[5. 직전 장면 이음새]` (Immediate scene seam & landing ground, ~400 chars)
  - **Header & Format Auditing (`validateMemoryHeaders`, `validateMemoryCompleteness`)**: Enforces presence of all 5 mandatory headers and soft-tolerates volume budget (target 4,000 chars) with yellow workbench warning. Validates each card in `archiveEntries` (`type`, `tags`, `time`, `content`, `lasting`).
- **Style Directives Service (`src/services/aiService.ts` -> `generateStyleDirectivesAI`)**:
  - Automatically synthesizes custom novel style, perspective, tone, and directing directives from the complete narrative context (`[The Codex]`, `[Plot Blueprint]`, `[Story Memory]`, `[Current Story Text]`).
  - **Zero Fragmentation**: Reuses 100% of the SSOT narrative pipeline (`buildTotalVariableDictionary`, `buildStandardNarrativeContext`).
  - Enforces strict hierarchical `<Subheader>` / `- Bullet` contract tailored for direct injection into Plot Blueprint Section 1.
- **Prompt Service (`src/services/promptService.ts`)**: 
  - **Unified Orchestrator**: Uses `generateTaskContext(taskType, novel, extraData)` as the single entry point for all AI context generation.
  - **Codebase SSOT Firmware Lock**: Locks `novel_system.md` and `codex_system.md` to codebase defaults, preventing stale legacy prompt overrides from DB.
  - **Task Configuration**: Uses `TASK_CONFIG` map to handle task-specific behaviors data-drivenly (e.g., `preserveLoreComments`). Default deny principle applied.
  - **Total Data Provider**: Relies on `buildTotalVariableDictionary` (from `src/lib/contextProviders.ts`) to extract *all* possible variables into a single dictionary before injecting them into templates.
  - **Unified Message Assembly (SSOT)**: Calls `buildTaskMessages({ taskType, variables, novel, extraData })` from `src/lib/contextProviders.ts` to assemble conversation turns for all task types (`novel`, `memory`, `autocodex`, `codex`, `consistency`, `plot`).
  - **Context Envelope Guarantee**: Guarantees that active Codex lore (`ACTIVE_LORE_BLOCK` / `ACTIVE_LORE_BLOCK_AUTO`) and story memory (`STORY_MEMORY_BLOCK`) are consistently injected at the top of the User turn across all AI tasks without fragmented manual assembly.
  - **Task Types**: Supports `novel` (injects active Codex entries, Plot Blueprint, and Story Memory at the top User turn via `buildSyntheticHistoryMessages`), `codex` (binds `novel.settings.codex` parameters and assembles a Recency-Biased sandwich prompt with target lore, User Directive, and Adaptive CoT JSON schema, enforcing `responseFormat: 'json'`), `memory`, `autocodex`, `consistency`, and `plot` (dedicated plot generation context with 3-part blueprint and CoT reasoning).
- **Context Builder (`src/services/contextBuilder.ts`)**:
  - Implements a structural assembly pattern using XML-like tags (`<System>`, `<User>`, `<Model>`).
  - **Fail-Fast Variable Interpolation**: Throws an error if a template placeholder `{{VAR}}` is missing from the variables object.
  - **Comment Stripping**: Automatically removes HTML comments (`<!-- ... -->`) and their trailing newlines from templates before processing.
- **Instruction Extraction**: 
  - Regex: `/\{[^}]+\}/g`.
  - Range: `continuationLength * 2`.
  - Action: Move to `[User Directive]`, remove from `history` text.
- **Keyword Matching**: 
  - Case-insensitive matching of comma-separated keywords against `windowContent`.
- **Gemini Penalty Mapping**: 
  - Maps `repetitionPenalty` (1.0-2.0) to `presencePenalty`/`frequencyPenalty` (0.0-1.99).
- **Safety Settings**: Always `BLOCK_NONE` for creative writing.

## 5. Maintenance
- **AI Agent Protocol**: Follow the "Mandatory AI Agent Protocol" in `/AGENTS.md`. Update this file whenever service logic or model IDs change.

*Last Updated: 2026-09-27 (v27 - Style Directives SSOT & Firmware Lock)*
