# Master Blueprint: Style Directives SSOT & Engine Firmware Unification
**File**: `PLAN_STYLE_DIRECTIVES_SSOT_AND_ENGINE_FIRMWARE_UNIFICATION.md`  
**Status**: APPROVED MASTER BLUEPRINT (Ready for Execution)  
**Last Updated**: 2026-09-27  

---

## 1. Problem Statement & Historical Context (문제 배경 및 진단)

### 1.1 초기 설계의 한계: "자유도"에서 "시스템 시한폭탄"으로
- **초기 상태 (v1.0)**: 소설 및 코덱스 시스템 프롬프트는 단순한 텍스트 가이드였으므로 유저가 자유롭게 편집하도록 노출한 것이 편의 기능이었음.
- **현재 상태 (v2.6+)**: 
  - 소설 생성 엔진(`novel_system.md`): 에디터 앵커 오버랩 스티칭(Section 8), `{}` 인라인 지시문 파서, 씬 전환(`* * *`), 플롯 계층 오버라이드, MARS 다중 감사관 파이프라인과 엄격하게 결합된 **시스템 펌웨어(OS Kernel)**.
  - 코덱스 생성 엔진(`codex_system.md`): 적응형 4단계 CoT, 영구 속성 증류(`dechronologization`), 가지치기(`spinoffEntries`), JSON Schema 출력을 강제하는 **백엔드 직렬화 파이프라인**.
- **유저 경험의 파탄**:
  - 유저가 이 프롬프트들을 조금이라도 건드리면 앵커 중복/단절 버그, JSON 파싱 에러(Syntax Error)로 앱이 고장남.
  - 새 버전이 배포되어도 기존 소설 DB(`novel.settings.systemPrompt`)에 구버전 프롬프트가 박혀 있어 최신 패치가 적용되지 않고, 매번 설정창 구석의 `Hard Reset to System Defaults`를 찾아 눌러야 하는 악순환 반복.
  - 역설적으로 정작 유저가 원했던 *"이 소설은 1인칭 주인공 시점이고 피카레스크풍의 냉혹한 단문으로 써줘"* 같은 **작품 고유의 문체/어조 설정 공간**은 시스템 어디에도 없었음.

---

## 2. Core Philosophy & Architectural Principles (핵심 원칙)

1. **System Firmware Separation (시스템 펌웨어의 완전 잠금)**:
   - 시스템 엔진 뼈대(`novel_system.md`, `codex_system.md`)는 코드베이스의 불변 SSOT로 전환.
   - DB에 저장된 레거시 시스템 프롬프트는 런타임에서 완전히 무시하고, 모든 소설은 항상 코드의 최신 시스템 펌웨어로 자동 구동 (하드리셋 개념 영구 소멸).
2. **Dedicated Style Guide Slot (작품 문체 및 연출 지침 단일 전용 슬롯 신설)**:
   - 복잡한 System Prompt 편집기를 제거하고, `novel.settings.styleDirectives` (작품 문체/연출 지침) 단일 필드 신설.
   - 빈 입력창일 때 실전 가이드 플레이스홀더(Placeholder) 제공 및 `[📋 기본 서식 삽입]` 퀵 버튼 지원.
3. **SSOT Context Injection & Zero-Duplication (절대 모순 방지 단일 결합)**:
   - 플롯 1번 헤더(`[1. 서술 방향 및 연출 디렉팅]`)의 `### 작품 전역 지침` 자리를 런타임 조립 함수(`resolveNarrativeDirectivesContext`)를 통해 설정창의 `styleDirectives`로 100% 자동 결합.
   - 플롯의 가변 지침인 `### 현재 아크 지침`은 온전히 보존하여 서사 템포와 긴장도를 유연하게 조율.
   - 설정창과 플롯 간의 불필요한 중복 저장 및 양방향 동기화 파편화 원천 방지.
