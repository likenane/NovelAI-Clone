# UI Components & UX Standards - Development Guidelines

This document defines the standards for UI development and user experience.

## 1. Component Design
- **Functional Components**: All components MUST be functional components using React hooks.
- **Prop Types**: Use TypeScript interfaces for all component props.
- **Separation of Concerns**: UI components should focus on rendering. Complex logic should be moved to hooks or services.

## 2. Styling & Layout
- **Tailwind CSS**: Use utility classes for all styling. Avoid custom CSS files.
- **Responsive Design**: Ensure all panels (Sidebar, Settings, Editor) are responsive and usable on mobile devices.
- **Zinc Palette**: Stick to the `zinc` color palette for a consistent dark mode experience.

## 3. Interaction & Feedback
- **Zero-Lag Keystroke Isolation Rule (키스트로크 격리 헌법)**:
  - 텍스트 입력창(textarea, input)에서 타이핑할 때 상위 컴포넌트의 React 상태(`currentNovel`)나 Firestore 비동기 저장 함수(`updateNovel`)를 `onChange`에서 즉시 직통 호출하는 것을 **엄격히 금지**합니다. (한국어 IME 씹힘 및 뚝뚝 끊기는 렉/스타터링 유발 방지).
  - 반드시 컴포넌트 로컬 상태(`localText`)와 `useRef`(`pendingUpdatesRef`, `debounceTimerRef`)를 두어, 타이핑 렌더링은 로컬에서 즉시 처리하고, 800ms 디바운스를 통해 상위 상태 및 DB에 저장해야 합니다.
  - 패널 닫힘, 모달 이동, 또는 언마운트 시점에는 반드시 안전 플러시(`flushPending...`)를 실행하여 0.1글자의 유실도 방지해야 합니다.
- **AnimatePresence**: 
  - Use `AnimatePresence` from `motion/react` for smooth entry/exit animations of panels and modals.
  - **React 19 Compatibility**: Every direct child of `AnimatePresence` MUST be a `motion` component (e.g., `motion.div`). Fragments (`<>`) are STRICTLY FORBIDDEN as direct children.
  - **Stable Keys**: Every child within `AnimatePresence` MUST have a unique and stable `key` prop to prevent React 19 static flag errors.
- **Loading States**: Always show a loading indicator (spinner or progress bar) during AI generation or database saves.
- **Notifications**: Use non-intrusive notifications for success/error messages.

## 4. Specific Component Rules
- **Editor**: 
  - Must handle `Instruction` nodes correctly (shortcuts, sanitization).
  - Must support `AIHighlight` marks and their automatic removal.
  - Must prevent undo history pollution during AI generation.
  - **Undo/Redo History Isolation**: Must ignore history transactions (`isHistoryTransaction(transaction)`) during `onUpdate` character accumulation (`incrementCharsRef`) to prevent sudden bulk character spikes from falsely triggering Auto-Codex or Auto-Plot.
  - **Sleek Automation Observability & Topmost Proposal Badges**: The floating action bar features zero-clutter, sleek SVG circular progress rings around the Codex and Plot buttons with zero-lag reactivity via `useAutoCounters`. Bulky on-screen text pills are completely omitted to ensure distraction-free, sleek writing, while pending proposal notification dots (`hasPendingProposals`, `hasPendingPlotProposal`) are strictly promoted to the topmost layer (`z-20`, rendered outside/above the SVG ring) at their exact `top-0 right-0` position without being obscured by progress strokes. Detailed counts and reset actions are maintained inside their respective workbenches.
