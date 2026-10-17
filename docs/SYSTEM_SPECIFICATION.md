# Project: AI Novelist Studio - System Architecture & Development Guidelines

This document is the **Single Source of Truth** for all developers and AI agents working on the AI Novelist Studio. It defines the architectural standards, data integrity protocols, and maintenance requirements to ensure the application remains stable, scalable, and professional.

---

## 1. Core Philosophy
- **Stability First**: Data integrity is paramount. Never compromise saving reliability for UI responsiveness.
- **Decoupled State**: The Editor state and the Sidebar/List state must remain independent to prevent race conditions.
- **Explicit Migration**: Legacy data structures must be migrated to the new sub-collection architecture proactively.
- **Self-Documenting**: Every major feature or architectural change MUST be reflected in this document.

---

## 2. System Architecture

### 2.1 Firestore Data Structure (Distributed Model)
To optimize performance and avoid document size limits (1MB), the data is distributed:

- **`/novels/{novelId}`**: Metadata only (Title, Author, Settings, Hierarchy).
  - *Constraint*: The `content` field is DEPRECATED here.
- **`/novels/{novelId}/contents/main`**: The actual Tiptap HTML content.
  - *Reason*: Prevents the sidebar list listener from fetching massive amounts of text unnecessarily.
- **`/novels/{novelId}/loreEntries/{entryId}`**: Individual Codex entries.
  - *Reason*: Allows real-time granular updates and searching.

### 2.2 State Management & Synchronization (Stable)
- **Single Source of Truth**: The `currentNovel` state in `App.tsx` is the master state for metadata. However, **during editing, the Tiptap editor's internal state is the sole source of truth for content.**
- **Unidirectional Data Flow**: 
  - Editor changes trigger a debounced save directly to Firestore via `useNovelContent`'s `updateNovelContent`.
  - React state (`currentNovel.content`) is updated *silently* after a successful save, without re-triggering editor updates.
- **Editor Sync**: 
  - The Tiptap editor must be synced via `editor.commands.setContent` **ONLY** when loading a new novel (tracked via `loadedNovelIdRef`).
  - **Undo History Protection**: Initial content loading and AI generation must use `.setMeta('addToHistory', false)` to prevent `Ctrl+Z` from reverting the document to an empty state.
- **Dirty Checking**: Use `lastSavedNovelRef` to compare current state vs. last saved state. Do not trigger saves if no meaningful change occurred.
- **Accumulated Debouncing**: For multi-field forms (like Codex), use a `pendingUpdatesRef` to accumulate and merge simultaneous changes (e.g., Title + Content) before the debounce timer fires, preventing partial data loss during input switching.

---

## 3. Data Integrity Protocols

### 3.1 The "No-Overwrite" Rule
- When the Sidebar list updates (via `onSnapshot`), it must NOT overwrite the `content` of the `currentNovel` if that novel is currently being edited.
- Metadata updates (title, settings) should be merged, but the `content` field in the local state must be protected.

### 3.3 Security Protocols
- **Admin Authorization**: The `isAdmin` function in `firestore.rules` must verify both the email address and the `email_verified` status.
- **Input Validation**: All Firestore write operations must enforce size limits (e.g., content < 1MB, titles < 100 chars) to prevent DoS attacks.
- **Ownership Protection**: Users can only modify their own novels (`authorUid` check), unless they are a verified admin.

### 3.4 Novel I/O Pipeline & Data Integrity Standard (V2)
- **Database SSOT & Resilient Pre-Save Guarantee (Zero-I/O Disaster Recovery)**:
  - The Firestore database is the normal Single Source of Truth (SSOT).
  - When downloading the active novel, a pre-save to Firestore (`saveNovel(undefined, true)`) is attempted to keep database and export synchronized.
  - **Quota-Exceeded / Resilient Export Mandate**: If Firestore pre-save fails due to daily quota exhaustion (`RESOURCE_EXHAUSTED` / `Quota exceeded`) or network outages, **the download operation MUST NOT abort**.
  - Instead, the pipeline performs an **In-Memory Hot Snapshot Export (Zero-I/O)**: extracting the live, uncommitted text directly from the Tiptap editor instance (`getEditorContent()`) and in-memory state (`currentNovel`, `loreEntries`, `storyMemory`, `plot`, `settings`), bypassing all Firestore Read/Write operations.
  - For inactive novels (downloaded from the sidebar while not open in the editor), Firestore Read errors due to quota limits are trapped gracefully with actionable user guidance ("Open the novel first to export from memory").
- **V2 Envelope Specification (`NovelExportEnvelopeV2`)**:
  - Exported JSON conforms to `{ version: '2.0', exportedAt, metadata: { ... }, data: { novel, content, loreEntries } }`.
  - Full payload preservation: `plot` (blueprint), `storyMemory`, modular `settings` (plot, autoCodex, automation, codex, memory), and Tiptap HTML `content`.
- **Codex Hygiene & Hierarchy Protection**:
  - Unapproved AI proposals (`isProposalOnly: true`) are strictly purged prior to export.
  - Lore hierarchy (`type`, `parentId`, `order`) is preserved and remapped deterministically on import to prevent ID collisions.
- **Deep Settings Merging & Backward Compatibility**:
  - `deepMergeNovelSettings` guarantees recursive fallback to `GLOBAL_DEFAULTS`, preventing `undefined` property crashes when loading legacy V1 or partial exports.
  - `parseAndNormalizeNovelUpload` seamlessly detects and migrates legacy V1 format files into normalized sub-collection structures.

---

## 4. Coding Conventions & Standards

