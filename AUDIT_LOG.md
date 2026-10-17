# Audit Log

## [2026-10-16] AI Studio Default Settings Update
- **Task Name**: AI Studio Default Settings Update
- **Purpose**:
  1. **User-Requested Default Settings Update (`src/constants.ts`)**:
     - **본문 생성 (Novel Generation)**: 참조 길이 3만자 (`contextWindow: 30000`), 모델 3.8flash (`gemini-3.8-flash`), 추론 Low (`thinkingLevel: 'LOW'`), Max output 800 토큰 (`maxTokens: 800`).
     - **MARS (탈고 감사)**: 기본 Off (`automation.enableStrictConsistency: false`), 모델 3.7 flash (`gemini-3.7-flash`), 추론 High (`thinkingLevel: 'HIGH'`), Max output 16,000 토큰 (`maxTokens: 16000`).
     - **플롯 (Plot)**: 모델 3.1 pro (`gemini-3.1-pro-preview`), 추론 High (`thinkingLevel: 'HIGH'`).
     - **스토리 (Story Memory)**: 모델 3.1 pro (`gemini-3.1-pro-preview`), 추론 Low (`thinkingLevel: 'LOW'`).
     - **코덱스 (Codex)**: 모델 3.1 pro (`gemini-3.1-pro-preview`), 추론 Low (`thinkingLevel: 'LOW'`).
     - **오토 코덱스 (Auto Codex)**: 모델 3.1 pro (`gemini-3.1-pro-preview`), 추론 High (`thinkingLevel: 'HIGH'`).
