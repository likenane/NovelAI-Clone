# Library & Utility Functions - Development Guidelines

This document defines the standards for utility functions and data providers in the `src/lib/` directory.

## 1. Context Providers (`src/lib/contextProviders.ts`)

This file is the core of the **Total Data Provider** architecture. It is responsible for translating the raw state of the application into a flat dictionary of variables that can be injected into Markdown templates.

### `resolveLiveStoryContent(novel, editorOrGetter, options)`
- **Purpose**: Single Source of Truth (SSOT) helper that guarantees all AI generation pipelines consume the latest live in-memory story prose (including immediate Undo/Redo or manual edits) rather than stale persisted Firestore state.
- **Contract**:
  1. Priority 1: Extracts live HTML from `editor` instance (`editor.getHTML()`) or `getEditorContent` callback.
  2. If live content is unavailable:
     - `strict: true` (default for user-initiated generations): Throws a descriptive error to block generation and prevent stale prose corruption.
     - `allowSavedFallback: true`: Falls back to `novel.content` only for headless/background runs where explicitly requested.

### `resolveStoryContextEngine(htmlContent, options)`
- **Purpose**: Single Source of Truth (SSOT) engine dedicated to processing raw HTML editor content, isolating directives, and strictly slicing context windows.
- **Contract**:
  1. HTML tag stripping & newline preservation (`getRawPlainText`).
  2. Bottom `{}` directive extraction and complete removal from prose.
  3. **Strict Invariant Slicing**: Slices the trailing text by `contextWindow` limit (`windowProse`). Guarantees no prose preceding `contextWindow` leaks to prompts.
  4. Prefill anchor segmentation: Splits `windowProse` into `windowProseNovel` (body) and `anchorTailText` (stitching anchor).
- **`processNovelContext(...)`**: Upgraded to a thin compatibility wrapper around `resolveStoryContextEngine`.

### `assertContextWindowGuard(messages, maxAllowedChars)`
- **Purpose**: 3rd-tier Invariant Assertion Guard running right before dispatching prompt payloads.
- **Mechanism**: Inspects `## [Current Story Text]` sections inside assembled conversation messages. If prose length exceeds `maxAllowedChars` (+ soft margin), automatically applies defensive slicing and logs a warning.

### `getPersonaPrimingMessages(novelSettings?: NovelSettings)`
- **Purpose**: Single Source of Truth (SSOT) engine generating In-Context Persona Priming turn pairs (`[User Priming Trigger -> Model Synthetic Response]`).
- **Mechanism**:
  1. Checks `novelSettings?.personaPriming?.enabled !== false`.
  2. Injects a 2-turn synthetic conversation where the model self-commits to being a dedicated genre-fiction web novelist who warmly and cheerfully fulfills the user's creative desires without refusal or meta-commentary.
  3. Includes a self-discipline clause ensuring that output data (JSON or novel continuation) remains pristine without conversational filler.
  4. Automatically prepended to conversation messages across all pipelines in `buildSyntheticHistoryMessages` and `buildTaskMessages`.

### `buildTotalVariableDictionary(novel: Novel, extraData?: any)`
- **Purpose**: Acts as a single, stable translator. It takes the entire `novel` object and any `extraData` and returns a massive dictionary containing *all* possible variables that any AI template might need.
- **Philosophy**: "Heavy but Stable". Instead of building specific dictionaries for specific tasks, it builds everything at once. This ensures that if a user adds `{{STORY_TITLE}}` to *any* `.md` template, it will simply work without requiring code changes in the orchestrator.
- **Responsibilities**:
  - Extracting and cleaning text (`getRawPlainText` preserves user-created trailing spaces and newlines instead of aggressively trimming).
  - Slicing context windows (`contextWindow`, `autoCodexWindow`).
  - Formatting markdown blocks (e.g., `formatActiveLore`, `formatStoryMemory`, `formatPlotBlueprint`).
  - Dynamically injecting master formatting rules: `codex_formatting_rules.md` is loaded as `codexFormattingRulesRaw`, bound to `CODEX_FORMATTING_RULES` in the total variable dictionary, injected into `{{CODEX_FORMATTING_RULES}}` for `auto-codex-system.md`, and directly utilized in `buildTaskMessages` (`case 'codex'`).
