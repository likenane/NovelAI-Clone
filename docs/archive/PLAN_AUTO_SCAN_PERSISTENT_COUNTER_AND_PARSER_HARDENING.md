# Master Blueprint: Auto-Codex & Auto-Plot 영속적 카운터 아키텍처 및 파서 견고화

> **Status**: MASTER BLUEPRINT (Ready for Execution pending Final Approval)  
> **Date**: 2026-10-09  
> **Target Files**:
> - `src/lib/counterStorage.ts` (신규: 소설별 카운터 영속 스토리지 SSOT 유틸리티)
> - `src/hooks/useAutoCodex.ts` (영속 카운터 연동, 실행 시점 리셋, 다중 키 파서 강화)
> - `src/hooks/useAutoPlot.ts` (영속 카운터 연동, 실행 시점 리셋)
> - `src/constants.ts` (기본 임계값 7,500자 정렬)
> - `AGENTS.md` & 하위 `AGENTS.md`

---

## 1. 배경 및 사용자 확정 요구사항

1. **기존 UI 아키텍처 100% 보존**:
   - `SettingsPanel`의 경량 미니멀 디자인 및 `AIEngineStudioModal`의 Local Draft Buffer(원자적 커밋)는 사용자가 의도한 설계이므로 **일체 수정하지 않고 원형을 유지**합니다.
2. **소설 집필 외적 요인에 의한 카운터 초기화 차단**:
   - 브라우저 새로고침(F5), 탭 재접속, 사이드바 소설 전환, 설정 토글 등으로 카운터가 `0`으로 날아가지 않도록 **소설별 영속 스토리지**를 구축합니다.
3. **기본 임계값 7,500자 확정**:
   - 3,000자는 너무 짧고 잦으므로, Auto-Codex와 Auto-Plot 모두 **7,500자**로 기본 임계값을 통일합니다. (약 1.5화~2화 분량)
4. **실행 시점 카운터 리셋 정책 (별론)**:
   - **자동 트리거 시**: 임계값 도달로 자동 실행 완료 시 0으로 리셋.
   - **수동 실행 시 (Directive Scan, Plot Workbench 수동 생성 등)**: 사용자가 직접 실행하여 해당 시점까지의 본문이 성공적으로 분석·반영되었으므로 카운터를 0으로 초기화.
   - **실패 시 (API/네트워크 에러)**: 카운터를 0으로 날리지 않고 기존 누적치를 안전하게 유지하여 다음 집필 시 재시도 기회를 보장.
5. **기존 소설 Save / Load 기능 안전성 보장**:
   - Firestore 데이터 스키마 및 DB I/O를 전혀 건드리지 않고, 브라우저 `localStorage` 기반으로 완전 격리하여 **기존 소설의 저장/불러오기/백업/내보내기(V2) 파이프라인에 0.001%의 사이드이펙트도 발생시키지 않습니다**.

---

## 2. Deep Self-Critique (심층 자가 비판 및 대응책)

### ① 구현 세밀도 (Feasibility & Granularity) - "타이핑 성능과 동기화 빈도는 안전한가?"
- **문제점**: Tiptap의 `onUpdate`는 사용자가 1글자를 타이핑할 때마다 `incrementChars(1)`을 호출함. 매 타이핑마다 동기(Synchronous) API인 `localStorage.setItem`을 호출하면 고속 타이핑 시 미세한 입력 지연(Micro-Jank)이 발생할 수 있음.
- **해결책**:
  - React Ref(`charsSinceLastScanRef`, `charsSinceLastPlotRef`)는 60fps로 즉시 업데이트하여 트리거 검사를 0ms로 수행.
  - `localStorage` 동기화는 **25자 누적 주기** 또는 **소설 전환 / 언마운트 / 스캔 실행 시점**에 디바운스/배치로 기록하여 I/O 비용을 극소화하면서도 새로고침 시 데이터 손실을 0에 가깝게 방어.

### ② 모듈화 및 파편화 방지 (Modularity & Anti-Fragmentation) - "중복 로직이 발생하지 않는가?"
- **문제점**: `useAutoCodex`와 `useAutoPlot`에 각각 `localStorage.getItem/setItem` 로직을 별개로 작성하면 키 네이밍 규칙, 예외 처리, 타입 정의가 파편화됨.
- **해결책**:
  - 단일 진실 공급원(SSOT) 헬퍼 파일인 `src/lib/counterStorage.ts`를 신설.
  - `getNovelCharCount(novelId, type)`, `setNovelCharCount(novelId, type, count)`, `resetNovelCharCount(novelId, type)`의 공통 API로 단일화.