- **Related Files**:
  - `src/constants.ts`
  - `AUDIT_LOG.md`
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` build success.

## [2026-10-15] Core Engine: Refiner Post-Generation Token Slicing Removal
- **Task Name**: Refiner Post-Generation Token Slicing Removal
- **Purpose**:
  1. **Refiner 결과물 사후 기계적 절단 완전 제거 (`refinerService.ts`, `useAIEngine.ts`)**:
     - Refiner가 초안(`<RAW_DRAFT>`)의 사건 지평선(Event Horizon) 내에서 완결되도록 제어된 상태에서, 사후에 적용되던 불필요한 기계적 토큰 슬라이싱(`sliceProseByTokens`)을 완전히 제거.
     - 탈고 모델이 정성껏 완성한 마지막 결말 문장, 묘사 매듭, 마침표가 기계적으로 잘려나가는 현상을 원천 방지하고 100% 온전하게 에디터에 삽입.
  2. **모드별 슬라이싱 분기 명확화 (`useAIEngine.ts`)**:
     - `enableStrictConsistency`가 활성화된 Refiner 모드에서는 사후 슬라이싱을 완전히 바이패스.
     - Refiner를 사용하지 않는 일반 단독 1단계 생성 시에는 사용자 설정 `maxTokens` 기반의 엄격 슬라이싱을 정상 유지하여 과생성 방지.
- **Related Files**:
  - `src/services/refinerService.ts`
  - `src/hooks/useAIEngine.ts`
  - `src/services/AGENTS.md`
  - `AUDIT_LOG.md`

## [2026-10-15] Core Engine: Live Prose SSOT Architecture & Refiner Undo Alignment
- **Task Name**: Live Prose SSOT Architecture & Refiner Undo Alignment
- **Purpose**:
  1. **Undo 후 리파이너 불일치 및 구 본문 누출 결함 해결**:
     - 에디터에서 Undo(`Ctrl+Z`) 또는 빠른 편집 후 소설 생성을 실행했을 때, React 상태(`currentNovel.content`)의 지연 저장(2초 디바운스)으로 인해 3단계 마스터 탈고(`refinerService.ts`)가 지워졌던 이전 생성물을 참조하여 문맥 충돌 및 앵커 찌꺼기를 남기던 결함 완전 해결.
     - `refinerService.ts` Stage 3 호출 시 `overrideContent: preGenerationContent` 누락을 수정하여 1단계(초안), 2단계(감사관), 3단계(탈고)가 동일한 에디터 라이브 텍스트를 참조하도록 일원화.
  2. **`resolveLiveStoryContent` SSOT 헬퍼 도입 (`src/lib/contextProviders.ts`)**:
     - 에디터 인스턴스(`editor.getHTML()`) 또는 콜백 게터(`getEditorContent()`)로부터 최신 인메모리 본문을 1순위로 추출하는 단일 진실 공급원 헬퍼 구현.
     - 에디터 미준비 시 Stale State 오염을 방지하기 위해 엄격한 사전 차단(`strict: true`) 및 안내 알림 연동.
  3. **6대 모든 AI 파이프라인 일괄 동기화**:
     - `useAIEngine.ts` (`handleContinue`, `handleDryRunNovel`, `handleGenerateCodex`, `handleGenerateMemory`), `useAutoCodex.ts`, `useAutoPlot.ts`, `PromptInspector.tsx` 전체에 `resolveLiveStoryContent`를 적용하여 낡은 `novel.content` 참조를 완전 차단.
  4. **Stale State Fallback Warning**:
     - `buildTotalVariableDictionary`에서 `overrideContent` 누락 시 콘솔 경고(`console.warn`)를 로깅하도록 방어선 구축.
- **Related Files**:
  - `src/lib/contextProviders.ts`: `resolveLiveStoryContent` 신설 및 `buildTotalVariableDictionary` 경고 가드.
  - `src/services/refinerService.ts`: Stage 3 `overrideContent` 누락 수정.
  - `src/hooks/useAIEngine.ts`: `handleContinue`, `handleDryRunNovel`, `handleGenerateCodex`, `handleGenerateMemory` 라이브 본문 연동.
  - `src/hooks/useAutoCodex.ts`, `src/hooks/useAutoPlot.ts`: 라이브 본문 연동 및 예외 차단.
  - `src/components/PromptInspector.tsx`: `resolveLiveStoryContent` 연동.
  - `AGENTS.md`, `src/lib/AGENTS.md`, `src/services/AGENTS.md`: 아키텍처 문서화 동기화.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.

## [2026-10-15] Core Prompt Architecture: Refiner Scope Alignment & Terminal Anchor Refinement Mode
- **Task Name**: Refiner Scope Alignment & Terminal Anchor Refinement Mode
- **Purpose**:
  1. **Refiner 과생성 및 무검증 분량 유입 방지 (Scope & Event Horizon)**:
     - Refiner가 초안(`<RAW_DRAFT>`)을 넘어 임의로 다음 분량을 생성하고 사후 토큰 클리핑에 의존하던 문제를 해결.
     - 초안의 마지막 문장을 강제로 고정하지 않고 자유롭게 개정할 수 있도록 보장하면서, 다루는 사건의 범위는 오직 `<RAW_DRAFT>`가 도달한 마지막 사건/상황의 매듭까지로 엄격히 한정(Event Horizon).
     - 상단의 `[Plot Blueprint]` 및 `[User Directive]`에 적힌 후속 전개가 있더라도 초안이 건드리지 않은 미래 영역으로 나아가는 월경(Trespassing) 행위를 엄격히 금지.
  2. **최하단 앵커 블록(`formatAnchorBlock`) 전용 모드 분리**:
     - `formatAnchorBlock(anchorText, options?: { mode?: 'continuation' | 'refinement' })` 도입.
     - 앵커 블록(`<anchor>`)이 프롬프트 최하단(Terminal Zone)에 위치하는 출력 신뢰성 구조는 100% 보존.
     - 앵커 블록 내부의 꼬리 지시문을 Stage 1(`continuation`: "다음 이야기를 이어서 집필하라")과 Stage 3(`refinement`: "오직 <RAW_DRAFT>가 다루는 사건의 범위 내에서 4대 진단 보고서를 반영하여 완전히 새롭게 빚어내고, 마지막 사건/상황의 매듭에서 완결된 문장으로 마침표를 찍고 끝마치라")으로 명확히 분리.
  3. **템플릿 정합성 강화**:
     - `src/contexts/consistency_critique_context.md`의 `<scope>` 지침을 동기화하여 초안의 마지막 문장 흉내내기/고정을 지양하고 사건 지평선 내 완결을 명시.
- **Related Files**:
  - `src/lib/contextProviders.ts`
  - `src/contexts/consistency_critique_context.md`
  - `src/lib/AGENTS.md`
  - `AUDIT_LOG.md`

## [2026-10-14] Core Engine & UI: Plot ThoughtProcess Schema Revision & Verification Hardening
- **Task Name**: Plot ThoughtProcess Schema Revision & Verification Hardening
- **Purpose**:
  1. **플롯 CoT 스키마 동기화 및 전단사(Bijective) 검증 강화 (`src/services/plotService.ts`)**:
     - `PlotCandidate`: `expectationHandling` 필드 제거 (후보 단계에서는 사전 평가 없이 방향·핵심 사건만 유지).
     - `PlotReverseReview`: `predictability` → `expectationRelation` 개정 (독자 기대 충족/지연/비틀기/뒤집기 판정), `verdict` 제거, 독자 경험 `strengths`(문자열) 및 `weaknesses`(문자열) 추가.
     - `PlotSelection`: `comparison`(문자열) 및 `decisions` 배열(`{ id, decision, reason }`) 추가.
     - `decision` 값에 대한 유효 enum 검증 ('채택' | '조합' | '기각') 및 `candidates.id` 집합과 `decisions.id` 집합 간 1:1 전수 일치(누락 및 중복 불가) 검증 구현.
  2. **PlotWorkbench UI CoT 시각화 개편 (`src/components/PlotWorkbench.tsx`)**:
     - 3단계 후보군 카드: 사전 평가 뱃지 제거 및 순수 방향 렌더링.
     - 3단계 역순 검토 카드: `expectationRelation` 뱃지 렌더링, `strengths`(에메랄드) 및 `weaknesses`(로즈) 시각화 블록 추가.
     - 4단계 선택 및 반전/신규 설정: `comparison` 상호 비교 분석 블록, `decisions` 후보별 판정 내역 카드 그리드(결정 뱃지 + 이유) 렌더링 추가.
  3. **문서화 동기화**: `src/services/AGENTS.md`, `src/components/AGENTS.md`, `src/prompts/AGENTS.md` 스펙 최신화.
- **Related Files**:
  - `src/services/plotService.ts`
  - `src/components/PlotWorkbench.tsx`
  - `src/services/AGENTS.md`
  - `src/components/AGENTS.md`
  - `src/prompts/AGENTS.md`
  - `AUDIT_LOG.md`

## [2026-10-14] Security & Data Integrity: Strict Multi-User Data Isolation
- **Task Name**: Strict Multi-User Data Isolation
- **Purpose**:
  1. **철저한 사용자별 데이터 격리 (Strict User Data Isolation)**:
     - 사용자 간 소설 데이터가 섞이거나 타인의 소설이 조회/수정되는 문제를 해결하기 위해, `firestore.rules`에서 `novels` 및 하위 서브컬렉션(`contents`, `loreEntries`, `memoryCards`)에 대한 읽기, 목록 조회, 생성, 수정, 삭제 권한을 소유자(`authorUid == request.auth.uid` 또는 `isAdmin()`)에게만 엄격히 허용하도록 보안 규칙을 강화.
  2. **쿼리 레벨 보안 강화 (`useNovels.ts`)**:
     - `useNovels` 훅의 실시간 구독 쿼리에 `where('authorUid', '==', user.uid)` 필터를 적용하여, 클라이언트단에서도 현재 로그인한 사용자의 소설만 조회되도록 보장.
  3. **배포 및 검증**:
     - `deploy_firebase`를 통해 업데이트된 보안 규칙을 프로덕션 환경에 정상 배포하였으며, `tsc` 및 빌드 검증 완료.
- **Related Files**:
  - `firestore.rules`
  - `src/hooks/useNovels.ts`

## [2026-10-14] Core Architecture: Shared Collaborative Workspace & Resilient Novel Duplication
- **Task Name**: Shared Collaborative Workspace & Resilient Novel Duplication
- **Purpose**:
  1. **공유 협업 워크스페이스 전환 (Shared Workspace)**:
     - Firestore 보안 규칙(`firestore.rules`)을 개정하여 인증된 모든 사용자가 공유 프로젝트 내의 소설 목록, 본문, 코덱, 메모리 카드를 자유롭게 열람, 수정, 생성, 삭제할 수 있도록 허용 (`allow read, list, write: if isAuthenticated();`).
     - `useNovels.ts`의 쿼리 필터에서 `where('authorUid', '==', user.uid)` 제약을 제거하여, 공유 링크로 접속한 모든 사용자가 워크스페이스의 전체 소설 목록을 실시간으로 공유하고 함께 협업할 수 있도록 개선.
  2. **소설 복제 및 삭제 파이프라인 방어력 강화 (`exportCompleteNovelData`, `deleteNovel`)**:
     - 서브컬렉션(`contents`, `loreEntries`, `memoryCards`) 병렬 읽기 및 삭제 시 발생할 수 있는 문서 누락, 쿼리 거부, 권한 에러를 개별 `catch` 핸들러와 폴백으로 완벽히 방어하여 접근 거부(Access Denied) 알림 원천 차단.
  3. **메모리 카드 및 코덱스 서브컬렉션 구독 안정화 (`useNovelContent.ts`)**:
     - 서버 측 `orderBy` 쿼리 제약으로 인해 비어 있거나 존재하지 않는 초기 서브컬렉션 접근 시 발생하던 `Missing or insufficient permissions` 에러를 방지하기 위해 클라이언트 사이드 정렬(`sort`) 방식으로 전환.
     - `onSnapshot` 에러 핸들러를 고도화하여 초기 비어 있는 서브컬렉션 경로에서 발생하는 불필요한 콘솔 에러를 조용히 억제하고 빈 배열(`[]`)로 안전하게 폴백.
- **Related Files**:
  - `firestore.rules`
  - `src/hooks/useNovels.ts`
  - `src/hooks/useNovelContent.ts`

## [2026-10-13] Core Engine & Architecture: 2-Tier Hierarchical Story Memory & Deterministic Archive Pipeline
- **Task Name**: 2-Tier Hierarchical Story Memory & Deterministic Archive Pipeline
- **Purpose**:
  1. **무손실 2-Tier 계층형 스토리 메모리 시스템 구축**:
     - 기존 4,000자 단일 버퍼 재작성으로 인한 사실 소실(Fact Truncation) 및 요약의 요약 변질(Degradation)을 원천 차단.
     - 항상 주입되는 핵심 기억(최대 4,000자 상한, 5대 필수 헤더)과 필요할 때만 결정론적으로 검색되어 주입되는 무제한 보관소 카드(Archive Cards) 서고로 분리.
     - 5대 고정 헤더: `[1. 이야기의 뿌리]`, `[2. 지난 경과]`(`◇ 전체 흐름`, `◇ 막 요약`, `◇ 진행 중인 막`), `[3. 미해결 단서]`, `[4. 인물 상태와 관계]`, `[5. 직전 장면 이음새]`.
  2. **결정론적 이름 매칭 & 보관소 검색 SSOT (`src/lib/memoryArchiveUtils.ts`)**:
     - 외부 벡터 DB/임베딩 없이 설정집(Codex) 표제어 및 별칭 기반으로 텍스트에서 등장 엔티티를 정규식(한국어 조사 분리 및 1글자 경계 방어)으로 추출.
     - 태그 일치 수 DESC ➔ 생성순 DESC ➔ 상한 N장 슬라이스 ➔ 시간순(order ASC) 정렬 주입. 정정 카드 발생 시 원본 카드 동반 주입 보장.
  3. **3대 AI 파이프라인 컨텍스트 주입 통합 (`src/lib/contextProviders.ts`)**:
     - 메모리 갱신 시: 명세서 표준 한국어 라벨(`## 설정집`, `## 플롯 청사진`, `## 기존 핵심 기억`, `## 관련 보관소 카드`, `## 직전 본문`, `## 작가 지시`) 100% 준수.
     - 소설 이어쓰기 시: 본문 말미 400자 + 플롯에서 추출된 카드를 `[Story Memory]` 하단에 `## [관련 보관소 과거 사실 (참고용)]`으로 주입.
     - MARS 검수 시: 초안 기반 관련 보관소 카드를 사실 기준표로 주입.
  4. **Firestore 서브컬렉션 및 원자적 커밋 (`firestore.rules`, `useNovelContent.ts`, `useNovels.ts`, `novelIO.ts`)**:
     - `/novels/{novelId}/memoryCards/{cardId}` 서브컬렉션 보안 규칙 추가 및 1MB 제한 방어.
     - AI 생성 완료 시 즉시 커밋하지 않고 `memoryProposal`에 임시 보관, 워크벤치에서 [적용] 시 단일 Batch Write로 원자적 일괄 저장 (쓰레기 카드 누적 방지).
     - Envelope V2 백업 및 복원에 `data.memoryCards` 무손실 동기화 탑재.
  5. **MemoryWorkbench UI 고도화 (`src/components/MemoryWorkbench.tsx`)**:
     - `[핵심 기억]` vs `[보관소 서고]` 2대 모드 탭 지원.
     - 핵심 기억: 4,000자 예산 실시간 추적 및 초과 시 소프트 경고 배지 표기. AI 제안 뷰에서 새로 발행될 보관소 카드 프리뷰 덱 제공.
     - 보관소 서고: 키워드/태그 검색, 유형별(`사건`, `막요약`, `정정`) 필터링, 수동 카드 추가/수정/삭제.
