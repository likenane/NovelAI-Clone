# AI Agent Operational Directives

## 1. Dual Planning & Task Protocols (이원화 계획 체계)
Google AI Studio의 네이티브 **Planning Mode**와 프로젝트 자체 거버넌스인 **STP(Strategic Task Protocol)**를 작업의 성격과 난이도에 따라 명확히 역할 분담하여 운용합니다.

---

### [모드 1] Native Planning Mode (경량 기능 & UI/UX 플래닝)
- **트리거**: 일반적인 신규 기능 추가, UI/UX 개선, 단일 컴포넌트 수정, 가벼운 인터랙션 개선, 또는 사용자의 일반적인 계획 요청.
- **실행 체계**: AI Studio 네이티브 `planning-mode` 워크플로우를 그대로 따릅니다.
  1. **Phase 1 (질의응답)**: 필요 시 `ask_question` 도구로 2~4개 선택지 질의 (Turn 1).
  2. **Phase 2 (계획서 작성)**: `.aistudio/artifacts/brain/.../implementation_plan.md` 아티팩트 발행 (`request_feedback: true`).
  3. **UI 승인 대기**: 플랫폼의 **Plan Approval Curtain (Proceed / Revise 버튼)**을 통해 사용자가 직접 승인.
  4. **Phase 3 (구현)**: 사용자가 UI에서 Proceed를 누르면 즉시 안정적으로 구현 및 검증 (`compile_applet`).
- **특징**: `GEMINI.md` 잠금 블록이나 불필요한 이중 승인 루프 없이, 플랫폼 UI의 신속한 의사결정을 극대화합니다.

---

### [모드 2] Deep Architectural STP (심층 아키텍처 & 안정성 보증)
코어 엔진, 데이터 정합성, 크로스-모듈 아키텍처 등 고난도/고위험 작업 시 발동하는 프로젝트 고유의 무자비한 엔지니어링 거버넌스입니다.

#### [트리거 조건]
- **자율적 트리거**: 에이전트가 판단하기에 데이터 스키마(Firestore/Sub-collection) 수정, 코어 엔진(MARS, Context Window, Token Slicer 등) 구조 변경, 비동기 레이스 컨디션 해결, 또는 3회 이상의 반복 오류 해결 실패 시 스스로 발동.
- **수동적 트리거 (User-Driven)**: 사용자가 "STP 절차를 지켜줘", "Strategic Task Protocol 시작", "딥 아키텍처 플랜 수립해줘" 등의 명시적 요청을 할 경우 즉시 발동.

#### [실행 단계]
1. **Plan & Blueprint Formulation**:
   - 아키텍처 청사진은 `PLAN_*.md` 파일(프로젝트 루트)로 생성하여 문제 원인, 해결 철학, 단계별 로직을 상세히 수립합니다.
   - 동시에 AI Studio UI 연동을 위해 `implementation_plan.md` 아티팩트에도 핵심 요약과 다이어그램을 반영합니다.
2. **Lock**:
   - `GEMINI.md` 최상단에 `## 🚨 CURRENT ACTIVE OPERATION: [Task Name] 🚨` 블록을 추가하여 작업 원칙을 고정하고, `PLAN_*.md`를 참조하도록 명시합니다.
3. **Review & Deep Self-Critique (CRITICAL - 4대 차원 무자비한 자가 비판)**:
   - **절대 즉시 구현을 시작하지 마십시오.** 계획 수립 직후 도구 호출을 멈추고 사용자에게 검토를 요청합니다.
   - 에이전트는 다음 4가지 핵심 차원에서 자신의 계획을 자가 비판(Self-Critique)하여 보고해야 합니다.
     - **① 구현 세밀도 (Feasibility & Granularity)**: 데이터 플로우, 타겟 함수명, 훅(Hook) 구조와 의존성 패턴까지 구체화되어 논리적 모순이 없는가?
     - **② 모듈화 및 파편화 방지 (Modularity & SSOT)**: 여러 유사 기능이 파편화되지 않고 `src/lib/`의 단일 진실 공급원(SSOT) 헬퍼로 통합되었는가?
     - **③ 안정성 (Stability)**: 비동기 레이스 컨디션, React 생명주기 하이드레이션, 서브 컬렉션 데이터 누락/오염 가능성을 완벽히 차단했는가?
     - **④ 확장성 (Scalability)**: 추후 데이터 스키마 확장이나 I/O 추가 시 현재 타입/파이프라인이 유연하게 수용할 수 있는가?
4. **Master Blueprint Approval**:
   - 자가 비판 및 사용자와의 방향성 조율을 거쳐 `PLAN_*.md`를 **Master Blueprint(단일 진실 공급원)**로 대규모 업데이트하고 사용자 최종 승인을 대기합니다.
5. **Execute**: 승인된 청사진에 따라 단계별 코드 구현을 진행합니다.
6. **Finalize**: 최종 아키텍처 및 변경 사항을 영향받은 **모든 디렉토리의 `AGENTS.md`** 및 `/AUDIT_LOG.md`에 빠짐없이 영구 기록합니다.
7. **Final Review**: 기능 구현 및 사이드이펙트 여부를 사용자가 검수합니다.
8. **Cleanup & Archive**:
   - `PLAN_*.md`는 절대 삭제하지 않고 영구 보존을 위해 `docs/archive/`로 이동(Archive)합니다.
   - `GEMINI.md`의 `CURRENT ACTIVE OPERATION` 블록을 제거하여 일반 모드로 복구합니다.
   - 사용자가 직접 검증할 수 있는 구체적인 **Verification Checklist(검증 체크리스트)**를 응답에 제공합니다.

## 2. Documentation-First Workflow
You are strictly required to maintain the `AGENTS.md` files (at the root and in sub-directories) as the project's "Living Documentation."

### Mandatory Execution Steps:
1. **Initialize**: At the start of every task, read `/AGENTS.md` to understand the current architectural constraints.
2. **Execute**: Perform the requested code changes following the established standards.
3. **Document**: Before ending your turn, you MUST:
   - Identify which `AGENTS.md` files are affected by your changes.
   - Update those files to reflect new features, model IDs, security rules, or architectural shifts.
   - If a new directory is created, initialize it with a local `AGENTS.md`.
4. **Finalize**: Summarize your work to the user, including a confirmation that the documentation has been updated.

## 2. Specific Maintenance Rules
- **Model IDs**: Any change to AI model selection (e.g., adding/updating Gemini or OpenRouter IDs) MUST be recorded in `/AGENTS.md` and `src/services/AGENTS.md`.
- **Firestore**: Any change to security rules or data structure MUST be recorded in `/AGENTS.md`.
- **UI/UX**: Any change to the design system or component library MUST be recorded in `src/components/AGENTS.md`.

**Failure to update documentation is considered a failed task.**
