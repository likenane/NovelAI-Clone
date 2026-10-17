# Prompts Module Guidelines

This directory contains the core system prompts for all AI tasks in AI Novelist Studio.

---

## Single Source of Truth (SSOT) & Formatting Standards

### 1. `codex_formatting_rules.md` (SSOT)
- **Role**: The absolute Single Source of Truth (SSOT) for all Codex formatting, structure, and update rules across AI Novelist Studio. Injected dynamically into both manual Codex AI Assistant prompts and Auto-Codex prompts.
- **3-Tier Structure**:
  1. `[Header]`: Tier-1 Category Header (e.g., `[기본 정보]`, `[개요]`, `[외형]`, `[말투]`, `[인간관계]`) on standalone lines. Strictly ban compound conjunctions (`~ 및 ~`).
  2. `<Sub-header>`: Tier-2 Sub-branch Header (e.g., `<상황별 스탠스>`, `<vs 대상명>`) on standalone lines.
  3. `- Bullet`: Tier-3 Single-depth hyphen bullet points.
- **Core Principles**:
  1. **무손실 질감 및 작가 디렉팅 계승 원칙 (Lossless Texture & Directing Preservation)**: When performing a full rewrite (전체 재작성), the AI is strictly forbidden from flattening, summarizing, or diluting the author's rich prose, vocabulary, metaphors, and embedded directing guidance into sterile bullet points. Unaltered sections and bullets must be preserved losslessly with their original stylistic cadence.
  2. **인물 본질의 고관성 및 보수적 상태 전이 규약 (Core Trait Inertia & Conservative State Shift)**: A character's core traits, worldview, and psychological baseline possess high inertia and must not be altered, diluted, or drifted due to transient emotions or isolated scene actions. Enforces a 3-tier inertia hierarchy: Tier 1 (Core Trait - frozen/immutable across short scenes), Tier 2 (Relational/Situational Stance - elaborated as internal conflict/paradox under `<vs Target>` without overwriting core traits), and Tier 3 (Transient State - kept out of Codex and confined to Story Memory).
  3. **안티-타임라인 상태 전이 규약 (Anti-Timeline & In-place State Overwrite)**: The Codex is not an episodic chronicle or action log; it represents persistent ontological state. Transitory actions and scene-by-scene action logs are strictly banned. Instead of sterile dataset tags (`[속성]:`), bullets use rich, literary prose anchored on the subject's inherent nature, relational stance, and ontological definition, naturally absorbing plot events as textural nuances. State shifts overwrite preexisting bullets in-place rather than appending infinite historical logs.
  4. **보편적 개념 분화 규약 (Universal Concept Spinoff Protocol)**: Lore elements are not artificially restricted to character/location taxonomies—all elements are Concepts. Any concept that attains **Independence (독립성)** (autonomous operation/relational potential outside the parent) and **Uniqueness (고유성)** (distinct identity and structural gravity) must spin off into an independent first-class entry, leaving a clean 1-line relational cross-reference in the parent entry.
  5. **Dynamic Subheader Fission Protocol**: When a header accumulates 4+ bullets or distinct contexts, split it into Tier-2 `<서브헤더>` blocks. If a sub-concept grows beyond internal subheaders, trigger Concept Spinoff.
  6. **Header Elasticity**: AI can create new fitting single-noun category headers (e.g., `[전투 체계]`, `[고유 결계]`, `[제약 및 대가]`) rather than cramming disparate facts.
  7. **Universal Genre-Neutral Examples**: Examples in `codex_formatting_rules.md` strictly use generic archetypes rather than specific novel or IP names to prevent model bias across diverse fiction genres.