- **Sidebar**: 
  - Must support hierarchical reordering (Dnd).
  - **True Tree Architecture**: `Sidebar.tsx` and `SortableNovelItem.tsx` use multiple nested `SortableContext`s. The Sidebar maps only root novels, and folders recursively map their children.
  - **Stable Tree UX (DND)**: When dragging, `SortableNovelItem.tsx` overrides default dnd-kit transform behaviors (`transform: undefined`) to prevent siblings from shifting/swapping. Visual feedback is exclusively reliant on blue drop-lines inside the items. Original dragged items do not collapse to `h-0`; instead, they keep layout footprint and receive `opacity-40` and `pointer-events-none` while the `DragOverlay` item displays brightly (`isOverlay` prop).
  - **Empty Folder Placeholders**: Empty, expanded folders inject a `DroppablePlaceholder` to catch nested drops (fixing the Phantom Slot anomaly).
  - **CSS-Based Hiding & Sensor Disable**: When dragging, folders apply `isHidden` to children (which sets `h-0 overflow-hidden opacity-0` and disables the `useSortable` sensor) instead of unmounting them, preventing drag context crashes.
  - Must handle inline title editing and folder expansion states.
  - **Creation & Duplication UX**: New item/folder creation immediately triggers inline title editing. Duplication bypasses inline editing but shifts the active editor focus to the newly duplicated novel.
- **Codex**: 
  - Must support AI generation for individual entries.
  - **AI Assistant Settings**: Supports model selection, temperature, Max Output Length (500-16000 tokens), and dynamic model-aware Thinking Level selection (`Minimal`, `Low`, `Medium`, `High`) with automatic fallback/transition upon model changes.
  - **Auto-Codex Style Compact Reasoning Callout & Spinoff Cards**:
    - Displays a clean, concise 1-paragraph explanation box (`💡 AI's Reasoning`) above the generated suggestion, describing what was modified/expanded and why without cluttering the UI.
    - **True Apply All & Dual Apply Actions**:
      - `전체 적용 (Apply All)`: 현재 항목 본문 갱신과 동시에 분화된 신규 항목들(`codexAISpinoffs`)을 코덱스 트리에 일괄 자동 등록(`addLoreEntry`)하고 패널을 클린업합니다.
      - `본문만 적용 (Apply Content Only)`: 현재 항목 본문만 갱신하고 분화 항목 카드는 유지하여 작가가 개별 검토 후 수동 등록할 수 있도록 지원합니다.
    - **Spinoff Entries Cards**: If the AI separates concepts during lore editing, `spinoffEntries` are rendered in a dedicated sub-panel (`개념 분화 신규 항목`) with preview and 1-click individual/bulk addition (`addLoreEntry`) to the Codex without overwriting the parent.
  - **Unified Auto-Codex Scan UX & Responsive Viewport Popover**:
    - Unifies general scan and directive-augmented scan into a single streamlined "스캔" (`RefreshCw`) button in the header toolbar, opening the `DirectiveScanPopover`.
    - **Dual Action Support**: Within the popover, users can execute either an instantaneous `[일반 스캔 (Quick Scan)]` or input authorial directives (for batch updates, relationship shifts, or spinoffs) and trigger `[지시 반영 스캔 (Directive Scan)]`.
    - **Zero-Lag & Zero-Clipping Responsive Layout**:
      - Manages local state (`localText`) to isolate keystrokes from parent tree re-renders, preventing Korean IME interruption.
      - Utilizes a responsive viewport boundary (`fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-96`) with a mobile backdrop, completely eliminating left-edge screen clipping on mobile viewports.
    - **Background Self-Healing Streamlining**: Removed the redundant manual "정리/복구" button from the toolbar since the `useNovelContent.ts` pipeline automatically detects and repairs circular/orphaned hierarchies in real time.
  - Must handle keyword-based activation logic.
  - **Performance & Stability**: 
    - Uses **Accumulated Debounce** via `pendingUpdatesRef` to merge multi-field (Title, Content, etc.) changes, preventing partial data loss during rapid switching.
    - Implements **Safe Sync & Scrubbing**: AI proposals (`acceptProposal`) and Assistant "Replace" actions must explicitly `setLocalContent` for instant UI feedback and `delete` pending content updates from the accumulator to prevent race-condition overwrites.
    - **DND Hierarchy & Circular Reference Guard**:
      - `handleDragEnd` uses `isDescendantOfLore` to prevent dropping a folder into itself or its own descendants, blocking recursive nesting errors.
      - **Sibling Reordering vs Nesting**: Dragging between items with the same parentId cleanly reorders siblings without accidental nesting into folders. Dropping onto another folder nests into that folder (with circular guard). Only affected siblings have their `order` (`idx * 10`) updated, protecting other levels from order corruption.
      - **Root Drop Zone (`codex-root-drop-zone`)**: A dedicated droppable zone appears when dragging items, allowing users to reliably drag items out of nested folders to the root level.
      - **1-Click Outdent (`CornerUpLeft`) & Subfolder Creation (`FolderPlus`)**: Nested items feature a dedicated outdent button on hover in `SortableLoreItem` to pop items out to root in 1 click without dragging. Folders feature a `FolderPlus` button to create nested subfolders directly without risky dragging.
      - **True-Orphan Safety Net & Dedicated Heal Tool (`healLoreHierarchy`)**: `getFlattenedLore` is cycle-safe and surfaces ONLY true orphaned items (whose parent folder was deleted/missing) at root, ensuring collapsed folder children remain safely hidden inside. A dedicated "정리/복구" (`Wrench`) button in the Codex top bar allows users to instantly untangle cycles and re-index sibling orders across all levels.
