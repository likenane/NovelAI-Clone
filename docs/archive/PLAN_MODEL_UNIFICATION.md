# Master Blueprint: AI Model Selection Unification

## 1. Background & Core Philosophy
The AI Novelist Studio uses multiple distinct AI interfaces:
- **Novel Generation** (`SettingsPanel.tsx`)
- **Auto-Codex** (`SettingsPanel.tsx`)
- **Codex AI Assistant** (`Codex.tsx`)
- **Memory Workbench** (`MemoryWorkbench.tsx`)

Currently, these interfaces suffer from fragmented, hardcoded model lists and redundant Provider (Gemini vs. OpenRouter) toggles. 
As a **Power User Tool**, the UI should be streamlined. The user already knows which models suit their needs. Therefore, we must unify all interfaces to use a single, flat, comprehensive list of models without intrusive warnings or unnecessary categorizations, while ensuring the background configurations (defaults and state management) remain robust.

## 2. Architectural Blueprint

### 2.1 Single Source of Truth (`src/constants.ts`)
The `AVAILABLE_MODELS` array has already been implemented. We must now define explicit **Feature-Specific Defaults** to ensure that while the UI shares the same dropdown, the underlying capabilities match the complexity of the task (e.g., Memory/Codex require high reasoning, hence 'Pro' models).

```typescript
// To be added/verified in src/constants.ts
export const DEFAULT_MODELS = {
  novel: 'gemini-3-flash-preview',
  codex: 'gemini-3.1-pro-preview', // Requires high reasoning for JSON extraction
  memory: 'gemini-3.1-pro-preview' // Requires high reasoning for summarization
} as const;
```

### 2.2 UI Unification (The 3 Targets)
For each of the following components:
1. `src/components/SettingsPanel.tsx` (Auto-Codex settings block)
2. `src/components/MemoryWorkbench.tsx` (Model selection block)
3. `src/components/Codex.tsx` (AI Assistant settings)

**Required Actions:**
- **Remove Provider Toggles**: Delete any UI buttons that force the user to toggle between "Gemini" and "OpenRouter".
- **Unify Dropdown**: Replace hardcoded `<option>` tags with a `.map()` over `AVAILABLE_MODELS`.
- **Legacy Fallback**: If the currently saved model is not in `AVAILABLE_MODELS`, render it at the top as `<option value={currentModel}>{currentModel} (Custom)</option>` to prevent accidental overwriting of deprecated/custom models.

## 3. Strict Implementation Rules (Guardrails)

### Rule 1: Deep Copy for React State (Anti-Data Loss)
Settings objects (like `autoCodex`) are nested. When updating the model from the unified dropdown, developers **MUST** use rigorous deep copying to prevent sibling properties (e.g., `temperature`, `maxTokens`) from being wiped out.
```typescript
// CORRECT PATTERN
setCurrentNovel(prev => ({
  ...prev,
  settings: {
    ...prev.settings,
    autoCodex: {
      ...prev.settings.autoCodex,
      modelName: newModelId,
      model: newProvider
    }
  }
}));
```

### Rule 2: Simple Provider Inference
We only officially support Gemini and OpenRouter. Avoid over-engineering the provider lookup. Use the following simple fallback logic when assigning the `model` (provider) property:
```typescript
const selectedModel = AVAILABLE_MODELS.find(m => m.id === newModelId);
const newProvider = selectedModel ? selectedModel.provider : (newModelId.includes('/') ? 'openrouter' : 'gemini');
```

### Rule 3: Respect Initial Defaults on Creation
Ensure that when a *new* novel is initialized in `useNovels.ts` or when a feature is turned on for the first time, it pulls its default model from the `DEFAULT_MODELS` constant defined in Step 2.1.

## 4. Execution Checklist
- [ ] Add `DEFAULT_MODELS` to `src/constants.ts`.
- [ ] Refactor `MemoryWorkbench.tsx` (remove toggles, map models, deep copy state).
- [ ] Refactor `Codex.tsx` (remove toggles, map models, deep copy state).
- [ ] Refactor Auto-Codex section in `SettingsPanel.tsx` (remove toggles, map models, deep copy state).
- [ ] Ensure Legacy Fallback UX is present in all 3 dropdowns.
- [ ] Verify `AUDIT_LOG.md` is updated after the implementation is complete.

---
*Status: Ready for Execution.*
