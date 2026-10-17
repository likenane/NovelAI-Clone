# Master Blueprint: Settings UX, Local Draft Buffer, Auto-Codex Station & Header Cleanup

> **Status**: FINAL MASTER BLUEPRINT (Ready for Execution)  
> **Target Files**:
> - `src/components/SettingsPanel.tsx`
> - `src/components/AIEngineStudioModal.tsx`
> - `src/components/MemoryWorkbench.tsx`
> - `src/components/PlotWorkbench.tsx`
> - `src/components/Codex.tsx`
> - `src/components/DirectiveScanPopover.tsx`
> - `src/components/EditorContainer.tsx`
> - `src/App.tsx`
> - `src/components/MobileZenStudio.tsx` (REMOVED)
> - `AGENTS.md` & `src/components/AGENTS.md`

---

## 1. 사용자의 신규 요구사항 및 확정 결정 사항

### 1.1 Auto-Codex Directive Scan Station (SettingsPanel)
- 구성: **지침 입력창 + [실행 아이콘] + [비우기 아이콘]**의 초경량 컴팩트 스테이션.
- 코덱스 열기 버튼은 불필요하므로 제외.
- **빈 지침 대응**: 지침이 빈 상태(`!directive.trim()`)에서 실행을 누르면 `scanForProposals({ isManual: true, userDirective: undefined })`가 호출되어 표준 오토 스캔과 동일하게 작동.
- 지침이 입력되어 있으면 `scanForProposals({ isManual: true, userDirective: trimmed })`로 지침 반영 스캔 작동.

### 1.2 The Codex 내 Auto-Codex 환경설정 바로가기
- `Codex.tsx` 및 `DirectiveScanPopover.tsx`에 `openAIEngineStudio('autoCodex')`로 즉시 진입할 수 있는 `SlidersHorizontal` 설정 아이콘 런처 연동.

### 1.3 소설 본문 상단 헤더 정리 및 Zen Reader 완전 제거
- 소설 본문 상단 헤더 우측에서 **Zen Reader(`Maximize2`) 및 AI Engine Studio(`SlidersHorizontal`) 아이콘 제거**.
- 불필요하고 정체성이 모호한 `MobileZenStudio.tsx` 컴포넌트 및 `isZenModeOpen` 상태, 관련 imports 전면 제거.
- 상단 헤더에는 꼭 필요한 [Save, Download, Prompt Inspector, Settings]만 남겨 극도로 정돈되고 깔끔한 툴바 구축.

---

## 2. 폐기된 대안과 채택된 솔루션 비교 (Trade-Off Matrix)

| 영역 | 폐기된 대안 (Rejected) | 채택된 마스터 설계 (Adopted Master Solution) | 채택 이유 |
| :--- | :--- | :--- | :--- |
| **I/O 최적화** | 슬라이더 300ms 디바운스 | **Local Draft Buffer (인메모리 버퍼 & 원자적 커밋)** | 슬라이더 드래그 시 DB 호출 0건, 60fps 즉각 렌더링, [취소(ESC)] 시 100% 롤백, [적용&저장] 시 1회 커밋 |
| **설정창-워크벤치 전환** | 설정창 열어둔 채 겹침 | **Zero-Lag Flush & Auto-Dismiss** | 워크벤치 호출 시 `flushPendingStyle(); flushPendingPlot(); onClose();` 순차 실행으로 겹침 간섭 원천 제거 |
| **상단 툴바** | 모든 기능 아이콘을 상단에 다닥다닥 배치 | **미니멀 에센셜 툴바 (Zen Reader & 스튜디오 런처 삭제)** | 상단은 집필과 저장/다운로드/설정의 핵심에만 집중하고, 파라미터는 설정 패널 및 워크벤치 내 런처로 단일화 |
| **오토 코덱스 스캔** | 별도 스캔 로직 중복 작성 | **`useAutoCodex` SSOT 공유 파이프라인 연동** | `scanForProposals({ isManual: true, userDirective })` 단일 파이프라인을 Codex와 SettingsPanel이 100% 공유 |

---

## 3. 상세 아키텍처 및 모듈별 구현 사양

### 3.1 Global Modal Stacking & Layering SSOT
```
Base Editor (0 ~ 30)
 └─ SettingsPanel (Backdrop: z-[139], Content: z-[140])
     └─ Fullscreen Workbenches (MemoryWorkbench, PlotWorkbench, The Codex: z-[150])
         └─ AI Engine Studio Modal (z-[160])
             └─ Prompt Inspector (z-[170])
                 └─ Global Settings & Confirmation Modals (z-[180] ~ z-[190])
                     └─ NotificationSystem (z-[200])
```

---

### 3.2 `src/components/AIEngineStudioModal.tsx` (Local Draft Buffer Engine)

