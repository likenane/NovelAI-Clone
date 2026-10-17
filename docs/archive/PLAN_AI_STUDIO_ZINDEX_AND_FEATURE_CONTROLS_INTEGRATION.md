# PLAN: AI Engine Studio z-index 레이어링 해결 및 종합 기능 제어 옵션 통합 아키텍처 (2차 개정안)

## 1. 개요 및 배경 (Context & Problem Statement)

1. **워크벤치 상단 레이어 침범 (z-index 버그)**:
   - Story Workbench(`MemoryWorkbench`) 또는 Plot Workbench(`PlotWorkbench`)가 열린 상태에서 "설정변경" 또는 "엔진 설정" 버튼을 누르면, 호출된 `AIEngineStudioModal`(`z-[120]`) 또는 `SettingsPanel`(`z-50`)이 워크벤치 모달(`z-[140]`)의 하단에 깔려 보이지 않는 현상.
2. **AI 파라미터 위계 분리 (Core vs Advanced Accordion)**:
   - 핵심 파라미터(모델, 크리에이티비티, 맥스 토큰, 리즈닝 레벨)만 상단에 즉시 노출하고, 세부적인 하이퍼파라미터(Top-P, Top-K, Repetition Penalty 등)는 접이식(Accordion) '고급 설정'으로 격리.
3. **AI Engine Studio 내 실질적 기능 제어 옵션(Feature Controls) 단일화**:
   - 불필요한 기능(Continuation Target 오인 파라미터, Style Directives 중복, 메모리 워크벤치 중복 작업 등)은 철저히 배제.
   - 각 파이프라인의 실질적인 AI 동작 제어 스위치(MARS On/Off, Plot Prompt 포함 및 자동 갱신 주기, 본문 참조 Context Window, Auto-Codex On/Off 및 스캔 주기/윈도우)만을 직관적으로 통합.
4. **Story Settings 내 `Automation Settings` 섹션의 정돈 및 역할 분담**:
   - `SettingsPanel` 내 파편화되어 있던 `Automation Settings`의 역할과 중복 문제를 명쾌하게 정리.

---

## 2. 사용자 피드백 정밀 검증 및 분석

### 2.1 본문 집필 (`novel`) 탭의 정밀화 (피드백 1번)
- **Continuation Target 제거**:
  - 코드베이스 분석 결과 `continuationLength`는 생성 목표 길이가 아닌, 직전 본문 말단에서 200자를 잘라 앵커/접미사 일치를 판별하는 내부 프리필 테크니컬 파라미터(`Length of the prefill suffix`, default: 200)입니다.
  - 실제 1회 텍스트 생성 길이는 사용자의 지적대로 **`maxTokens` (최대 출력 토큰)**이 100% 결정합니다. 따라서 별도의 Continuation Length 슬라이더는 사용자에게 혼란을 주는 불필요한 요소이므로 UI에서 완전히 배제합니다.
- **Style Directives Link 배제**:
  - `styleDirectives`는 `SettingsPanel`의 [서술 지침] 단일 슬롯에서 전담 편집 및 AI 생성을 지원하므로, 모델 설정 스튜디오인 `AIEngineStudioModal`에 중복 배치하지 않고 순수 모델/컨텍스트 설정에 집중합니다.
- **최종 `novel` 탭 구성**:
  - **Core**: 모델 선택, 크리에이티비티(Temperature), 최대 출력 토큰(Max Tokens - 실제 생성 길이 조절), 리즈닝 레벨(Thinking Level).
  - **Feature Control**: **Context Window (이전 본문 참조 글자 수: 4,000 ~ 60,000자)**. (AI가 다음 문장을 쓸 때 참조하는 최근 스토리 본문의 길이).
  - **Advanced Accordion**: Top-P, Top-K, Repetition Penalty, 기본값 초기화.

### 2.2 스토리 메모리 (`memory`) 탭의 순수 세팅 공간화 (피드백 2번)
- `AIEngineStudioModal`의 Story Memory 탭에서 워크벤치 작업이나 메모리 텍스트 조작을 시도하는 군더더기를 일체 배제합니다.
- **오롯이 세팅값만을 설정하는 순수 AI 스튜디오**:
  - 모델 선택 (Provider & Model)
  - 크리에이티비티 (Temperature)
  - 최대 출력 토큰 (Max Tokens)
  - 리즈닝 레벨 (Thinking Level)
  - Advanced Accordion: Top-P, Top-K, 기본값 초기화.