- **Related Files**:
  - `src/types.ts`
  - `firestore.rules`
  - `src/prompts/memory_system.md`
  - `src/lib/memoryArchiveUtils.ts`
  - `src/services/memoryService.ts`
  - `src/services/refinerService.ts`
  - `src/lib/contextProviders.ts`
  - `src/hooks/useNovelContent.ts`
  - `src/hooks/useNovels.ts`
  - `src/hooks/useAIEngine.ts`
  - `src/lib/novelIO.ts`
  - `src/components/MemoryWorkbench.tsx`
  - `src/App.tsx`
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.

## [2026-10-13] Prompt Architecture & Engine: Auto-Codex Pruning Schema & Rules Modularization into Dedicated Markdown Prompts
- **Task Name**: Auto-Codex Pruning Schema & Rules Modularization into Dedicated Markdown Prompts
- **Purpose**:
  1. **인라인 하드코딩된 프롬프트 지침의 완전한 마크다운 파일화**:
     - 기존 `src/lib/contextProviders.ts` 내에 TypeScript 문자열로 하드코딩되어 있던 프루닝 스키마와 규칙을 독립 마크다운 파일(`src/prompts/autocodex_pruning_schema.md`, `src/prompts/autocodex_pruning_rules.md`)로 추출.
     - 코더/작가가 프롬프트 디렉터리만 열람해도 프루닝 규칙과 JSON 스키마를 100% 투명하게 파악할 수 있도록 복원.
  2. **`contextProviders.ts`의 순수 파이프라인 정류화**:
     - 프롬프트 텍스트 소유를 배제하고, 마크다운 파일을 Vite `?raw`로 import하여 `enablePruning` 플래그에 따라 주입하는 조건부 배관 역할로 정돈.
  3. **문서 동기화**:
     - `src/prompts/AGENTS.md`에 모듈형 프루닝 프롬프트 명세 추가.
- **Related Files**:
  - `src/prompts/autocodex_pruning_schema.md`
  - `src/prompts/autocodex_pruning_rules.md`
  - `src/lib/contextProviders.ts`
  - `src/prompts/AGENTS.md`
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.

## [2026-10-13] Prompt Architecture & Engine: Codex & Auto-Codex Context Architecture Modernization & XML Blueprint Structural Decoupling
- **Task Name**: Codex & Auto-Codex Context Architecture Modernization & XML Blueprint Structural Decoupling
- **Purpose**:
  1. **컨텍스트 템플릿의 명시적 XML 청사진화 (`src/contexts/*.md`)**:
     - `codex-generation.md`: 단순 1줄 `{{SYSTEM_PROMPT_CODEX}}` 래퍼에서 탈피하여 `<role>`, `<inputs>`, `<schema>`, `<core_directives>`, `<formatting_rules>`, `<output_rules>` 명시적 XML 구조체로 격상.
     - `autocodex-generation.md`: `<role>`, `<inputs>`, `<schema>`, `<core_directives>`, `<formatting_rules>`, `<output_rules>` 명시적 XML 구조체로 격상하여 5-step Evaluative CoT JSON 스키마 및 프루닝/서브룰 슬롯을 한눈에 조망 가능하도록 개편.
  2. **프롬프트 본문 파일의 관심사 분리 및 경량화 (`src/prompts/*.md`)**:
     - `codex_system.md`: 외곽 JSON 스키마와 3계층 서브룰 바인딩을 템플릿에 위임하고, 순수 집필 철학(작가 지휘권, 무손실 질감 계승, 인물 고관성, 안티-타임라인 상태 증류 등)과 적응형 추론 가이드에 100% 집중하도록 정돈.
     - `auto-codex-system.md`: 거대 스키마를 템플릿에 위임하고, 순수 연역적 CoT 판정 규칙(Evaluative CoT & Decision Rules)에 온전히 집중하도록 정돈.
  3. **단일 진실 공급원 변수 사전 확장 (`src/lib/contextProviders.ts`)**:
     - `buildTotalVariableDictionary`: `PRUNING_SCHEMA`, `PRUNING_RULES`를 정규 반환 사전에 명시적으로 포함하여 템플릿 주입 안정성 확보.
  4. **엔지니어링 문서 동기화**:
     - `src/contexts/AGENTS.md`, `src/prompts/AGENTS.md` 갱신.
