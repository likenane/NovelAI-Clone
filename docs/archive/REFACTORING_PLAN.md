# AI Novelist Studio - Refactoring Plan

This document outlines the phased approach to refactoring the `App.tsx` (3000+ lines) into a modular, maintainable architecture while preserving all functional features.

## Phase 1: Foundation & Utility Extraction
**Goal**: Reduce noise in `App.tsx` by moving non-React logic to dedicated modules.
- [x] Move shared types to `src/types.ts`.
- [x] Extract Tiptap extensions to `src/lib/editor/extensions.ts`.
- [x] Extract prompt generation logic to `src/services/promptService.ts`.
- [x] Move Firestore error handling to a utility file.

## Phase 2: Business Logic Hooks
**Goal**: Separate state management and side effects from the UI.
- [x] `useAuth`: Handle Firebase Auth and user settings.
- [x] `useNovels`: Handle novel list CRUD and real-time sync.
- [x] `useNovelContent`: Handle content loading, sub-collection sync, and migration.
- [x] `useAIEngine`: Handle generation triggers and state.

## Phase 3: Component Modularization
**Goal**: Break down the monolithic `App.tsx` render function.
- [x] `Sidebar`: Extracted to `src/components/Sidebar.tsx`.
- [x] `Codex`: Extracted to `src/components/Codex.tsx`.
- [x] `SettingsPanel`: Extracted to `src/components/SettingsPanel.tsx`.
- [x] `EditorContainer`: Wrap Tiptap and its specific UI (toolbar, scroll).
- [x] `PromptInspector`: Extract the complex inspector modal.
- [x] `MemoryWorkbench`: Extract the memory summary logic and UI.
- [x] `AuthOverlay`: Extract login/loading screens.
- [x] `FullScreenPromptEditor`: Extract the full screen prompt editor modal.
- [x] `GlobalSettings`: Extract the global settings modal.
- [x] `DeleteConfirmationModal`: Extract the delete confirmation modal.

## Phase 4: State Management Optimization
**Goal**: Clean up Prop Drilling.
- [ ] Implement `NovelContext` for shared state (currentNovel, settings).
- [ ] Standardize notification usage across all modules.

---
*Status: Phase 3 completed. App.tsx reduced to ~1160 lines.*
