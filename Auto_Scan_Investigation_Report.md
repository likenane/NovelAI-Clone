# Auto Codex & Auto Plot 주기별 자동 스캔 기능 결함 조사 보고서
**Inspection & Architectural Root-Cause Analysis Report**

- **작성일자**: 2026-10-09
- **대상 모듈**:
  - `src/hooks/useAutoCodex.ts` (Auto-Codex 백그라운드 주기 스캔 훅)
  - `src/hooks/useAutoPlot.ts` (Auto-Plot 백그라운드 주기 갱신 훅)
  - `src/components/SettingsPanel.tsx` (스토리 설정 패널)
  - `src/components/AIEngineStudioModal.tsx` (AI 엔진 스튜디오 모달)
  - `src/components/PlotWorkbench.tsx` (플롯 워크벤치)
  - `src/components/EditorContainer.tsx` (본문 에디터 및 글자수 감지기)
  - `src/constants.ts` & `src/types.ts` (글로벌 기본값 및 데이터 모델)

---

## 1. Executive Summary (요약)

사용자가 제기한 **"Auto Codex와 Plot 생성의 주기별 자동 스캔 기능이 정상 작동하지 않는 것 같다"는 의혹은 실존하는 치명적인 구조적 결함(Defect Confirmed)**으로 최종 확인되었습니다.

단순한 오작동이 아니라, **최근 2주간 진행된 UI/UX 리팩토링 및 설정 단일화 작업, 인메모리 카운터 생명주기 설계, 그리고 비현실적으로 높은 기본 임계값(Threshold)이 복합적으로 결합하여 발생한 다차원적 아키텍처 장애**입니다.

### 핵심 결론 요약
1. **문제 실존 여부**: **[실존함 (CONFIRMED)]**
   - 실제로 일반적인 소설 집필 환경에서 주기별 자동 스캔이 **사실상 단 한 번도 실행되지 못하거나 실행되어도 결과가 버려지는 상태**입니다.
2. **발생 원인**:
   - **원인 ① (휘발성 인메모리 카운터 & 비현실적인 임계값)**: 누적 글자수 카운터(`charsSinceLastScanRef`, `charsSinceLastPlotRef`)가 React In-Memory `useRef(0)`로만 관리되어 새로고침(F5)·소설전환·설정변경 시마다 즉시 0으로 초기화되는데, 기본 발동 기준치가 **10,000자 / 7,500자(웹소설 2화 연속 집필 분량)**로 극단적으로 높아 일반 세션에서는 임계값 도달이 원천 불가능함.
   - **원인 ② (SettingsPanel 자동화 UI 소실 및 인메모리 드래프트 버퍼 미커밋 장벽)**: `SettingsPanel` 경량화 리팩토링 중 자동화 토글 및 슬라이더가 전부 제거되었고, `AIEngineStudioModal`로 이관된 토글은 로컬 드래프트 버퍼(`draftSettings`) 구조상 [적용 & 저장]을 명시적으로 누르지 않고 닫으면 무조건 롤백되어 사용자가 켰다고 믿어도 실제로는 꺼져 있는 상태로 유지됨.
   - **원인 ③ (Delta 감쇄 로직에 의한 카운터 후퇴)**: Backspace 및 블록 삭제 시 카운터가 차감(`Math.max(0, current + count)`)되므로, 문장 수정 및 퇴고가 잦은 집필 환경에서는 10,000자 목표선이 무한히 뒤로 밀림.
   - **원인 ④ (Auto-Codex 수신 파서 필드명 불일치로 인한 Silent Drop)**: 10,000자에 도달해 실제 API가 호출되더라도, CoT 프롬프트 개편으로 변화된 JSON 스키마 필드(`entryId`, `description` 등)를 `useAutoCodex.ts`가 구버전 키(`originalEntryId`, `content`)로만 엄격히 조회하여 유효한 제안이 침묵 속에서 스킵됨.
   - **원인 ⑤ (가시성 및 피드백 0%)**: 현재 누적 글자수가 몇 자인지, 자동 스캔이 켜져 있는지 확인할 수 있는 인디케이터가 전무하여 사용자는 기능이 정지되었다고 인지함.