4. **AI-Native Style Generation (단일 AI 맞춤 문체 생성 도구)**:
   - 유저가 맨땅에 타이핑하지 않도록, 설정창에 `[✨ AI 소설 맞춤 문체 생성]` 단일 도구 제공.
   - 기존 소설 생성과 **완벽히 동일한 컨텍스트 조립 헬퍼(`buildStandardNarrativeContext`, `buildTotalVariableDictionary`)를 100% 재사용**하여 코덱스, 스토리 메모리, 플롯, 본문 텍스트 전체를 완벽히 숙지한 상태에서 소설에 가장 어울리는 문체를 자동 생성 (Anti-Fragmentation).
5. **Codex Prompt UI Complete Deprecation (코덱스 커스텀 프롬프트 폐지)**:
   - 코덱스 시스템 프롬프트 편집창을 설정 모달에서 완전 제거. 코덱스 생성/수정은 이미 개별 항목 모달의 `USER_INSTRUCTION_CODEX`와 본문 `{}` 지시문으로 완벽히 통제됨.

---

## 3. Detailed Data Flow & Context Pipeline Architecture (데이터 파이프라인 상세 설계)

### 3.1 런타임 서사 컨텍스트 결합 로직 (`resolveNarrativeDirectivesContext`)
소설 생성 시 `src/lib/contextProviders.ts`의 `buildStandardNarrativeContext`에서 다음과 같이 결합:

```typescript
/**
 * 플롯 청사진과 소설 설정의 styleDirectives를 100% 모순 없이 결합하는 SSOT 함수.
 * 
 * 1. 플롯이 존재하는 경우:
 *    플롯의 '[1. 서술 방향 및 연출 디렉팅]' 섹션 내부의 '### 작품 전역 지침' 영역을
 *    설정창의 styleDirectives로 동적 교체하고, '### 현재 아크 지침'은 보존.
 * 
 * 2. 플롯이 없는 경우:
 *    styleDirectives가 존재하면 독립적인 '## [Novel Style & Directing Guide]' 블록 생성.
 */
export function resolveNarrativeDirectivesContext(
  styleDirectives: string | undefined,
  plotBlueprint: string | undefined
): { mergedPlotBlueprint?: string; standaloneStyleBlock?: string }
```

- **위계 구조 (Hierarchy)**:
  - 대분류: `## 1. NARRATIVE DIRECTOR & STYLE DIRECTIVES` (또는 `[1. 서술 방향 및 연출 디렉팅]`)
  - 중분류: `### 작품 전역 지침` (동적으로 `styleDirectives` 내용 주입)
  - 소분류: `<시점 및 서술 어조>`, `<장르 및 묘사 규칙>`, `<절대 금기 사항>`
  - 세부항목: `- 불릿`
- **결과**: LLM 내부에서의 프롬프트 모순(Contradiction) 0%, 토큰 중복 낭비 0%.

### 3.2 AI 맞춤 문체 생성 파이프라인 (`generateStyleDirectivesAI`)
유저가 설정창에서 `[✨ AI 소설 맞춤 문체 생성]`을 실행할 때:
- **SSOT 헬퍼 함수 재사용**: `buildTotalVariableDictionary(currentNovel, options)` 및 `buildStandardNarrativeContext`를 호출하여 완벽한 서사 맥락을 구축.
- **제공되는 컨텍스트**:
  1. `[The Codex]`: 현재 활성화된 인물/세계관 규칙
  2. `[Plot Blueprint]`: 작성된 플롯 청사진 (기승전결 및 전개 방향)
  3. `[Story Memory]`: 최근 스토리 요약 및 인과 관계
  4. `[Current Story Text]`: 현재 작성된 본문 텍스트
- **프롬프트 템플릿**:
  - LLM에게 현재까지의 소설 컨텍스트를 분석하여, 작품의 톤과 장르에 가장 완벽하게 부합하는 문체 지침을 생성하도록 요구.
  - 출력 포맷을 엄격한 `<>` 소분류 및 `-` 불릿 규격으로 강제.

