# Project: AI Novelist Studio - System Architecture & Guidelines

This document is the **Single Source of Truth** for architectural standards, data integrity, and operational protocols. Detailed specifications for modules are linked below and maintained in sub-directory `AGENTS.md` files.

---

## 1. Core Philosophy
- **Stability First**: Data integrity is paramount. Never compromise saving reliability for UI responsiveness.
- **SSOT Functional Unification (DRY Rule)**: Whenever identical or virtually identical logic, prompt structures, or format rules exist across multiple modules (e.g. anchor formatting, narrative context assembly, synthesis prompts), **it is strictly prohibited to write duplicate string templates or logic blocks**. You MUST extract them into a single dedicated SSOT helper function in `src/lib/` and have all consumers call that exact function, ensuring future changes require updating only that single function.
- **Decoupled State**: Editor state and Sidebar/List state must remain independent to prevent race conditions.
- **Explicit Migration**: Legacy data structures must be migrated to sub-collections proactively.
- **Self-Documenting**: Changes must be reflected in documentation and `/AUDIT_LOG.md`.

---

## 2. System Architecture & Firestore

### 2.1 Firestore Data Model (Distributed)
To optimize performance and avoid the 1MB document limit:
- **`/novels/{novelId}`**: Metadata only (`title`, `authorUid`, `settings`, `hierarchy`, `plot`, `storyMemory`). *`content` is DEPRECATED here.*
- **`/novels/{novelId}/contents/main`**: Raw Tiptap HTML content. Prevents sidebar list listener from fetching large text.
- **`/novels/{novelId}/loreEntries/{entryId}`**: Individual Codex entries. Allows granular real-time updates and search.
- **`/novels/{novelId}/memoryCards/{cardId}`**: Granular 2-Tier Story Memory Archive cards. Real-time deterministic search without 1MB document boundary risk.

### 2.2 State Management & Synchronization
- **Single Source of Truth**: `currentNovel` in `App.tsx` is metadata master. During editing, **Tiptap internal state is the sole SSOT for content**.
- **Unidirectional Data Flow**: Editor changes trigger debounced saves via `useNovelContent.ts`. React state updates silently after successful save.
- **Editor Sync**: Sync Tiptap via `editor.commands.setContent` **ONLY** on novel switch (`loadedNovelIdRef`). Initial load & AI generation use `.setMeta('addToHistory', false)`.
- **Dirty Checking & Debouncing**: Use `lastSavedNovelRef`. Accumulate multi-field updates via `pendingUpdatesRef` before debounce fires.

---

## 3. Data Integrity & Security

### 3.1 Overwrite Prevention & Security
- **No-Overwrite Rule**: Sidebar `onSnapshot` must NEVER overwrite local `content` while being edited.
- **Security Rules**: Enforce `isAdmin` email check, input validation (content < 1MB, title < 100), and ownership protection (`authorUid`).

### 3.2 Novel I/O Pipeline & Disaster Recovery (V2)
- **Zero-I/O Disaster Recovery**: When downloading, attempt Firestore pre-save. If quota fails (`RESOURCE_EXHAUSTED`), perform an **In-Memory Hot Snapshot Export (Zero-I/O)** directly from Tiptap instance and in-memory state.
- **Envelope V2**: Standardized `{ version: '2.0', exportedAt, metadata, data: { novel, content, loreEntries } }`.
- **Hygiene & Deep Merge**: Purge proposals (`isProposalOnly`) on export; use `deepMergeNovelSettings` with `GLOBAL_DEFAULTS` fallback.

---

## 4. Coding Conventions & Stack

- **Components**: Extracted in `src/components/`, state logic in `src/hooks/`, AI logic in `src/services/`.
- **Theme & UI**: Dark mode (`zinc`), `lucide-react` icons, `motion/react` animations, and `NotificationSystem` (no `window.alert`).
- **Models**: Pure Gemini Architecture only (Google Direct Gemini & OpenRouter Gemini). Non-Gemini models (e.g. Grok) are strictly excluded.
- **AI Engine Studio & Unified Settings**: `src/components/AIEngineStudioModal.tsx`. Centralized command studio (`z-[160]`) with **Local Draft Buffer (Zero-I/O & Atomic Commit)** for all 6 AI pipelines, two-tier Core vs Advanced parameters, compact 1-line MARS switch bar with tooltips, and integrated feature controls.
- **Global Modal Stacking Standard**: Base Editor (0-30) < SettingsPanel (140) < Fullscreen Workbenches & Codex (150) < AI Engine Studio (160) < Prompt Inspector (170) < GlobalSettings (180) < Confirmations (190) < Notifications (200).

---

## 5. Core Feature Summary & Module Index