- **`formatAnchorBlock(anchorText, options?)`**: Single Source of Truth (SSOT) formatter generating the immediate overlap stitching anchor. Supports `options.mode: 'continuation' | 'refinement'`. For drafting (`continuation`), instructs the model to seamlessly continue narrative flow. For Stage 3 Refiner (`refinement`), instructs the model to rewrite within the exact event scope of `<RAW_DRAFT>` and conclude naturally at the end of the draft's events without trespassing into future scenes. Enforces concise, authoritative Korean directive language while strictly preserving `### [Immediate Stitching Anchor]` header and `<anchor>` XML tags at the prompt terminal.
- **`formatStyleDirectives(directives)`**: Single Source of Truth (SSOT) formatter for author-defined style directives. Injected into the System Instruction (`STYLE_DIRECTIVES_SYSTEM_BLOCK`) for drafting and synthesis models, and provided as `## [Novel Style & Directing Guide]` in `buildStandardNarrativeContext` for the 4 auditors.
- **`formatPlotBlueprint(plot)`**: Formats the 4-tier structural Plot Blueprint into `## [Plot Blueprint]` without brittle regex hijacking, allowing Section 1 (`### 작품 전역 지침` & `### 현 에피소드 연출 디렉팅`) to focus cleanly on directing.
- **`buildStandardNarrativeContext(variables)`**: Single Source of Truth (SSOT) narrative context builder that standardizes the 7-tier context injection order (`[The Codex]` -> `[Novel Style & Directing Guide]` -> `[Plot Blueprint]` -> `[Story Memory]` -> `[Current Story Text]` -> `[Immediate Preceding Anchor]` -> `[User Directive]`) across novel drafting, 4-agent parallel audits, and final synthesis. Strictly injects complete recent prose (`STORY_CONTEXT`) into `[Current Story Text]` to eliminate 200-character Ghost Gaps and guarantee 100% seamless continuity with stitching anchors.
- **`formatMasterSynthesisPrompt(variables, rawDraft, auditReports)`**: Unified SSOT synthesis prompt assembler shared between runtime execution in `refinerService.ts` and `PromptInspector`. Employs the **Narrative Order Harmonization & Recency-Biased Anchor Architecture**: upper narrative context ([The Codex] -> [Style] -> [Plot Blueprint] -> [Story Memory] -> full `## [Current Story Text]` -> `## [User Directive]`), middle reference briefing (`<RAW_DRAFT>`, `## [Specialist Diagnostic Reports]`), and lower generation boundary (Recency Zone: `## [Final Directing for Master Literary Restorer]` with **Event Horizon & Anti-Trespassing Scope Rules** guaranteeing ending sentence revision freedom while strictly bounding the narrative event scope to `<RAW_DRAFT>`, directly coupled with `### [Immediate Stitching Anchor]` in `refinement` mode).
- **`buildTaskMessages({ taskType, variables, novel, extraData })`**:
  - **Purpose**: Acts as the Single Source of Truth (SSOT) for constructing `Messages` (conversation turns) across all AI tasks (`novel`, `codex`, `memory`, `autocodex`, `consistency`, `plot`).
  - **Context Envelope Unification**: Prepend `topContextPrefix` (`[The Codex]` + `[★ Plot Blueprint]` + `[Story Memory]`) at the top of the User turn for tasks to maintain chronological premise alignment.
  - **Turn Strategy Differentiation & Schema Decoupling**:
    - `novel`: Uses `buildSyntheticHistoryMessages` (multi-turn anchor-stitching history) with `[The Codex]` -> `[★ Plot Blueprint]` -> `[Story Memory]` at the top User turn.
    - `codex`: Uses Recency-Biased Sandwich Architecture (`[Active Lore & Story Memory]` -> `[Current Story Text]` -> `[Target Lore Entry to Update/Create]` -> `[User Directive]` -> `[Output Format Directive]`). Features decoupled Korean directives with `항목명` labeling and pure `[User Directive]`, `[Current Story Text]`, `[Target Lore Entry to Update/Create]` reference pointers without redundant translations.
    - `plot`: Assembles a dedicated single-turn prompt containing the current blueprint, recent context, and user directive, mandating decoupled JSON schema adherence via `시스템 지침에 정의된 JSON 스키마 규격을 엄격히 준수하여 유효한 JSON 객체만을 출력하라`.
    - `memory`: Uses a single-turn prompt strictly matching the 2-Tier specification with exact Korean input headers:
      - `## 설정집` (Active lore / Codex)
      - `## 플롯 청사진` (Plot Blueprint or "없음")
      - `## 기존 핵심 기억` (Existing Core Memory or "없음")
      - `## 관련 보관소 카드` (Time-sorted deterministic archive cards or "없음")
      - `## 직전 본문` (Recent Story Text window)
      - `## 작가 지시` (Author directives or "없음")
      - `## [Output Protocol & Strict JSON Requirement]`
    - `autocodex`: Uses Recency-Biased Sandwich Architecture (`## [Existing Lore ID Metadata]` -> `## [Current Story Text]` -> `## [User Directive]` -> `## [Output Protocol]`) with decoupled schema directives. All control directives and output protocols strictly mandate `##` Markdown headers to prevent prompt bleeding with in-story brackets (`[...]`).
    - `consistency`: Uses single-turn user prompts with `##` headers to avoid task confusion and ensure direct adherence to instructions and structured JSON generation.