- **Related Files**:
  - `src/contexts/codex-generation.md`
  - `src/contexts/autocodex-generation.md`
  - `src/prompts/codex_system.md`
  - `src/prompts/auto-codex-system.md`
  - `src/lib/contextProviders.ts`
  - `src/contexts/AGENTS.md`
  - `src/prompts/AGENTS.md`
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.


- **Task Name**: Plot System Prompt Overhaul, Deterministic Author Notes & 5-Tier Reader-Driven CoT Workbench Architecture
- **Purpose**:
  1. **플롯 시스템 프롬프트(`src/prompts/plot_system.md`) 전면 개편**:
     - 역할 정립: 본문 작성 모델이 그대로 따라 쓰는 확정적 구상 노트로 정의하고 모호성을 배제.
     - 설정집 읽기 원칙 신설: 설정의 명시적 범위 준수, 조건 미충족 시 배제, 새 설정은 4번 구역 `[신규 설정]`으로 투명하게 표기.
     - 독자 기대 기반 5단계 재미 설계 도입: 독자의 실시간 궁금증/보상 기대 분석 -> 갈등 재료 추출 -> 다방향 후보군(C1~Cn) 도출 -> 역순(Reverse) 다차원 검토 -> 비틀기/뒤집기 채택.
     - 6~8개 시퀀스 체제 확장: 앞선 3~4개 시퀀스는 4대 항목 완비, 후속 시퀀스는 훅 중심 간결화.
     - 4번 구역 신규 설정 지원: `[신규 설정 | 이름]` 태그 공식 지원.
  2. **파서 및 유효성 검증 엔진 업그레이드 (`src/services/plotService.ts`)**:
     - 신규 CoT 스키마 타입 정의: `PlotDiagnosis`, `PlotReaderAnalysis`, `PlotCandidate`, `PlotReverseReview`, `PlotSelection`, `PlotVerification`, `PlotSection4Plan`.
     - 듀얼 스키마 파서 및 하위 호환성 정규화: 신규 5-Tier CoT를 기본 지원하면서 기존 3-Tier 및 레거시 8-Step CoT도 누락 없이 인식.
     - 시퀀스 추출기 신설 (`extractSequencesFromPlotText`): 플롯 텍스트에서 6~8개 시퀀스를 자동 추출하여 구조화된 시퀀스 목록 보존.
     - 완결성 검증 강화 (`validatePlotCompleteness`): 6~8개 시퀀스 체제에 맞춰 최소 4개 이상 시퀀스 완결 여부를 엄격히 검증.
  3. **컨텍스트 공급 엔진 일원화 (`src/lib/contextProviders.ts`)**:
     - `buildTaskMessages`의 `plot` 태스크에서 이전 플롯이 상단 `topContextPrefix`에 중복 삽입되던 버블을 제거하고 프롬프트 명세 순서(`[The Codex]` -> `[Story Memory]` -> `[Current Story Text]` -> `[Current Plot Blueprint (Reference)]` -> `[User Directive]` -> `[Output Protocol]`)와 100% 일치시킴.
  4. **PlotWorkbench 전용 5-Tier CoT 시각화 UI 구축 (`src/components/PlotWorkbench.tsx`)**:
     - `사고 분석 (CoT)` 탭에 1) 상황 및 불일치 진단, 2) 독자 재미 분석 & 코덱스 갈등 재료, 3) 전개 후보군 다방향 도출 & 역순 검토, 4) 최종 선택 및 반전/신규 설정, 5) 사전 품질 검증 & 시퀀스 계획 카드를 미려하게 렌더링.
- **Related Files**:
  - `src/prompts/plot_system.md`: 프롬프트 본체 전면 갱신.
  - `src/services/plotService.ts`: CoT 타입 확장, 듀얼 파서 정규화, 정규식 시퀀스 추출기, 시퀀스 4개 이상 완결성 검증.
  - `src/lib/contextProviders.ts`: `buildTaskMessages`의 `plot` 입력 순서 및 중복 제거.
  - `src/components/PlotWorkbench.tsx`: 5-Tier Reader-Driven CoT 전용 시각화 UI 추가.
  - `src/prompts/AGENTS.md`, `src/services/AGENTS.md`, `src/components/AGENTS.md`: Living Documentation 동기화.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.


- **Task Name**: Prompt Inspector Refiner Output 3-Way Comparison Console & Word-Level Diff Engine
- **Purpose**:
  1. **초안(Stage 1)과 최종 탈고본(Stage 3) 비교의 극심한 피로도 해소**:
     - 기존에는 초안을 확인하기 위해 `Novel Stage 1` 탭으로 전환했다가 다시 `Refiner (MARS)` 탭으로 돌아와야 했고, 수천 자 장문에서 무엇이 수정되었는지 일일이 대조하기 어려웠던 문제 근본적 해결.
  2. **경량 단어 단위(LCS) Diff 엔진 신설 (`src/lib/diffUtils.ts`)**:
     - 한국어 형태소/단어 경계 및 구두점 보존 토크나이저와 LCS 기반 단어 단위 Diff 알고리즘을 외부 무거운 의존성 없이 순수 구현.
     - 추가/삭제/유지 토큰 분리 및 변경 통계(추가 단어 수, 교정 단어 수, 유사도 비율) 자동 산출.
  3. **3-Way 비교 전용 뷰어 컴포넌트 (`src/components/RefinerDiffViewer.tsx`)**:
     - `변경점 추적 (Diff)`: 초안에서 교정/삭제된 구절(취소선/붉은색)과 탈고본에서 추가/수정된 구절(에메랄드색)을 인라인 하이라이트.
     - `나란히 비교 (Split)`: 좌측 1단계 원시 초안과 우측 3단계 최종 탈고본을 2열 그리드로 나란히 배치하고 동기화 스크롤 지원.
     - `단독 탭 (Stage 1 / Stage 3)`: 전체 너비 원문 뷰 및 원클릭 클립보드 복사 제공.
  4. **파이프라인 및 상태 보존 (`src/services/refinerService.ts`, `src/hooks/useAIEngine.ts`, `src/components/PromptInspector.tsx`)**:
     - `ConsistencyPipelineResult`에 `rawDraft`를 보존하여 Stage 3 탈고 후에도 Inspector 상태에 초안 데이터가 안전하게 전달되도록 연계.