---

## 2. 결함 검증 매트릭스 (Defect Verification Matrix)

| 결함 영역 | 결함 내용 | 심각도 | 영향도 |
| :--- | :--- | :---: | :--- |
| **카운터 생명주기** | `useRef(0)` 세션 휘발성 및 잦은 강제 리셋 | **CRITICAL** | 새로고침, 소설 전환 시 카운터가 0으로 초기화되어 장기 누적 불가 |
| **임계값 설정** | 기본값 10,000자(코덱스) / 7,500자(플롯) | **CRITICAL** | 단일 브라우저 세션에서 1~2만 자를 쉼 없이 써야만 1회 발동 |
| **설정 패널(UI)** | `SettingsPanel` 내 자동화 토글 및 슬라이더 전면 부재 | **HIGH** | 메인 설정창에서 자동 스캔 활성화 여부 확인 및 주기 조절 불가 |
| **스튜디오 커밋** | `AIEngineStudioModal` 드래프트 버퍼 미커밋 시 롤백 | **HIGH** | 모달에서 토글을 켜고 X나 ESC로 닫으면 저장이 취소되어 비활성 유지 |
| **CoT 파서 불일치** | `useAutoCodex.ts`의 `update.originalEntryId`, `newEntry.content` 하드코딩 | **HIGH** | 모델 응답이 도착해도 필드명 차이로 인해 업데이트/신규 항목 무시 |
| **UI 가시성** | 진행률(0/10,000자) 및 백그라운드 활성 뱃지 부재 | **MEDIUM** | 기능이 작동하고 있는지 사용자가 전혀 인지할 수 없음 |

---

## 3. 세부 원인 심층 분석 (Root-Cause Deep Dive)

### 3.1 원인 ①: In-Memory Ref의 세션 휘발성과 10,000자 도달 불가 결함

`src/hooks/useAutoCodex.ts` 및 `src/hooks/useAutoPlot.ts`의 카운터 구현:

```typescript
// src/hooks/useAutoCodex.ts (Lines 24, 40-42)
const charsSinceLastScanRef = useRef(0);

// Reset counter when Auto-Codex is disabled or novel changes
useEffect(() => {
  charsSinceLastScanRef.current = 0;
}, [novel?.id, novel?.settings?.automation?.autoCodex]);
```

```typescript
// src/hooks/useAutoPlot.ts (Lines 19, 27-29)
const charsSinceLastPlotRef = useRef(0);

// Reset counter when Auto-Plot is disabled or novel changes
useEffect(() => {
  charsSinceLastPlotRef.current = 0;
}, [novel?.id, novel?.settings?.automation?.autoPlot]);
```

그리고 `src/constants.ts`의 기본 설정값:
```typescript
// src/constants.ts (Lines 149-164, 195-205)
export const GLOBAL_DEFAULTS = {
  automation: {
    autoCodex: false,
    autoPlot: false,
    ...
  },
  autoCodex: {
    triggerChars: 10000, // 10,000자!
    ...
  },
  plot: {
    triggerChars: 7500,  // 7,500자!
    ...
  }
};
```

#### 발생 메커니즘:
1. 웹소설의 일반적인 집필 패턴: 1회 집필 시 약 1,500 ~ 4,000자 작성 후 저장, 또는 퇴고.
2. 사용자가 글을 쓰다가 **브라우저 새로고침(F5)**, 창 닫기 후 재접속, 혹은 좌측 사이드바에서 다른 소설을 클릭하여 전환(`novel?.id` 변경)하는 순간:
   - `charsSinceLastScanRef.current = 0;`
   - `charsSinceLastPlotRef.current = 0;`