---

## 4. UI / UX Redesign Specification (화면 설계)

### 4.1 `SettingsPanel.tsx` 개편
1. **제거되는 요소**:
   - `System Prompt` 50줄짜리 거대 텍스트에어리어 제거.
   - `Codex System Prompt` JSON 스키마 텍스트에어리어 제거.
   - `Hard Reset to System Defaults` 버튼 제거.
   - `FullScreenPromptEditor` 모달 호출 제거.
2. **신설되는 요소 (`작품 문체 및 연출 지침`)**:
   - 상단 액션 바:
     - `[✨ AI 맞춤 문체 생성]` 버튼 (소설 컨텍스트 기반 스마트 추출 모달 트리거)
     - `[📋 기본 서식 삽입]` 버튼 (클릭 시 표준 템플릿 즉시 삽입)
   - 텍스트 입력창:
     - 비어 있을 때 실전 가이드 Placeholder 노출:
       ```text
       <시점 및 서술 어조>
       - 1인칭 주인공 시점 ('나'의 냉소적인 내면 독백과 통찰 중심)
       - 긴장감 높은 단문 위주의 호흡과 감정 과잉 배제

       <장르 및 묘사 규칙>
       - 피카레스크 다크 판타지: 폭력과 마법은 시각적·물리적 충격 위주로 건조하게 묘사
       - 클리셰적인 과장된 감탄사 및 만화적 연출 지양
       ```
     - 사용자가 자유롭게 편집 가능.

### 4.2 플롯 워크벤치(`PlotWorkbench.tsx`) 연동
- 플롯 1번 헤더(`### 작품 전역 지침`)가 소설 설정창의 `styleDirectives`와 동적으로 결합됨을 알리는 인라인 안내 배지 제공.
- 플롯 자동 생성 결과에서 `### 작품 전역 지침` 내용이 갱신되었을 때, 이를 원클릭으로 소설 설정창(`styleDirectives`)에 저장할 수 있는 동기화 액션 지원.

---

## 5. Execution Plan (세부 구현 순서)

1. **Step 1: 타입 및 상수 정비 (`src/types.ts`, `src/constants.ts`)**
   - `NovelSettings` 인터페이스에 `styleDirectives?: string` 추가.
   - `systemPrompt`, `codexSystemPrompt`는 `@deprecated` 처리 및 UI 바인딩 해제.
   - `DEFAULT_STYLE_DIRECTIVES_TEMPLATE` 상수 정의.

2. **Step 2: 컨텍스트 빌더 및 주입 로직 SSOT 구현 (`src/lib/contextProviders.ts`, `src/services/promptService.ts`)**
   - `resolveNarrativeDirectivesContext` 구현.
   - `buildStandardNarrativeContext`에서 `styleDirectives` 결합 로직 반영.
   - `generateTaskContext`에서 레거시 DB `systemPrompt` 오버라이드 로직 완전 제거 (코드 파일 SSOT로 영구 고정).

3. **Step 3: AI 맞춤 문체 생성 서비스 구현 (`src/services/aiService.ts`)**
   - `generateStyleDirectivesAI` 함수 구현 (기존 `buildStandardNarrativeContext` 재사용).

4. **Step 4: UI 개편 (`src/components/SettingsPanel.tsx`, `PlotWorkbench.tsx`)**
   - 레거시 시스템 프롬프트 에디터 및 하드리셋 버튼 제거.
   - `styleDirectives` 전용 편집 UI, 플레이스홀더, 서식 삽입 버튼, AI 생성 모달 연결.
   - 플롯 워크벤치 1번 헤더 안내 및 동기화 버튼 연동.

5. **Step 5: 검증 및 문서화**
   - `lint_applet` & `compile_applet` 실행.
   - `AGENTS.md` 및 `AUDIT_LOG.md` 업데이트.