- **Related Files**:
  - `src/lib/diffUtils.ts`: 신설 (단어 단위 LCS Diff 엔진 SSOT).
  - `src/components/RefinerDiffViewer.tsx`: 신설 (3-Way 비교 콘솔).
  - `src/services/refinerService.ts`: `ConsistencyPipelineResult` 및 반환 객체에 `rawDraft` 포함.
  - `src/hooks/useAIEngine.ts`: `setLastConsistencyPromptInfo`에 `rawDraft` 전달.
  - `src/components/PromptInspector.tsx`: Stage 3 Master Novelist Output 영역에 `RefinerDiffViewer` 탑재.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.


## [2026-10-12] Governance & Architecture: AI Studio 네이티브 Plan 도입에 따른 Dual Planning & STP 이원화 체계 정립
- **Task Name**: Dual Planning & Strategic Task Protocol Delineation
- **Purpose**:
  1. **플랫폼 네이티브 Plan 도입에 따른 중복 및 마찰 해소**:
     - Google AI Studio의 공식 `planning-mode` (질의응답, `implementation_plan.md` 아티팩트 발행, UI Plan Approval Curtain) 도입으로 기존 수동 STP 거버넌스 간에 발생하던 승인 루프 이중화(Double Friction) 및 아티팩트 충돌 문제 해결.
  2. **이원화 계획 체계 (Dual Planning Protocol) 수립**:
     - **[모드 1] Native Planning Mode (경량 기능 & UI/UX 플래닝)**: 일반 기능 추가, UI 수정, 단일 컴포넌트 개선 시 AI Studio 네이티브 Plan 모드를 그대로 활용하여 불필요한 Lock 없이 신속 승인 및 구현 진행.
     - **[모드 2] Deep Architectural STP (심층 아키텍처 & 안정성 보증)**: 코어 엔진/데이터 스키마 수정/고난도 비동기 레이스 등 고위험 작업 시 발동. `PLAN_*.md` 기반 4대 핵심 차원(구현 세밀도, SSOT 모듈화, 안정성, 확장성)의 무자비한 자가 비판(Deep Self-Critique)과 `CURRENT ACTIVE OPERATION` 락을 거쳐 안정성 절대 보증.
- **Related Files**:
  - `GEMINI.md`: 1번 섹션 'Dual Planning & Task Protocols'로 전면 개정.
  - `AGENTS.md`: AI Agent Protocol 섹션 및 Last Updated 동기화.
- **Verification**: 문서 정합성 및 규정 일치 확인.

## [2026-10-12] Prompt Architecture & Engine: Refiner (MARS Stage 3) 프롬프트 서사 인과 순서 일원화 및 본문 전진 배치
- **Task Name**: Refiner Prompt Narrative Order Harmonization & Prose Forward-Positioning
- **Purpose**:
  1. **서사적 인과 순서 일원화 (확정된 방안 A)**:
     - `src/lib/contextProviders.ts`의 `formatMasterSynthesisPrompt`에서 소설 본문을 상단 선행 본문(`STORY_CONTEXT_NOVEL`)과 최하단 말단 조각(`ANCHOR_TAIL_TEXT`, 150자)으로 양분하던 구조 폐지.
     - `contextWindow` 상한이 보장된 온전한 단일 본문(`variables.STORY_CONTEXT`)을 `<RAW_DRAFT>` 바로 앞에 `## [Current Story Text]`로 전진 배치.
     - 서사 인과 순서(`[설정/배경]` -> `## [Current Story Text]` -> `## [User Directive]` -> `<RAW_DRAFT>` -> `## [Specialist Diagnostic Reports]` -> `## [Final Directing]` -> `### [Immediate Stitching Anchor]`)를 정립하여 모델의 인과 인지 왜곡 해결.
  2. **Stage 2 감사관 프롬프트와의 100% SSOT 동기화**:
     - Stage 2 감사관들이 사용하는 `buildStandardNarrativeContext`의 서사 배치 순서와 Stage 3 탈고 프롬프트의 맥락 순서가 완벽히 동일한 패턴으로 통일.
  3. **최하단 앵커 스티칭 무결성 유지**:
     - 최하단 Recency Zone에는 중복 본문 조각을 배제하고 `## [Final Directing]` 및 `formatAnchorBlock`의 `<anchor>` 태그만을 직결 배치하여 100% Verbatim Overlap 스티칭 안정성 유지.
- **Related Files**:
  - `src/lib/contextProviders.ts`: `formatMasterSynthesisPrompt` 리팩토링.
  - `src/lib/AGENTS.md`, `src/services/AGENTS.md`, `AGENTS.md`: Living Documentation 동기화.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.

## [2026-10-12] Prompt Architecture & Engine: 플롯 시스템 프롬프트 전면 개정 및 3단계 CoT·파서·2탭 워크벤치 UI 동기화
- **Task Name**: Plot System Prompt Overhaul & 3-Tier CoT Parser and Workbench UI Synchronization
- **Purpose**:
  1. **플롯 시스템 프롬프트(`src/prompts/plot_system.md`) 전면 개정**:
     - 역할 및 목적을 '다음 집필에 쓸 플롯을 설계하는 웹소설·라이트노벨의 플롯 설계자 구상 노트'로 정립.
     - 입력 우선순위(지시문, 기존 본문, 기존 플롯, 서사 요약, 설정집) 및 지시문-본문 충돌 시 우회 규칙 명시.
     - 대사 문장 생성 금지(대화 목적, 태도, 감정, 몸짓으로 대체), 시퀀스당 5,000자 분량 사건 밀도 및 4번 구역 논리의 사건적 구현 원칙 확립.
     - 4개 구역 구조([1. 서술 방향 및 연출 디렉팅], [2. 장기 대서사 플롯], [3. 현재 진행 중인 사건 플롯], [4. 장기 복선 및 고정 논리 프레임워크]) 정립.
     - 출력 규약을 3단계 CoT(`contextAnalysis`, `updatePlan`: `section1`/`section2`/`section4`/`prunedItems`, `preWriteCheck`: `consistency`/`character`/`logic`/`densityAndPayoff`) 및 `finalPlotText` 단일 JSON 구조로 간소화 개편.
  2. **파서 및 인터페이스 정비 (`src/services/plotService.ts`)**:
     - `PlotUpdatePlan`, `PlotPreWriteCheck` 인터페이스 신설 및 `PlotThoughtProcess`에 `contextAnalysis`, `updatePlan`, `preWriteCheck` 필드 반영.
     - `parseAndValidatePlotResponse` 파서에서 `thoughtProcess.contextAnalysis` 직접 파싱 및 `plotBlueprint` 루트 키 부재 시에도 안정적 폴백/완결성 검증 지원.
     - `validatePlotCompleteness`에서 텍스트 기반 시퀀스 완결성 및 최소 800자 검증 로직 견고화.
  3. **워크벤치 UI 2탭 개편 및 CoT 카드 동기화 (`src/components/PlotWorkbench.tsx`)**:
     - 우측 탭을 `[제안된 플롯]`과 `[사고 분석 (CoT)]` 2탭 구조로 확립.
     - CoT 탭 내 3단계 카드(1단계: 상황 및 입력 분석, 2단계: 플롯 구역별 갱신 계획, 3단계: 집필 전 4대 핵심 품질 사전 점검)를 새 스키마에 맞춰 최적화 렌더링하도록 개편.