- **CollapsibleTextArea**:
  - Reusable UI atom with local state and debounced synchronization to prevent parent re-renders on keystrokes.
- **NotificationSystem**: 
  - Must be used for all async feedback (Saving, Generating, Errors).
  - Supports 'generating' type with character count display.
  - **Zero-Trust Resilience**: Aligns with the updated `TECH_DEBT` architecture. 
    - Always display the manual close (X) button regardless of state (loading/generating) to ensure user sovereignty.
    - Uses Smart Duration (longer duration for longer text) and Absolute 60s TTL (Dead Man's Switch) for loaders to prevent zombie notifications.
    - NEVER use `truncate` on notifications; use `break-words` and `overflow-y-auto` to ensure long error messages are fully readable.
- **EditorContainer**:
  - **State Colocation**: Encapsulates `useEditor` and all Tiptap internal state to isolate re-renders from the main app.
  - **Instance Bridge**: Exposes a stable editor instance to `App.tsx` via `onEditorReady` callback.
  - Handles auto-scroll and novel selection empty states.
  - **Universal Character Accumulation & Delta Subtraction**: `onUpdate` calculates and emits document character changes (`incrementCharsRef`) on any net size change (`transaction.doc.content.size - transaction.before.content.size !== 0`), ensuring both AI-generated text and manual typing increment background automation thresholds (Auto-Plot and Auto-Codex) while text deletions (Backspace, block delete) produce negative deltas that are cleanly subtracted from cumulative counters (floored at 0 in consumer hooks) to prevent unintended auto-triggers during rewriting. AI highlight removal remains strictly isolated to manual edits (`!transaction.getMeta('ai-generated')`).
  - **Responsive Floating Action Bar**: Bottom action bar uses responsive spacing (`bottom-4 left-3/right-3 sm:bottom-8 sm:left-8/right-8`, `gap-1.5 sm:gap-3`), compact 44px mobile touch targets (`w-11 h-11 sm:w-14 sm:h-14`), and `shrink-0` to guarantee zero button overlap between Codex, Plot, and Directive/Control buttons on mobile screens.
- **PromptInspector**:
  - Centralized modal for debugging prompts (Novel, Consistency, Codex, Memory, AutoCodex, Plot).
  - Supports Live vs Last Generated views.
  - **Full Mobile & Desktop Parity**: 
    - Responsive 2-tier header structure eliminating horizontal overflow on mobile screens.
    - Prominent, touch-friendly horizontal scrollable segmented pill bar for 1-tap switching between all 6 generation types: **Novel Stage 1** (`novel`), **Refiner Stage 2** (`consistency`), **Codex AI** (`codex`), **Story Memory** (`memory`), **Auto Codex** (`autocodex`), and **Plot Blueprint** (`plot`).
    - Lore entry selector dropdown when in Codex inspection mode to inspect prompts for specific lore entries on mobile and desktop.
    - Mobile expand/collapse all toggles and responsive viewport height (`h-[92vh] sm:h-[85vh]`).
  - Displays Model Name, Temperature, Max Tokens, Thinking Level, and Repetition Penalty in the parameters breakdown.
  - **Refiner Output Breakdown (Refiner Architecture V2)**: For Consistency Refiner tasks, displays dedicated structured inspection cards for the specialized analysis vectors according to the cognitive evaluation order:
    0. **Global Context & Rules** (`globalContextAudit`): Visualizes active directives summary, exhaustive `activeCodexScope` tag badges, global narrative fulfillment assessment, and declared global defects/rules (`globalDefects: [{ ruleId, category, issue, correctionDirective }]`).
    1. **Dynamic Sliced Audits Timeline (SSOT)** (`slices`): Comprehensive timeline visualizing 250~350 char newline-delimited sliced prose inspection windows (`[Slice N]`), text excerpt, and inherited fix tags.
       - **Physical & Spatial Continuity** (`physicalLogicAudit`): Renders spatial and actor continuity assessment.
       - **Incident Audits (Lore & Character Graphs)** (`incidentAudits`): Renders N:M incident cards with referenced lore badges, verdict status (`PASS` / `FAIL`), cited prose quotes, codex grounding basis, causal CoT analysis, and surgical correction directives.
       - **2-Phase Stylistic Audit** (`stylisticAudit`): Displays **Phase A (Macro Flow)** rhythm, pacing, tone, and immersion alongside **Phase B (Micro Defects)** critique and polish suggestion cards.
    - **Refiner Change Log** (`changeLog`): Semantic-invariance audit cards showing before/after text diffs classified by vector (`LORE`, `PHYSICAL_LOGIC`, `CHARACTER`, `PLOT`, `LINGUISTIC`, `INFO_ORDER`).
    Alongside detected conflicts/awkward phrasings (`conflicts`) and raw JSON output with backward compatibility fallback for legacy analyses.
  - **Plot Inspection & Total Observability**: Inspects Plot generation prompts, parameters, and live user directives (`plotAIInstruction`). The Output section is unconditionally rendered whenever `output` or `error` exists. When available, displays dedicated CoT cards for Plot Reasoning (독자 보상 및 쾌감 훅, 장기 서사 관성 베이스라인, 단기 상황적 심리 마찰, 인물 관계 변곡점) and highlights runtime parsing/validation errors clearly in red. Live inspection tab dynamically binds `overrideContent: lastContentRef?.current || currentNovel.content || ""` to reflect editor state in real-time.
  - **Auto-Codex 5-Step Evaluative CoT Cards**: For Auto-Codex tasks, displays dedicated structured inspection cards for the full 5-step CoT reasoning trace:
    1. **Step 5: Global Synthesis & Lore Trajectory** (`step5_globalSynthesis` / `globalAnalysis`)
    2. **Step 1-A: Active Lore Fact-Shift Triage**: Visualizes the pre-scan triage of active lore entries with evidence strings (`observedFactShift`) before boolean status flags (`hasFactShift`).
    3. **Step 1-B & 2: Multi-Track Semantic Discovery & Mapping**: Visualizes all 4 discovery tracks (`explicitEntities`, `implicitEmergentEntities` with descriptive clues and recurrence basis, `conceptualClusters` with fragmented cluster evidence and abstract definition, and `plotSection4GraduationTriage` with 3-gate permanence evaluation and graduation verdicts) alongside mapping analysis and routing (`targetRoute`, `mappedExistingTitle`).
    4. **Step 3: New Entry Screening via 4 Gateways**: Visualizes candidate type badges (`EXPLICIT`, `IMPLICIT`, `CONCEPTUAL`), narrative permanence, functional identity, narrative stakes, non-redundancy, and accept/reject verdict rationale.
    5. **Step 4: Existing Update Evaluation via 3-Audit & De-chronologization State Distillation**: Visualizes psychological inertia & anti-overinterpretation audit, revealed facts permanence evaluation, mere mention audit, 1st verdict rationale (`UPDATE` | `DROP`), conditioned **De-chronologization Pipeline** (`stateDistillation`: raw observed event, 100% evaporated context/actions vs. distilled permanent property/stance/rule, and target header teleology mapping with implicit question & distilled prose bullet), and surgical merge plan.
    Accessible directly via `PromptInspector` tabs or the inspection shortcut buttons (`History` icon) inside `PendingProposalsList` and `ProposalDiffView`.
  - **Manual Codex Adaptive CoT & State Distillation Cards**: For Codex Assistant tasks, displays structured inspection cards for the adaptive thought process:
    1. **Directive Intent Classification**: Shows intent type badge (`RESTRUCTURE`, `PURE_CREATIVE`, `STORY_UPDATE`, `HYBRID`) and summary of authorial intent.
    2. **Anti-Timeline De-chronologization (Conditional)**: Shows observed event, 100% evaporated context & actions (with strikethrough), and distilled permanent state.
    3. **Header Teleology**: Shows target header routing, implicit query, and distilled literary prose bullet.
    4. **Lossless Preservation Plan**: Shows preservation audit of untouched headers and surgical insertion plan.
  - **Story Memory 5-Step Evaluative CoT Cards**: For Story Memory tasks, displays dedicated structured inspection cards for the full 5-step CoT reasoning trace:
    1. **Step 5: 3-Tier Memory Final Synthesis Strategy** (`step5_synthesisRationale`)
    2. **Step 1: Delta Analysis & Codex Static Attribute Filtering**: Visualizes newly generated plot events (`newPlotEvents`), Codex entity exclusion audit (`codexEntityFiltering`), and user directive intent (`userDirectiveIntent`).
    3. **Step 2: Causality Selection, Preservation Lock & Archival**: Visualizes root causes under preservation lock (`rootCauses`), Chekhov's guns (`chekhovGuns`), and resolved events scheduled for 1-line ledger archival (`resolvedEventsToArchive`). (With legacy `activeThreads` support).
    4. **Step 3: Chronological Ledger Compression & Budget Audit**: Visualizes preservation lock audit for Header 1 (`preservationAudit`), 1-line event ledger pruning plan for Header 2 (`ledgerPruningPlan`), character 1-line 3-element update plan for Header 3 (`characterSnapshotPlan`), and hard character budget evaluation (< 4,000 chars) (`characterBudgetEvaluation`).
    5. **Step 4: Narrative Foothold & Actor States**: Visualizes the overall scene landing ground banner (`currentFoothold`) and individual actor cards (`character`, `locationAndPresence` [위치/동행], `immediateResult` [직전 결과], `currentActionOrStance` [당면 착지 상태]). (With legacy `characterDynamics` fallback).
    Directly accessible via Prompt Inspector context switcher or the "CoT Process" button inside `MemoryWorkbench`.
  - **MARS 4-Auditor Parallel Reports Cards**: For Consistency tasks, visualizes the 4 specialized parallel audit reports (`plotAudit`, `physicalAudit`, `loreAudit`, `stylisticAudit`) in responsive, categorized cards alongside the final synthesized prose output.
  - **Memoization**: Uses `React.memo` and `useMemo` to skip expensive prompt generation context 연산 when the inspector is closed.
- **MobileZenStudio**:
  - Standalone distraction-free mobile portal (`z-[160]`) with two distinct modes: **Reader Mode** and **Focus Studio Mode**.
  - **Typography & Theme Controls**: Custom font size (14-26px), line height (1.4-2.4), font family (Serif, Sans, Mono), and 3 themes (OLED Black `#000`, Zinc Dark `#09090b`, Warm Sepia `#181411`) stored in `localStorage`.
  - **Reader Mode**: Clean sanitized prose view with reading scroll progress percentage bar (0-100%).
  - **Focus Studio Mode**: Mobile-optimized writing canvas with live character counter and floating quick action bar.
  - **Bottom Mobile Action Bar**: Fast access to continue story (`Play` / `Loader2`), `{}` inline directive trigger, and bottom slide-up drawers for **Quick Plot Blueprint**, **Quick Story Memory**, and **Quick Codex Search**.
- **MemoryWorkbench**:
  - Dedicated UI for the 2-Tier Hierarchical Story Memory & Deterministic Archive Pipeline.
  - **Two Primary Workbench Modes**:
    - `[핵심 기억 (Core Memory)]`: Real-time editor with 4,000-char volume budget tracking and soft warning badge (`isBudgetExceeded`). Split-pane comparison with AI Suggestion. Includes dedicated preview deck for newly extracted archive cards (`archiveEntries`). Atomic commit button (`commitMemoryProposal`) simultaneously persists core memory text and commits new cards to Firestore.
    - `[보관소 서고 (Archive Library)]`: Unlimited card library viewer with keyword/tag search, type filter pills (`전체`, `사건`, `막요약`, `정정`), manual card creation/editing dialog, and card deletion.
  - **Zero-Lag State Architecture**: Uses `localMemoryText`, `pendingMemoryUpdatesRef`, and `flushPendingMemory` to decouple keystroke rendering from root state, eliminating typing lag and cursor jumping.
  - **Fullscreen Expansion**: Integrates `FullScreenTextEditor` (`Maximize2` button) for expansive, distraction-free editing.
  - "Thought Process" shortcut button in the Suggestion header for 1-click inspection of the AI reasoning process.
  - **Mobile Responsive Architecture (< lg)**: Supports mobile tabs (`[현재 메모리]`, `[AI 제안]`, `[서고]`, `[생성]`), bounded strictly within `100dvh` with permanently anchored sticky footer (`제안 비우기`, `일괄 적용`).
- **PlotWorkbench**:
  - Dedicated full-screen modal interface (`z-[150]`) for the 4-Tier Plot Blueprint & Narrative Director system.
  - **Zero-Lag State Architecture**: Employs `localPlotText`, `pendingPlotUpdatesRef`, and `flushPendingPlot` with unmount flush to guarantee zero data loss and eliminate typing lag.
  - **Fullscreen Expansion**: Integrates `FullScreenTextEditor` (`Maximize2` button) for deep, focused plot composition.
  - **Exposed Director Directive Console**: Dedicated bottom console spanning the full width with multi-line instruction textarea, shortcut helper (`Ctrl+Enter`), and direct generation trigger, providing immediate accessibility without navigating settings menus.
  - **Streamlined Minimal Header**: Streamlined header with quick pills (`includeInPrompt`, `autoPlot`), direct AI Engine Studio launcher (`SlidersHorizontal`), and Prompt Inspector (`Eye`), completely eliminating redundant duplicate settings drawers.
  - 2 inspection modes (Streamlined 2-Tab Architecture):
    - 사고 분석 CoT (`Brain`): 5-Tier Reader-Driven CoT visualization:
      1. 상황 및 불일치 진단 (`diagnosis`: contextAnalysis, plotType, mismatches, roadmapDecision, currentMilestone, section1Handling).
      2. 독자 재미 분석 및 갈등 재료 (`readerAnalysis`, `codexMaterial`: enjoymentDirection, currentExpectations, openClues, codexMaterial).
      3. 전개 후보군 다방향 도출 및 역순 검토 (`candidates`, `reverseReview`: C1~Cn without premature evaluations, reverseReview multi-dimensional scrutiny cards with `expectationRelation` badges, `characterFit`, `codexAndStoryFit`, `strengths`, and `weaknesses`).
      4. 최종 전개 채택 및 반전/신규 설정 (`selection`: `comparison` analysis, `decisions` cards with decision badges [채택/조합/기각] and reasons, `chosen` rationale, and `twistAndNewSettings` with kind badges and reader risk audit).
      5. 사전 품질 검증 & 시퀀스 계획 (`verification`, `sequencePlan`, `section4Plan`: 3대 정합성 검증, 6~8개 시퀀스 타임라인 로드맵, 4번 구역 갱신 계획).
      (With full backward compatibility for legacy 3-tier and 8-step CoT logs).
  - Live staged proposals (`pendingPlotProposal`) with one-click application to novel state (strictly isolated to `novel.plot`, ensuring author-defined `styleDirectives` in Novel Style are never overwritten).
  - Integrated with `PromptInspector` for real-time prompt verification.
- **AuthOverlay**:
  - Handles app initialization and Google Sign-in UI.
- **GlobalSettings**:
  - Manages cross-novel settings (API keys, Server selection).
- **AIEngineStudioModal**:
  - **Single Centralized AI Command Studio (`z-[160]`)**: Consolidates parameter controls and operational feature switches for all 6 AI pipelines into a single comprehensive modal (`AIEngineStudioModal.tsx`), elevated strictly above workbenches (`z-[150]`) and side drawers (`z-[140]`).
  - **Full Mobile Responsive & Ergonomic Layout**:
    - **Single-Row Compact Header**: Features adaptive brand title (`AI Studio` on mobile, `AI Engine & Model Studio` on desktop), compact provider switcher (`Direct` / `Router`), and secure 44px touch-target close button (`X`) to prevent horizontal wrapping and title truncation.
    - **Horizontal Touch Scroll Tab Rail (`< md`)**: Replaces the desktop 320px vertical pipeline list on mobile with a sleek, space-efficient horizontal scroll tab bar (`44px` height, recovering 276px+ of vertical space for controls).
    - **Pinned Sticky Bottom Action Bar**: Fixes `[기본값 복원]`, `[취소 (ESC)]`, and `[적용 & 저장]` directly into the Natural Thumb Zone at the bottom of the modal, guaranteeing instant 1-tap atomic commits without scrolling through parameter lists.
  - **Local Draft Buffer Architecture (Zero-I/O & Atomic Commit)**:
    - Eliminates Firestore write storms when dragging sliders (Temperature, Context Window, Repetition Penalty).
    - Manipulates state exclusively in-memory (`draftSettings`) at 60fps.
    - [취소 (ESC)] discards the draft without any DB I/O.
    - [적용 & 저장 (Enter)] executes a single atomic commit only when changes are detected (`isDirty`).
  - **High-Density Compact UI & Hover Tooltips**:
    - Replaces sprawling multi-card explanations with compact 1-line switch bars (e.g. MARS 4-Auditor review toggle with status badge).
    - Uses hover tooltips (`title` and `Info` icons) and eliminates redundant cards across Memory and Codex tabs.
    - **Dedicated Web Novelist Persona Priming Card**: In Novel generation tab, provides full control over In-Context Persona Priming (toggle switch, status badge, collapsible custom trigger/declaration editor, and reset to defaults).
  - **Pipelines Covered**: Novel Primary Writer, MARS Auditor (4 parallel agents), Plot Blueprint & Narrative Director, Story Memory (5-step CoT), Codex Assistant, and Auto-Codex Scanner.
  - **Two-Tier Parameter Architecture**:
    - **Core Parameters (Always Visible)**: Model Architecture, Reasoning Level (Thinking Level), Creativity (Temperature), and Max Output Tokens (with presets).
    - **Advanced Parameters (Collapsible Accordion)**: Top-P, Top-K, Repetition Penalty (novel/autoCodex), and pipeline defaults reset button.
  - **Provider-Centric Architecture**: Pure Gemini support only (Google Direct Gemini vs OpenRouter Gemini) with dynamic model sanitization.

- **SettingsPanel**:
  - Organizes novel settings into lightweight collapsible sections.
  - **Z-Index Layering & Auto-Dismiss Standard**: Panel positioned at `z-[140]` (backdrop `z-[139]`). Opening full-screen workbenches ("AI Summary", "AI Plot") flushes pending text (`flushPendingStyle()`, `flushPendingPlot()`) and immediately auto-dismisses the panel (`onClose()`) to provide an unobstructed workspace.
  - **Auto-Codex Directive Scan Station**:
    - Replaced redundant automation controls with a dedicated directive scan station.
    - Includes directive textarea, minimal icon toolbar (`Trash2` for clearing, `Play` for scanning), and background scanning status spinner.
    - When directive is empty, executes standard full prose scan (`scanForProposals({ isManual: true })`).
  - **Pure Manual Plot Blueprint Workspace**:
    - Removed redundant automation/prompt toggles (managed in AI Engine Studio).
    - Features large `h-60` editing textarea, character counter, and `Maximize2` button linking to `FullScreenTextEditor`.
    - Protected by Zero-Lag Keystroke Isolation (`localPlotText`, 800ms debounce, `flushPendingPlot`).
  - **Novel Style, Plot Blueprint & Story Memory (Zero-Lag SSOT)**:
    - Dedicated slots (`styleDirectives`, `plot`, `storyMemory`) protected by Zero-Lag Keystroke Isolation (`localStyleText`, `localPlotText`, `localMemoryText`, 800ms debounce, `flushPendingStyle`, `flushPendingPlot`, `flushPendingMemory`).
    - Unified header with character counter and `Maximize2` button linking to `FullScreenTextEditor` for all three major composition fields.
    - Codebase firmware SSOT lock: `novel_system.md` and `codex_system.md` locked to codebase constants.
    - AI custom style generation modal (`generateStyleDirectivesAI`).
- **FullScreenTextEditor**:
  - **Universal Modularity**: Reusable overarching modal wrapper (`h-[100dvh]` on mobile) for expansive, distraction-free editing.
  - **Adaptive UX (`saveMode`)**: Supports `'manual'` mode (shows Apply/Cancel paradigm) and `'auto'` mode (shows single Done button to match auto-sync mechanics). Includes configurable `zIndex` to escape overlapping contexts.
- **PendingProposalsList**:
  - Renders AI-proposed new entries and updates in the Codex sidebar.
- **ProposalDiffView**:
  - Top-Bottom layout for reviewing, editing, and accepting AI-proposed Codex changes.

## 5. Feature Checklist for Refactoring
- [x] Instruction nodes (`{}`) shortcuts and rendering.
- [x] AI Highlight mark removal on input.
- [x] Sidebar drag-and-drop reordering.
- [x] Novel/Lore folder expansion persistence.
- [x] AI Generation character count in notifications.
- [x] Prompt Inspector (System/History/Prefill view, MARS 4-Auditor Sub-Agent Inspector [Plot & Directives, Physical & Spatial, Lore & Epistemic Boundary, Native Korean Stylistics] with dedicated sub-tab switching, full raw report inspections, Stage 3 Master Novelist synthesis review, and **Refiner 3-Way Output Comparison Console** featuring inline word-level LCS Diff tracking, synchronized side-by-side split view, and tabbed inspection with one-click copy and quantitative revision metrics).
- [x] **Consolidated Saving Indicator** (Shared between hooks).
- [x] **Recursive Novel Deletion** (Folders + Contents).
- [x] **User Null Check Fix**: Prevented crashes by wrapping main app in user check and using optional chaining.
- [x] **AI Generation Normalization**: Fixed circular dependency between `useEditor` and `useAIEngine` using `useRef` and hook reordering.
- [x] **Editor State Preservation**: Removed `updateNovelContent` from `useEditor` dependencies to prevent editor recreation, preserving undo history and marks. Fixed `AIHighlight` parseHTML and `tr.addMark` logic.
- [x] **Editor State Colocation**: `useEditor` logic moved to `EditorContainer.tsx` to isolate re-renders.
- [x] **Performance Memoization**: Optimized `PromptInspector` and `Codex` fields with local state and memoization to resolve typing lag.
- [x] **Accumulated Debounce & Safe Sync**: Implemented `pendingUpdatesRef` in `Codex.tsx` to prevent multi-field data loss and ensured immediate AI sync with content scrubbing.
## 6. Model Selection UI Standard
- **Single Source of Truth**: All components that require an AI model selection interface (e.g., `SettingsPanel.tsx`, `MemoryWorkbench.tsx`, `Codex.tsx`) MUST use the `AVAILABLE_MODELS` array exported from `src/constants.ts`.
- **Unified Flat List**: Do not categorize models by provider (Gemini vs OpenRouter) or use secondary toggles. Present them as a single, intuitive flat `<select>` list.
- **Provider Inference**: Determine the provider (`gemini` or `openrouter`) dynamically based on the selected model ID (`selectedModelId.includes('/') ? 'openrouter' : 'gemini'`).
- **Legacy Fallback**: Always ensure that if the currently saved model ID is not present in `AVAILABLE_MODELS`, it is still rendered as a `<option>` with a "(Custom)" suffix to prevent data loss.
- **Deep-Copy Updates**: When updating nested settings (e.g., `autoCodex` or `codex`), use deep-spread operators (`...prev.settings, codex: { ...prev.settings.codex }`) to prevent partial overwrite of sibling properties.

## 7. Maintenance
- **AI Agent Protocol**: Follow the "Mandatory AI Agent Protocol" in `/AGENTS.md`. Update this file whenever UI components or UX standards change.
