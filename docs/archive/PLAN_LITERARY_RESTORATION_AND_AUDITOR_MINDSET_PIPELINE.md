# Master Plan: Literary Restoration & Auditor Mindset Modernization Pipeline

## 1. Executive Summary & Philosophical Rationale

### 1.1 The Core Problem: False-Positive Safety Censorship & Sterilization
- **Symptom**: When refining creative prose (even normal literary fiction involving combat, high tension, dark emotions, or visceral conflicts), the AI frequently self-censors, issues safety refusals, or strips away emotional grit/intensity (sterilization).
- **Root Cause**:
  1. **High-Risk Alignment Triggers**: Words like `Rewrite`, `Revise`, `Correction`, and punitive `Audit Defects` trigger LLM alignment/safety filters into treating the task as sanitizing harmful/toxic text or executing an adversarial rewrite.
  2. **Inquisitor/Policing Mindset in Auditors**: The 4 specialist auditors were instructed to "strictly detect/crack down on defects (적발/감찰)", causing them to treat raw dramatic conflicts, crude character traits, or dark atmospheres as "defects to be corrected."
  3. **Master Novelist Framing**: Instructed to "mechanically correct all flaws and completely rewrite", leading the synthesis model to sanitize and neuter the draft's vitality.

### 1.2 The Solution: The "Literary Restoration & High-Fidelity Rendering" Paradigm
We shift the cognitive framing of the entire MARS pipeline from **"Defect Inspection & Rewriting (취조 및 전면 개정)"** to **"Literary Restoration & Canonical Scene Rendering (문학적 원형 보존 및 정밀 복원 렌더링)"**:
- **Literary Non-Interference Constitution**: Explicitly establish that the text is pure literary fiction where conflict, grit, and emotional intensity are essential vital assets that must NOT be sanitized.
- **Auditors as Restoration Specialists (복원 분석관)**: Transforming from fault-finding inquisitors to camera directors and causal engineers who identify signal loss, perceptual blindspots, and translation noise.
- **Synthesis Model as Master Restorer (수석 문학 복원가)**: Restoring the author's raw draft to 100% resolution with pristine native Korean flow without losing its visceral edge.

---

## 2. Implementation Scope

### 2.1 Prompt Files
1. `/src/prompts/auditor_scope_protocol.md`:
   - Add Article 4: `[문학적 에너지 보존 및 비간섭 헌법 (Artistic Non-Interference Rule)]`.
   - Update terminology to issue-driven restoration analysis.
2. `/src/prompts/critique_plot_system.md`:
   - Reframe from "플롯 감찰관" to "수석 서사 역동 & 인과 복원 분석관 (Senior Narrative Dynamics & Causal Fidelity Analyst)".
   - Update lenses & reporting structure (`결함` -> `서사 이음새 보강 지점`, `복원 가이드`).
3. `/src/prompts/critique_physical_system.md`:
   - Reframe from "시공간 감찰관" to "수석 시공간 물리 정합 분석관 (Senior Spatial & Physical Fidelity Analyst)".
   - Focus on visual camera trajectory and tactile physics restoration.
4. `/src/prompts/critique_lore_epistemic_system.md`:
   - Reframe from "세계관 감찰관" to "수석 로어 수호 및 인지 경계 분석관 (Senior Lore & Epistemic Boundary Custodian)".
   - Focus on cognitive stepping stones and POV immersion.
5. `/src/prompts/critique_stylistic_system.md`:
   - Reframe from "문체 감찰관" to "수석 한국어 문체 및 미학 조율관 (Senior Korean Prose Stylistics & Aesthetics Stylist)".
   - Focus on native Korean cadence, sensory vitality, and author style fidelity.
6. `/src/prompts/critique_synthesis_system.md`:
   - Reframe to "Master Literary Restoration & Canonical Prose Rendering Directives".
   - Reinforce the Vitality & Raw Momentum Preservation Rule.

### 2.2 TypeScript Context Provider & Service Layer
1. `/src/lib/contextProviders.ts`:
   - Update `formatMasterSynthesisPrompt` directing text and report section labels to adopt the Literary Restoration paradigm.
2. `/src/services/refinerService.ts`:
   - Maintain full interface backward compatibility while harmonizing internal labeling.

---

## 3. Verification Protocol
- Run `lint_applet` (`tsc --noEmit`) to verify 100% type safety.
- Run `compile_applet` to ensure build integrity.