- **Related Files**:
  - `src/prompts/plot_system.md`: 플롯 시스템 프롬프트 전면 교체.
  - `src/services/plotService.ts`: 3단계 CoT 타입 정의 및 파서/완결성 검증 업데이트.
  - `src/components/PlotWorkbench.tsx`: 2탭 구조 및 3단계 CoT 카드 렌더링 동기화.
  - `src/prompts/AGENTS.md`, `src/services/AGENTS.md`, `src/components/AGENTS.md`, `AGENTS.md`: Living Documentation 동기화.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.

## [2026-10-12] Prompt Architecture: 컨텍스트 직접 주입 지시문 단호한 명령형 한국어 개편 및 스키마 디커플링
- **Task Name**: Context Direct Injected Directives Korean Localization & Schema Decoupling
- **Purpose**:
  1. **컨텍스트 직접 주입 지시문 한국어화**:
     - `src/lib/contextProviders.ts`의 `formatAnchorBlock` 앵커 스티칭 지침을 단호하고 간결한 명령형 지침체(~하라, ~할 것)의 자연스러운 한국어로 개편. (`[...]` 대괄호 헤더 및 `<anchor>` XML 태그 식별자는 100% 보존).
     - 오토 코덱스 비활성화 규칙(`prune`), 작품 문체 지침 프리앰블, 미입력 폴백 기본값(`"Untitled Story"` -> `"제목 없는 소설"`, `"(Empty)"` -> `"(내용 없음)"`, `"(None)"` -> `"(지시사항 없음)"` 등)을 한국어로 전면 개편.
  2. **태스크별 JSON 출력 규약 스키마 디커플링**:
     - `memory`, `plot`, `autocodex`의 하단 지시문(`tailDirective`, `Output Protocol`)에서 개별 스키마 필드명(`step1_...`)을 중복 나열하던 결합도를 제거하고, 시스템 지침의 스키마를 단일 진실 공급원(SSOT)으로 참조하도록 정류하여 유지보수성 극대화.
     - `codex` 어시스턴트 타겟 블록 레이블(`항목명`) 및 지시문(`[User Directive], [Current Story Text], [Target Lore Entry to Update/Create]을 바탕으로...`) 표준화.
  3. **드라이런 및 프롬프트 검사기 플레이스홀더 국문화**:
     - `src/services/promptService.ts` 내 Stage 1 `rawDraft` 자리표시자를 자연스러운 한국어로 정비.
- **Related Files**:
  - `src/lib/contextProviders.ts`: 앵커 지시문, 스키마 출력 규약, 사전 기본값 한국어화 및 디커플링.
  - `src/services/promptService.ts`: Stage 1 초안 자리표시자 한국어화.
  - `src/lib/AGENTS.md`: 컨텍스트 지시문 국문화 규약 및 스키마 디커플링 원칙 반영.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.

## [2026-10-10] AI Engine & Prompt: 리파이너 4대 감사관 탄력적 쟁점 확장 및 무결점 바이패스 프로토콜 (Elastic Issues & Zero-Defect Bypass)
- **Task Name**: Refiner 4-Auditor Elastic Issues & Zero-Defect Bypass Protocol
- **Purpose**:
  1. **고정 2개 쟁점 및 1~2개 불릿 제약 완전 철폐**:
     - 기존 감사관 프롬프트 3번 섹션(`Report Protocol`)에 하드코딩되어 있던 `[핵심 쟁점 1]`, `[핵심 쟁점 2]` 예시 닻내림을 제거하고, 초안에서 실제로 포착된 환부 수에 따라 `[핵심 쟁점 1...N]`으로 자율 확장되는 탄력적 스케일링 프로토콜 도입.
     - 단순 1줄 요약 강제를 해제하여 원인 분석과 구체적 환부 표현, 교정 힌트를 필요한 만큼 깊이 있게 전개하도록 개방.
  2. **무결점 즉시 패스(Zero-Defect Bypass) 규약 확립**:
     - 초안에 실질적인 서사/물리/로어/문체적 결함이 없을 때 억지로 사소한 꼬투리를 잡거나 결함을 지어내는 행위를 금지하고, `[핵심 쟁점: 특이사항 없음 (현 서사 완성도 양호)]`로 간결하게 패스하는 공식 프로토콜 신설.
  3. **공통 스코프 프로토콜 SSOT 및 Stage 3 수석 문학 복원가 연동**:
     - `src/prompts/auditor_scope_protocol.md`의 3항을 자연스러운 한국어로 정비하여 4대 감사관 공통 헌법으로 선언.
     - `src/prompts/critique_synthesis_system.md`에서 `[특이사항 없음]` 보고 시 해당 영역의 고유 텍스처를 온전히 보존하고, `[핵심 쟁점 1...N]`이 보고된 결함 영역에 종합 탈고 역량을 집중하도록 가이드 보강.
- **Related Files**:
  - `src/prompts/auditor_scope_protocol.md`: 탄력적 쟁점 주도 진단 및 무결점 패스 원칙 SSOT 갱신.
  - `src/prompts/critique_plot_system.md`: 플롯 감사관 Section 3 가변 1~N개 확장 및 무결점 패스 템플릿 개편.
  - `src/prompts/critique_physical_system.md`: 물리 감사관 Section 3 가변 1~N개 확장 및 무결점 패스 템플릿 개편.
  - `src/prompts/critique_lore_epistemic_system.md`: 로어 감사관 Section 3 가변 1~N개 확장 및 무결점 패스 템플릿 개편.
  - `src/prompts/critique_stylistic_system.md`: 문체 감사관 Section 3 가변 1~N개 확장 및 무결점 패스 템플릿 개편.
  - `src/prompts/critique_synthesis_system.md`: Stage 3 Master Novelist 무결점 보존 및 다중 쟁점 수용 지침 보강.
  - `AGENTS.md`, `src/prompts/AGENTS.md`, `src/services/AGENTS.md`: Living Documentation 갱신.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.

## [2026-10-10] UX Refinement: 집필 에디터 미니멀 UI 정류 및 제안 알림 배지 최상위 레이어(z-20) 승격
- **Task Name**: Streamline Editor Floating Bar & Promote Proposal Badges Layer
- **Purpose**:
  1. **집필 에디터 시야 확보 및 미니멀화**:
     - 에디터 화면에 항시 노출되던 글자수 텍스트 Pill 및 팝오버를 완전히 제거하여 날렵하고 방해 없는 집필 환경 조성.
     - 원형 아이콘 윤곽선을 채우는 SVG 원형 프로그레스 링(게이지 그래프)만 깔끔하게 유지하여 진행률 직관성 확보. (상세 글자수는 코덱스/플롯 작업창 내부에서 확인)
  2. **제안 알림 배지(파란 점/보라 점) 가림 현상 해결**:
     - 기존 `top-0 right-0` 좌표 위치는 그대로 유지하면서, 배지를 `<button>` 내부 깊숙한 곳에서 SVG 그래프보다 상위인 최상단 레이어(`z-20 pointer-events-none`)로 승격.
     - 원형 프로그레스 링 스트로크에 알림 점이 파묻히거나 가려지는 현상 완벽 방지.