3. 카운터가 Firestore나 LocalStorage에 영속화되지 않는 단순 React Ref이므로, **브라우저를 끄지 않고 단 한 번의 연속 세션에서 7,500자~10,000자(책 15~20페이지 분량)를 쉼 없이 작성하지 않는 한 트리거 조건(`current >= triggerChars`)에 절대 도달할 수 없습니다.**
4. 따라서 사용자는 수일 동안 수만 자를 나누어 집필했음에도 불구하고 "자동 스캔이 한 번도 동작하지 않는다"고 체감하게 됩니다.

---

### 3.2 원인 ②: SettingsPanel 경량화 리팩토링으로 인한 UI 단절 및 로컬 드래프트 버퍼 미커밋

#### 이전 상태 (작동하던 시절):
과거에는 `SettingsPanel.tsx` 내에 `AI Automation Control` 섹션이 존재하여, 사용자가 우측 설정창을 열면:
- `Enable Auto-Codex [ON/OFF]`
- `Trigger Interval [1,000자 ~ 10,000자 슬라이더]`
- `Enable Auto-Plot [ON/OFF]`
- `Trigger Interval [1,000자 ~ 10,000자 슬라이더]`
가 바로 보였고, 사용자가 1,000자나 2,000자로 낮추어 즉시 켜고 테스트할 수 있었습니다.

#### 변곡점 (2026-09-28 리팩토링 이후):
`docs/archive/PLAN_SETTINGS_UX_OPTIMIZATION_AND_LOCAL_DRAFT_BUFFER.md`에 따라 진행된 작업:
1. `SettingsPanel`의 섹션 5가 단순한 텍스트 입력창인 **`Auto-Codex Directive Scan Station`**으로 대체됨:
   ```tsx
   // src/components/SettingsPanel.tsx (Lines 814-850)
   {openSections.includes('autocodex') && (
     <div className="p-4 space-y-3">
       <textarea value={localDirective} ... placeholder="선택 사항: 지시 입력..." />
       <button onClick={handleRunAutoCodexScan}>스캔 실행</button>
     </div>
   )}
   ```
   - **`automation.autoCodex` 활성화 토글이 `SettingsPanel`에서 영구 삭제됨.**
   - **스캔 주기(triggerChars) 슬라이더가 `SettingsPanel`에서 영구 삭제됨.**
2. `SettingsPanel`의 섹션 4 (Plot Blueprint) 역시 순수 수동 작성 공간으로 바뀌면서 `automation.autoPlot` 관련 토글/슬라이더가 전면 삭제됨.
3. 이 모든 제어기가 **`AIEngineStudioModal.tsx`** 내부의 6대 탭 중 `plot` 탭과 `autoCodex` 탭 안으로 완전히 숨겨짐.
4. 그러나 `AIEngineStudioModal`은 Firestore 쓰기 폭풍 방지를 위해 **Local Draft Buffer (인메모리 격리 버퍼)**를 사용함:
   ```tsx
   // src/components/AIEngineStudioModal.tsx (Lines 416-431)
   const handleApplyAndSave = () => {
     if (isDirty && currentNovel) {
       updateNovel(currentNovel.id, { settings: draftSettings });
     }
     onClose();
   };
   ```
   - 사용자가 AI Engine Studio를 열어 Auto-Codex나 Auto-Plot 토글을 켰더라도, 우측 하단의 **[적용 & 저장]** 버튼을 누르지 않고 상단 'X' 버튼이나 `ESC` 키를 누르면 `onClose()`만 호출되어 **수정한 임시 버퍼가 전량 폐기(Rollback)**됩니다.
   - 그 결과, 사용자는 "분명히 켰다"고 생각하지만 실제 DB 및 React State에는 여전히 `autoCodex: false`, `autoPlot: false`로 남아있어 자동 스캔이 영구히 작동하지 않습니다.

---

### 3.3 원인 ③: Delta 차감(Delta Subtraction with Floor)에 의한 카운터 역행

