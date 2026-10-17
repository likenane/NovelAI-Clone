# PLAN: AI Engine Studio & 파편화된 LLM 파라미터 UI 단일 통합 아키텍처

## 1. 배경 및 문제 의식
- **극심한 UI 파편화**:
  - 본문 집필(Novel), 탈고 감사(MARS Refiner), 스토리 메모리(Story Memory), 플롯 청사진(Plot), 코덱스 어시스턴트(Codex), 자동 코덱스 스캔(Auto-Codex) 등 6개 이상의 서로 다른 AI 기능들의 모델, 온도, 토큰, 사고 수준(Thinking Level) 등의 조절 UI가 각각 서로 다른 위치(`SettingsPanel`, `MemoryWorkbench`, `PlotWorkbench`, `Codex` 등)에 중구난방으로 파편화되어 있음.
  - 이로 인해 우측 사이드 패널(`SettingsPanel`)이 과도하게 비대해져 본래의 목적인 서술 지침(Style Directives) 및 작품 메타데이터 관리가 어려워짐.
- **비-Gemini 모델의 혼재 및 Provider 설정 모호성**:
  - 기존에는 OpenRouter를 통해 grok 등 이질적인 모델들이 섞여 있었으나, 이제 프로젝트는 순수 **Google Gemini 아키텍처**를 표준으로 삼음.
  - OpenRouter를 사용하더라도 Gemini 모델 계열만 호출해야 하며, 사용자가 Provider(Google Direct vs OpenRouter)를 상위 레벨에서 명확히 통제할 수 있어야 함.

---

## 2. 해결 원칙 및 핵심 아키텍처

### 2.1 단일 통합 대형 창: `AIEngineStudioModal` 신설
- **위치 & 비주얼**:
  - 화면 중앙에 넓고 시원하게 펼쳐지는 데스크톱 급 워크스테이션 모달 (`max-w-5xl`, `h-[85vh]`).
  - 좌측 네비게이션 레일(카테고리 탭) + 우측 상세 파라미터 워크스페이스 구조.
- **좌측 카테고리 레일 (6대 AI 작업 타겟)**:
  1. 🖋️ **소설 본문 집필 (Novel Primary)**: 메인 작가 모델 초안 및 탈고 합성
  2. 🛡️ **탈고 감사 (MARS Refiner Auditor)**: 4대 관점(플롯/물리/로어/문체) 동시 감사
  3. 🧠 **스토리 메모리 (Story Memory)**: 5단계 CoT 상태 추출 및 장기 기억 압축
  4. 🧭 **플롯 청사진 (Plot Blueprint)**: 다계층 서사 청사진 분석 및 연출 디렉팅
  5. 📖 **코덱스 어시스턴트 (Codex AI)**: 단일 로어 항목 작성 및 파생 항목 분화
  6. ⚡ **자동 코덱스 스캔 (Auto-Codex Scanner)**: 본문 누적 글자 수 기반 배경 로어 감지
- **우측 상세 설정 패널 (SSOT 연동)**:
  - 타겟별 특화 파라미터 편집:
    - 모델 선택 (`gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.1-pro-preview`, `gemini-3.5-flash-lite` 등)
    - 사고 수준 (`Thinking Level`: 모델별 지원 레벨에 따른 동적 선택)
    - 창의성 (`Temperature`), 최대 길이 (`Max Tokens`)
    - 고급: `Top P`, `Top K`, `Repetition Penalty` (해당 작업군에 한함)
    - 자동화 임계치: `Trigger Chars` (Plot / Auto-Codex 전용)
  - `Prompt Inspector` 바로가기 연동 및 기본값 복원 버튼.

### 2.2 파편화된 파라미터 UI의 '최소화 아이콘화'
- `MemoryWorkbench`, `PlotWorkbench`, `Codex`, `SettingsPanel` 등 각 기능 UI 내부의 거추장스러운 슬라이더 폼을 전면 제거.
- 해당 위치에는 깔끔한 미니멀 아이콘 버튼(예: `SlidersHorizontal` / `SparklesSettings`)만 배치.
- 해당 아이콘 클릭 시:
  - `AIEngineStudioModal`이 즉시 열리며,
  - `initialTask` prop을 통해 클릭한 해당 기능(예: `memory`, `plot`, `codex`, `auditor`, `novel`, `autoCodex`)의 탭이 활성화된 상태로 진입.