### 2.3 `SettingsPanel`의 `Automation Settings` 존재 의의 및 처리 방안 (피드백 3번)
- **문제 진단**:
  - 과거에는 통합 AI 설정 모달(`AIEngineStudioModal`)이 없어, 임시방편으로 `SettingsPanel` 하단에 `Automation Settings` 섹션을 두고 MARS 토글, 오토 코덱스 토글, 자동 플롯 토글 등을 모아두었습니다.
  - `AIEngineStudioModal`에 해당 파이프라인별 기능 옵션(MARS 탭의 On/Off, 플롯 탭의 자동 플롯, 오토 코덱스 탭의 스캔 설정)이 완전 통합되면, `SettingsPanel`의 `Automation Settings`는 **100% 기능 중복이자 설정 파편화의 온상**이 됩니다.
- **최적의 해결책 (관심사 분리 & SSOT 원칙)**:
  - **Story Settings (`SettingsPanel`)의 본질**: **"소설 내용 및 텍스트 데이터(Contents)"**의 관리.
    - 서술 지침 본문 (`styleDirectives`)
    - 스토리 메모리 본문 (`storyMemory`)
    - 플롯 청사진 본문 (`plot`)
    - 프로바이더 전역 선택 (Google Direct vs OpenRouter)
  - **AI Engine Studio (`AIEngineStudioModal`)의 본질**: **"AI 모델 파라미터 및 AI 자동화/감사/스캔 엔진"**의 단일 통합 관제탑.
  - **처리 방식**:
    - `SettingsPanel` 내의 번잡하고 중복된 `Automation Settings` 아코디언을 과감히 제거 또는 **"AI 자동화 & 파이프라인 설정" 미니 카드(Quick Launcher)**로 일원화합니다.
    - 카드를 클릭하면 해당 AI 기능(MARS, 오토 플롯, 오토 코덱스)의 탭이 `AIEngineStudioModal`에서 즉시 열리도록 연결합니다.
    - 이를 통해 사용자는 "소설 텍스트 데이터는 우측 사이드 패널에서, AI에 관한 모든 설정(모델+자동화)은 AI Engine Studio에서"라는 명확하고 일관된 멘탈 모델을 갖게 됩니다.

---

## 3. 전역 모달 계층 구조 (Global z-index Hierarchy)

```
[Layer 0 ~ 30]   기본 에디터, 사이드바, 헤더
[Layer 130]      The Codex 모달 (z-[130])
[Layer 140]      Workbenches (MemoryWorkbench, PlotWorkbench: z-[140])
[Layer 150]      SettingsPanel 슬라이드 드로어 (backdrop z-[149], content z-[150])
[Layer 160]      AI Engine Studio 모달 (backdrop z-[159], content z-[160])
[Layer 170]      Prompt Inspector 모달 (backdrop z-[169], content z-[170])
[Layer 200+]     시스템 확인 모달 및 알림 (DeleteConfirmationModal, Notifications)
```

- Story Workbench(`z-[140]`)나 Plot Workbench(`z-[140]`)에서 "엔진 설정"을 누르면 `AIEngineStudioModal`(`z-[160]`)이 워크벤치 바로 위에 완벽하게 뜹니다.
- "설정 변경"을 누르면 `SettingsPanel`(`z-[150]`)이 워크벤치 위에 온전히 노출됩니다.
- 모달 닫기 시 하위 워크벤치는 배경에 유지되며 작업 흐름이 끊기지 않습니다.

---

## 4. 6대 파이프라인별 탭 UI 상세 명세

모든 탭 공통:
- **Core Parameters (상단 항상 노출)**:
  - Provider & Model Selection
  - Creativity (Temperature)
  - Max Output Tokens (실제 생성 길이 결정)
  - Reasoning Level (Thinking Level 배지: MINIMAL, LOW, MEDIUM, HIGH)
- **Advanced Settings (접이식 Accordion - 기본 접힘)**:
  - Top-P, Top-K, Repetition Penalty (적용 탭), 기본값 복원 버튼