- **Related Files**:
  - `src/components/EditorContainer.tsx`: 상시 Pill UI 제거, 제안 배지 최상위 레이어(`z-20`) 승격, 미사용 import/state 정리.
  - `src/components/AGENTS.md`: 에디터 플로팅 바 UI 스펙 갱신.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.

## [2026-10-10] Bugfix: PlotWorkbench 컴포넌트 내 useAutoCounters 훅 호출 순서(Rules of Hooks) 정류
- **Task Name**: PlotWorkbench Hook Order Fix
- **Purpose**:
  - `PlotWorkbench.tsx` 내에서 `useAutoCounters` 훅이 조건부 조기 반환문(`if (!currentNovel) return null;`)보다 뒤쪽에 위치하여, `currentNovel`의 유무에 따라 렌더링 간 훅 호출 횟수 및 순서가 달라지던 `Rendered more hooks than during the previous render` 에러 해결.
  - `useAutoCounters` 훅 호출을 컴포넌트 최상단(`useState` 블록 직후)으로 이동시켜 무조건적(Unconditional) 훅 호출 규칙을 100% 준수하도록 수정.
- **Related Files**:
  - `src/components/PlotWorkbench.tsx`: `useAutoCounters` 훅 호출 위치 최상단으로 이동.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.

## [2026-10-10] UX & Accessibility: 실시간 누적 카운터 관측성 고도화 및 Story Memory Workbench 모바일 전면 반응형 재설계
- **Task Name**: Auto-Counter Real-time Observability & Mobile Story Memory Workbench Responsive Overhaul
- **Purpose**:
  1. **사용자 실시간 누적 글자수 관측성 체계 (Auto-Codex & Auto-Plot)**:
     - 집필 에디터(`EditorContainer.tsx`) 플로팅 액션 바에 전용 실시간 관측 알약(Pill) 위젯 및 SVG 원형 프로그레스 링을 도입하여 현재 누적 글자수, 목표 주기, 달성률(%)을 시각화.
     - 클릭 시 팝오버 카드로 상세 잔여 글자수 확인 및 즉시 0자 초기화 지원.
     - `DirectiveScanPopover`에도 실시간 누적 글자수/진행률/카운터 리셋 카드 통합.
     - `counterStorage.ts`의 `AUTO_COUNTER_EVENT`와 커스텀 훅 `useAutoCounters.ts`를 신설하여 Firestore I/O 없이 Zero-Lag 실시간 반응형 동기화 달성.
     - `useAutoCodex` 및 `useAutoPlot`에 리셋 이벤트 동기화 리스너 추가하여 수동 초기화 시 내부 ref와 즉시 동기화.
  2. **모바일 Story Memory Workbench 전면 반응형 UI 개선**:
     - 기존 단일 수직 배치로 인해 모바일에서 스크롤이 불가능하거나 AI 제안 영역이 하단 뷰포트 밖으로 잘리던 문제 완전 해결.
     - 모바일 전용 3-탭 반응형 아키텍처 도입: `[현재 메모리]` / `[AI 제안]` / `[지침 & 생성]`.
     - 뷰포트 맞춤형 높이(`h-[100dvh]`) 및 하단 영구 고정 제어 바(Permanently Anchored Sticky Footer)로 모바일에서도 `제안 비우기 (Discard)` 및 `메모리에 적용 (Replace)`이 항상 스크롤 없이 즉시 도달 가능.
     - 요약 생성 버튼 클릭 시 AI 제안 탭으로 자동 전환 및 생성 로딩 상태 명확화.
     - 컴팩트 액티브 메모리 엔진 카드 적용으로 불필요한 상단 여백 축소.
- **Related Files**:
  - `src/lib/counterStorage.ts`: `AUTO_COUNTER_EVENT` 이벤트 정의 및 디스패치.
  - `src/hooks/useAutoCounters.ts`: Zero-Lag 실시간 카운터 구독 및 리셋 React Hook 신설.
  - `src/hooks/useAutoCodex.ts`: `AUTO_COUNTER_EVENT` 동기화 리스너 추가.
  - `src/hooks/useAutoPlot.ts`: `AUTO_COUNTER_EVENT` 동기화 리스너 추가.
  - `src/components/EditorContainer.tsx`: 플로팅 관측 알약, 팝오버 카드, Codex/Plot 버튼 SVG 원형 진행률 링 탑재.
  - `src/components/DirectiveScanPopover.tsx`: 실시간 누적 카운터 프로그레스 카드 및 0자 리셋 버튼 추가.
  - `src/components/MemoryWorkbench.tsx`: 모바일 3-탭 반응형 시스템, `h-[100dvh]` 뷰포트 적응, 상시 도달 가능한 고정 푸터.
  - `src/App.tsx`: `memoryMobileTab`에 `'instruction'` 탭 타입 추가.
  - `AGENTS.md`, `src/components/AGENTS.md`: Living documentation 동기화.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.

## [2026-10-09] Architecture & Quality: Refiner 전면 종합 탈고 패러다임 전환 및 소설 본문 생성 앵커(Anchor) 기계적 메커니즘 일원화
- **Task Name**: Refiner Holistic Restoration & Anchor Mechanism Unification
- **Purpose**:
  1. **Stage 2 감사관 미세 대필(Micro-Copywriting) 및 구절 인용 완전 제거**:
     - `critique_plot_system.md`, `critique_physical_system.md`, `critique_lore_epistemic_system.md`, `critique_stylistic_system.md`의 `보강 대상 구절` 및 `복원 처방` 프로토콜 폐지.
     - `[영역별 전반 진단]` 및 `[핵심 쟁점 1, 2: 결함 원인 분석(설명+예시 키워드) 및 교정 힌트(방향+보강/전환 예시)]`로 프로토콜을 고밀도 순수화하여 추상적 선언문으로 인한 수정 방향 상실을 해결하면서도 토큰 소모 대폭 절감.
     - `critique_synthesis_system.md` 우선순위 사슬에서 한국어 문체를 사실관계 충돌(`Plot >= Physical > Lore`)과 분리하여 글 전체에 적용되는 총괄적 질적 차원(Overarching Qualitative Craft)으로 전면 반영.
     - `auditor_scope_protocol.md`에 미세 대필 및 구절 인용 금지 규약 SSOT 동기화.
  2. **Stage 3 탈고 모델의 '부분 땜질(Find-and-Replace)' 전면 금지 및 종합 재집필 헌법 제정**:
     - `critique_synthesis_system.md` 및 `consistency_critique_context.md` 개정.
     - 4대 감사 보고서를 단순 지시서가 아닌 '종합 진단 브리핑(Diagnostic Dossier)'으로 흡수하여, 특정 부위 땜질을 금지하고 초안의 서사적 뼈대를 바탕으로 글 전체의 호흡, 텐션, 문체적 질감을 처음부터 끝까지 완전하게 다시 빚어내는(Holistic Overhaul & Resynthesis) 총괄 소설가 헌법 수립.
  3. **소설 본문 생성(Stage 1)과 100% 동일한 '물리적/기계적 앵커 메커니즘' 일원화**:
     - AI의 지능과 말에 의존하는 프롬프트 호소를 배제하고, `formatMasterSynthesisPrompt`의 물리적 어텐션 배치를 Stage 1과 완벽히 동일하게 재배치:
       - 상단: 서사 배경 (`The Codex`, `Style`, `Plot Blueprint`, `Story Memory`, `Preceding Story Context`, `User Directive`).
       - 중단: 미완성 초안 (`<RAW_DRAFT>`) 및 4대 전문 진단 보고서 (`## [Specialist Diagnostic Reports]`).
       - 최하단 Recency Zone: `## [Final Directing for Master Literary Restorer]` -> `## [Current Story Text]`(직전 본문 tail) -> `### [Immediate Stitching Anchor]`(`<anchor>` 태그)를 생성 직전 절대적 최말단 위치에 배치.
     - 모델의 즉각적 어텐션이 직전 본문 tail과 앵커에 고정되어 앵커 변조 및 씬 리셋을 원천 차단하고 `stitchAndTrimAnchor`를 통한 기계적 무결성 100% 보장.