- **`buildSyntheticHistoryMessages(...)`**: Construct dynamic synthetic multi-turn histories for novel generation.
  - Models the Anchor Stitching pattern using XML `<anchor>` tags for bulletproof boundary matching regardless of quotes or newlines.
  - Injects active Codex entries, Plot Blueprint, Story Memory, and Relevant Archive Cards at the top User turn to maintain timeline causality.
  - When preceding text is under 200 chars, it sends a pure single-turn payload with the context prefix to prevent genre/context contamination.

### `memoryArchiveUtils.ts` (SSOT Engine)
- **`buildCodexNameDictionary(loreEntries)`**: Extracts canonical names and alias mappings from Codex lore entries.
- **`extractMentionedEntities(text, loreEntries)`**: Extracts unique mentioned entities while handling Korean particle boundaries (`은/는/이/가/을/를/의/에게/과/와/으로/도` 등) and single-character word boundaries.
- **`searchRelevantMemoryCards(cards, mentionedEntities, limit)`**: Deterministic tag retrieval with descending tag match count, latest order sorting, correction card bundling, and chronological ascending re-ordering.
- **`formatArchiveCardsForPrompt(cards)`**: SSOT markdown prompt formatter for archive cards.

## 2. Token Slicer (`src/lib/tokenSlicer.ts`)
- **Purpose**: Precision token calculation and physical text slicing for AI prose continuation.
- **Philosophy**: Guarantees predictable prose continuation length under thinking/reasoning models without injecting artificial length prompts or altering the model's natural writing momentum.
- **Key Functions**:
  - `estimateTokens(text: string): number`: Computes estimated tokens based on SentencePiece/BPE density characteristics (Hangul syllables ~0.7 tokens, ASCII alphabets ~0.25 tokens, whitespaces ~0.3 tokens, CJK ~0.85 tokens).
  - `sliceProseByTokens(text: string, maxTokens: number): SliceResult`: Traverses the text in linear time (O(N)), accumulating character token weights until `maxTokens` is reached, and returns the physically sliced string along with metadata (`consumedTokens`, `wasCutoff`, `totalTokens`).