### 탭 1: 본문 집필 (`novel`)
- **Core**: Provider, Model, Creativity, Max Output Tokens, Reasoning Level
- **Feature Control**:
  - **Context Window (이전 본문 참조 글자 수)**: 4,000 ~ 60,000자 슬라이더 및 인풋 (안내: "AI가 다음 문장을 작성할 때 참조할 최근 소설 본문의 길이입니다.")
- **Advanced**: Top-P, Top-K, Repetition Penalty, 초기화

### 탭 2: 탈고 감사 (`auditor`)
- **Feature Control**:
  - **탈고 감사 (MARS) 가동 On/Off 대형 스위치**: `automation.enableStrictConsistency`
  - 설명: "2단계 생성 파이프라인 (초안 작성 → 4개 병렬 감사관 검증 → Refiner 최종 합성) 활성화 여부"
  - 상태 배지: "활성화 (4개 병렬 감사관 검증)" / "비활성화 (초안 즉시 출력)"
- **Core**: Provider, Model, Creativity, Max Output Tokens, Reasoning Level
- **Advanced**: Top-P, Top-K, 초기화

### 탭 3: 플롯 청사진 (`plot`)
- **Feature Control**:
  - **Include in Prompt (플롯 프롬프트 자동 포함)**: `plot.includeInPrompt` 토글 (본문 생성 시 플롯 청사진 자동 주입)
  - **Enable Auto-Plot (자동 갱신 제안)**: `automation.autoPlot` 토글
  - **Trigger Interval (자동 갱신 실행 주기)**: `plot.triggerChars` (1,000 ~ 20,000자마다 자동 갱신 트리거)
- **Core**: Provider, Model, Creativity, Max Output Tokens, Reasoning Level
- **Advanced**: Top-P, Top-K, 초기화

### 탭 4: 스토리 메모리 (`memory`)
- **순수 AI 모델 파라미터 세팅 전용 (군더더기 배제)**:
- **Core**: Provider, Model, Creativity, Max Output Tokens, Reasoning Level
- **Advanced**: Top-P, Top-K, 초기화

### 탭 5: 코덱스 (`codex`)
- **코덱스 AI 어시스턴트 모델 파라미터 세팅 전용**:
- **Core**: Provider, Model, Creativity, Max Output Tokens, Reasoning Level
- **Advanced**: Top-P, Top-K, 초기화

### 탭 6: 오토 코덱스 (`autoCodex`)
- **Feature Control**:
  - **Enable Auto-Codex (배경 스캔 제안)**: `automation.autoCodex` 토글
  - **Trigger Scan Every (스캔 주기 글자 수)**: `autoCodex.triggerChars` (1,000 ~ 50,000자)
  - **Context Window (스캔 대상 본문 범위)**: `autoCodexContextWindow` (1,000 ~ 60,000자)
  - **Context Pruning (미사용 설정 가지치기 제안)**: `enableContextPruning` 토글
- **Core**: Provider, Model, Creativity, Max Output Tokens, Reasoning Level
- **Advanced**: Top-P, Top-K, 초기화

---

## 5. 단계별 실행 계획 (Execution Roadmap)

1. **Step 1: z-index 스태킹 계층 구조 전역 정리**
   - `AIEngineStudioModal.tsx` (`z-[120]` -> `z-[160]`)
   - `SettingsPanel.tsx` (backdrop `z-40` -> `z-[149]`, content `z-50` -> `z-[150]`)
   - `PromptInspector.tsx` (`z-[150]` -> `z-[170]`)
2. **Step 2: `AIEngineStudioModal.tsx` 리팩토링**
   - Core vs Advanced 2단계 구조화
   - 불필요 항목 제거 (`continuationLength`, `styleDirectives` 등)
   - 파이프라인별 Feature Controls 통합 (MARS 토글, Plot 자동화, Context Window, Auto-Codex 자동화)
3. **Step 3: `SettingsPanel.tsx` 내 중복된 `Automation Settings` 정리**
   - 불필요하게 중복된 슬라이더/토글들을 AI Engine Studio 직행 미니 런처로 일원화
4. **Step 4: 검증 및 테스트**
   - 린트(`tsc --noEmit`) 및 컴파일(`npm run build`) 확인
   - 워크벤치 상단 오픈 및 z-index 상호작용 검증