- **Strict Negative Constraints**: Markdown code blocks (\`\`\`markdown), markdown headers (`#`), bold (`**`), italics (`*`), blockquotes (`>`), and tables (`|`) are strictly prohibited.
- **In-situ Directing Mandate**: Strictly forbid creating artificial headers like `[소설 집필 디렉팅]`. Directing guidance must be embedded naturally inside relevant attribute bullets.

### 2. `codex_system.md` & `codex-generation.md`
- **Role**: Defines the core Directing Philosophy and Adaptive CoT reasoning guidelines for the Codex Lore Architect.
- **Context/Prompt Role Separation**: The outer JSON Output Format Schema and formatting rule injection (`{{CODEX_FORMATTING_RULES}}`) are fully housed within `src/contexts/codex-generation.md` (`<role>`, `<inputs>`, `<schema>`, `<formatting_rules>`, `<output_rules>`), allowing `codex_system.md` to focus strictly on pure directing principles and adaptive thought process instructions.
- **Adaptive CoT & State Distillation Pipeline**: Enforces structured JSON output with Adaptive CoT (`thoughtProcess`: `directiveIntent`, `dechronologization`, `headerTeleology`, `losslessPreservationPlan`, and `finalContent`). Strictly enforces Author Directive Supremacy (`User Directive`), Lossless Full-Document Return, and conditional De-chronologization.
- **Concept Spinoff Support (`spinoffEntries`)**: Allows the AI assistant to separate distinct concepts that emerged within the target entry into independent `spinoffEntries` while leaving a clean 1-line reference in the parent entry.

### 3. `auto-codex-system.md` & `autocodex-generation.md`
- **Role**: Autonomous background curator that evaluates novel context and returns JSON proposals (`newEntries`, `updates`, `prune`).
- **Context/Prompt Role Separation**: The outer 5-step Evaluative CoT JSON Schema and dynamic pruning slots (`{{PRUNING_SCHEMA}}`, `{{CODEX_FORMATTING_RULES}}`) are hosted cleanly within `src/contexts/autocodex-generation.md` (`<role>`, `<inputs>`, `<schema>`, `<core_directives>`, `<formatting_rules>`, `<output_rules>`), allowing `auto-codex-system.md` to focus strictly on pure evaluative CoT decision rules (Step 0 ~ Step 5).
- **Modular Pruning Prompts**:
  - `autocodex_pruning_schema.md`: The single source of truth for the optional `"prune"` JSON array schema.
  - `autocodex_pruning_rules.md`: The single source of truth for the active lore pruning protocol directive (`{{PRUNING_RULES}}`).
- **Step 0 (`step0_authorDirectiveSupremacy`)**: Author Directive Supremacy CoT. When the author supplies an explicit scanning directive (e.g. batch modification, relationship shifting, concept splitting), it acts as an absolute top-priority override governing all subsequent evaluation steps.
- **Step 1-A (`activeLoreFactShiftTriage`)**: Focuses purely on permanent state transitions and worldview rule changes while filtering out transitory episodic actions (Anti-Timeline).
- **Step 1-B**: Identifies emergent independent concepts across multiple tracks.
- **Step 4 CoT (`step4_updateEvaluation`)**: Plans lossless texture preservation, in-place state overwrites, and concept spinoffs (spinoff concept extracted to `newEntries`, parent entry streamlined with 1-line reference in `updates`).

### 4. `consistency_critique_system.md` & `consistency_critique_context.md`
- **Role**: Defines the System Prompt and Context Template for the 2-stage Continuity & Polish Refiner.
- **SSOT Architecture Alignment**: `consistency_critique_context.md` serves strictly as a thin XML template injecting `{{SYSTEM_PROMPT_CONSISTENCY}}` into `<System>`, keeping prompt logic centralized in `consistency_critique_system.md`.
- **Unified Global Narrative & Directive Audit**:
  - Macro plot pacing, storyline progression, causal continuity with recent narrative context, and author inline `{}` directives are audited strictly and completely within `globalPlotAndDirectiveAudit` in `globalContextAudit`.
  - Macro defects are logged under `plotDefectsIdentified`.
- **Strict Domain Separation Directive**:
  - Global plot audit is strictly restricted to narrative flow, pacing, and directives. It is forbidden from discussing character tone, lore rules, translationese, or sentence cadence.
- **Direct Sliced 4-Tier Micro-Continuity Hierarchy**:
  - Because 250~350 character slices cannot evaluate holistic plot progression, per-slice audits exclusively examine micro continuity in 4 distinct tiers:
    1. `stage1_PhysicalAndSituational`: Spatial logic, posture, body mechanics, wounds, item state from previous sentences (`[결함-물리 N]`).
    2. `stage2_LoreCanonAndVoice`: In-slice active Codex rule adherence, character tone, honorifics, and dialogue persona (`[결함-로어 N]`, `[결함-말투 N]`).
    3. `stage3_EpistemicBoundaryAndPOV`: Bottom-up provenance check on character knowledge and perspective boundaries (`[결함-정보 N]`). Audits 4 distinct violations:
       - **미해금 설정 전제 (Unrevealed Plot/Lore)**: Character knows secrets/backstory before storyline revelation.
       - **인물 간 정보 비대칭 침범 (Asymmetric Secrets)**: Character assumes or reacts to confidential information known only to others.
       - **시점(POV) 및 메타 정보 오염 (POV/Dramatic Irony Leak)**: Restricted 1st/3rd POV narrative leaks distant events or reader-only metadata.
       - **외적 단서 없는 독심술 (Unfounded Mind-Reading)**: Asserting others' internal motives/emotions without observable show cues (facial twitches, tone shifts, micro-behaviors). Observable cues are respected as valid narrative intuition.
    4. `stage4_NativeLinguisticAndStyle`: Native Korean prose polish (`[결함-문체 N]`), targeting 5 critical flaw types:
       - **영문 구문 및 부정관사 직역**: `It was not A, but B` 구문(`~한 것은 A가 아니었다. B였다`) 즉각 긍정 서술문화, `한 마리의`/`하나의`/`어느 한` 부정관사 직역 퇴출.
       - **감각 묘사의 시계열(Perceptual Chronology) & 동사 활성화**: [접촉/관찰 ➔ 향/온도 ➔ 미각/육즙/질감]의 시간 순서 재배열, 정적 명사 나열 종결 금지.
       - **프롬프트 메타데이터 기계적 슬롯 필링(인물 딱지) 제거**: 이미 알려진 신분·직업(`여고생의`, `마법사의`)을 인물 내면 심리의 소유격으로 붙이지 않고 내면 심리로 수렴.
       - **양태 명사 및 주술 호응 비문 척결**: `꼴/모습/표정/태도` 주어와 실체 서술어 간 호응 일치(`꼴이 ~ 같았다` / `~ 꼴이었다`).
       - **기존 문체 결함**: 무생물 주어, 이중피동, 종결어미 3연속 반복, 관념어(Tell) 배제. *(사용자 예외: 서브컬처 특성을 고려해 시대착오적 인터넷 은어/통신어 퇴출 조항은 제외)*
- **Proactive Drafting Directives (`novel_system.md`)**: Section 6 (Style & Expressiveness) incorporates proactive rules for perceptual chronology, dynamic verbs, avoiding robotic metadata tagging, and banning translationese constructs (`It was not A, but B`, `한 마리의`) at source.
- **Stage-Scoped Trailing Tagging & Exhaustive Projection Protocol**:
  - `stageAudits` CoT 과정에서 포착된 결함은 스테이지 간 스코프 리셋 및 카운팅 혼선을 원천 방지하기 위해 도메인 접두사를 부여:
    - `[결함-물리 N]`, `[결함-로어 N]`, `[결함-말투 N]`, `[결함-정보 N]`, `[결함-문체 N]`
  - 포착된 모든 태깅 결함은 `newDefectsIdentified` 배열로 1:1 전수 등재 (`PHYSICAL`, `LORE`, `CHARACTER_SPEECH`, `EPISTEMIC`, `LINGUISTIC`).
  - 사소한 지적도 자가 면죄부("문맥상 큰 문제는 없으나...")를 원천 차단하고 결함 등록 의무화.
  - 각 스테이지 내에서 독립 카운팅하므로 모델의 스테이지 간 연산/기억 부담 제거.
  - **관조적 훈수 및 자가 면죄부 금지**: "치명적 비문은 아님", "호흡을 정돈할 것", "표현이 거칠다" 등 개선 필요성을 언급해놓고 결함 등록을 회피하는 자가 면죄부 엄격 금지 (지적=100% 결함 태깅).
  - **태그 없는 비판 사족 금지**: 추가 비판 문장("또한 ~작위적임")도 반드시 말미에 개별 태그(`[결함-* N]`)를 부착하도록 강제.
  - 태깅된 모든 결함은 `newDefectsIdentified` 배열에 단 하나도 누락 없이 1:1 개별 객체로 전수 등록하도록 강제.
  - JSON 스키마 예시에 물리(`RULE_1_1`) 및 주술불일치/어조작위성/의성어나열 리듬 결함(`RULE_1_2`~`RULE_1_4`) 다중 결함 샘플과 가변 무제한 등록 지침 명시.
- **Cascade Suppression**: Reuses upstream `ruleId` via `inheritedFixesApplied` to eliminate critique fatigue.

### 5. `plot_system.md`
- **Role**: Defines the Streamlined Narrative Architect & Chief Story Director generating the publication-grade 4-Tier Plot Blueprint.
- **Role & Philosophy**: Acts as a deterministic author-grade working notebook that prose drafting models follow directly. Replaces ambiguity with concrete events and actively designs narrative enjoyment around reader expectations and curiosity.
- **5-Tier Reader-Driven Algorithmic CoT**:
  1. `diagnosis`: Deep situational context analysis, plot type (`INITIAL | EXTENSION | REVISION | AUTO_UPDATE`), narrative mismatches handling (다시 씀 vs 유지), roadmap decision, milestone status, and Section 1 handling.
  2. `readerAnalysis` & `codexMaterial`: Reader enjoyment direction, real-time curiosity/questions, expected payoffs, open clues/foreshadowing, and conflict materials extracted from Codex.
  3. `candidates`: Multi-directional branch candidate ideation (C1~Cn, starting with baseline C1, direction and key events only without premature ratings or labels).
  4. `reverseReview`: Reverse-order multi-dimensional scrutiny (from Cn back to C1) evaluating `expectationRelation` (충족 | 지연 | 비틀기 | 뒤집기), character consistency, canon/story fit, and reader-experience `strengths` & `weaknesses`.
  5. `selection`, `verification`, `sequencePlan`, `section4Plan`: Cross-candidate `comparison`, candidate `decisions` (`{ id, decision: '채택' | '조합' | '기각', reason }`), `chosen` direction from reader experience perspective, twists & new settings audit, 3-point pre-write verification, 6~8 sequence timeline, and section 4 pruning/addition plan.
- **Section 1 Standard 2-Tier Directing Constitution & Immutable Global Directives Mandate**:
  - `[1. 서술 방향 및 연출 디렉팅]` is strictly divided into two neutral markdown subheaders:
    1. `### 작품 전역 지침`: POV, tone, prose style, absolute taboos spanning the entire novel (immutable constitutional rules, preserved losslessly unless explicitly requested).
    2. `### 현재 아크 지침`: Directorial pacing, focus, and interpersonal tension specific to the active 5-stage roadmap and scene sequences (adaptive rules).
  - General neutral character nomenclature (주인공, 주요 인물, 화자) strictly enforced in Section 1.
- **Section 2 & 3 Scale Standards (6~8 Sequences)**:
  - Section 2: 5 Macro-Arc Milestones (발단-전개-위기-절정-결말), each ~20,000 characters.
  - Section 3: Active Episode Incident with 6~8 scene sequences (~5,000 characters each). First 3~4 sequences feature all 4 elements ([서사 전개], [행동 및 대화 디렉팅], [연출 작법], [시퀀스 훅]); subsequent sequences are streamlined.
- **Section 4 Long-Term Logic Framework (한국어 4대 도구)**:
  - Formatted dynamically using Korean category tags:
    - `[해결 논리 | 제목]`: Causal operational resolution mechanisms, constraints, leverage, decisive mechanics, and costs.
    - `[불변 제약 | 이름]`: Absolute diegetic constraints (stamina, mana, distance, societal limits).
    - `[복선 | 이름]`: Latent foreshadowing and clues planted or recalled.
    - `[신규 설정 | 이름]`: New settings or intentional deviations from the Codex, with documented intent.
  - Excludes Section 1 directing rules, Codex overlap, and executed/resolved items (graduation pruning).

### 6. MARS (Multi-Agent Review & Synthesis) Parallel Refiner Architecture
- **Architecture**: Decouples monolithic CoT into 4 specialized parallel diagnostic analysis prompts and 1 dedicated master literary restorer prompt:
  1. **`critique_plot_system.md` (Senior Narrative Dynamics & Causal Fidelity Analyst)**: Macro narrative arc, author `{}` directive execution fidelity, scene tension, and causal inevitability. Uses Comprehensive Narrative Lenses and generates elastic issue-driven diagnostic reports (`[영역별 전반 진단: 서사 인과율 및 연출 목표]`, Zero-Defect Bypass `[핵심 쟁점: 특이사항 없음]` or Elastic `[핵심 쟁점 1...N: 결함 원인 분석 및 교정 힌트]`) without markdown `#` headers or token-wasting sentence quotes.
  2. **`critique_physical_system.md` (Senior Spatial & Physical Fidelity Analyst)**: 3D spatial positioning, line of sight, hands/grasp inventory invariants (preventing phantom 3rd hand errors), wound/fatigue continuity, and environmental physics. Uses Comprehensive Physical Lenses and elastic issue-driven reporting (`[영역별 전반 진단: 시공간 물리 정합성]`, Zero-Defect Bypass `[핵심 쟁점: 특이사항 없음]` or Elastic `[핵심 쟁점 1...N: 결함 원인 분석 및 교정 힌트]`).
  3. **`critique_lore_epistemic_system.md` (Senior Lore & Epistemic Boundary Custodian)**: Codex canon fidelity, **bottom-up epistemic boundary provenance tracking (preventing unobservable mind-reading or unrevealed secret leakage)**, and cognitive stepping stones. Uses Comprehensive Lore Lenses and elastic issue-driven reporting (`[영역별 전반 진단: 세계관 및 지식 경계]`, Zero-Defect Bypass `[핵심 쟁점: 특이사항 없음]` or Elastic `[핵심 쟁점 1...N: 결함 원인 분석 및 교정 힌트]`).
  4. **`critique_stylistic_system.md` (Senior Korean Prose Stylistics & Aesthetics Stylist)**: Eradication of English/Japanese translationese, removal of robotic prompt metadata tags, sentence-ending rhythm diversity, and sensory perceptual chronology. Uses Comprehensive Stylistic Lenses and elastic issue-driven reporting (`[영역별 전반 진단: 한국어 문체 및 미학]`, Zero-Defect Bypass `[핵심 쟁점: 특이사항 없음]` or Elastic `[핵심 쟁점 1...N: 결함 원인 분석 및 교정 힌트]`).
  5. **`critique_synthesis_system.md` (Stage 3: Master Literary Restorer & Canonical Prose Renderer)**:
     - Consumes the 4 parallel elastic diagnostic reports alongside the raw draft and anchor context.
     - **Masterful Holistic Literary Overhaul (Anti-Patching & Full Prose Resynthesis Constitution - CRITICAL)**: Strictly forbids partial find-and-replace patching or micro surgical modifications. Fully internalizes the 4 diagnostic briefs as a comprehensive dossier—preserving domains marked with Zero-Defect `[특이사항 없음]` and systematically resolving all reported flaws across elastic `[핵심 쟁점 1...N]`—rewriting, polishing, and elevating the entire continuation prose from start to finish into a high-fidelity, complete literary work with seamless authorial voice and momentum.
     - **Literary Restoration & Anti-Sterilization Constitution (CRITICAL)**: Pure literary fiction preservation framework. Strictly prohibits sanitizing/sterilizing the raw grit, violence, dark atmosphere, or emotional intensity of the scene. Eliminates technical/perceptual noise while 100% preserving and amplifying raw narrative momentum and visceral texture.
     - **Conflict Resolution & Overarching Stylistic Craft**: Factual and narrative event conflicts resolve via `[Plot/Directives] >= [Physical] > [Lore]`. Meanwhile, Korean prose stylistics is an overarching qualitative dimension that must be applied across the entire text, elevating the cadence, diverse endings, and natural dialogue of the whole scene.
     - **Seamless Continuity via Anchor Overlap Stitching (Harmonized with Novel Generation)**: The physical prompt layout places `Current Story Text` tail and `[Immediate Stitching Anchor]` at the generation boundary (Recency Zone), identical to Stage 1. Repeats `<anchor>` verbatim so `stitchAndTrimAnchor` deterministically trims overlap without seam or drift.
     - Directly outputs pure novel prose without markdown code blocks.
- **Context/Prompt Role Separation & SSOT Assembly**:
  - `novel_system.md` and `critique_synthesis_system.md` contain pure execution constitutions without conflicting personas.
  - `novel-generation.md` and `consistency_critique_context.md` define single top-level personas and dynamically assemble the underlying constitutions.
  - `auditor_scope_protocol.md` establishes a single source of truth for the audit scope protocol: isolating `<RAW_DRAFT>` as the sole target, strictly prohibiting mechanical quota-filling and nitpicking, codifying the **Elastic Issue-Driven & Zero-Defect Protocol** (allowing 0-issue bypass via `[핵심 쟁점: 특이사항 없음]` and unconstrained 1~N issue scaling with rich cause-and-hint depth), and establishing the **Artistic Non-Interference Constitution** (preventing AI false-positive safety censorship and sanitization).
  - `formatAuditorPrompt(variables, scopedDraft)` and `buildStandardNarrativeContext(variables, { includeAnchor: false })` guarantee that 4 Auditor agents receive pure context without anchor repetition directives, while Stage 3 Synthesis uses `formatMasterSynthesisPrompt` with a recency-biased layout mirroring Stage 1 novel continuation.