### 2.3 Provider 설정 및 모델 풀(Model Pool) 순수화
- **Provider 단일 진실 공급원**:
  - `SettingsPanel` 최상단에는 복잡한 모델 드롭다운 대신 깔끔한 **Provider 선택기** 배치 (Google Direct vs OpenRouter).
  - OpenRouter 선택 시에도 **오직 Google Gemini 모델들만** 노출 (grok 등 비-Gemini 모델 완전 제거).
- **글로벌 Provider 일괄 동기화 및 개별 오버라이드 지원**:
  - Provider를 전환하면 모든 서브태스크가 일관된 Provider 프리픽스를 사용하도록 자동 정규화.

### 2.4 Story Settings (우측 패널) 극적 경량화
- 슬라이더 숲이 사라지고, 다음과 같은 명쾌한 4단 구조로 재편:
  1. **Provider & AI Engine Overview**: 현재 Provider(Google/OpenRouter) 및 각 기능별 할당된 모델 요약 칩 + `AI Engine Studio 열기` 버튼.
  2. **서술 지침 (Style Directives)**: 작품 고유 문체/어조/연출 규칙 (충분한 높이와 집중 편집 도구).
  3. **스토리 메모리 & 플롯 요약**: 현재 상태 프리뷰 + 워크벤치 바로가기.
  4. **자동화 토글 (Automation)**: On/Off 스위치 중심 (Auto-Codex, Auto-Plot, Strict Consistency).

---

## 3. 상세 구현 단계

1. **상수 및 타입 정리 (`src/constants.ts`, `src/types.ts`)**:
   - `x-ai/grok-4.20` 등 비-Gemini 모델 삭제.
   - 순수 Gemini 라인업(Google Direct 4종 + OpenRouter Gemini 4종)으로 `AVAILABLE_MODELS` 통일.
   - `AIEngineTaskType = 'novel' | 'auditor' | 'memory' | 'plot' | 'codex' | 'autoCodex'` 타입 정의.
2. **단일 통합 모달 컴포넌트 신설 (`src/components/AIEngineStudioModal.tsx`)**:
   - 좌측 탭 바 + 우측 파라미터 조정 영역.
   - 실시간 `currentNovel.settings` 반영 및 Firestore 자동 디바운스 저장.
   - 단축키 (Esc 닫기), 반응형(모바일에서는 상단 탭 스크롤).
3. **`SettingsPanel.tsx` 경량화 리팩토링**:
   - 길게 늘어져 있던 Model & Provider 드롭다운 및 Generation Parameters 슬라이더 덩어리 축출.
   - Provider 선택 라디오/세그먼트 및 각 AI 기능 요약 카드(아이콘 클릭 시 모달 오픈)로 재배치.
   - Auto-Codex 섹션 내 인라인 AI 파라미터 제거 (아이콘 링크로 대체).
4. **각 워크벤치/모듈의 파라미터 UI 축소**:
   - `MemoryWorkbench.tsx`: 좌측 80px~80vh를 차지하던 Generation Parameters 제거 -> 헤더 우측 슬라이더 아이콘 클릭 시 모달의 `memory` 탭 오픈.
   - `PlotWorkbench.tsx`: 상단 `isSettingsExpanded` 드로어 내 복잡한 슬라이더 제거 -> 헤더 우측 슬라이더 아이콘 클릭 시 모달의 `plot` 탭 오픈.
   - `Codex.tsx`: AI 어시스턴트 내 인라인 설정 패널 제거 -> 헤더 `Settings` 아이콘 클릭 시 모달의 `codex` 탭 오픈.
5. **`App.tsx` 상태 조율**:
   - `isAIEngineStudioOpen` 및 `aiEngineStudioTask` 상태 관리.
   - 전역 어디서든 해당 모달을 타겟 탭과 함께 팝업할 수 있도록 헬퍼 함수 제공.