### 4.1 Component Architecture
- **App.tsx**: Acts as the Orchestrator. It should handle global state and routing only.
- **src/components/**: All UI blocks (Sidebar, Settings, Editor, Codex) must be extracted into functional components.
- **src/hooks/**: Business logic (e.g., AI generation, Firestore syncing) should be moved to custom hooks.

### 4.2 Styling & UI
- **Theme**: Dark mode by default using the `zinc` palette.
- **Icons**: Exclusively use `lucide-react`.
- **Animations**: Use `motion/react` for all transitions and micro-interactions.
- **UX**: Always provide visual feedback for saving (e.g., "Saved" indicator) and generation (e.g., loading notifications). Use the `NotificationSystem` for all user feedback (success, error, loading) instead of native `alert()` calls.

### 4.3 AI Service Integration
- **Location**: All AI logic resides in `src/services/aiService.ts`.
- **Parameters**: `repetitionPenalty` is a mandatory parameter (1.0 - 2.0).
- **Context**: AI calls must always include the relevant Codex entries (Lore) to maintain story consistency.
- **Model Support**:
  - **Gemini (Direct)**: Supports `gemini-3.8-flash` (Default), `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.1-pro-preview`, `gemini-3.5-flash-lite`.
  - **OpenRouter**: Supports `google/gemini-3.8-flash`, `google/gemini-3.7-flash`, `google/gemini-3.6-flash`, `google/gemini-3.1-pro-preview`, `google/gemini-3.5-flash-lite`, `x-ai/grok-4.20`, etc.
  - *Note*: Always use the exact model IDs specified in the UI components to avoid 404 errors.

---

## 6. Feature Inventory (Functional Specification)
To prevent regression during refactoring, all agents MUST ensure these features remain functional:

### 6.1 Core Editor (Tiptap)
- **Instruction Nodes (`{}`)**: 
  - Custom inline node for user directives.
  - Shortcut: `{` creates node, `Enter` escapes to new paragraph.
  - Logic: Sanitize `{}` within node, handle backspace/delete for node removal.
- **AI Generation UI**:
  - `Mod-Enter` triggers generation.
  - **AI Highlight**: New text is highlighted in indigo; removed on user input or next generation.
  - **Undo Protection**: `addToHistory: false` used for initial load and AI generation.
- **Auto-scroll**: Editor scrolls to bottom after AI generation completes.

### 6.2 AI Generation Engine
- **Multi-Model**: Supports Gemini (Direct) and OpenRouter.
- **Consistency Refiner (2-Stage Pipeline)**: 
  - **Stage 1 (Drafting)**: Generates `rawDraft`.
  - **Stage 2 (Evidence-First Cognitive Critique & Refine Architecture)**: 
    - **Language Anchor & Sequential Specialized Analysis (Field-Order Thinking)**: Anchors analysis language via top-level `analysisLanguage` (e.g., '본문 언어가 한국어이므로, 이하 모든 분석과 비판은 한국어로 진행함'), then analyzes `rawDraft` in structured cognitive evaluation order:
      1. **Physical & Spatial Logic** (`physicalLogicAnalysis`): Validates spatial consistency, character body mechanics, object physics, and situational constraints first as objective physical ground.
      2. **Lore & World Mechanics (`loreAudits` / `loreSystemAnalysis`)**: Conducts a dynamic, per-lore multi-audit (`loreAudits`) over all worldbuilding elements, magic/skill systems, codex rules, and location/faction constraints present in the scene. Employs an Evidence-First evaluation workflow (`loreName`, `citedProse`, `codexRule`, `complianceAudit`, and concluding `verdict: 'PASS' | 'LORE_CONTRADICTION' | 'MECHANIC_VIOLATION'`), establishing hard canon before evaluating character psychology.
      3. **Character Dynamics & Authenticity (`characterAudits` / `characterDynamicsAnalysis`)**: Evaluates each character present in the generated scene individually using an Evidence-First workflow (`characterName`, `actionsAndDialogue`, `epistemicAudit`, `personalityAndValuesAudit`, `speechAndToneAudit`, and concluding `verdict: 'PASS' | 'OOC_DETECTED' | 'SPEECH_TONE_MISMATCH' | 'EPISTEMIC_VIOLATION'`). Strictly separates and audits:
         - **Epistemic Boundaries** (`epistemicAudit`): Anti-mindreading, anti-omniscience, and adherence to character knowledge horizon.
         - **Personality & Values Fidelity** (`personalityAndValuesAudit`): Core character traits, values, psychological baseline, emotional reactions, and OOC prevention.
         - **Speech Register & Dialogue Persona** (`speechAndToneAudit`): Address terms per dialogue partner (<인물별 호칭>), honorifics and speech levels (존댓말/반말 일관성 및 하대/존칭 혼용 방지), unique speech habits, and distinctive tone/endings.
      4. **Plot & Directive Alignment** (`plotAndDirectiveAnalysis`): Verifies inline `{}` directive execution and continuity with Plot Blueprint and Story Memory.
      5. **Structured Native Linguistic & Stylistic Polish (`structuredLinguisticAnalysis` / `linguisticAnalysis`)**: Employs multi-faceted linguistic auditing with Evidence-First issue reporting:
         - **Exposition & Lore Labeling Pruning (`expositionAndLoreLabeling`)**: Detects and prunes awkward didactic explanations, unnecessary info dumps, and misplaced historical tags without forcing artificial sensory descriptions.
         - **Native Fluency & Translationese Eradication (`nativeFluencyAndTranslationese`)**: Detects and eliminates translationese (번역투), unnatural passives, pronoun overuse, mechanical syntax, and broken subject-predicate structures, matching the authentic register of native Korean fiction.
         - **Dynamic Stylistic Flaws (`dynamicStylisticFlaws`)**: Dynamically flags and corrects register clashes, tonal inconsistencies, and mechanical syntax.
      6. **Information Order & Pacing (`informationOrderAudit`)**: Audits sentence-level and narrative-level pacing and information release order, eliminating conclusion-first exposition (`conclusionFirstPhrases`, `analysis`, `reorderPlan`, `hasIssues`).
    - **Refiner Change Log & Semantic Invariance**: Tracks all revisions in `changeLog` (`[{ vector, before, after }]`) alongside `conflicts`. Sets `hasConflicts: true` if ANY flaw or awkwardness is detected across vectors, triggering precise correction in `refinedText`. Strictly adheres to the **Semantic Invariance Mandate** (preserving author's plot, events, and thematic intent without arbitrary rewriting).
    - **Unconstrained Headroom**: `maxTokens` is unconstrained up to 60,000 tokens (intelligently clamped to model limits) to completely prevent truncation caused by thinking tokens or critique.
  - **Structural Validation & Safe Fallback**: If JSON parsing fails or `refinedText.length` is less than 50% of the draft, it immediately injects `rawDraft` into the editor to protect user experience from model hallucinations.
  - **Backward Compatibility**: `extractConsistencyResponse` safely parses legacy responses and synthesizes `characterDynamicsAnalysis`, `linguisticAnalysis`, and `narrativeAnalysis` from structured data for seamless backward compatibility.
  - **Streaming**: Streaming is intentionally disabled to avoid "Theatrical Streaming" delays; the final text is flushed immediately into the editor.
- **Prompt Construction & Directive Supremacy**:
  - **Hierarchy of Authority**: `[User Directive ({})]` (Supreme Priority) > `[Current Story Text]` (Ground Truth) > `[★ Plot Blueprint]` > `[Story Memory]` > `[The Codex]`.
  - **Directive Conflict Resolution**: If `{}` directly contradicts or diverges from the Plot Blueprint, the `{}` directive is strictly prioritized as intentional author steering without causing a refiner conflict.
  - **Scene Break Protocol**: Inserts standalone `* * *` between paragraphs (`\n\n* * *\n\n`) for sequence beat shifts, time-skips, and location changes.
  - **Natural Anchor Stitching Engine**: Instead of forcing artificial structural tags (`[INLINE]`, `[NEW_LINE]`), the engine instructs the AI to naturally repeat the final 10-25 characters of the story text as an anchor, proceeding smoothly with real prose formatting (`\n\n`, `\n`, or inline continuation).
  - **Dynamic Synthetic Multi-turn History**: `buildSyntheticHistoryMessages` models the anchor-repetition continuation pattern using real preceding paragraphs, teaching the model to echo the preceding anchor without breaking narrative immersion.
  - **Precise Anchor Trimming & Physical Newline Routing**: In `useAIEngine.ts`, `stitchAndTrimAnchor` uses sliding prefix matching to cleanly strip the echoed anchor. The remaining physical newlines (`\n\n` -> `<p></p>` blank line + new paragraph, `\n` -> new paragraph, inline -> current paragraph at `docSize - 1`) dictate Tiptap insertion with 100% fidelity.
  - **Instruction Extraction**: Extracts `{}` from the end of content and moves them to `[User Directive]` section.
  - **Context Injection**: Dynamically injects relevant Codex entries (via keyword matching) and Story Memory at the top User turn of the Messages payload (ahead of preceding story text), ensuring world rules and story summaries act as chronological premises without conflicting with active directives or latest prose.
  - **Lookback**: Extracts instructions from a range twice the `continuationLength`.
- **Deduplication (Pure Mathematical Overlap)**: Suffix repetition by the model is trimmed in the frontend using `removeMathematicalOverlap`, which enforces exact substring matching without dangerous heuristic assumptions (no greeting word replacement or whitespace trimming).
- **Output Format Mode**: 
  - **JSON Mode**: Structured tasks (`Auto-Codex`, `Consistency Refiner`, and `Codex AI Assistant`) enforce JSON schema output using Native JSON response formats (`responseMimeType: 'application/json'` / `response_format`).
  - **Plain Text Mode**: Creative/prose tasks (`Novel`, `Story Memory`) strictly generate plain text without JSON wrapping.
- **Thinking Token Decoupling & Engine-Side Precision Slicing**:
  - **The Continuity Principle**: Strictly forbids injecting length constraints or target token numbers into prompts, preserving uninhibited prose momentum and natural, abrupt cutoff.
  - **Dynamic Model-Aware Thinking Level Alignment (SSOT)**:
    - Centralized matrix `SUPPORTED_THINKING_LEVELS_BY_MODEL` and validator `getValidThinkingLevel` in `src/constants.ts` strictly define supported levels (`'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH'`) per model.
    - `gemini-3.8-flash` supports `LOW`, `MEDIUM`, `HIGH` (default: `MEDIUM`), preventing 400 Bad Request errors from invalid `MINIMAL` requests.
    - All UI surfaces (`SettingsPanel`, `Codex`, `MemoryWorkbench`) dynamically render supported options via `getSupportedThinkingLevels` and auto-transition invalid levels upon model change.
  - **API-Level Thinking Headroom**: `calculateEffectiveMaxTokens` dynamically adds buffer tokens (+5000 for `HIGH`, +2500 for `MEDIUM`, +1500 for `LOW`, +500 for `MINIMAL`) to `maxOutputTokens` at the API level, ensuring internal reasoning tokens never starve visible prose output.
  - **In-Flight Service Sanitization**: `generateGeminiContent` validates and sanitizes `thinkingLevel` in-flight prior to API dispatch as a non-invasive defense against legacy database values.
  - **Engine-Side Physical Slicing**: After anchor trimming and newline formatting, `sliceProseByTokens` calculates accurate SentencePiece/BPE token density (Hangul ~0.7 tokens/char, English ~0.25 tokens/char) and physically cuts the prose strictly at the user's configured `currentNovel.settings.maxTokens`.
  - **Task-Aware Isolation**:
    - **Novel Continuation (`novel`)**: Uses anchor trimming and precision token slicing to deliver the authentic, abrupt mid-sentence cutoff author experience.
    - **Completion Tasks (`codex`, `memory`, `autocodex`)**: Bypasses trimming and slicing to guarantee fully closed sentences, coherent summary paragraphs, and uncorrupted JSON data structures.
- **Parameters**: Supports Temperature, Max Tokens, Top P/K, Repetition Penalty, and Thinking Level (Reasoning: `MINIMAL`, `LOW`, `MEDIUM`, `HIGH`).
- **Fallbacks**: Automatically retries without `thinkingLevel` or `repetitionPenalty` if the model returns a 400 error.

### 6.3 Codex (Lorebook)
- **Role & Architectural Philosophy**: Serves as both a World Canon repository and an active **Writing Directing Anchor (집필 디렉팅 앵커)** guiding AI tone, speech registers, naming conventions, psychological baselines, and inter-character stances during novel generation.
- **Master Codex Formatting Rules (`codex_formatting_rules.md`) (SSOT)**:
  - Serves as the global Single Source of Truth for all Codex formatting, structure, and update rules, dynamically injected into both Codex AI Assistant and Auto-Codex prompts.
- **Strict 3-Tier Structure Constraints**: All entries strictly enforce a 3-tier plain-text formatting standard:
  - **Tier-1 Category Headers**: `[Header]` (e.g., `[기본 정보]`, `[개요]`, `[외형]`, `[말투]`, `[인간관계]`) on standalone lines. Strictly ban compound conjunctions (`~ 및 ~`).
  - **Tier-2 Sub-headers**: `<Sub-header>` (e.g., `<상황별 스탠스>`, `<인물별 호칭>`) on standalone lines.
  - **Tier-3 Bullet Lines**: `- ` (single-depth hyphen bullet points only).
  - **Strict Negative Constraints**: Ban all markdown code blocks (```), markdown headers (`#`), bold (`**`), italics (`*`), blockquotes (`>`), tables (`|`), and numbered lists.
- **Core Update & Curation Principles**:
  - **무손실 질감 및 작가 디렉팅 계승 원칙 (Lossless Texture & Directing Preservation)**: Full rewrite(전체 재작성) 유연성을 유지하되, 작가의 고유 어휘, 문학적 서술 밀도, 문체적 질감, 그리고 작가가 설정한 말투/행동 집필 디렉팅 뉘앙스는 모델 임의로 요약·압축·단문화하지 않고 100% 무손실로 계승한다. 미변경 불릿과 서술은 원형을 완벽히 보존한다.
  - **인물 본질의 고관성 및 보수적 상태 전이 규약 (Core Trait Inertia & Conservative State Shift)**: 인물의 기저 성향, 삶의 신조, 근본 가치관은 강력한 관성을 지닌 불변 영역이다. 단기 씬의 일시적 감정이나 단편적 행동을 이유로 캐릭터의 본질을 성급하게 개변(Character Drift)하는 것을 엄격히 통제하며, 3단계 관성 계층(1단계 기저 본성: 불변 동결, 2단계 관계/상황 스탠스: `<vs 대상명>` 하위 내적 갈등/모순 심화 기술, 3단계 일시적 감정/사건: 코덱스 반영 배제 및 스토리 메모리 격리)을 준수한다.
  - **안티-타임라인 및 시공간 탈색 상태 증류 파이프라인 규약 (Anti-Timeline & De-chronologization State Distillation)**: 코덱스는 단순 줄거리나 사건 일지(Timeline/Chronicle)가 아니며 '현재 시점의 본질적인 최종 확정 상태(Ontological State)'의 저장소이다. 씬 단위의 행동 경과(`~를 수령하고`, `~를 겪음`)와 시공간 정황(언제, 어디서)을 100% 증발시키고 영구적 속성/스탠스/규칙만을 추출한다. 임의의 헤더 [X]는 '이 대상의 [X]에 관한 영구 불변 규칙/상태는 무엇인가?'라는 암묵적 질문(Implicit Query)으로 기능하며, 오직 그 질문에 답하는 영구 상태 명제만을 서술한다. 영구적 상태 변화가 발생한 경우 불릿을 무한 덧붙이지 않고, 변화된 기존 불릿을 찾아 현재의 최신 확정 상태와 뉘앙스로 직접 대체/갱신(In-Place Overwrite)한다.
  - **서술의 닻(Anchor) 및 문학적 산문 원칙 (Literary Lore Prose)**: 불릿마다 `[관계]:`, `[스탠스]:` 같은 딱딱한 키워드 접두어를 붙여 메마른 데이터셋이나 엑셀 시트처럼 만들지 않는다. 문장의 뼈대(주어와 서술어)는 반드시 대상의 본질, 대인 스탠스, 고유 특성에 두고, 작중 사건과 디테일은 그 태도와 상태의 깊이를 증명하는 문학적 수식과 뉘앙스로 자연스럽게 녹여내어 완성된 서술문으로 작성한다.
  - **보편적 개념 분화 규약 (Universal Concept Spinoff Protocol)**: 인물, 장소, 사물과 같은 인위적 분류에 갇히지 않고 모든 로어 요소를 동등한 '개념(Concept)'으로 대한다. 모체 항목 내에서 **독립성(Independence: 모체 맥락을 벗어나 독립적 작동 원리나 서사적 파급력을 지님)**과 **고유성(Uniqueness: 고유한 명칭과 질적 비중을 확립할 고유 설정 체계를 지님)**을 획득한 하위 개념은 한 항목에 가두지 않고 독립 엔트리로 분열(Spinoff)시키며, 모체 항목에는 1줄 상호참조(`- <개념명>: (핵심 작용 및 관계 1줄 요약)`)만 남긴다.
  - **Header Elasticity**: Standard taxonomy is an extensible guideline. The AI can create new fitting Category Headers (e.g., `[전투 체계]`, `[고유 결계]`, `[제약 및 대가]`) instead of cramming heterogeneous facts into mismatched existing headers.
  - **Dynamic Subheader Fission Protocol**: When a header accumulates 4+ bullets or branches into distinct situations/targets, split it into Tier-2 `<서브헤더>` blocks to keep facts organized.
  - **수동 코덱스 적응형 CoT & 상태 증류 파이프라인 (Manual Codex Adaptive CoT Pipeline)**:
    - **작가 지시권 최우선 및 적응형 의도 분류 (Adaptive Intent Classification)**: `User Directive`를 제1지휘권으로 삼아 4대 의도(`RESTRUCTURE` [구조 개편/병합/분할], `PURE_CREATIVE` [순수 설정 창작/디렉팅 보강], `STORY_UPDATE` [본문 사건 상태 반영], `HYBRID` [복합])로 자동 분류하며, 지시문 부재 시 최신 본문 사건 반영(`STORY_UPDATE`)으로 자동 전환.
    - **조건부 시공간 탈색 상태 증류 (Conditional De-chronologization)**: `STORY_UPDATE` 및 `HYBRID` 작업 시에만 사건의 씬 정황(시간, 장소)과 동작 경과를 100% 증발·소각시키고 영구적 속성/스탠스/규칙만 추출하여 단순 사건 일지화를 원천 방지. `RESTRUCTURE` 및 `PURE_CREATIVE` 시에는 불필요한 증류 단계를 우회하여 의도된 구조 개편과 창작에 집중.
    - **헤더 목적론 및 문학적 산문 (Header Teleology)**: 각 타겟 헤더의 암묵적 질문(Implicit Header Question: "이 대상의 [X]에 관한 영구 불변 규칙/상태는 무엇인가?")에 직접 답하는 완성된 문학적 산문 불릿 도출.
    - **무손실 완전체 반환 규약 (Lossless Full-Document Return Mandate)**: 수정 대상이 아닌 기존 헤더와 불릿을 100% 원형 보존한 완전체 항목을 `finalContent`에 반환하여 편집 시 부분 누락이나 데이터 증발을 원천 차단.
    - **Auto-Codex 스타일 한 문단 변경 이유 요약 (`updateReason`)**: Auto-Codex와 동일하게 AI 어시스턴트 패널 상단에 컴팩트한 `💡 AI's Reasoning` 박스로 한 문단 분량의 수정/보강 이유를 명쾌하게 제공하며, 하단에 제안된 본문 텍스트를 깨끗하게 표시하여 에디터 입력 화면을 가리거나 복잡성을 유발하지 않는 가볍고 직관적인 UI 유지.
    - **견고한 파싱 및 안전한 폴백 (`parseCodexAssistantResponse`)**: 네이티브 JSON 및 마크다운 코드블록 래핑을 안정적으로 파싱하며, 비정형 텍스트 출력 시에도 정규식 기반 폴백으로 사용자 입력 데이터를 보호.
- **Common Essential Headers (Universal Baseline)**:
  - `[기본 정보]`: Fixed factual facts in itemized bullet format (`- 이름: ...`, `- 나이: ...`, `- 소속: ...`).
  - `[개요]`: Concise 1-2 sentence core summary defining the entry.
- **Recommended Header Taxonomy (Flexible & Non-Mandatory)**: Recommended examples only; authors/AI may omit or add headers as fitting.
  - Character (인물): `[기본 정보]`, `[개요]`, `[외형]`, `[말투]`, `[인간관계]`
  - Faction (세력 및 단체): `[기본 정보]`, `[개요]`, `[내부 구조]`, `[대외 관계]`
  - Concept (개념): `[기본 정보]`, `[개요]`, `[특징]`, `[서사적 역할]`
  - Location (장소 및 배경): `[기본 정보]`, `[개요]`, `[특징]`, `[서사적 역할]`
  - Rule & System (규칙 및 시스템): `[기본 정보]`, `[개요]`, `[작용 원리]`, `[서사적 역할]`
- **In-situ Directing Mandate (내재화 원칙)**:
  - Strictly bans creating artificial separate headers such as `[소설 집필 디렉팅]` or `[집필 가이드]`.
  - Directing instructions (how attributes manifest, dialogue tone, scene delivery, portrayal guides) must be embedded naturally within the corresponding core attribute bullets (e.g., under `[말투]` or `[외형]`).
- **Incremental Preservation**: When updating existing entries, AI must respect and preserve user-defined existing header structures without forced reorganization.
- **Activation**: Entries are injected into prompts if keywords match the recent context (unless `isAlwaysActive`).
- **AI Assistant Architecture & System Instruction Alignment**:
  - Dedicated workbench to generate/refine lore entries using story context and user directives.
  - **System Instruction Isolation & Zero-Conflict Formatting Architecture**: Aligned with the gold standard established in Auto-Codex. The structured JSON Output Contract and `{{CODEX_FORMATTING_RULES}}` are dynamically embedded directly inside the `<System>` prompt (`codex_system.md`). The User turn cleanly supplies [Active Lore & Story Memory (전역 배경)] -> [Current Story Text (소설 본문)] -> [Target Lore Entry to Update/Create (대상 항목)] -> [User Directive (유저 지시문)] -> [Final JSON Action Trigger]. This completely eliminates Recency Bias collisions where 160 lines of plain-text formatting rules at the tail of the User message previously caused models to output plain text instead of JSON.
  - **Dedicated Settings Routing (SSOT)**: `promptService.ts` explicitly binds `novel.settings.codex` (temperature, maxTokens, thinkingLevel) into `promptInfo.config`, avoiding silent fallback to novel settings.
  - **Token & Reasoning Headroom**: `GLOBAL_DEFAULTS.codex.maxTokens` default is 3000 (slider: 500-16000). Thinking buffer (HIGH=5000, LOW=1500, MINIMAL=500) ensures reasoning models (`gemini-3.8-flash`) never starve visible lore text.
- **Auto-Codex**: 
  - **Policy**: Default is **OFF** (Opt-in).
  - **UI**: All settings consolidated in `SettingsPanel.tsx`. `Codex.tsx` contains a shortcut link.
  - **Parameters**: Model (default: `gemini-3.7-flash`), Temperature (default: 0.3), Max Tokens (default: `30,000`, slider up to 60,000), Thinking Level (default: `HIGH`), Context Window (default: `30,000` chars), and Trigger Chars (default: `10,000` chars) are user-configurable.
  - **5-Step Evaluative CoT Architecture (`thoughtProcess`)**:
    - **Step 1: 2-Stage Semantic Discovery (`step1_semanticDiscovery`)**:
      - **Stage 1-A: Active Lore State-Shift Triage (`activeLoreFactShiftTriage`)**: Pre-scans active lore entries for permanent state transitions, cognitive baseline shifts, and worldview rule changes. Strictly enforces **Anti-Timeline** principles by filtering out transitory episodic actions (daily conversation, skirmishes, travel). Uses an **Evidence-First** pipeline where the model writes `observedFactShift` before determining `hasFactShift` (boolean), preventing confirmation bias.
      - **Stage 1-B: Novel Entity & Concept Discovery**: Bypasses surface-level noun fixation through 4 parallel discovery tracks:
        1. **Track 1: Explicit Entities (`explicitEntities`)**: Actively named characters, locations, items, and events with mention context.
        2. **Track 2: Implicit & Emergent Entities (`implicitEmergentEntities`)**: Identifies unnamed or descriptively referenced actors, factions, spaces, and objects (e.g. `[세력] 성벽 뒤편의 복면 무리`, `[장소] 폐광 심층 지하공동`) with temporary anchor titles (`temporaryAnchorTitle`), descriptive clues (`descriptiveClues`), and narrative recurrence basis (`recurrenceBasis`).
        3. **Track 3: Conceptual Clusters (`conceptualClusters`)**: Synthesizes 2+ fragmented symptoms, clues, magical laws, world mechanics, or social dynamics into a cohesive higher-order lore concept (`proposedConceptTitle`, `clusterEvidence: string[]`, `abstractDefinition`).
        4. **Track 4: Plot Section 4 Graduation Triage (`plotSection4GraduationTriage`)**: Evaluates unresolved scratchpads from Plot Blueprint Section 4. Tests against 3-Gate criteria (`manifestedInStoryProse`, `transientTacticalTrickAudit`, `worldCanonPermanenceEval`) to formulate `verdict` (`GRADUATE_TO_CODEX | KEEP_IN_PLOT | PRUNE_COMPLETED`). Items graduated to Codex transition from transient plot scratchpads into permanent Canon Lore, eliminating context redundancy.
      *(Note: Fully backward-compatible with legacy `step1_candidateExtraction`).*
    - **Step 2: Alias & Existing Mapping (`step2_aliasAndExistingMapping`)**: Resolves aliases, epithets, titles, conceptual subsets, and affiliations across all 3 tracks against existing entries (`[ID: xxx]`), preventing duplicate creation and routing to `EXISTING_UPDATE_CANDIDATE`.
    - **Step 3: New Entry Screening via 4 Gateways (`step3_newEntryScreening`)**: Enforces sequential narrative evaluation across (1) **Narrative Permanence** (recurring vs single-scene extra), (2) **Functional Identity** (independent entity/concept status, accepting descriptive or non-grammatical terms like "검은 망토의 사내" or world-specific common nouns), (3) **Narrative Stakes** (concrete plot/character impact and conflict weight), and (4) **Non-Redundancy** (standalone management value), before formulating an explicit `verdict` (`ACCEPT | REJECT`) and `verdictRationale`.
    - **Step 4: Existing Update Evaluation via 3-Audit & De-chronologization State Distillation (`step4_updateEvaluation`)**: Conducts sequential narrative audits across (1) **Inertia & Anti-Overinterpretation Audit**, (2) **Revealed Facts Permanence**, and (3) **Mere Mention Audit**, formulating a 1st verdict (`UPDATE | DROP`). If `UPDATE`, enters the **De-chronologization Pipeline** (`stateDistillation`: `rawObservedEvent`, complete evaporation of situational context/actions in `evaporatedContextAndActions`, extraction of permanent rule/property in `distilledPermanentProperty`, and `headerTeleologyMapping` with `targetHeader`, `implicitHeaderQuestion`, and `distilledProseBullet`), ending with (4) **Surgical Merge Plan** (guaranteeing 100% **Lossless Texture & Directing Preservation**, in-place state overwrite, and **Universal Concept Spinoff**). If `DROP`, `stateDistillation` is cleanly omitted/set to null.
    - **Step 5: Global Synthesis (`step5_globalSynthesis`)**: Generates an overarching synthesis of lore trajectory and writing context, maintaining backward compatibility with legacy `globalAnalysis`.
  - **Keyword Expansion Mandate (for Abstract & Emergent Entries)**: To ensure conceptual and emergent entities activate reliably during future story drafting, `newEntries` generation mandates registering descriptive clue terms, situational words, and symptom keywords (e.g., 흑염, 마력 역류, 마나 번, 체내 충돌, 복면, 밀수선) into the comma-separated `keywords` field.
  - **Stability & Defense**: 
    - Implements Lazy Migration, Ghost Scan defense, and non-intrusive error notifications.
    - **CoT Consistency Guard & Robust Title Normalization**: Client-side filtering in `useAutoCodex` actively cross-checks proposed additions and updates against CoT verdicts using bracketed category prefix stripping (`stripCategoryPrefix`, `normalizeCandidateTitle`), dropping rejected candidates or dropped updates to defend against model hallucination.
    - **Regurgitation Filter**: Employs deep normalization (`hasMeaningfulChanges`) to silently drop AI proposals that have no meaningful text differences, preventing UX fatigue and duplicate notifications.
    - **Lineage Architecture**: Utilizes `originalEntryId` and `updateReason` for Chain-of-Thought prompting and to prevent duplicate creation if the AI hallucinates a title change. `updateReason` is rendered in the UI to build trust.
  - **Proposals**: Grouped in a collapsible sidebar section; require user approval via a diff view.
  - **Total Observability & Prompt Inspector Integration**: Raw LLM responses, errors, and parsed 5-step CoT (`thoughtProcess`) are stored in `lastAutoCodexPromptInfo`. In `PromptInspector`, dedicated UI cards visualize Step 5 (Synthesis), Step 1-A (Active Lore Fact-Shift Triage), Step 1-B & 2 (Multi-Track Semantic Discovery with Conceptual Evidence, Emergent Clues, and Mapping), Step 3 (New Entry Screening via 4 Gateways & Verdicts with Candidate Type Badges), and Step 4 (Existing Update Evaluation via 4 Gateways & Verdicts). Directly accessible via shortcut buttons in `PendingProposalsList` and `ProposalDiffView`.
- **Organization**: Supports folders and drag-and-drop reordering.
- **Codex UI**:
  - **Pending Proposals**: Collapsible sidebar section (default: collapsed).
  - **Notification Badge**: The Codex button in the editor displays a pulsing dot when there are pending proposals (optimized via `useMemo`).
  - **Internal Notes**: Reordered above Keywords and made collapsible via `CollapsibleTextArea` component.
  - **Diff View**: Preserves line breaks (`whitespace-pre-wrap`) and includes "Copy" utilities for both current and proposed content.
  - **Stability & Sync**: Uses Accumulated Debounce to merge multi-field inputs and implements "Safe Sync & Scrubbing" to ensure AI proposals update the UI immediately without race-condition overwrites.
- **Content Deduplication & SSOT Engine**:
  - **Deduplication Logic**: `deduplicateLoreContent` in `src/lib/loreUtils.ts` programmatically removes redundant bullet points and profile keys (Name, Affiliation, etc.) that leak into non-primary headers.
  - **SSOT Mandate**: `src/prompts/codex_system.md` contains strict instructions to prevent information redundancy across headers, enforcing a Single Source of Truth within each lore entry.
  - **UI Controls**: Individual lore items feature a manual "Deduplicate" button (Scissors icon) to trigger the cleanup engine on existing content.
  - **Automated Filtering**: Both `useAIEngine` (Codex Assistant) and `useAutoCodex` (Background Proposals) pass AI-generated content through the deduplication engine before presentation to the user.

### 6.4 Story Memory & Workbench (5-Step Evaluative CoT Architecture)
- **Role & Architectural Philosophy**: Preserves high-density historical plot continuity, causal milestones, and the immediate narrative foothold of the latest prose without redundant bloat, operating strictly under the **4,000 Character Hard Budget Ceiling**. Active future goals and unfinished plot tasks are fully delegated to the Dynamic Plot Blueprint.
- **3-Tier Chronological & Situational Hierarchy**: All memories strictly enforce a 3-tier header order designed for optimal LLM chronological digestion and seamless prose continuation:
  1. `[1. 대서사 핵심 기점 및 원인]` (Preservation Lock / Immune): Foundational incident catalysts, world-altering milestones, and core motivations. Strictly protected from arbitrary culling or loss.
  2. `[2. 시간순 주요 사건 연표]` (Compressible / Dynamic Ledger): Ordered chronological bullet list (`- 제국력 O년 O월 / O일차: ...`). Completed intermediate events are compressed into concise 1-line ledgers, preventing exponential memory expansion.
  3. `[3. 현재 서사 도달점 및 인물 상황]` (Compressible / Situational Landing Ground):
     - **Codex Deconfliction & Strict Negative Constraint**: Prohibits character traits, static psychology, appearance, and general lore duplication (Codex domain).
     - **1-Line 3-Element Ultra-Compression Rule**: Strictly restricts each character to 1 line formatted as `- 인물명: [위치/동행] + [직전 사건의 물리적/직접적 결과] + [당면한 즉각적 상태/착지점]`.
     - **Narrative Foothold (Landing Ground)**: Directly anchors the exact situational state where the preceding prose ended, providing the optimal springboard for the next prose continuation.
- **5-Step Evaluative CoT Reasoning Pipeline (`thoughtProcess`)**:
  - **Step 1: Prose Delta Analysis & Codex Static Attribute Filtering (`step1_deltaAnalysis`)**: Identifies newly occurred plot developments (`newPlotEvents`), strictly excludes static lore/Codex entities (`codexEntityFiltering`), and focuses on user directives (`userDirectiveIntent`).
  - **Step 2: Causality Selection & Culling / Archival Routing (`step2_causalityAndCulling`)**: Evaluates `rootCauses` (Header 1 preservation), `chekhovGuns` (dormant foreshadowing preservation), and routes completed events to `resolvedEventsToArchive` with single-line archive formats.
  - **Step 3: Chronological Ledger Compression & Budget Strategy (`step3_compressionStrategy`)**: Plans `preservationAudit` (Header 1 immune status), `ledgerPruningPlan` (Header 2 one-line compression), `characterSnapshotPlan` (Header 3 1-line 3-element compression), and validates `characterBudgetEvaluation` (budget ceiling <= 4,000 characters).
  - **Step 4: Narrative Foothold & Actor States Analysis (`step4_narrativeFootholdAndActorStates`)**: Establishes overall scene landing ground (`currentFoothold`) and audits individual actor states (`actorStates`) across `[locationAndPresence]`, `[immediateResult]`, and `[currentActionOrStance]`. (Fully backward-compatible with legacy `step4_characterEpistemicDelta`).
  - **Step 5: 3-Tier Memory Synthesis Rationale (`step5_synthesisRationale`)**: Synthesizes the final output according to the 3-tier hierarchy.
- **2-Tier Hybrid Restoration & Resilience Pipeline (`memoryService.ts`)**:
  - **Tier 1 (JSON Schema Parse with Sanitization)**: Strips markdown code blocks, normalizes control characters, and parses structured `{ thoughtProcess, finalMemoryText }`.
  - **Tier 2 (Fallback Regex & Structural Recovery)**: If JSON parsing fails or model outputs plain text, validates presence of mandatory 3-tier headers (with backward-compatible support for legacy 4-tier headers) and recovers `finalMemoryText` safely.
  - **Completeness Guard (`validateMemoryCompleteness`)**: Enforces presence of all 3 mandatory headers (supporting both new `현재 서사 도달점 및 인물 상황` and legacy `현재 인물 동향`) and minimum character length (>= 100 characters).
- **Workbench & Prompt Inspector Observability**:
  - `MemoryWorkbench.tsx`: Side-by-side diff view with "CoT Process" inspection button, copy utilities, and model-aware reasoning levels.
  - `PromptInspector.tsx`: Dedicated 5-Step CoT cards visualizing Step 5 (Synthesis Rationale), Step 1 (Delta Analysis & Codex Filtering), Step 2 (Causality & Preservation Locks with Chekhov's guns and archival items), Step 3 (Compression Strategy & Budget Audit), and Step 4 (Narrative Foothold & 1-Line 3-Element Actor State Cards).
- **Defaults**: Model: `gemini-3.7-flash` (or novel default), Thinking Level: `HIGH`, Max Tokens: `8,000` (buffer: +5,000 reasoning headroom). Response format: `json`.

### 6.5 Dynamic Plot Blueprint & Narrative Director System (Light Novel Architecture)
- **Defaults**: Model: `gemini-3.7-flash`, Thinking Level: `HIGH`, Max Tokens: `21,000` (slider up to 60,000), Auto-Plot Trigger: `7,500` characters.
- **Purpose & Architecture**: Directs narrative macro-structure, episode stakes, and publication-grade directing craft. Tailored for Light Novels / Web Novels with high character density, relationship shifts (Relationship Delta), reader payoff hooks, and publication-scale sequence pacing (~20,000-25,000 characters per episode incident; ~5,000 characters per individual sequence).
- **Scale Standards (1권 스케일 체계)**:
  - Full Volume: ~100,000-130,000 characters.
  - 5 Macro-Arc Milestones: ~20,000 characters per milestone (발단-전개-위기-절정-결말).
  - Active Episode Incident Plot: ~20,000-25,000 characters structured into 4~5 dense scene sequences.
  - Individual Scene Sequence: ~5,000 characters of rich prose narrative mass per sequence.
- **4 Mandatory Structural Headers (Standard & Legacy Compatible)**:
  - `[1. 서술 방향 및 연출 디렉팅]` (or `[서술 방향 및 연출 디렉팅]` / `[작품의 테마 및 장르상 유의점]`): Directorial rules for prose voice, POV distance, dialogue pacing, and strict anti-directives. Must use strictly neutral terminology (주인공, 주요 인물, 화자, 관찰자, 상대역) without hardcoded character names.
  - `[2. 장기 대서사 플롯 (아크 완결성 및 5단계 로드맵)]` (or `[장기 대서사 플롯]` / `[장기 플롯]`): Macro trajectory covering `[서사적 의도 및 목적]`, `[캐릭터 심리 관성 및 개연적 변화 궤적]` (개연성 중심 및 급변 금지), `[아크의 구조적 종착지]` (결말부 상태), and the 5 thematic milestones (~20,000 chars each: 발단-전개-위기-절정-결말).
  - `[3. 현재 진행 중인 사건 플롯]` (or `[현재 진행 중인 사건 플롯]` / `[진행중인 플롯]`): Episode incident (~20,000-25,000 chars) with relationship delta and 4~5 dense scene sequences (~5,000 chars each).
  - `[4. 장기 복선 및 고정 논리 프레임워크]` (or `[장기 복선 및 고정 논리 프레임워크]` / `[고정 논리 프레임워크]`): Flexible repository across plots for strategic plans, causal invariant constraints, and uncollected foreshadowing hooks. (No rigid fixed format; serves as a flexible scratchpad for long-term narrative logic).
- **Critical Directorial Laws**:
  - **Dialogue Prohibition**: Strict ban on verbatim dialogue quotes (`"..."`, `'...'`) in plot sequences. Direct only conversational attitude, emotional tone, subtext, and concrete physical actions.
  - **Immutable Ground Truth**: The written story text (`[Current Story Text]`) is absolute Ground Truth. Any plot contradictions yield to the story prose.
  - **Character Inertia & Plausible Delta Law**: Character values and relationships change gradually through convincing narrative causality. Absolute sudden transformations (e.g. instant corruption or instant complete trust) are strictly rejected.
- **8-Step Pure Deductive CoT Reasoning & Dynamic Self-Critique**:
  - **Step 1: Deductive Diagnosis & Condition-Decomposed Step Execution Plan (`step1_diagnosis`)**: Executes comprehensive context analysis (`contextAnalysis`), determines `plotType` and `plotDirection`, performs **Milestone Progress Analysis** (`milestoneProgressAnalysis`: `currentMilestone`, `milestonePhase` [EARLY/MID/LATE/COMPLETED], `isTransitionBridgeRequired`, `bridgeTargetMilestone`, `deductionReason`), and establishes an explicit `stepExecutionPlan` using atomic condition factors (`isInitialCreation`, `hasDirectingChangeRequest`, `currentRulesAdequate`, `isArcCompletedOrNewArcRequired` [new arc vs cruising in active arc roadmap], `currentArcRoadmapValid`, `isSection1OnlyRevision`, `needsProseDraftingSequences`, `hasNewForeshadowingOrLogicRules`, `existingFrameworkSufficient`, `hasPrunableOrGraduatedItems`, and forward-positioned `prunableItemsAudit` [사전 소거 대상 식별]) along with causal `deductionReason` justifying `execute` decisions. If prunable items exist, `hasPrunableOrGraduatedItems: true` immediately forces Step 7 execution to prevent premature bypassing.
  - **Step 2: Directing Constitution (`step2_directingConstitution`)**: Evaluates if the current directing rules (Section 1) need refinement or can be bypassed based on Step 1 plan (`isBypassed`, `bypassReason`). Must use markdown bullet points.
  - **Step 3-4: Macro Roadmap & Critique (`step3_4_macro`)**:
    - **Preliminary Ideation (`preliminaryIdeation`)**: Obligatory pre-drafting reasoning establishing (1) `narrativeIntent` (서사적 의도 및 목적), (2) `characterInertia` (인물들의 심리적 기저선과 방어 기제), and (3) `plausibleDelta` (관성을 고려한 가장 개연성 있는 변화 궤적 증명).
    - **Roadmap Drafting (`macroRoadmap`)**: Drafts the structural destination and the 5-milestone roadmap (발단-전개-위기-절정-결말) based on the preliminary ideation.
    - **Macro Self-Critique & Patch (`macroCritiqueAndPatch`)**: Performs harsh self-critique across `logicalFlow`, `pacingAndPayoff`, `characterInertiaAndDelta` (strict inspection against rapid character OOC/unearned relationship shifts), **Timeline & Canon Consistency** (`timelineAndCanonConsistency`: strict verification against Story Memory and established historical story text to eliminate timeline misalignments or re-litigating resolved conflicts), dynamically generated custom MACRO critique vectors (e.g. Multi-faction Balance), and issues `patchedSolutions`.
  - **Step 5: Dynamic Invariants, Foreshadowing & Narrative Logic Formulation (`step5_invariantsAndForeshadowing`) [Causal Anchor - Prior to Sequences]**:
    - **Causal Anchoring Principle**: To prevent "Inverted Causality" in left-to-right autoregressive LLM generation, long-term foreshadowing, strategic plans, tactical tricks, and invariant narrative rules (Section 4) are explicitly conceived and formulated BEFORE scene sequences are drafted.
    - **Anti-Duplication & Graduation Audit (`antiDuplicationAndGraduationAudit`)**: Conducts strict domain purity audits across (1) `section1DirectingLeakCheck` (eliminates directorial rules belonging in Section 1), (2) `codexOverlapFilter` (filters out static worldbuilding/rules in Codex), and (3) `graduationPruningList` (prunes resolved scratchpads already manifested in story prose or graduated to Codex).
    - **Scratchpads Formulation**: Formulates active scratchpads (`scratchpads: [{ category, content }]`) providing concrete causal constraints, clue placements, and logic foundations that directly constrain and guide the subsequent sequence design.
  - **Step 6-7: Active Incident Deductive Grounding, Foreshadowing-Constrained Sequences Drafting & Deep Self-Critique (`step6_7_activeSequences`)**:
    - **Episode Ideation (`episodeIdeation`)**: Obligatory 5-step deduction establishing (1) `narrativeIntent`, (2) `characterInertia`, (3) `plausibleDelta`, (4) `structuralDestination`, and (5) derived `episodeIncident`.
    - **Sequence Drafting (Foreshadowing-Constrained)**: Constructs dense 4~5 scene sequences (~5,000 chars each) that actively weave in the causal invariants and clue placements established in Step 5. If `isTransitionBridgeRequired` is true, formulates a final Transitional Bridge Sequence (`isBridgeSequence: true`).
    - **Micro Self-Critique & Patch**: Performs deep self-critique across 5 fixed vectors (Causality, Character OOC, Entertainment, Pacing Density, **Historical Ground Truth & Timeline Integrity**) plus custom dynamic vectors, then issues `patchedSolutions`.
- **4-5 Stage Scene Sequences with Directing Craft & Transitional Bridge Protocol**:
  - Each sequence details: Narrative Flow (~5,000 chars mass), Conversational Attitude & Action Directing (no quotes), Directing Craft (POV shifts, micro-expressions, gap-moe), Sequence Hook/Payoff, and optional `isBridgeSequence` indicator for roadmap transition boundaries.
- **2-Tier Hybrid Recovery & Strict Completeness Validation (`plotService.ts`)**:
  - **1-Pass (JSON Parse with State-Machine Sanitizer)**: Trims markdown wrapping, sanitizes string literals, and validates structured schema with null-safe CoT critique parsing (`macroCritiqueAndPatch`), gracefully falling back to legacy schemas if present.
  - **2-Pass (Regex-based Text Extraction Fallback)**: Scans raw response for the mandatory headers.
  - **Strict Completeness Defense (`validatePlotCompleteness`)**: Enforces mandatory headers, sequence completion (Sequence 4+ or conclusion), and minimum 800 characters.
  - **Token Headroom & Persistence**: Default `maxTokens` set to 20,000 (slider up to 60,000) to prevent truncation.
- **Context Injection Pipeline (Recency-Biased Sandwich)**:
  - Injection sequence: `[The Codex]` -> `[★ Plot Blueprint]` -> `[Story Memory]` -> `[Current Story Text]`.
  - Gated by `currentNovel.settings.plot.includeInPrompt` (default: `true`).
- **Plot Workbench (`PlotWorkbench.tsx`)**:
  - 3 view tabs: Final Plot Text (`FileText`), Blueprint Beat Editor (`ListTree`), and Chain-of-Thought Reasoning (`Brain` featuring the full 8-step execution trace including dynamic critique vectors and patched solutions).
  - **Exposed Director Directive Console**: Dedicated bottom console spanning full width with directive textarea and generation trigger.
  - **Header Quick Toggles & Engine Drawer**: Interactive header pills for `includeInPrompt` and `autoPlot`, alongside a collapsible drawer for model, thinking levels, temperature, and tokens.
  - **Immediate Persistence & State Integrity**: Employs `localPlotText` and `updateNovelContent(..., immediate: true)` on proposal application.
- **Automation Engine (`useAutoPlot.ts` & `useAutoCodex.ts`)**:
  - Opt-in background tracking via `currentNovel.settings.automation.autoPlot` and `autoCodex` (default: `false`).
  - Tracks accumulated character deltas up to configurable thresholds (`triggerChars`).
  - **Delta Subtraction with Floor Protocol**: `EditorContainer` emits net document deltas (`diff !== 0`). Typed characters increment counters while deleted characters (backspace, block delete) produce negative deltas that decrement the cumulative counter with a floor at 0 (`Math.max(0, current + count)`). This prevents rewriting or deleting text from falsely accumulating towards trigger thresholds. Counters safely reset to 0 upon novel change.
  - Generates background proposals staged in `pendingPlotProposal` with an editor badge.
  - **Zero-Overhead Lazy Evaluation**: `EditorContainer` no longer performs expensive `editor.getHTML()` serialization on every keystroke. Instead, a `getEditorContent` function is passed down from `App.tsx`, allowing AI pipelines (`useAIEngine`, `useAutoPlot`, `useAutoCodex`, `PromptInspector`) and the `saveNovel` function to lazily fetch the freshest HTML content on-demand, completely eliminating typing lag while guaranteeing 0ms stale-data latency.

### 6.6 Data & Synchronization
- **Sub-collection Architecture**: Content and Lore are stored in sub-collections to avoid 1MB limits.
- **Unified I/O Pipeline (SSOT)**: 
  - All read/write operations spanning multiple collections (Upload, Duplicate, Download, Create) strictly route through `createNovelWithSubcollections` and `exportCompleteNovelData`.
  - **Smart Batching & Atomic Reveal**: Write operations automatically use a single `writeBatch` if total documents <= 500. If > 500, a shadow flag (`isImporting: true`) is injected into the parent document on the first batch, and removed simultaneously with the final lore entry chunk (`batch.update({ isImporting: deleteField() })`). This prevents the infamous "Fully Written but Trapped" DB lock state while fully protecting the UI from partially loaded novels.
  - **Self-Healing GC**: Sub-collection writes that fail midway and stay `isImporting` for over 1 hour are automatically deleted by a background Garbage Collector in `useNovels` `onSnapshot`.
  - **Legacy Fallback**: `exportCompleteNovelData` gracefully handles backward compatibility, checking the parent document fields if subcollections (`contents/main` or `loreEntries`) are empty.
- **Duplication Logic**: 
  - Supports "Full Duplicate" (Content + Settings) and "Settings Only" (Metadata only).
  - **Backend-Authoritative**: Re-fetches pure data directly from the server to prevent stale frontend state from migrating.
  - **Pure Metadata Transition & Explicit Hydration**: When duplicating, the frontend explicitly strips `content` and `loreEntries` from the React state (`content: undefined`). This prevents frontend state leaks (Ghost Data Bug), forces the `EditorContainer` to unmount, and prompts the `useNovelContent` hook to safely fetch the new document's data.
  - **Lore Persistence**: Lore entries are 항상(always) duplicated regardless of the content option.
  - **UX Constraint (Focus vs Edit)**: Duplicating a novel smoothly shifts the editor's focus to the new copy via optimistic update, but MUST NOT trigger "Edit Mode". Creating a *new* blank novel/folder MUST automatically trigger "Edit Mode" in the sidebar.
- **Auto-save**: Debounced saving with dirty checking (`lastSavedNovelRef`).
- **Migration**: Auto-migrates legacy data from the main document to sub-collections on load.
- **No-Overwrite**: Sidebar updates must not overwrite local `content` if the novel is active.
- **Prompt Boundary Rule**: When initializing a new novel or importing one, system prompts MUST strictly adhere to the hardcoded `GLOBAL_DEFAULTS` (which stem from raw `.md` templates). Generation parameters (temperature, maxTokens) may be inherited from user settings, but underlying structural prompts must remain pure to prevent prompt bleed across contexts.
- **Firebase Configuration**: **Strictly JSON Managed**. Secrets (Environment Variables) are ERADICATED from the codebase to ensure 100% Remix-compatibility. Uses `firebase-applet-config.json` for the Default server and `firebase-backup-config.json` for the Backup server.
- **Modular Architecture**: 
  - **UI Atoms**: Extracted reusable components like `CollapsibleTextArea` for consistent field management.
  - **Namespaced Settings**: Automation features grouped under `settings.automation` for scalability.
  - **Context Builder Architecture (Total Data Provider & Unified Message Assembly)**: AI context generation is decoupled into a structural engine (`contextBuilder.ts`), markdown templates (`src/contexts/*.md`), and a unified message assembly engine (`buildTaskMessages`). 
    - **Total Data Provider**: `buildTotalVariableDictionary` in `src/lib/contextProviders.ts` acts as a single, stable translator that extracts *all* possible variables from the novel state.
    - **Unified Message Assembly (SSOT)**: `buildTaskMessages` in `src/lib/contextProviders.ts` unifies conversation turn construction across all AI tasks (`novel`, `codex`, `memory`, `autocodex`, `consistency`), ensuring active Codex entries and Story Memory are consistently injected at the top of the User turn (Context Envelope) without code duplication.
    - **Orchestrator**: `generateTaskContext` in `src/services/promptService.ts` simply coordinates the template building and delegates message assembly to `buildTaskMessages`, eliminating legacy task-specific message assembly fragments.
  - **Prompt Management**: Prompts are being migrated to `.md` files in `src/prompts/` and imported via Vite's `?raw` to separate logic from content.

### 6.7 Prompt Inspector & Multi-Task Observability (Desktop & Mobile Parity)
- **Centralized Multi-Task Switcher**: Allows live debugging and inspection across all 6 generation engines:
  1. `novel`: Primary novel prose continuation (Stage 1).
  2. `consistency`: 2-Stage Consistency Refiner critique and refinement output (Stage 2) with 5-vector inspection cards.
  3. `codex`: Lorebook entry generation and update prompt context with dynamic entry selection.
  4. `memory`: 3-Tier Story Memory generation with 5-step Evaluative CoT reasoning breakdown.
  5. `autocodex`: Background auto-codex proposal generator with 5-step Evaluative CoT reasoning cards.
  6. `plot`: 4-Tier Plot Blueprint & Narrative Director with full 8-step CoT reasoning trace.
- **Mobile Responsive Architecture**: Responsive 2-tier header with horizontal scrollable segmented pill tabs, entry picker for Codex mode, responsive heights (`h-[92vh] sm:h-[85vh]`), and touch-optimized action targets, ensuring identical functionality across mobile and desktop devices.
- **Mobile Zen Studio Integration**: Direct access via the Prompt Inspector history button in the Mobile Zen Studio header.
  - Tiptap extensions extracted to `src/lib/editor/extensions.ts`.
  - Shared types consolidated in `src/types.ts`.
  - **Business logic extracted to custom hooks** (`useAuth`, `useNovels`, `useNovelContent`, `useAIEngine`).
  - `App.tsx` reduced to ~1200 lines, acting as a pure UI orchestrator.
- **Hydration Definition**:
  A novel is considered "hydrated" ONLY when `content` has been successfully fetched.
  Until then, the Editor MUST remain unmounted and auto-save MUST be disabled.
- **Async Safety Rule**:
  All async responses (Promises, Snapshots) MUST validate the current `novelId` before mutating state.
- **Drag and Drop Architecture (True Coordinate Standard & Stable Tree UX)**:
  - **No `delta.y` Math**: Do NOT use `event.delta.y` for hierarchical direction logic.
  - **True Coordinates**: Extract real mouse/touch coordinates `(clientX, clientY)` at `onDragStart` and add live `delta` for precision.
  - **DND State Separation**: Store `lastValidPointerCoordsRef` and `lastValidDropTargetRef` as fallbacks to instantly recover from 'Phantom Shifts' (where `event.over` temporarily hits null mid-drag). 
  - **Stale Hover Defense**: Compare recovered coordinates to current coordinates; if the delta exceeds `30px`, abort the operation rather than dropping into an unintended target.
  - **Single Source of Truth (`dragIntent`)**: Visual DND indicators (top/bottom drop lines, nest highlights) and the final network execution MUST be powered by a unified `dragIntent` state (`predictedOrder`, `insertLineTargetId`, `targetParentId`) extracted directly from collision engines during `onDragOver` to guarantee what the user sees is *exactly* where it will be dropped.
  - **Stale Closure Defense**: Use `dragIntentRef` in `onDragEnd` to bypass React state batching delays and ensure the database update uses the exact final visual intent.
  - **Stable Tree UX**: Default `dnd-kit` CSS transforms (`transform: CSS.Transform.toString(transform)`) MUST be disabled (`undefined`) on sibling items. Do not let sibling items shift or swap around. Rely purely on the blue "drop lines" relative to `insertLineTargetId` to provide visual feedback, keeping the overall list layout stationary (VS Code / Tree Editor style).
  - **Original Item Transparency**: Dragged original items must retain their height in the layout to prevent list jumping, but receive `opacity-40 pointer-events-none`. The `DragOverlay` item should maintain full opacity (`isOverlay: true`).
  
- **Plot Workbench & Memory Workbench Zero-Lag State Architecture**:
  - `PlotWorkbench.tsx` and `MemoryWorkbench.tsx` isolate typing state (`localPlotText`, `localMemoryText`) using `pendingPlotUpdatesRef` / `pendingMemoryUpdatesRef` and debounced sync (1000ms).
  - Unmount and pre-generation flush logic (`flushPendingPlot`, `flushPendingMemory`) prevents data loss when switching tools, triggering AI, or closing dialogs.
  - Integrates `FullScreenTextEditor` (`Maximize2` button) for distraction-free full-screen editing.
- **Protected State Synchronization (`useNovelContent.ts`)**:
  - `setCurrentNovel` protects `plot` and `storyMemory` from being overwritten by stale snapshot updates during active typing.
  - `saveNovel` correctly syncs both `storyMemory` and `plot` into `lastSavedNovelRef` and React state.
- **Mobile Zen Studio (`MobileZenStudio.tsx`)**:
  - Dedicated full-screen portal (`z-[160]`) addressing mobile readability and editing without breaking desktop layout.
  - Features **Reader Mode** with scroll progress bar (0-100%) and **Focus Studio Mode** with floating action bar.
  - Configurable typography (font size 14-26px, line height 1.4-2.4, Serif/Sans/Mono) and 3 themes (OLED Black, Zinc Dark, Warm Sepia) persisted in `localStorage`.
  - Quick bottom sheet drawers for live Plot editing, Story Memory preview, and Codex searching.

---

## 7. Maintenance & Evolution

### 5. Mandatory AI Agent Protocol (Self-Maintenance)
**CRITICAL**: Every AI agent working on this project MUST follow this protocol without exception:
1. **Strategic Task Protocol (STP)**: For complex tasks or architectural changes, follow the "Plan -> Lock -> Execute -> Cleanup" cycle as defined in `GEMINI.md`.
2. **Pre-Change Analysis**: Before modifying code, check the relevant `AGENTS.md` (root or sub-directory) for existing rules.
3. **Change Tracking Log**: After performing any code edit (edit_file, multi_edit_file), you MUST record the change in `/AUDIT_LOG.md` by **appending** the new entry to the top of the file. Never overwrite existing log entries.
   - **Required Content**: Date, Task Name, Purpose, Reason, Related Files, and Detailed Edit Description.
   - **Verification**: Your turn is NOT complete until this log is updated.
4. **Post-Change Update**: Immediately after implementing a feature, fixing a bug, or changing architecture, you MUST update the corresponding `AGENTS.md` file(s).
5. **Granularity**: 
   - Global changes (Auth, Firestore structure, Security) -> Update `/AGENTS.md`.
   - Logic/Service changes -> Update `src/services/AGENTS.md`.
   - UI/UX/Context changes -> Update `src/contexts/AGENTS.md` and `src/components/AGENTS.md`.
   - Hook/State changes -> Update `src/hooks/AGENTS.md`.
   - Utility/Provider changes -> Update `src/lib/AGENTS.md`.
6. **Verification**: Your turn is NOT complete until you have verified that the documentation reflects the new state of the code.

### 5.2 Refactoring & Debt
- **Refactoring Debt**: Periodically review `App.tsx` size. If it exceeds 1500 lines, prioritize component extraction.
- **React 19 Compatibility**: `AnimatePresence` direct children MUST be `motion` components with stable keys. Avoid fragments in animation wrappers.
- **Performance Optimization**: Isolate volatile state (like the Tiptap editor) from the main application to prevent global re-renders. Use local state and debouncing for input fields to reduce synchronization overhead.
- **Error Logging**: Use the `handleFirestoreError` pattern for all database operations to ensure diagnostic clarity.
- **Editor State Preservation**: Never put functions that change frequently (like `updateNovelContent` or `handleContinue`) in `useEditor`'s dependency array, as this recreates the editor and wipes undo history/marks. Use `useRef` to access the latest functions inside `onUpdate`, and **CRITICALLY**, apply this "Ref-Forwarding" pattern to any callbacks injected into Tiptap's static configurations (e.g., `editorProps > handleKeyDown`, `extensions > GlobalShortcuts`) to prevent Stale Closure traps (Zombie Editor AI bugs).
- **State Updates vs. Debounce**: `updateNovelContent` separates `content` updates from metadata updates. Metadata updates (like `storyMemory`, `title`) immediately update the React state to ensure UI responsiveness, while `content` updates bypass immediate React state updates to prevent Tiptap race conditions. Both are eventually persisted via a debounced save.
- **Tiptap Marks**: Always include `parseHTML` in custom marks (like `AIHighlight`) so they survive HTML serialization and editor recreation.
- **Transaction Marks**: When inserting text and applying marks in the same chain, use `tr.addMark` instead of `setMark` to ensure the mark applies to the newly inserted text, not the old selection state.

---

*Last Updated: 2026-04-17 (v19 Stable - Data Loss Prevention & Sync Fix)*
