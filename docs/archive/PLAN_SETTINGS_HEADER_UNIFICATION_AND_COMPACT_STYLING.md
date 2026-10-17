# Plan: Story Settings 헤더 디자인 통일 및 미니멀 컴팩트 스타일링

> **Status**: STP REVIEW & REFINE PHASE (Deep Self-Critique)  
> **Target File**: `src/components/SettingsPanel.tsx`

---

## 1. 배경 및 사용자 요구사항 분석

Story Settings(`SettingsPanel.tsx`)의 각 아코디언 섹션 헤더와 내부 요소들이 파편화되어 있어 시각적 통일성과 정돈감이 떨어짐:

1. **`Novel Style Directives` ➡️ `NOVEL STYLE` & 스튜디오 런처 추가**:
   - 레이블을 `NOVEL STYLE`로 간결화.
   - 우측에 다른 섹션들과 동일하게 본문 생성 AI 설정을 여는 `SlidersHorizontal` (`openAIEngineStudio?.('novel')`) 아이콘 버튼 배치.
2. **`PROVIDER & AI ENGINE` 섹션 정돈**:
   - 장황하고 덕지덕지 붙어있던 설명 문단 제거.
   - 상단에 `Google Direct` vs `OpenRouter`를 1클릭으로 전환할 수 있는 세그먼트 컨트롤 배치.
   - 하단 버튼 텍스트를 "AI Engine Studio 열기" ➡️ "AI Engine Studio"로 간결화.
3. **`Story Memory` 및 `Plot Blueprint` 워크벤치 단축키 간략화**:
   - 긴 텍스트("AI Summary", "AI Plot")를 제거하고 세련된 아이콘 버튼(`Sparkles`, `Compass`)만 남겨 헤더 우측을 컴팩트하게 정돈 (마우스 호버 시 툴팁 제공).
4. **`Auto-Codex Directive Scan` ➡️ `AUTO-CODEX`**:
   - 레이블을 `AUTO-CODEX`로 간결화하여 통일.

---

## 2. 5대 섹션 헤더 통일화 그리드 사양 (Unified Header Grid)

모든 아코디언 헤더를 완벽하게 동일한 구조로 규격화:
- **헤더 좌측**: 아이콘 + `text-xs font-bold uppercase tracking-widest text-zinc-400` + `ChevronRight`
- **헤더 우측**:
  - `PROVIDER & AI ENGINE`: (우측 토글 `ChevronRight`)
  - `NOVEL STYLE`: `[SlidersHorizontal]` (소설 본문 AI 설정 런처)
  - `STORY MEMORY`: `[SlidersHorizontal]` (메모리 AI 설정) + `[Sparkles]` (메모리 워크벤치)
  - `PLOT BLUEPRINT`: `[SlidersHorizontal]` (플롯 AI 설정) + `[Compass]` (플롯 워크벤치)
  - `AUTO-CODEX`: `[SlidersHorizontal]` (오토 코덱스 AI 설정)

---

## 3. 심층 자가비판 (Deep Self-Critique)

### ① 구현 세밀도 (Feasibility & Granularity)
- **[점검]**: `PROVIDER & AI ENGINE` 섹션에서 Provider를 `gemini` ↔ `openrouter`로 변경할 때 모델 sanitize 처리가 즉시 이루어지는가?
- **[설계]**: Provider 변경 시 `sanitizeModelForProvider`를 거쳐 모든 6대 파이프라인의 모델이 안전하게 치환되어야 하며, `updateNovel`과 `setCurrentNovel`을 통해 원자적으로 저장되어야 함.

### ② 모듈화 및 파편화 방지 (Modularity & Anti-Fragmentation)
- **[점검]**: 워크벤치 아이콘 버튼(`Sparkles`, `Compass`)을 눌렀을 때 텍스트가 없더라도 사용자가 무엇인지 직관적으로 알 수 있는가?
- **[설계]**: 아이콘에 마우스 호버 시 `title="AI Summary Workbench (전체화면)"` 및 `title="Plot Workbench & Narrative Director (전체화면)"` 툴팁을 명시하고, 아이콘 색상을 포인트 컬러(Emerald, Purple)로 하이라이트하여 인지성 확보.

### ③ 안정성 (Stability)
- **[점검]**: 워크벤치 아이콘을 클릭할 때 패널 내 지침 텍스트(`localStyleText`, `localPlotText`)가 유실되지 않는가?
- **[설계]**: 워크벤치 버튼 클릭 시 기존에 구축된 `handleOpenMemoryWorkbench`와 `handleOpenPlotWorkbench`를 그대로 호출하여, `flushPendingStyle(); flushPendingPlot(); onClose();`가 완벽히 보장됨.

### ④ 확장성 및 시각적 조망 (Scalability & Aesthetics)
- **[점검]**: 우측 액션 버튼들이 너무 커서 제목과 겹치거나 줄바꿈(wrap)이 일어나지 않는가?
- **[설계]**: 텍스트를 제거하고 `w-7 h-7` (또는 `p-1.5`) 컴팩트 아이콘 버튼으로 통일함으로써, 좁은 너비의 모바일 화면에서도 제목과 버튼이 한 줄에 쾌적하게 핏(Fit)됨.

---

## 4. 단계별 실행 계획

1. `src/components/SettingsPanel.tsx` 편집:
   - Provider 변경 헬퍼 함수 (`handleSwitchProvider`) 추가
   - Section 1: `PROVIDER & AI ENGINE` 내부 장황한 텍스트 제거, 상단 Provider 세그먼트 스위치 및 하단 "AI Engine Studio" 버튼 배치
   - Section 2: `Novel Style Directives` ➡️ `NOVEL STYLE`로 타이틀 변경, 헤더 우측에 `openAIEngineStudio?.('novel')` 런처 아이콘 배치
   - Section 3: `Story Memory` 헤더 우측에서 "AI Summary" 텍스트 제거하고 `Sparkles` 아이콘 버튼으로 컴팩트화
   - Section 4: `Plot Blueprint` 헤더 우측에서 "AI Plot" 텍스트 제거하고 `Compass` 아이콘 버튼으로 컴팩트화
   - Section 5: `Auto-Codex Directive Scan` ➡️ `AUTO-CODEX`로 타이틀 간결화
2. 빌드 및 린트 검증 (`compile_applet`, `lint_applet`)
3. 문서화 및 체크리스트 보고