## 3. Lore Utilities (`src/lib/loreUtils.ts`)
- **Purpose**: Handles logic related to Codex (Lore) entries.
- **`checkKeywordMatch`**: Performs case-insensitive matching of comma-separated keywords against the provided text context.
- **`deduplicateLoreContent`**: Programmatically enforces SSOT by removing redundant duplicate bullet points and profile keys that leak outside `[기본 정보]` or `[개요]`.
- **`parseCodexAssistantResponse`**: Parses the structured JSON response from the Manual Codex AI Assistant, extracting `thoughtProcess`, sanitized `finalContent`, and `spinoffEntries` (new lore entries split out from parent). Features robust regex-based fallback extraction if JSON formatting fails or if the model outputs raw text.
- **`getPruningCandidates`**: Deterministically identifies unused lore entries for pruning suggestions.
- **`isDescendantOfLore`**: Traverses node lineage with cycle detection to determine if a target entry is a child/descendant of another entry, preventing circular nesting in drag-and-drop.
- **`sanitizeAndHealLoreEntries`**: Self-healing utility that inspects the lore hierarchy for self-references (`parentId === id`), non-existent parents, or closed circular loops ($A \to B \to A$), resetting corrupted entries to `parentId: null` so they remain visible and retrievable.


## 4. General Utilities (`src/lib/utils.ts`)
- **Purpose**: General-purpose helper functions.
- **`cn`**: Utility for merging Tailwind CSS classes (using `clsx` and `tailwind-merge`).
- **`stripInlineComments`**: Safely removes `//` inline comments using regex `/(^|\s)\/\/.*$/gm`. Protects URLs and word-internal slashes.

## 5. Novel I/O Engine (`src/lib/novelIO.ts`)
- **Purpose**: Single Source of Truth (SSOT) engine for serializing, deserializing, validating, and normalizing novel export/import files.
- **`deepMergeNovelSettings(incomingSettings)`**: Performs recursive deep-merging with `GLOBAL_DEFAULTS`, guaranteeing that all nested configuration sub-trees (`plot`, `autoCodex`, `automation`, `codex`, `memory`) possess valid, sanitized default values to eliminate runtime `undefined` crashes.
- **`sanitizeAndRemapLoreEntries(entries)`**: Cleans lore entries by filtering out unapproved AI proposals (`isProposalOnly`), preserving hierarchy (`parentId`, `order`, `type`), and remapping IDs deterministically.
- **`createNovelExportEnvelope(novel)`**: Generates the official `NovelExportEnvelopeV2` format (`version: '2.0'`) packing full metadata, content, settings, plot, sanitized lore, and memoryCards.
- **`parseAndNormalizeNovelUpload(rawJson, authorUid, maxOrder)`**: Robust multi-stage parser handling both legacy V1 format and standard V2 envelopes, returning ready-to-write sub-collection payloads with validation statistics and preserved memory cards.

## 6. Novel Counter Storage (`src/lib/counterStorage.ts`)
- **Purpose**: Single Source of Truth (SSOT) utility for managing per-novel background automation (`autocodex`, `autoplot`) accumulated character counters.
- **Architecture**:
  - **Zero-I/O Isolation**: Completely decouples counter state from Firestore metadata and content documents. Counters are stored in browser `localStorage` keyed by `novel_counter_${type}_${novelId}`, ensuring 0% impact on Firestore quota, network I/O, or novel Save/Load/Export pipelines.
  - **Session & Toggle Persistence**: Preserves accumulated character counts across page reloads (F5), tab close/reopen, sidebar novel switching, and settings toggle states.
  - **Atomic Reset & Error-Safe Retention**: Counts reset to 0 exclusively when a scan or generation run completes successfully (both automated triggers and manual runs like Directive Scan or Plot Workbench generation). Network or API errors preserve the current count so author progress is never discarded.
  - **Storage Exception Hardening**: All `localStorage` calls are wrapped in `try-catch` blocks, providing graceful degradation in private/incognito browsing or storage quota errors.
  - **`purgeNovelCounters(novelId)`**: Cleanly purges orphan counter entries from `localStorage` upon novel deletion in `useNovels.ts`.

## 7. Maintenance
- **AI Agent Protocol**: Follow the "Mandatory AI Agent Protocol" in `/AGENTS.md`. Update this file whenever the role or structure of utility functions changes.

*Last Updated: 2026-09-18 (v2 - Novel I/O Pipeline Modernization)*