#### ① 인메모리 버퍼 생명주기
```tsx
const [draftSettings, setDraftSettings] = useState<NovelSettings>(() => 
  JSON.parse(JSON.stringify(currentNovel?.settings || GLOBAL_DEFAULTS))
);

useEffect(() => {
  if (isOpen && currentNovel) {
    setDraftSettings(JSON.parse(JSON.stringify(currentNovel.settings || GLOBAL_DEFAULTS)));
  }
}, [isOpen, currentNovel?.id]);

const isDirty = useMemo(() => {
  if (!currentNovel) return false;
  return JSON.stringify(draftSettings) !== JSON.stringify(currentNovel.settings);
}, [draftSettings, currentNovel]);

const updateDraftTaskSettings = (task: AIEngineTaskType, updates: Record<string, any>) => {
  setDraftSettings(prev => {
    const next = { ...prev };
    switch (task) {
      case 'novel':
        return { ...next, ...updates };
      case 'auditor':
        return { ...next, auditor: { ...(next.auditor || GLOBAL_DEFAULTS.auditor), ...updates } };
      case 'memory':
        return { ...next, memory: { ...(next.memory || GLOBAL_DEFAULTS.memory), ...updates } };
      case 'plot':
        return { ...next, plot: { ...(next.plot || GLOBAL_DEFAULTS.plot), ...updates } };
      case 'codex':
        return { ...next, codex: { ...(next.codex || GLOBAL_DEFAULTS.codex), ...updates } };
      case 'autoCodex':
        return { ...next, autoCodex: { ...(next.autoCodex || GLOBAL_DEFAULTS.autoCodex), ...updates } };
      default:
        return next;
    }
  });
};

const handleApplyAndSave = () => {
  if (isDirty && currentNovel) {
    if (setCurrentNovel) {
      setCurrentNovel({ ...currentNovel, settings: draftSettings });
    }
    if (updateNovel) {
      updateNovel(currentNovel.id, { settings: draftSettings });
    } else if (updateNovelContent) {
      updateNovelContent(currentNovel.id, { settings: draftSettings }, true, false);
    }
  }
  onClose();
};
```

#### ② 시각적 압축 및 마우스 호버 툴팁 시스템
- **MARS Auditor 탭**: 장황한 3중 박스 제거 ➡️ 1줄 고밀도 스위치 바 `[탈고 감사 (MARS)] [토글] [상태 배지]` + 마우스 호버 툴팁.
- **Memory & Codex 탭**: 중복 설명 박스 전면 삭제, 직관적 고밀도 뷰.

---

### 3.3 `src/components/SettingsPanel.tsx`

#### ① Auto-Codex Directive Scan Station
- `AI Automation Control` 섹션을 제거하고 **"Auto-Codex Directive Scan"** 섹션 신설.
- **UI 레이아웃**:
  - 간결한 헤더 + `isAutoCodexScanning` 인디케이터
  - 컴팩트 텍스트창 (`localDirective`, `h-20`, placeholder: "선택 사항: 특별 지시 입력 (미입력 시 표준 본문 스캔)")
  - 우측 하단 아이콘 액션 바:
    - **[지침 비우기 아이콘 (`Trash2` / `RotateCcw`)]**: `setLocalDirective("")`
    - **[스캔 실행 아이콘 (`Play` / `RefreshCw`)]**: `scanForProposals({ isManual: true, userDirective: localDirective.trim() || undefined })`
    - 스캔 진행 중에는 아이콘 회전 스피너 및 비활성화

#### ② Plot Blueprint 순수 수동 집필 작업 공간화
- 불필요한 토글 제거.
- `localPlotText` + `plotDebounceTimerRef` (800ms 디바운스, `flushPendingPlot`) Zero-Lag Keystroke Isolation 적용.
- `h-60` 대형 텍스트에리어 및 전체화면 에디터(`Maximize2`) 버튼 연동.

#### ③ 워크벤치 호출 시 Auto-dismiss & Flush
- "AI Summary" 또는 "AI Plot" 클릭 시 `flushPendingStyle(); flushPendingPlot(); onClose();` 순차 실행.

---

### 3.4 `src/components/Codex.tsx` & `src/components/DirectiveScanPopover.tsx`
- `The Codex` 상단의 스캔 팝오버 및 툴바에서 `openAIEngineStudio?.('autoCodex')`를 호출할 수 있는 `SlidersHorizontal` 설정 버튼 추가.

---

### 3.5 `src/App.tsx` & `src/components/EditorContainer.tsx`
- 소설 본문 상단 헤더에서 Zen Reader(`Maximize2`) 및 AI Engine Studio(`SlidersHorizontal`) 아이콘 제거.
- `MobileZenStudio.tsx` 파일 삭제 및 `isZenModeOpen` 상태 정리.
- `SettingsPanel`에 `scanForProposals`, `isAutoCodexScanning` props 바인딩.

---

## 4. Verification Checklist (검증 체크리스트)

- [ ] **헤더 정리 확인**: 상단 헤더에 Zen Reader와 AI Engine Studio 아이콘이 제거되고 미니멀한 필수 아이콘만 깔끔하게 노출되는가?
- [ ] **The Codex 설정 연동 확인**: 코덱스 내 오토 코덱스 스캔 팝오버/헤더에서 `SlidersHorizontal`을 누르면 AI Engine Studio의 `autoCodex` 탭이 즉시 열리는가?
- [ ] **Auto-Codex Station 동작 확인**: `SettingsPanel`에서 지침 없이 [실행]을 누르면 일반 스캔이, 지침을 적고 [실행]을 누르면 지침 반영 스캔이 정상 작동하는가? [비우기] 아이콘이 잘 작동하는가?
- [ ] **Plot 수동 편집창 확인**: 토글 없이 `h-60` 대형 창에서 플롯이 쾌적하게 작성되고 지연 없이 자동 저장되는가?
- [ ] **Local Draft Zero-I/O 확인**: AI Engine Studio에서 슬라이더를 드래그할 때 불필요한 Firestore 쓰기가 0건으로 유지되며, [적용 & 저장] 시에만 단 1회 커밋되는가?