`src/components/EditorContainer.tsx`의 글자 수 감지 로직:
```tsx
// src/components/EditorContainer.tsx (Lines 91-96)
if (transaction.docChanged) {
  const diff = transaction.doc.content.size - transaction.before.content.size;
  if (diff !== 0) {
    incrementCharsRef.current(diff);
  }
}
```

`src/hooks/useAutoCodex.ts`의 누적 로직:
```tsx
// src/hooks/useAutoCodex.ts (Lines 272-273)
charsSinceLastScanRef.current = Math.max(0, charsSinceLastScanRef.current + count);
```

#### 발생 메커니즘:
- 사용자가 500자 문단을 작성했다가 마음에 들지 않아 백스페이스로 지우거나 블록 삭제하면, `diff = -500`이 전달됩니다.
- `charsSinceLastScanRef.current`는 500자가 깎여 0으로 내려앉습니다.
- 웹소설 작가는 글을 쓰면서 앞 문장을 지우고 고쳐 쓰는 행위(재집필)를 반복합니다.
- 높은 10,000자 기준치에서 삭제할 때마다 카운터가 차감되므로, 실질적인 순 증가량(Net Delta)이 10,000자에 도달하기는 통계학적으로 거의 불가능에 가깝습니다.

---

### 3.4 원인 ④: Auto-Codex 수신 파서의 필드명 불일치 (Silent Proposal Drop)

혹여 10,000자에 도달하여 백그라운드에서 `scanForProposals({ isManual: false })`가 실행되었다 하더라도, 결과물이 등록되지 못하는 심각한 파싱 결함이 존재합니다.

`src/hooks/useAutoCodex.ts`의 응답 파싱 코드:
```typescript
// src/hooks/useAutoCodex.ts (Lines 154-175)
if (parsed.updates && Array.isArray(parsed.updates)) {
  for (const update of parsed.updates) {
    const targetId = update.originalEntryId || update.id;
    if (!targetId || droppedUpdateTargetIds.has(targetId)) {
      continue;
    }
    ...
  }
}

// Lines 180-215
if (parsed.newEntries && Array.isArray(parsed.newEntries)) {
  for (const newEntry of parsed.newEntries) {
    ...
    await addLoreEntry('item', null, {
      title: newEntry.title || "New Proposed Entry",
      proposedContent: deduplicateLoreContent(newEntry.content),
      keywords: newEntry.keywords || "",
      isProposalOnly: true,
      enabled: false,
      updateReason: newEntry.updateReason
    });
  }
}
```

#### 스키마 불일치 분석:
1. **업데이트 ID 누락 위험**:
   - `auto-codex-system.md` 프롬프트 명세에는 `originalEntryId`로 적혀 있으나, LLM(Gemini)은 범용적인 `entryId` 또는 `targetEntryId`로 응답하는 경우가 빈번합니다.
   - `update.originalEntryId`와 `update.id`만 검사하므로, `entryId`로 응답이 올 경우 `targetId`가 `undefined`가 되어 정상적인 업데이트 제안이 **통째로 버려집니다(Silent Skip)**.
2. **신규 항목 본문 증발 위험**:
   - 2026-10-07의 `PLAN_STORY_MEMORY_AND_AUTO_CODEX_OPTIMIZATION.md` 아카이브 계획서(Line 228)에는 신규 엔트리 본문 필드가 `"description": "string"`으로 정의되어 있었습니다.
   - 그러나 `useAutoCodex.ts`는 오직 `newEntry.content`만을 참조합니다.
   - 만약 모델이 `description`이나 `proposedContent`로 반환하면 `newEntry.content`가 `undefined`가 되어, 코덱스에 내용이 텅 빈(`""`) 껍데기 제안만 등록되거나 무의미한 항목이 됩니다.

---

### 3.5 원인 ⑤: Plot Workbench의 Fail-Fast 완결성 검증 실패에 따른 무음 폐기