- **Related Files**:
  - `src/prompts/auditor_scope_protocol.md`: 미세 대필/구절 인용 금지 및 앵커 불변 규약.
  - `src/prompts/critique_plot_system.md`: 인과 원인 분석 및 서사적 지향 원칙 동적 쟁점 프로토콜.
  - `src/prompts/critique_physical_system.md`: 물리 원인 분석 및 물리적 연속성 지향 원칙 동적 쟁점 프로토콜.
  - `src/prompts/critique_lore_epistemic_system.md`: 로어 원인 분석 및 인지적 징검다리 지향 원칙 동적 쟁점 프로토콜.
  - `src/prompts/critique_stylistic_system.md`: 문체 원인 분석 및 한국어 미학 지향 원칙 동적 쟁점 프로토콜.
  - `src/prompts/critique_synthesis_system.md`: 종합 탈고 헌법 및 부분 땜질 금지 규약.
  - `src/contexts/consistency_critique_context.md`: 수석 문학 복원가 시스템 템플릿.
  - `src/lib/contextProviders.ts`: `formatMasterSynthesisPrompt` Recency-Biased 물리적 어텐션 재배치.
  - `src/services/refinerService.ts`: MARS 파이프라인 무결성 유지.
  - `AGENTS.md`, `src/prompts/AGENTS.md`, `src/lib/AGENTS.md`, `src/services/AGENTS.md`: 아키텍처 문서화 동기화.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.

## [2026-10-09] Bugfix: Undo/Redo 히스토리 트랜잭션의 오토 카운터 왜곡 및 폭주 차단
- **Task Name**: Undo/Redo History Transaction Isolation in Auto-Scan Counter
- **Purpose**:
  1. **Undo/Redo 시 대량 글자수 일시 가산 버그 해결**:
     - 에디터에서 `Ctrl+Z`(Undo) 또는 `Ctrl+Y`/`Ctrl+Shift+Z`(Redo) 실행 시, 복원된 글자수가 `transaction.docChanged`를 통해 한 번에 `+수천 자`로 방출되어 오토 스캔/플롯이 즉각 오작동하던 현상 해결.
  2. **`isHistoryTransaction` 가드 적용 (`EditorContainer.tsx`)**:
     - ProseMirror 히스토리 트랜잭션 판별 유틸리티(`isHistoryTransaction`)를 연동하여, 히스토리 되돌리기/다시실행 시에는 `incrementCharsRef(diff)` 호출을 안전하게 건너뛰도록 격리.
     - 오직 사용자의 직접 타이핑, 붙여넣기, AI 이어쓰기 등 순수한 원고 진전에 의해서만 카운트가 누적되도록 정류.
- **Related Files**:
  - `src/components/EditorContainer.tsx`: `isHistoryTransaction` 임포트 및 `onUpdate` 내역 트랜잭션 카운터 배제 가드 추가.
  - `src/components/AGENTS.md`: 에디터 Undo/Redo 히스토리 트랜잭션 격리 규칙 문서화.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.

## [2026-10-09] Architecture & Reliability: Auto-Codex & Auto-Plot 영속적 카운터 아키텍처 및 파서 다중 키 강화
- **Task Name**: Auto-Scan Persistent Counter Architecture & Parser Hardening
- **Purpose**:
  1. **Zero-I/O 소설별 카운터 영속 스토리지 신설 (`counterStorage.ts`)**:
     - 브라우저 새로고침(F5), 탭 재접속, 사이드바 소설 전환, 설정 토글 시 카운터가 0으로 초기화되던 세션 휘발성 결함 해결.
     - Firestore I/O를 전혀 발생시키지 않고 브라우저 `localStorage` 기반(`novel_counter_${type}_${novelId}`)으로 소설별 완전 격리 보존.
     - 시크릿 모드/Quota 에러 대응 `try-catch` 안전 가드 및 소설 삭제 시 연계 키 정리(`purgeNovelCounters`) 구현.
  2. **실행 시점 카운터 리셋 정책 확립**:
     - 자동 스캔/생성 또는 수동 스캔/생성 성공 시에만 카운터를 0으로 초기화.
     - API/네트워크 에러 발생 시 카운터를 보존하여 작성자의 글자수 누적치와 재시도 기회를 안전하게 보호.
  3. **기본 임계값 7,500자 정렬 및 UI 슬라이더 500자 정밀 조절**:
     - `GLOBAL_DEFAULTS.autoCodex.triggerChars` 및 `GLOBAL_DEFAULTS.plot.triggerChars` 기본값을 7,500자로 통일 (1.5~2화 분량).
     - `AIEngineStudioModal`의 슬라이더 스텝을 `500`으로 조정하여 7,500자 및 세부 임계값의 정밀 선택 지원.
  4. **Auto-Codex 응답 JSON 파서 다중 키 매핑 폴백 (Silent Drop 방지)**:
     - `updates / modifiedEntries / updatedEntries`, `newEntries / createdEntries / addedEntries`, `prune / pruning / pruneEntries` 등 AI 응답 키 변형에 대한 유연한 폴백 체계 확립.
- **Related Files**:
  - `src/lib/counterStorage.ts`: 영속 카운터 조회/저장/리셋/정리 SSOT 모듈.
  - `src/hooks/useAutoCodex.ts`: 영속 카운터 연동, 실행 시점 리셋, 다중 키 파서 강화.
  - `src/hooks/useAutoPlot.ts`: 영속 카운터 연동, 실행 시점 리셋.
  - `src/hooks/useNovels.ts`: 소설 삭제 시 영속 카운터 정리(`purgeNovelCounters`) 연동.
  - `src/components/AIEngineStudioModal.tsx`: 슬라이더 `step="500"` 및 7,500자 안내 라벨 적용.
- **Verification**: `lint_applet` (`tsc --noEmit`) 0 errors, `compile_applet` 빌드 성공.



