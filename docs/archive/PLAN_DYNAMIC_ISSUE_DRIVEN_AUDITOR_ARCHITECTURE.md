# [MASTER BLUEPRINT] Refiner 4대 감사관 쟁점 주도형 동적 보고서 아키텍처 개편

## 1. 철학적 배경 및 근본 원인 분석
- **문제 진단**:
  4대 감사관(`critique_plot_system.md`, `critique_physical_system.md`, `critique_lore_epistemic_system.md`, `critique_stylistic_system.md`)의 보고서 출력 프로토콜(`Report Protocol`)에 하드코딩된 고정 번호 목차(`[1. ...] [2. ...] [3. ...] [4. ...]`)로 인해, AI 모델이 장면의 고유한 결함에 유기적으로 집중하지 못하고 "정해진 양식 칸을 기계적으로 채우는 형식주의(Formalism)"에 매몰됨.
- **검사 지침의 본질**:
  프롬프트에 제시된 세부 항목들(동선, 양손 파지, 인과 사슬, 지식 경계, 번역투 등)은 감사관이 내재화해야 할 **'포괄적 감사 렌즈(Comprehensive Audit Lenses)'**이며, 결코 고정된 출력 목차여서는 안 됨.
- **해결 방안 (대안 1 확정)**:
  출력 목차의 경직성을 깨고, **장면에서 실제로 발견된 결함을 기반으로 AI가 스스로 소제목(`[핵심 쟁점: <소제목>]`)을 달아 보고서를 역동적으로 구성하는 '쟁점 주도형 동적 보고서 아키텍처'** 구축.

---

## 2. 핵심 설계 규약 (SSOT Architecture)

### 2.1 감사 렌즈(Audit Lenses)의 포괄적 권한 격상
- 2번 섹션을 `## 2. [Comprehensive Audit Lenses]`로 승격.
- 명시적 원칙 선언:
  *"아래 지침들은 반드시 포함하여 전방위로 점검해야 할 대표적 감사 렌즈(Audit Lenses)이며, 결코 여기에 국한되지 않습니다. 해당 전문 영역의 관점에서 장면의 장르와 맥락에 부합하는 모든 잠재적 위화감과 미세 결함을 포괄하여 자유롭게 감찰하십시오."*

### 2.2 쟁점 주도형 동적 보고서 구조 (Issue-Driven Dynamic Report Protocol)
- 마크다운 헤더(`#`, `##` 등) 금지 규칙은 철저히 유지.
- 대괄호 섹션(`[...]`)과 `- 블릿` 구조를 유지하되, 내부 소제목은 씬의 결함에 맞추어 유기적으로 생성:
  1. `[영역별 전반 진단: <전문영역명>]`: 해당 영역 관점에서 본 초안의 기초 상태 및 전체 맥락 요약 (1~2 블릿).
  2. `[핵심 쟁점 1: <AI가 자율 명명한 실제 결함 소제목>]`: 가장 치명적인 모순/결함에 대한 심층 해부.
  3. `[핵심 쟁점 2: <AI가 자율 명명한 실제 결함 소제목>]` (존재할 경우 N개로 유기적 전개): 추가적인 구조적/세부적 결함.
  4. `[수석 소설가를 위한 전문 보강 지침]`: Synthesizer 파싱 및 수정을 위한 필수 액션 아이템:
     - 결함 구절 인용: (반드시 <RAW_DRAFT> 내부에서 발췌한 결함 문장)
     - 결함 사유: (왜 문제가 되는가)
     - 개정 지침: (어떻게 수정해야 하는가)

### 2.3 공통 감사 스코프 프로토콜(`auditor_scope_protocol.md`) 동기화
- 4대 감사관이 공유하는 공통 메타 규약에 '쟁점 주도형 동적 보고서 생성 원칙'을 SSOT로 명시하여 출력 파편화 방지.

### 2.4 최종 종합 모델(`critique_synthesis_system.md`)과의 상호운용성 보장
- 각 감사관의 동적 쟁점 보고서가 전달되더라도, 소제목에 얽매이지 않고 `[핵심 쟁점]`들과 `[전문 보강 지침]`을 유기적으로 흡수하여 최고 완성도의 본문으로 승화시키도록 지침 보강.

---

## 3. 세부 파일별 구현 계획

### 1) `src/prompts/auditor_scope_protocol.md`
- 공통 규약에 쟁점 주도형 감사 프로토콜 명시.
- 배경과 초안 구분, 토큰 컷오프 처리 유지.

### 2) `src/prompts/critique_plot_system.md`
- 섹션 2: `[Comprehensive Plot & Narrative Lenses]`로 확장 및 포괄적 권한 부여.
- 섹션 3: 쟁점 주도형 동적 보고서 프로토콜 적용 (`[영역별 전반 진단: 서사 인과율]`, `[핵심 쟁점: ...]`, `[수석 소설가를 위한 서사 보강 지침]`).

### 3) `src/prompts/critique_physical_system.md`
- 섹션 2: `[Comprehensive Physical & Spatial Lenses]`로 확장 및 포괄적 권한 부여.
- 섹션 3: 쟁점 주도형 동적 보고서 프로토콜 적용 (`[영역별 전반 진단: 시공간 물리 정합성]`, `[핵심 쟁점: ...]`, `[수석 소설가를 위한 물리 인과 복구 지침]`).

### 4) `src/prompts/critique_lore_epistemic_system.md`
- 섹션 2: `[Comprehensive Lore & Epistemic Boundary Lenses]`로 확장 및 포괄적 권한 부여.
- 섹션 3: 쟁점 주도형 동적 보고서 프로토콜 적용 (`[영역별 전반 진단: 세계관 및 지식 경계]`, `[핵심 쟁점: ...]`, `[수석 소설가를 위한 인지 징검다리 묘사 보강 지침]`).

### 5) `src/prompts/critique_stylistic_system.md`
- 섹션 2: `[Comprehensive Korean Stylistic & Aesthetic Lenses]`로 확장 및 포괄적 권한 부여.
- 섹션 3: 쟁점 주도형 동적 보고서 프로토콜 적용 (`[영역별 전반 진단: 한국어 문체 및 미학]`, `[핵심 쟁점: ...]`, `[수석 소설가를 위한 한국어 고유 어감 윤문 지침]`).

### 6) `src/prompts/critique_synthesis_system.md`
- 동적 보고서 수용 및 쟁점 중심의 최고 수준 종합 집필 지침 정밀화.

### 7) Living Documentation 갱신
- `AGENTS.md`, `src/prompts/AGENTS.md`, `src/services/AGENTS.md`, `AUDIT_LOG.md`.
