# Context Builder Architecture & Templates

This directory contains the structural templates (`*.md`) used by the **Context Builder Engine** to assemble the final payload for AI generation requests.

## 1. Concept: Context vs. Prompt
It is crucial to distinguish between a "Context Template" and a "Prompt":
- **Prompt (`src/prompts/*.md`)**: The actual domain logic, directing principles, and decision rules (e.g., state distillation, core trait inertia, CoT evaluation rules).
- **Context Template (`src/contexts/*.md`)**: The architectural blueprint and contract that defines how roles, JSON schemas, prompts, sub-rules, and negative constraints are structured into XML blocks (`<role>`, `<inputs>`, `<schema>`, `<core_directives>`, `<formatting_rules>`, `<output_rules>`).

## 2. Templates Inventory
- **`novel-generation.md`**: Main structural template for continuing novels. Integrates `{{SYSTEM_PROMPT_NOVEL}}` and `{{STYLE_DIRECTIVES_SYSTEM_BLOCK}}`.
- **`codex-generation.md`**: Modernized architectural blueprint for Codex (Lorebook) assistant. Enforces explicit XML framing (`<role>`, `<inputs>`, `<schema>`, `<core_directives>`, `<formatting_rules>`, `<output_rules>`), hosting the adaptive thought process JSON schema and 3-tier plain-text formatting contract while delegating directing principles to `codex_system.md`.
- **`autocodex-generation.md`**: Modernized architectural blueprint for Auto-Codex entity extraction and canon audit. Enforces explicit XML framing (`<role>`, `<inputs>`, `<schema>`, `<core_directives>`, `<formatting_rules>`, `<output_rules>`), hosting the 5-step Evaluative CoT JSON schema and pruning slots while delegating evaluation rules to `auto-codex-system.md`.
- **`consistency_critique_context.md`**: MARS (Multi-Agent Review & Synthesis) Refiner system template. Bridges unified system instructions across 4-Agent Parallel Audits and Stage 3 Master Novelist synthesis within explicit XML tags (`<role>`, `<inputs>`, `<core_directives>`, `<restoration>`, `<output_rules>`).
- **`memory-generation.md`**: Template for Story Memory summaries and delta updates.
- **`plot-generation.md`**: Template for dynamic plot blueprint generation and directional updates.