`src/hooks/useAutoPlot.ts`에서 백그라운드 플롯 생성 시:
```typescript
// src/hooks/useAutoPlot.ts (Lines 91-92, 118-132)
// 2-Tier Hybrid Parsing & Strict Fail-Fast Validation
const parsed = parseAndValidatePlotResponse(responseText);
...
} catch (err: any) {
  console.error("Plot generation / validation error:", err);
  // 에러 노티피케이션만 띄우고 proposal은 null 반환
  return null;
}
```

`src/services/plotService.ts`의 엄격 검증 로직:
```typescript
// src/services/plotService.ts (Lines 296-306)
if (finalPlotText.length < 800) {
  throw new Error("플롯 분량이 너무 짧거나 불완전합니다. (최소 800자 이상의 온전한 구성 필요)");
}
const hasClosingSequence = /시퀀스\s*[45]|Sequence\s*[45]|수습\s*및\s*여운|결말/i.test(finalPlotText);
if (!hasClosingSequence && (sequencesCount === undefined || sequencesCount < 3)) {
  throw new Error("플롯 시퀀스가 도중에 잘렸거나 미완결 상태입니다.");
}
```
- 사용자의 프롬프트 지시 없이 백그라운드에서 자동 생성된 플롯 텍스트가 800자 미만이거나, 정규식에 걸리지 않을 경우 즉시 에러가 발생하여 제안(`pendingPlotProposal`)이 생성되지 않고 사라집니다.

---

## 4. 왜 "이전에는 문제가 없었는데 지금 문제가 발생하기 시작했는가?" (역사적 원인 규명)

시간대별 아키텍처 변천사 추적 결과, 세 가지 중대한 변곡점(Inflection Points)이 확인되었습니다:

```
[과거: 정상 체감 시기]
  ├─ SettingsPanel에 Auto-Codex / Auto-Plot 전용 서랍 및 1클릭 토글 직접 노출
  ├─ 사용자가 즉시 트리거 글자수를 1,000자 ~ 2,000자로 낮추어 테스트 가능
  └─ 인라인 토글 시 Firestore 및 State 즉시 동기화

       ▼ [변곡점 1: 2026-09-28 AI Engine Studio & Unified LLM Settings 도입]
  ├─ 6대 AI 파이프라인의 모든 슬라이더를 SettingsPanel에서 일괄 제거
  ├─ 자동화 설정이 AIEngineStudioModal 깊숙이 격리됨
  └─ Local Draft Buffer 도입: 토글 조작 후 [적용 & 저장] 미클릭 시 변경사항 폐기 버그 생성

       ▼ [변곡점 2: 2026-09-28 Settings UX Optimization & Station 개편]
  ├─ SettingsPanel 5번 섹션을 단순 지시형 텍스트창(Station)으로 전환
  ├─ 설정 패널에서 주기 스캔의 On/Off 여부와 글자수 제어가 완전히 소멸
  └─ 플롯 섹션도 순수 수동 집필 공간으로 전환되며 autoPlot 컨트롤 소멸

       ▼ [변곡점 3: 2026-10-07 Auto-Codex 프롬프트 & CoT 스키마 고도화]
  ├─ 기본 트리거 글자수가 10,000자(코덱스) / 7,500자(플롯)로 상향 고정
  ├─ 인메모리 Ref의 세션 휘발성과 결합하여 단일 세션 10,000자 요구 병목 심화
  └─ 응답 키 매핑 불일치로 응답이 도착해도 Silent Drop되는 버그 잠복

[현재: 주기별 자동 스캔 완전 마비 상태]
```

### 핵심 요약:
1. **과거**: 설정창에서 바로 켜고 글자수를 낮춰서 확인했기에 작동함을 체감할 수 있었습니다.
2. **현재**:
   - 설정창에서 토글과 슬라이더가 사라져 켜져 있는지 알 수 없고,
   - AI Engine Studio에서 켜더라도 [적용 & 저장]을 누르지 않아 꺼진 상태로 남으며,
   - 켜졌다 한들 10,000자라는 거대한 임계값이 새로고침/소설전환 시마다 0으로 리셋되어 절대 발동되지 않고,
   - 발동되어도 파서 결함으로 제안이 소실되는 삼중 트랩에 걸려 완전히 무력화된 것입니다.