For in-depth specifications, refer to `docs/SYSTEM_SPECIFICATION.md` and module docs:
- **Core Editor & Tiptap**: `src/components/AGENTS.md` (Inline `{}` directives, AI highlight, anchor stitching, zero-lag typing, streamlined essential top bar).
- **SettingsPanel & Directive Scan**: `src/components/AGENTS.md` (`SettingsPanel`, Auto-Codex Directive Scan Station with instant scan/clear, pure manual Plot Blueprint with zero-lag isolation and fullscreen editing, auto-dismiss to workbenches).
- **AI Engine Studio & Local Draft Buffer**: `src/components/AGENTS.md` (`AIEngineStudioModal`, in-memory draft isolation preventing Firestore write storms on slider drag, atomic single commit on apply, 1-click launcher across Codex & Workbenches).
- **Context Window & Live Prose SSOT**: `src/lib/contextProviders.ts` & `src/lib/AGENTS.md` (`resolveLiveStoryContent` live in-memory prose extraction SSOT preventing stale Undo state leakage across all 6 AI pipelines, `resolveStoryContextEngine` single prose processing engine, defense-in-depth double-slicing in `buildSyntheticHistoryMessages`, `assertContextWindowGuard` 3rd-tier invariant assertion, strictly preventing prose overflow beyond `contextWindow` across all tasks).
- **Persona Priming & Synthetic History Injection SSOT**: `src/lib/contextProviders.ts` & `src/lib/AGENTS.md` (`getPersonaPrimingMessages` dedicated web novelist persona self-commitment turn pair, cross-task self-discipline, studio feature control).
- **AI Generation Engine**: `src/services/AGENTS.md` & `src/prompts/AGENTS.md` (MARS Multi-Agent Review & Synthesis: Primary Model drafting & Stage 3 Master Literary Restorer holistic overhaul prose resynthesis with live story content SSOT injection, narrative-order harmonized context, and recency-biased anchor stitching + Auditor Model 4 parallel specialist diagnostic agents with Elastic Issue-Driven & Zero-Defect Bypass protocol via Promise.allSettled).
- **Codex (Lorebook)**: `src/lib/AGENTS.md` & `src/prompts/codex_formatting_rules.md` (3-tier plain-text headers `[Header]`, `<Subheader>`, `- Bullet`, SSOT deduplication, de-chronologization state distillation, directive scan popover with direct studio launcher).
- **Story Memory & Deterministic Archive Pipeline**: `src/lib/memoryArchiveUtils.ts`, `src/services/memoryService.ts`, `src/components/MemoryWorkbench.tsx` (2-Tier architecture: 4,000-char Core Memory + unlimited deterministic Archive Cards via Codex name matching, 5 mandatory headers [이야기의 뿌리, 지난 경과, 미해결 단서, 인물 상태와 관계, 직전 장면 이음새], atomic proposal commit, and dedicated archive library browser).
- **Plot Blueprint & Narrative Director**: `src/services/AGENTS.md`, `src/prompts/AGENTS.md`, `src/components/AGENTS.md` (Light novel 4-tier blueprint, 3-tier streamlined CoT [상황 및 입력 분석, 구역별 갱신 계획, 집필 전 4대 핵심 점검], Section 1 2-tier directing constitution, 2-tab streamlined Plot Workbench, transitional bridge sequences, pure manual drafting space in settings).
- **Style Directives & Engine Firmware SSOT**: `src/lib/contextProviders.ts` & `src/components/SettingsPanel.tsx` (Firmware lock for `novel_system.md`/`codex_system.md`, `styleDirectives` single slot, dynamic Section 1 fusion via `resolveNarrativeDirectivesContext`, and AI custom style generation reusing narrative SSOT).
- **Auto-Scan Real-Time Observability & Mobile Memory Workbench Overhaul**: `src/lib/counterStorage.ts`, `src/hooks/useAutoCounters.ts`, `src/components/EditorContainer.tsx`, and `src/components/MemoryWorkbench.tsx` (Zero-lag real-time counter pill with SVG progress rings and popover stats/reset on floating action bar, mobile 3-tab architecture [현재 메모리 / AI 제안 / 지침 & 생성] with 100dvh viewport and permanently anchored sticky footer).

---

## 6. AI Agent Protocol (Mandatory)

1. **Dual Planning Protocol**: 
   - **Lightweight / Feature Planning**: 일반 기능 및 UI 변경 시 AI Studio 네이티브 `planning-mode` (`implementation_plan.md` + UI Curtain)로 신속 승인 및 구현.
   - **Deep Architectural STP**: 코어 엔진/데이터 스키마/고위험 리팩터링 시 `GEMINI.md`의 `Deep Architectural STP` ("Plan & Blueprint -> Lock -> 4대 차원 무자비한 자가 비판 -> Master Blueprint 승인 -> Execute -> Cleanup & Archive") 준수.
2. **Audit Logging**: Record code changes in `/AUDIT_LOG.md` (append to top). Keep `/AUDIT_LOG.md` concise (<25KB); older entries archive to `docs/archive/`.
3. **Documentation Size Constraint**: **Keep this root `AGENTS.md` strictly under 15KB** (platform truncates at 24KB byte-boundary, which breaks UTF-8 decoding if exceeded). Place detailed domain specs in `src/*/AGENTS.md` or `docs/`.
4. **Verification**: Always run `lint_applet` (`tsc --noEmit`) and `compile_applet` before finishing turns.

---

*Last Updated: 2026-10-12 (AI Studio 네이티브 Plan 도입에 따른 Dual Planning & STP 이원화 프로토콜 개정)*