### ③ 안정성 (Stability) - "브라우저 시크릿 모드나 Quota 에러는 안전한가?"
- **문제점**: 사용자가 시크릿 모드를 사용하거나 브라우저 스토리지 용량이 초과된 경우 `localStorage.setItem`이 `QuotaExceededError`나 `SecurityError`를 던져 앱 전체가 멈출 수 있음.
- **해결책**:
  - `counterStorage.ts` 내부의 모든 `localStorage` 접근에 `try-catch` 가드를 적용하여, 스토리지 접근이 차단된 환경에서도 안전하게 In-Memory Ref로 Graceful Degradation 동작 보장.

### ④ 확장성 (Scalability) - "기존 Save/Load 및 신규 기능 연동성은 유연한가?"
- **문제점**: 소설 삭제 시 불필요한 키가 스토리지에 남아있거나, 추후 다른 자동화 작업(예: Auto-Memory)이 추가될 때의 구조적 유연성.
- **해결책**:
  - `AITaskType`과 연계 가능한 타입 유니온(`'autocodex' | 'autoplot'`)으로 설계하여 확장성을 보장하고, 소설 삭제 시 연관 키를 정리할 수 있는 `purgeNovelCounters(novelId)` 함수 제공.

---

## 3. 세부 코드 아키텍처 및 구현 명세

### 3.1 [신규 모듈] `src/lib/counterStorage.ts`
```typescript
export type AutoCounterType = 'autocodex' | 'autoplot';

export function getNovelCharCount(novelId: string | undefined, type: AutoCounterType): number;
export function setNovelCharCount(novelId: string | undefined, type: AutoCounterType, count: number): void;
export function resetNovelCharCount(novelId: string | undefined, type: AutoCounterType): void;
export function purgeNovelCounters(novelId: string | undefined): void;
```

### 3.2 `src/hooks/useAutoCodex.ts`
1. 초기화 및 소설 전환:
   - `useEffect`에서 `novel?.id` 변경 시 `getNovelCharCount(novel.id, 'autocodex')`를 호출하여 카운터 하이드레이션.
   - `novel?.settings?.automation?.autoCodex`가 변경되어도 카운터를 리셋하지 않음.
2. `incrementChars`:
   - `charsSinceLastScanRef.current = Math.max(0, current + count);`
   - 일정 간격(25자) 또는 조건 만족 시 `setNovelCharCount` 동기화.
3. `scanForProposals`:
   - 성공 시: `resetNovelCharCount(novel.id, 'autocodex')` 및 `charsSinceLastScanRef.current = 0`.
   - 에러 시: 카운터 리셋하지 않고 보존.
4. 응답 파서 강화:
   - `update.originalEntryId || update.targetEntryId || update.entryId || update.id`
   - `newEntry.content || newEntry.description || newEntry.proposedContent || ""`
   - `newEntry.updateReason || newEntry.rationale || newEntry.reason || ""`

### 3.3 `src/hooks/useAutoPlot.ts`
1. 초기화 및 소설 전환:
   - `useEffect`에서 `novel?.id` 변경 시 `getNovelCharCount(novel.id, 'autoplot')` 하이드레이션.
   - 토글 변경 시 카운터 강제 리셋 방지.
2. `onCharactersAdded`:
   - `charsSinceLastPlotRef.current = Math.max(0, current + count);`
   - `setNovelCharCount` 동기화.
3. `generatePlot`:
   - 자동/수동 무관하게 성공 시: `resetNovelCharCount(novel.id, 'autoplot')` 및 `charsSinceLastPlotRef.current = 0`.
   - 에러 시: 카운터 보존.

### 3.4 `src/constants.ts`
- `GLOBAL_DEFAULTS.autoCodex.triggerChars`: `7500`
- `GLOBAL_DEFAULTS.plot.triggerChars`: `7500`
- `AIEngineStudioModal.tsx`의 기본 fallback 및 라벨: `7500`으로 정렬.

---

## 4. 검증 계획 (Verification Matrix)
1. **정적 검증**: `lint_applet` (`tsc --noEmit`) 0 에러 및 `compile_applet` 빌드 성공.
2. **세션 지속성 검증**:
   - 100자 타이핑 후 새로고침(F5) 시 `localStorage`에서 100자가 온전히 복원되는지 확인.
   - 사이드바에서 다른 소설로 전환 후 복귀해도 해당 소설의 누적 글자수가 유지되는지 확인.
   - 설정 모달에서 토글을 껐다 켜도 카운터가 보존되는지 확인.
3. **리셋 무결성 검증**:
   - 수동 스캔/생성 성공 시 카운터가 0으로 정상 초기화되는지 확인.
4. **기존 소설 I/O 안전성 검증**:
   - Firestore 저장/불러오기 정상 작동 확인.