---

## 5. 아키텍처 정상화 로드맵 (Actionable Resolution Blueprint)

이 문제를 근본적으로 해소하고, 안정적이며 관측 가능한(Observable) 자동 스캔 환경을 복원하기 위한 구체적인 기술 실행 계획입니다:

### 5.1 [P0] 카운터 영속화 및 현실적 기본 임계값 조정
1. **카운터 영속화 (Session Persistence)**:
   - `charsSinceLastScanRef`와 `charsSinceLastPlotRef`의 누적치를 `localStorage` (`novel_autocodex_chars_${novelId}`, `novel_autoplot_chars_${novelId}`)에 보관하여, 브라우저 새로고침이나 탭 종료 후에도 누적 글자수가 유지되도록 개선.
2. **기본 임계값 현실화**:
   - `GLOBAL_DEFAULTS.autoCodex.triggerChars`: `10,000자` ➔ **`3,000자` (권장: 웹소설 반 회차~1회차 분량)**
   - `GLOBAL_DEFAULTS.plot.triggerChars`: `7,500자` ➔ **`3,000자` (권장)**

### 5.2 [P0] SettingsPanel 자동화 퀵 컨트롤 복원
1. `SettingsPanel.tsx`의 **AUTO-CODEX** 및 **PLOT BLUEPRINT** 섹션에:
   - **자동 스캔 온/오프 퀵 토글** 직접 노출 (AI Engine Studio를 열지 않고도 1클릭 토글 가능하도록 복원).
   - **현재 누적 글자수 및 진행률 게이지 바** 시각화:
     - 예: `자동 스캔: ON (현재 1,420 / 3,000자 - 47%)`
   - 스캔 주기 슬라이더 (1,000자 ~ 10,000자) 지원.

### 5.3 [P0] AIEngineStudioModal 원자적 커밋 UX 개선
1. `draftSettings`의 자동화 토글(`autoCodex`, `autoPlot`)을 변경했을 때, 사용자가 실수로 모달을 닫아 설정이 취소되는 사고를 방지:
   - 모달 닫기 시 `isDirty` 상태라면 확인 다이얼로그를 띄우거나,
   - 모달 헤더에 "저장되지 않은 변경사항이 있습니다" 뱃지를 명확히 강조.

### 5.4 [P1] Auto-Codex 응답 파서 방어벽 강화 (Robust Fallback Mapping)
1. `src/hooks/useAutoCodex.ts`의 파서 보강:
   ```typescript
   // ID 추출 유연화
   const targetId = update.originalEntryId || update.targetEntryId || update.entryId || update.id;
   
   // 본문 추출 유연화
   const newContent = newEntry.content || newEntry.description || newEntry.proposedContent || "";
   const reason = newEntry.updateReason || newEntry.rationale || newEntry.reason || "";
   ```

### 5.5 [P1] Plot 완결성 검증의 백그라운드 탄력성 부여
1. 백그라운드 자동 플롯 생성(`isManual: false`) 시에는 길이가 다소 짧더라도 핵심 시퀀스가 존재하면 유효한 제안으로 수용할 수 있도록 완결성 검증 임계치를 유연하게 적응(800자 ➔ 400자 이상 완화).

---

## 6. 결론 (Conclusion)

사용자께서 지적하신 문제는 단순한 일시적 결함이 아니라, **"카운터 휘발성 + 극단적 임계값 + UI 접근성 단절 + 파서 키 불일치"가 얽힌 실존하는 핵심 결함**이었습니다.

원인이 명백하게 규명되었으므로, 위 5단계 해결 방안을 적용하면 이전보다 훨씬 더 투명하고 안정적이며 실효성 있는 주기별 자동 스캔 시스템으로 즉시 복원할 수 있습니다.
